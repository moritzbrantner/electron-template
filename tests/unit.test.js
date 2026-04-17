const { test } = require('bun:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('desktop renderer uses the preload-backed desktop platform APIs', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/renderer.ts'), 'utf8');

  assert.match(source, /window\.desktop\.preferences\.getAll\(\)/);
  assert.match(source, /window\.desktop\.documents\.getState\(\)/);
  assert.match(source, /window\.desktop\.uploads\.getState\(\)/);
  assert.match(source, /window\.desktop\.commands\.list\(\)/);
  assert.match(source, /window\.desktop\.uploads\.pickFiles\(\)/);
  assert.match(source, /window\.desktop\.uploads\.addDroppedFiles/);
  assert.match(source, /window\.desktop\.uploads\.startAll\(\)/);
  assert.match(source, /window\.desktop\.uploads\.retryUpload/);
  assert.match(source, /appState\.preferences\.hotkeys\.navigation/);
  assert.match(source, /window\.location\.hash = targetRoute\.href/);
  assert.match(source, /Reset navigation hotkeys/);
  assert.match(source, /Each page shortcut must be unique\./);
  assert.match(source, /Built-in document shortcuts stay global/);
  assert.match(source, /hotkey-kbd/);
  assert.match(source, /route === 'documents'/);
  assert.match(source, /route === 'uploads'/);
  assert.match(source, /System theme/);
  assert.match(source, /Light mode/);
  assert.match(source, /Dark mode/);
  assert.match(source, /Display/);
  assert.match(source, /Use GPU acceleration/);
  assert.match(source, /Applies the next time the app launches\./);
  assert.match(source, /Persistent file intake/);
  assert.match(source, /Drop files here/);
  assert.match(source, /Upload queue/);
  assert.match(source, /window\.addEventListener\('hashchange', renderApp\)/);
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
  assert.equal(
    fs.existsSync(path.resolve(__dirname, '../scripts/dispatch-monorepo-update.mjs')),
    false,
  );
  assert.equal(
    fs.existsSync(path.resolve(__dirname, '../.github/workflows/update-monorepo.yml')),
    false,
  );
  assert.equal(
    fs.existsSync(
      path.resolve(__dirname, '../.github/workflows/notify-monorepo-subtree-sync.yml'),
    ),
    false,
  );
});
