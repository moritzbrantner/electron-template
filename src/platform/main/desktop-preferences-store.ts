import fs from 'node:fs';
import path from 'node:path';

import { createJsonStore } from '@moritzbrantner/electron-json-store/main';

import {
  defaultDesktopPreferences,
  isDesktopPreferences,
  normalizeDesktopPreferencesFromVersion,
  type DesktopPreferences,
} from '../shared/preferences';

const desktopPreferencesFileName = 'preferences.json';

export const desktopPreferencesStoreVersion = 3;

function cloneValue<TValue>(value: TValue): TValue {
  return structuredClone(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

function isEnvelope(value: unknown): value is { data: unknown; version: number } {
  return isRecord(value) && typeof value.version === 'number' && 'data' in value;
}

function migrateDesktopPreferences(parsed: unknown) {
  let version = 0;
  let data: unknown = parsed;

  if (isEnvelope(parsed)) {
    version = parsed.version;
    data = parsed.data;
  }

  return normalizeDesktopPreferencesFromVersion(data, version);
}

export function getDesktopPreferencesFilePath(userDataPath: string) {
  return path.join(userDataPath, 'moritzbrantner', desktopPreferencesFileName);
}

export function createDesktopPreferencesStore(userDataPath: string) {
  return createJsonStore<DesktopPreferences>({
    defaultValue: defaultDesktopPreferences,
    filePath: getDesktopPreferencesFilePath(userDataPath),
    migrations: {
      0: (value) => normalizeDesktopPreferencesFromVersion(value, 0),
      1: (value) => normalizeDesktopPreferencesFromVersion(value, 1),
      2: (value) => normalizeDesktopPreferencesFromVersion(value, 2),
    },
    resetOnError: true,
    validate: isDesktopPreferences,
    version: desktopPreferencesStoreVersion,
  });
}

export function loadDesktopPreferencesForLaunch(userDataPath: string) {
  try {
    const raw = fs.readFileSync(getDesktopPreferencesFilePath(userDataPath), 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    const preferences = migrateDesktopPreferences(parsed);

    if (!isDesktopPreferences(preferences)) {
      throw new Error('Invalid desktop preferences');
    }

    return preferences;
  } catch {
    return cloneValue(defaultDesktopPreferences);
  }
}
