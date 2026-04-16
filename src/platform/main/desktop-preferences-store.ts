import fs from 'node:fs';
import path from 'node:path';

import { createJsonStore } from '@moritzbrantner/electron-json-store/main';

import {
  defaultDesktopPreferences,
  isDesktopPreferences,
  normalizeDesktopNavigationHotkeys,
  type DesktopPreferences,
} from '../shared/preferences';

type DesktopPreferencesV1 = Omit<DesktopPreferences, 'display'>;
const desktopPreferencesFileName = 'preferences.json';

export const desktopPreferencesStoreVersion = 3;

function cloneValue<TValue>(value: TValue): TValue {
  return structuredClone(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

function isThemePreference(value: unknown): value is DesktopPreferences['appearance']['theme'] {
  return value === 'system' || value === 'light' || value === 'dark';
}

function normalizeDesktopPreferencesV1(value: unknown): DesktopPreferencesV1 {
  const current = isRecord(value) ? value : {};
  const appearance = isRecord(current.appearance) ? current.appearance : {};
  const developer = isRecord(current.developer) ? current.developer : {};
  const documents = isRecord(current.documents) ? current.documents : {};

  return {
    appearance: {
      theme: isThemePreference(appearance.theme)
        ? appearance.theme
        : defaultDesktopPreferences.appearance.theme,
    },
    developer: {
      openDevToolsOnLaunch:
        typeof developer.openDevToolsOnLaunch === 'boolean'
          ? developer.openDevToolsOnLaunch
          : defaultDesktopPreferences.developer.openDevToolsOnLaunch,
    },
    documents: {
      reopenLastDocument:
        typeof documents.reopenLastDocument === 'boolean'
          ? documents.reopenLastDocument
          : defaultDesktopPreferences.documents.reopenLastDocument,
    },
  };
}

function normalizeDesktopPreferences(value: unknown): DesktopPreferences {
  const base = normalizeDesktopPreferencesV1(value);
  const current = isRecord(value) ? value : {};
  const display = isRecord(current.display) ? current.display : {};

  return {
    ...base,
    display: {
      useGpu:
        typeof display.useGpu === 'boolean'
          ? display.useGpu
          : defaultDesktopPreferences.display.useGpu,
    },
  };
}

function normalizeDesktopPreferencesWithHotkeys(value: unknown): DesktopPreferences {
  const base = normalizeDesktopPreferences(value);
  const current = isRecord(value) ? value : {};
  const hotkeys = isRecord(current.hotkeys) ? current.hotkeys : {};

  return {
    ...base,
    hotkeys: {
      navigation: normalizeDesktopNavigationHotkeys(hotkeys.navigation),
    },
  };
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

  while (version < desktopPreferencesStoreVersion) {
    if (version === 0) {
      data = normalizeDesktopPreferencesV1(data);
    } else if (version === 1) {
      data = normalizeDesktopPreferences(data);
    } else if (version === 2) {
      data = normalizeDesktopPreferencesWithHotkeys(data);
    } else {
      throw new Error(`Missing desktop preferences migration ${version}`);
    }

    version += 1;
  }

  return normalizeDesktopPreferencesWithHotkeys(data);
}

export function getDesktopPreferencesFilePath(userDataPath: string) {
  return path.join(userDataPath, 'moritzbrantner', desktopPreferencesFileName);
}

export function createDesktopPreferencesStore(userDataPath: string) {
  return createJsonStore<DesktopPreferences>({
    defaultValue: defaultDesktopPreferences,
    filePath: getDesktopPreferencesFilePath(userDataPath),
    migrations: {
      0: (value) => normalizeDesktopPreferencesV1(value),
      1: (value) => normalizeDesktopPreferences(value),
      2: (value) => normalizeDesktopPreferencesWithHotkeys(value),
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
