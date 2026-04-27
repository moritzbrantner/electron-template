import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'bun:test';

test('electron renderer keeps settings and upload flows local to the app', () => {
  const source = readFileSync(path.resolve(import.meta.dirname, '../../src/renderer.tsx'), 'utf8');

  assert.match(source, /route === 'settings'/);
  assert.match(source, /route === 'uploads'/);
  assert.match(source, /setPreferenceSection\('hotkeys'/);
  assert.match(source, /window\.desktop\.uploads\.startAll\(\)/);
  assert.match(source, /window\.desktop\.uploads\.pickFiles\(\)/);
  assert.match(source, /RendererRoutePreview/);
});
