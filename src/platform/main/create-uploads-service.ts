import { stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { nanoid } from 'nanoid';

import type { BrowserWindow, IpcMain, WebContents } from 'electron';

import type { JsonStore } from '@moritzbrantner/electron-json-store/main';

import {
  uploadsChannels,
  type UploadItem,
  type UploadsState,
} from '../shared/uploads.ts';

function cloneValue<TValue>(value: TValue): TValue {
  return structuredClone(value);
}

const require = createRequire(import.meta.url);

export interface UploadDialogAdapter {
  showOpenDialog(browserWindow: BrowserWindow): Promise<{
    canceled: boolean;
    filePaths: string[];
  }>;
}

export interface UploadsServiceOptions {
  dialogAdapter: UploadDialogAdapter;
  getBroadcastTargets: () => WebContents[];
  progressStep?: number;
  store: JsonStore<UploadsState>;
  tickInMs?: number;
}

export function createUploadsService(options: UploadsServiceOptions) {
  const progressStep = options.progressStep ?? 18;
  const tickInMs = options.tickInMs ?? 140;
  const uploadTimers = new Map<string, NodeJS.Timeout>();
  let mutationQueue = Promise.resolve();
  let stateCache: UploadsState | null = null;

  async function withMutation<TValue>(mutation: () => Promise<TValue>): Promise<TValue> {
    const result = mutationQueue.then(mutation, mutation);
    mutationQueue = result.then(
      async () => undefined,
      async () => undefined,
    );
    return result;
  }

  async function broadcast() {
    const snapshot = await getState();

    options.getBroadcastTargets().forEach((target) => {
      if (!target.isDestroyed()) {
        target.send(uploadsChannels.stateDidChange, cloneValue(snapshot));
      }
    });
  }

  function stopUploadTimer(uploadId: string) {
    const timer = uploadTimers.get(uploadId);

    if (!timer) {
      return;
    }

    clearTimeout(timer);
    uploadTimers.delete(uploadId);
  }

  async function persistState(nextState: UploadsState, shouldBroadcast = true) {
    stateCache = cloneValue(nextState);
    await options.store.save(nextState);

    if (shouldBroadcast) {
      await broadcast();
    }
  }

  async function getState() {
    if (stateCache !== null) {
      return cloneValue(stateCache);
    }

    const loadedState = await options.store.load();
    const recoveredItems = loadedState.items.map((item) =>
      item.status === 'uploading'
        ? {
            ...item,
            error: 'Upload interrupted before completion.',
            status: 'failed' as const,
            updatedAt: new Date().toISOString(),
          }
        : item,
    );
    const recoveredState = {
      items: recoveredItems,
      statusMessage:
        recoveredItems.some((item) => item.status === 'failed' && item.error === 'Upload interrupted before completion.')
          ? 'Recovered upload queue after restart.'
          : loadedState.statusMessage,
    };

    stateCache = cloneValue(recoveredState);

    if (JSON.stringify(loadedState) !== JSON.stringify(recoveredState)) {
      await options.store.save(recoveredState);
    }

    return cloneValue(recoveredState);
  }

  async function addFiles(filePaths: string[]) {
    const snapshot = await getState();
    const existingPaths = new Set(snapshot.items.map((item) => item.filePath));
    const nextItems = cloneValue(snapshot.items);
    let addedCount = 0;

    for (const filePath of filePaths) {
      if (!filePath || existingPaths.has(filePath)) {
        continue;
      }

      try {
        const fileStats = await stat(filePath);
        const timestamp = new Date().toISOString();

        nextItems.unshift({
          addedAt: timestamp,
          attempts: 0,
          completedAt: null,
          error: null,
          filePath,
          id: nanoid(),
          name: path.basename(filePath),
          progress: 0,
          size: fileStats.size,
          status: 'queued',
          updatedAt: timestamp,
        });
        existingPaths.add(filePath);
        addedCount += 1;
      } catch (_error) {}
    }

    await persistState({
      items: nextItems,
      statusMessage:
        addedCount > 0
          ? `Queued ${addedCount} file${addedCount === 1 ? '' : 's'} for upload.`
          : 'No new files were added to the queue.',
    });
  }

  async function pickFiles(browserWindow: BrowserWindow | null) {
    if (!browserWindow) {
      return;
    }

    const result = await options.dialogAdapter.showOpenDialog(browserWindow);

    if (result.canceled || result.filePaths.length === 0) {
      const snapshot = await getState();
      await persistState({
        ...snapshot,
        statusMessage: 'Upload picker canceled.',
      });
      return;
    }

    await addFiles(result.filePaths);
  }

  async function setItemState(
    uploadId: string,
    updater: (item: UploadItem) => UploadItem,
    statusMessage: string,
  ) {
    const snapshot = await getState();
    let didUpdate = false;
    const nextItems = snapshot.items.map((item) => {
      if (item.id !== uploadId) {
        return item;
      }

      didUpdate = true;
      return updater(item);
    });

    if (!didUpdate) {
      return false;
    }

    await persistState({
      items: nextItems,
      statusMessage,
    });
    return true;
  }

  function shouldFailUpload(item: UploadItem, nextProgress: number) {
    return item.name.toLowerCase().includes('fail') && item.attempts === 1 && nextProgress >= 72;
  }

  function scheduleUploadTick(uploadId: string) {
    stopUploadTimer(uploadId);

    const timer = setTimeout(() => {
      void withMutation(async () => {
        const snapshot = await getState();
        const item = snapshot.items.find((candidate) => candidate.id === uploadId);

        if (!item || item.status !== 'uploading') {
          stopUploadTimer(uploadId);
          return;
        }

        const nextProgress = Math.min(item.progress + progressStep, 100);
        const timestamp = new Date().toISOString();

        if (shouldFailUpload(item, nextProgress)) {
          stopUploadTimer(uploadId);
          await setItemState(
            uploadId,
            (currentItem) => ({
              ...currentItem,
              error: 'Simulated transport failure. Rename without "fail" or retry to continue.',
              progress: Math.min(nextProgress, 96),
              status: 'failed',
              updatedAt: timestamp,
            }),
            `Upload failed for ${item.name}.`,
          );
          return;
        }

        if (nextProgress >= 100) {
          stopUploadTimer(uploadId);
          await setItemState(
            uploadId,
            (currentItem) => ({
              ...currentItem,
              completedAt: timestamp,
              error: null,
              progress: 100,
              status: 'completed',
              updatedAt: timestamp,
            }),
            `Uploaded ${item.name}.`,
          );
          return;
        }

        await setItemState(
          uploadId,
          (currentItem) => ({
            ...currentItem,
            error: null,
            progress: nextProgress,
            status: 'uploading',
            updatedAt: timestamp,
          }),
          `Uploading ${item.name}...`,
        );
        scheduleUploadTick(uploadId);
      });
    }, tickInMs);

    uploadTimers.set(uploadId, timer);
  }

  async function startUpload(uploadId: string) {
    await withMutation(async () => {
      const snapshot = await getState();
      const item = snapshot.items.find((candidate) => candidate.id === uploadId);

      if (!item || item.status === 'completed' || item.status === 'uploading') {
        return;
      }

      const timestamp = new Date().toISOString();
      await setItemState(
        uploadId,
        (currentItem) => ({
          ...currentItem,
          attempts: currentItem.attempts + 1,
          completedAt: null,
          error: null,
          progress: currentItem.status === 'failed' || currentItem.status === 'canceled' ? 0 : currentItem.progress,
          status: 'uploading',
          updatedAt: timestamp,
        }),
        `Starting upload for ${item.name}.`,
      );
      scheduleUploadTick(uploadId);
    });
  }

  async function startAll() {
    const snapshot = await getState();
    const queuedItems = snapshot.items.filter((item) => item.status === 'queued');

    await Promise.all(queuedItems.map((item) => startUpload(item.id)));
  }

  async function cancelUpload(uploadId: string) {
    stopUploadTimer(uploadId);

    await withMutation(async () => {
      const snapshot = await getState();
      const item = snapshot.items.find((candidate) => candidate.id === uploadId);

      if (!item || (item.status !== 'queued' && item.status !== 'uploading')) {
        return;
      }

      await setItemState(
        uploadId,
        (currentItem) => ({
          ...currentItem,
          error: 'Canceled by user.',
          status: 'canceled',
          updatedAt: new Date().toISOString(),
        }),
        `Canceled upload for ${item.name}.`,
      );
    });
  }

  async function retryUpload(uploadId: string) {
    await withMutation(async () => {
      const snapshot = await getState();
      const item = snapshot.items.find((candidate) => candidate.id === uploadId);

      if (!item || (item.status !== 'failed' && item.status !== 'canceled')) {
        return;
      }

      await setItemState(
        uploadId,
        (currentItem) => ({
          ...currentItem,
          completedAt: null,
          error: null,
          progress: 0,
          status: 'queued',
          updatedAt: new Date().toISOString(),
        }),
        `Queued retry for ${item.name}.`,
      );
    });

    await delay(0);
    await startUpload(uploadId);
  }

  async function clearCompleted() {
    await withMutation(async () => {
      const snapshot = await getState();
      const nextItems = snapshot.items.filter((item) => item.status !== 'completed');

      await persistState({
        items: nextItems,
        statusMessage:
          nextItems.length === snapshot.items.length
            ? 'No completed uploads to clear.'
            : 'Cleared completed uploads.',
      });
    });
  }

  function installIpc(ipcMain: IpcMain) {
    const { BrowserWindow: ElectronBrowserWindow } = require('electron') as typeof import('electron');

    ipcMain.handle(uploadsChannels.getState, async () => getState());
    ipcMain.handle(uploadsChannels.addDroppedFiles, async (_event, filePaths: string[]) => {
      await addFiles(filePaths);
    });
    ipcMain.handle(uploadsChannels.pickFiles, async (event) => {
      await pickFiles(ElectronBrowserWindow.fromWebContents(event.sender));
    });
    ipcMain.handle(uploadsChannels.startAll, async () => {
      await startAll();
    });
    ipcMain.handle(uploadsChannels.startUpload, async (_event, uploadId: string) => {
      await startUpload(uploadId);
    });
    ipcMain.handle(uploadsChannels.cancelUpload, async (_event, uploadId: string) => {
      await cancelUpload(uploadId);
    });
    ipcMain.handle(uploadsChannels.retryUpload, async (_event, uploadId: string) => {
      await retryUpload(uploadId);
    });
    ipcMain.handle(uploadsChannels.clearCompleted, async () => {
      await clearCompleted();
    });

    return () => {
      ipcMain.removeHandler(uploadsChannels.getState);
      ipcMain.removeHandler(uploadsChannels.addDroppedFiles);
      ipcMain.removeHandler(uploadsChannels.pickFiles);
      ipcMain.removeHandler(uploadsChannels.startAll);
      ipcMain.removeHandler(uploadsChannels.startUpload);
      ipcMain.removeHandler(uploadsChannels.cancelUpload);
      ipcMain.removeHandler(uploadsChannels.retryUpload);
      ipcMain.removeHandler(uploadsChannels.clearCompleted);
    };
  }

  return {
    addFiles,
    cancelUpload,
    clearCompleted,
    getState,
    installIpc,
    pickFiles,
    retryUpload,
    startAll,
    startUpload,
  };
}
