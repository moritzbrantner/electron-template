const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('desktop renderer includes a theme selector with persistence and navbar mounting', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/renderer.ts'), 'utf8');

  assert.match(source, /desktop-theme/);
  assert.match(source, /Light mode/);
  assert.match(source, /Dark mode/);
  assert.match(source, /Three\.js/);
  assert.match(source, /React Hook Form/);
  assert.match(source, /Uploads/);
  assert.match(source, /Realtime communication/);
  assert.match(source, /Websockets/);
  assert.match(source, /CRDTs/);
  assert.match(source, /route === 'react-hook-form'/);
  assert.match(source, /route === 'three'/);
  assert.match(source, /route === 'uploads'/);
  assert.match(source, /route === 'communication'/);
  assert.match(source, /localStorage\.setItem\(storageKey, theme\)/);
  assert.match(source, /window\.addEventListener\('hashchange', renderApp\)/);
  assert.match(source, /route === 'settings'/);
  assert.match(source, /dialog\.showOpenDialog/);
  assert.match(source, /renderer picker/);
  assert.match(source, /Current upload items/);
  assert.match(source, /getUploadGuide\('desktop'\)/);
});

test('desktop navbar component provides app navigation links', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/navbar.ts'), 'utf8');

  assert.match(source, /navbar__brand/);
  assert.match(source, /Desktop App/);
  assert.match(source, /Home/);
  assert.match(source, /Settings/);
  assert.match(source, /Three\.js/);
  assert.match(source, /React Hook Form/);
  assert.match(source, /Uploads/);
  assert.match(source, /Communication/);
  assert.match(source, /#\/communication/);
  assert.match(source, /#\/uploads/);
  assert.match(source, /#\/react-hook-form/);
  assert.match(source, /#\/three/);
  assert.match(source, /#\/settings/);
  assert.match(source, /is-active/);
});
