export type ThemePreference = 'dark' | 'light' | 'system';

export type NavigationHotkeyName = 'home' | 'settings' | 'documents' | 'uploads';

export interface NavigationHotkeys {
  home: string;
  settings: string;
  documents: string;
  uploads: string;
}

export interface DesktopPreferences {
  appearance: {
    theme: ThemePreference;
  };
  display: {
    useGpu: boolean;
  };
  developer: {
    openDevToolsOnLaunch: boolean;
  };
  documents: {
    reopenLastDocument: boolean;
  };
  hotkeys: {
    navigation: NavigationHotkeys;
  };
}

export interface DesktopPreferencesProfile {
  kind: 'desktop-preferences-profile';
  version: number;
  exportedAt: string;
  data: DesktopPreferences;
}

export const desktopPreferencesProfileKind = 'desktop-preferences-profile';
export const desktopPreferencesProfileVersion = 3;

export const reservedDesktopHotkeys = [
  'CmdOrCtrl+,',
  'CmdOrCtrl+N',
  'CmdOrCtrl+O',
  'CmdOrCtrl+S',
  'CmdOrCtrl+Shift+S',
] as const;

export const defaultNavigationHotkeys: NavigationHotkeys = {
  home: 'CmdOrCtrl+1',
  settings: 'CmdOrCtrl+2',
  documents: 'CmdOrCtrl+3',
  uploads: 'CmdOrCtrl+4',
};

export const defaultDesktopPreferences: DesktopPreferences = {
  appearance: {
    theme: 'system',
  },
  display: {
    useGpu: true,
  },
  developer: {
    openDevToolsOnLaunch: false,
  },
  documents: {
    reopenLastDocument: false,
  },
  hotkeys: {
    navigation: defaultNavigationHotkeys,
  },
};

type DesktopPreferencesV1 = Omit<DesktopPreferences, 'display' | 'hotkeys'>;
type DesktopPreferencesV2 = Omit<DesktopPreferences, 'hotkeys'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

function isIsoTimestamp(value: string) {
  return !Number.isNaN(Date.parse(value));
}

export function normalizeDesktopHotkeyKeyToken(value: string) {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();

  if (/^[a-z]$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  if (/^[0-9]$/.test(trimmed)) {
    return trimmed;
  }

  if (lower === 'comma' || trimmed === ',') {
    return ',';
  }

  if (lower === 'period' || lower === 'dot' || trimmed === '.') {
    return '.';
  }

  if (lower === 'slash' || trimmed === '/') {
    return '/';
  }

  if (lower === 'minus' || trimmed === '-') {
    return '-';
  }

  return null;
}

export function normalizeDesktopHotkeyAccelerator(value: string) {
  const tokens = value
    .split('+')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    return null;
  }

  let hasAlt = false;
  let hasCmdOrCtrl = false;
  let hasShift = false;
  let key: string | null = null;

  for (const token of tokens) {
    const normalizedToken = token.toLowerCase();

    if (normalizedToken === 'cmdorctrl' || normalizedToken === 'cmd' || normalizedToken === 'ctrl') {
      if (hasCmdOrCtrl) {
        return null;
      }

      hasCmdOrCtrl = true;
      continue;
    }

    if (normalizedToken === 'alt' || normalizedToken === 'option') {
      if (hasAlt) {
        return null;
      }

      hasAlt = true;
      continue;
    }

    if (normalizedToken === 'shift') {
      if (hasShift) {
        return null;
      }

      hasShift = true;
      continue;
    }

    if (key) {
      return null;
    }

    key = normalizeDesktopHotkeyKeyToken(token);
  }

  if (!key) {
    return null;
  }

  if (!hasCmdOrCtrl && !hasAlt && !hasShift) {
    return null;
  }

  const parts: string[] = [];

  if (hasCmdOrCtrl) {
    parts.push('CmdOrCtrl');
  }

  if (hasAlt) {
    parts.push('Alt');
  }

  if (hasShift) {
    parts.push('Shift');
  }

  parts.push(key);
  return parts.join('+');
}

export function splitDesktopHotkeyAccelerator(accelerator: string) {
  return accelerator.split('+').map((token) => (token === 'CmdOrCtrl' ? 'Cmd/Ctrl' : token));
}

function isNavigationHotkeyName(value: string): value is NavigationHotkeyName {
  return value === 'home' || value === 'settings' || value === 'documents' || value === 'uploads';
}

