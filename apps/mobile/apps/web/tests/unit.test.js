import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('web theme toggle persists a selected mode', () => {
  const source = readFileSync(new URL('../app/theme-toggle.tsx', import.meta.url), 'utf8');

  assert.match(source, /localStorage\.setItem\(STORAGE_KEY, theme\)/);
  assert.match(source, /Switch to dark mode/);
  assert.match(source, /Switch to light mode/);
});

test('web settings page exposes a dedicated appearance section', () => {
  const source = readFileSync(new URL('../app/settings/page.tsx', import.meta.url), 'utf8');

  assert.match(source, /Application settings/);
  assert.match(source, /SiteNav/);
  assert.match(source, /ThemeToggle/);
  assert.match(source, /Back home/);
});

test('web has a dedicated Three.js page', () => {
  const source = readFileSync(new URL('../app/three/page.tsx', import.meta.url), 'utf8');

  assert.match(source, /Three\.js/);
  assert.match(source, /SiteNav/);
  assert.match(source, /future scene work/);
});

test('web has a dedicated React Hook Form overview page', () => {
  const source = readFileSync(
    new URL('../app/react-hook-form/page.tsx', import.meta.url),
    'utf8',
  );

  assert.match(source, /React Hook Form/);
  assert.match(source, /required validation/);
  assert.match(source, /dirty tracking/);
  assert.match(source, /reset\(newValues\)/);
});

test('web has a dedicated communication page with Websockets and CRDTs sections', () => {
  const source = readFileSync(new URL('../app/communication/page.tsx', import.meta.url), 'utf8');

  assert.match(source, /Communication category/);
  assert.match(source, /Realtime communication/);
  assert.match(source, /Websockets/);
  assert.match(source, /CRDTs/);
  assert.match(source, /activePage="communication"/);
});

test('web has a dedicated uploads page with picker and drag-and-drop queue handling', () => {
  const source = readFileSync(new URL('../app/uploads/page.tsx', import.meta.url), 'utf8');

  assert.match(source, /getUploadGuide\("web"\)/);
  assert.match(source, /drag and drop/);
  assert.match(source, /Choose files/);
  assert.match(source, /Current upload items/);
  assert.match(source, /activePage="uploads"/);
  assert.match(source, /uploadLifecycle/);
});

test('web profile pages resolve /profile/@username URLs and reject unknown segments', () => {
  const source = readFileSync(
    new URL('../app/profile/[profile]/page.tsx', import.meta.url),
    'utf8',
  );

  assert.match(source, /getProfileFromSegment/);
  assert.match(source, /profile\.startsWith\("@"\)/);
  assert.match(source, /notFound\(\)/);
  assert.match(source, /User profile/);
});

test('web profile data exposes a current user and profile lookup helpers', () => {
  const source = readFileSync(new URL('../app/profiles.ts', import.meta.url), 'utf8');

  assert.match(source, /export const currentUser = profiles\[0\]/);
  assert.match(source, /export function getProfileByUsername/);
  assert.match(source, /export function getProfileFromSegment/);
});

test('web home links to a dummy teammate profile page', () => {
  const source = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

  assert.match(source, /Dummy teammate profile/);
  assert.match(source, /getProfileByUsername\("jules"\)/);
  assert.match(source, /href=\{`\/profile\/@\$\{featuredProfile\.username\}`\}/);
  assert.match(source, /href="\/uploads"/);
});
