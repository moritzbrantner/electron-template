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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
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

  if (
    value.appearance.theme !== 'system' &&
    value.appearance.theme !== 'light' &&
    value.appearance.theme !== 'dark'
  ) {
    return false;
  }

  return (
    typeof value.display.useGpu === 'boolean' &&
    typeof value.developer.openDevToolsOnLaunch === 'boolean' &&
    typeof value.documents.reopenLastDocument === 'boolean' &&
    isNavigationHotkeys(value.hotkeys.navigation)
  );
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
