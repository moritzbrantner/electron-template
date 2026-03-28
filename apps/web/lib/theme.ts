export const THEME_STORAGE_KEY = 'theme';
export const THEME_COOKIE_NAME = 'theme';

export type Theme = 'light' | 'dark';

export function isTheme(value: string | null | undefined): value is Theme {
  return value === 'light' || value === 'dark';
}
