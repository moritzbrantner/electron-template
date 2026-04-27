const { test } = require('bun:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('desktop renderer uses the preload-backed desktop platform APIs', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/renderer.tsx'), 'utf8');

  assert.match(source, /window\.desktop\.preferences\.getAll\(\)/);
  assert.match(source, /window\.desktop\.documents\.getState\(\)/);
  assert.match(source, /window\.desktop\.uploads\.getState\(\)/);
  assert.match(source, /window\.desktop\.commands\.list\(\)/);
  assert.match(source, /preferences\.hotkeys\.navigation/);
  assert.match(source, /window\.location\.hash = target\.href/);
  assert.match(source, /route === 'documents'/);
  assert.match(source, /route === 'settings'/);
  assert.match(source, /route === 'uploads'/);
  assert.match(source, /window\.desktop\.uploads\.pickFiles\(\)/);
  assert.match(source, /window\.addEventListener\('hashchange', onHashChange\)/);
  assert.match(source, /createSharedButtonLabel\(\{ label: 'desktop-launch' \}\)/);
});

test('desktop navbar component provides app navigation links including documents', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/navbar.ts'), 'utf8');

  assert.match(source, /navbar__brand/);
  assert.match(source, /Desktop App/);
  assert.match(source, /hotkey-preview/);
  assert.match(source, /Home/);
  assert.match(source, /Settings/);
  assert.match(source, /Documents/);
  assert.match(source, /Uploads/);
  assert.match(source, /Maps/);
  assert.match(source, /#\/documents/);
  assert.match(source, /#\/maps/);
  assert.match(source, /#\/uploads/);
  assert.match(source, /#\/settings/);
  assert.match(source, /is-active/);
});

test('standalone manifest uses repo-level entry workspace and current shared package set', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../app.manifest.ts'), 'utf8');

  assert.match(source, /entryWorkspace: '\.'/);
  assert.match(source, /@moritzbrantner\/maps/);
  assert.match(source, /@moritzbrantner\/ui/);
});

test('direct-sync interfaces are removed from scripts and workflows', () => {
  const packageSource = fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8');

  assert.doesNotMatch(packageSource, /sync:monorepo/);
  assert.equal(fs.existsSync(path.resolve(__dirname, '../scripts/dispatch-monorepo-update.mjs')), false);
  assert.equal(fs.existsSync(path.resolve(__dirname, '../.github/workflows/update-monorepo.yml')), false);
  assert.equal(fs.existsSync(path.resolve(__dirname, '../.github/workflows/notify-monorepo-subtree-sync.yml')), false);
});
