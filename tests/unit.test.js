const { test } = require('bun:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('desktop renderer uses the preload-backed desktop platform APIs', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/renderer.ts'), 'utf8');

  assert.match(source, /window\.desktop\.preferences\.getAll\(\)/);
  assert.match(source, /window\.desktop\.documents\.getState\(\)/);
  assert.match(source, /window\.desktop\.uploads\.getState\(\)/);
  assert.match(source, /window\.desktop\.uploads\.pickFiles\(\)/);
  assert.match(source, /window\.desktop\.uploads\.addDroppedFiles/);
  assert.match(source, /window\.desktop\.uploads\.startAll\(\)/);
  assert.match(source, /window\.desktop\.uploads\.retryUpload/);
  assert.match(source, /document\.save/);
  assert.match(source, /route === 'documents'/);
  assert.match(source, /route === 'uploads'/);
  assert.match(source, /System theme/);
  assert.match(source, /Light mode/);
  assert.match(source, /Dark mode/);
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
  assert.match(source, /Home/);
  assert.match(source, /Settings/);
  assert.match(source, /Documents/);
  assert.match(source, /Uploads/);
  assert.match(source, /#\/documents/);
  assert.match(source, /#\/uploads/);
  assert.match(source, /#\/settings/);
  assert.match(source, /is-active/);
});
