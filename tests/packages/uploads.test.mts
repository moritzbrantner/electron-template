import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'bun:test';

import { createJsonStore } from '../../packages/electron-json-store/src/main.ts';
import { createUploadsService } from '../../src/platform/main/create-uploads-service.ts';
import {
  defaultUploadsState,
  isUploadsState,
} from '../../src/platform/shared/uploads.ts';

async function waitFor(predicate: () => Promise<boolean>, timeoutInMs = 500) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutInMs) {
    if (await predicate()) {
      return;
    }

    await delay(10);
  }

  throw new Error('Timed out waiting for condition.');
}

test('uploads service deduplicates files, supports retry and cancelation, and persists state', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'desktop-uploads-'));
  const successFilePath = path.join(directory, 'success.txt');
  const failFilePath = path.join(directory, 'will-fail.txt');
  await writeFile(successFilePath, 'success', 'utf8');
  await writeFile(failFilePath, 'failure', 'utf8');

  const store = createJsonStore({
    defaultValue: defaultUploadsState,
    filePath: path.join(directory, 'uploads.json'),
    validate: isUploadsState,
    version: 1,
  });

  const service = createUploadsService({
    dialogAdapter: {
      async showOpenDialog() {
        return { canceled: false, filePaths: [successFilePath] };
      },
    },
    getBroadcastTargets: () => [],
    progressStep: 60,
    store,
    tickInMs: 5,
  });

  await service.addFiles([successFilePath, successFilePath, failFilePath]);
  assert.equal((await service.getState()).items.length, 2);

  const successItem = (await service.getState()).items.find((item) => item.name === 'success.txt');
  const failItem = (await service.getState()).items.find((item) => item.name === 'will-fail.txt');

  assert.ok(successItem);
  assert.ok(failItem);

  await service.startUpload(successItem.id);
  await delay(1);
  await service.cancelUpload(successItem.id);
  assert.equal((await service.getState()).items.find((item) => item.id === successItem.id)?.status, 'canceled');

  await service.retryUpload(successItem.id);
  await waitFor(async () => {
    const item = (await service.getState()).items.find((candidate) => candidate.id === successItem.id);
    return item?.status === 'completed';
  });

  await service.startUpload(failItem.id);
  await waitFor(async () => {
    const item = (await service.getState()).items.find((candidate) => candidate.id === failItem.id);
    return item?.status === 'failed';
  });

  await service.retryUpload(failItem.id);
  await waitFor(async () => {
    const item = (await service.getState()).items.find((candidate) => candidate.id === failItem.id);
    return item?.status === 'completed';
  });

  await service.clearCompleted();
  assert.equal((await service.getState()).items.length, 0);

  await rm(directory, { force: true, recursive: true });
});

test('uploads service recovers in-flight work after restart', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'desktop-uploads-recovery-'));
  const store = createJsonStore({
    defaultValue: defaultUploadsState,
    filePath: path.join(directory, 'uploads.json'),
    validate: isUploadsState,
    version: 1,
  });

  await store.save({
    items: [
      {
        addedAt: new Date().toISOString(),
        attempts: 1,
        completedAt: null,
        error: null,
        filePath: '/tmp/in-flight.txt',
        id: 'upload-1',
        name: 'in-flight.txt',
        progress: 48,
        size: 12,
        status: 'uploading',
        updatedAt: new Date().toISOString(),
      },
    ],
    statusMessage: 'Uploading in-flight.txt...',
  });

  const service = createUploadsService({
    dialogAdapter: {
      async showOpenDialog() {
        return { canceled: true, filePaths: [] };
      },
    },
    getBroadcastTargets: () => [],
    store,
  });

  const state = await service.getState();
  assert.equal(state.items[0].status, 'failed');
  assert.match(state.items[0].error ?? '', /interrupted/i);
  assert.match(state.statusMessage, /Recovered upload queue/);

  await rm(directory, { force: true, recursive: true });
});