function normalizeNavigationHotkeys(value: unknown): NavigationHotkeys {
  const current = isRecord(value) ? value : {};
  const names = Object.keys(defaultNavigationHotkeys) as NavigationHotkeyName[];
  const normalizedCandidates = {} as Partial<Record<NavigationHotkeyName, string | null>>;

  names.forEach((name) => {
    const sourceValue = current[name];
    normalizedCandidates[name] =
      typeof sourceValue === 'string' ? normalizeDesktopHotkeyAccelerator(sourceValue) : null;
  });

  const nextHotkeys = {} as NavigationHotkeys;
  const usedHotkeys = new Set<string>(reservedDesktopHotkeys);

  names.forEach((name) => {
    const candidate = normalizedCandidates[name];

    if (
      !candidate ||
      usedHotkeys.has(candidate) ||
      names.some((otherName) => otherName !== name && normalizedCandidates[otherName] === candidate)
    ) {
      return;
    }

    nextHotkeys[name] = candidate;
    usedHotkeys.add(candidate);
  });

  names.forEach((name) => {
    if (nextHotkeys[name]) {
      return;
    }

    const fallbackValue = (
      names.map((routeName) => defaultNavigationHotkeys[routeName]).find((candidate) => !usedHotkeys.has(candidate))
      ?? defaultNavigationHotkeys[name]
    );

    nextHotkeys[name] = fallbackValue;
    usedHotkeys.add(fallbackValue);
  });

  return nextHotkeys;
}

export function isNavigationHotkeys(value: unknown): value is NavigationHotkeys {
  if (!isRecord(value)) {
    return false;
  }

  const usedHotkeys = new Set<string>(reservedDesktopHotkeys);

  return Object.entries(value).length === Object.keys(defaultNavigationHotkeys).length &&
    Object.entries(value).every(([name, accelerator]) => {
      if (!isNavigationHotkeyName(name) || typeof accelerator !== 'string') {
        return false;
      }

      const normalizedValue = normalizeDesktopHotkeyAccelerator(accelerator);

      if (!normalizedValue || normalizedValue !== accelerator || usedHotkeys.has(normalizedValue)) {
        return false;
      }

      usedHotkeys.add(normalizedValue);
      return true;
    });
}

export function isDesktopPreferences(value: unknown): value is DesktopPreferences {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !isRecord(value.appearance) ||
    !isRecord(value.display) ||
    !isRecord(value.developer) ||
    !isRecord(value.documents) ||
    !isRecord(value.hotkeys)
  ) {
    return false;
  }

  if (!isThemePreference(value.appearance.theme)) {
    return false;
  }

  return (
    typeof value.display.useGpu === 'boolean' &&
    typeof value.developer.openDevToolsOnLaunch === 'boolean' &&
    typeof value.documents.reopenLastDocument === 'boolean' &&
    isNavigationHotkeys(value.hotkeys.navigation)
  );
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

function normalizeDesktopPreferencesV2(value: unknown): DesktopPreferencesV2 {
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

function normalizeDesktopPreferencesV3(value: unknown): DesktopPreferences {
  const base = normalizeDesktopPreferencesV2(value);
  const current = isRecord(value) ? value : {};
  const hotkeys = isRecord(current.hotkeys) ? current.hotkeys : {};

  return {
    ...base,
    hotkeys: {
      navigation: normalizeDesktopNavigationHotkeys(hotkeys.navigation),
    },
  };
}

export function normalizeDesktopPreferences(value: unknown): DesktopPreferences {
  return normalizeDesktopPreferencesV3(value);
}

export function normalizeDesktopPreferencesFromVersion(value: unknown, version: number) {
  let nextVersion = Number.isInteger(version) ? version : 0;
  let data: unknown = value;

  while (nextVersion < desktopPreferencesProfileVersion) {
    if (nextVersion === 0) {
      data = normalizeDesktopPreferencesV1(data);
    } else if (nextVersion === 1) {
      data = normalizeDesktopPreferencesV2(data);
    } else if (nextVersion === 2) {
      data = normalizeDesktopPreferencesV3(data);
    } else {
      throw new Error(`Missing desktop preferences profile migration ${nextVersion}`);
    }

    nextVersion += 1;
  }

  return normalizeDesktopPreferencesV3(data);
}

export function isDesktopPreferencesProfile(value: unknown): value is DesktopPreferencesProfile {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.kind === desktopPreferencesProfileKind &&
    Number.isInteger(value.version) &&
    typeof value.version === 'number' &&
    value.version >= 1 &&
    typeof value.exportedAt === 'string' &&
    isIsoTimestamp(value.exportedAt) &&
    isDesktopPreferences(value.data)
  );
}

export function normalizeDesktopPreferencesProfile(value: unknown): DesktopPreferencesProfile {
  const current = isRecord(value) ? value : {};
  const version = typeof current.version === 'number' ? current.version : 0;

  return {
    kind: desktopPreferencesProfileKind,
    version: desktopPreferencesProfileVersion,
    exportedAt:
      typeof current.exportedAt === 'string' && isIsoTimestamp(current.exportedAt)
        ? current.exportedAt
        : new Date().toISOString(),
    data: normalizeDesktopPreferencesFromVersion(current.data, version),
  };
}

export function normalizeDesktopNavigationHotkeys(value: unknown) {
  return normalizeNavigationHotkeys(value);
}

export function resolveThemePreference(
  theme: ThemePreference,
  systemPrefersDark: boolean,
): 'dark' | 'light' {
  if (theme === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }

  return theme;
}
