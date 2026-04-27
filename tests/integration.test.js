const { test } = require('bun:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('desktop main window hides the default menu bar', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/main.ts'), 'utf8');

  assert.match(source, /autoHideMenuBar:\s*true/);
  assert.match(source, /loadDesktopPreferencesForLaunch/);
  assert.match(source, /app\.disableHardwareAcceleration\(\)/);
});

test('desktop main process composes the reusable platform layer', () => {
  const mainSource = fs.readFileSync(path.resolve(__dirname, '../src/main.ts'), 'utf8');
  const platformSource = fs.readFileSync(
    path.resolve(__dirname, '../src/platform/main/create-desktop-platform.ts'),
    'utf8',
  );

  assert.match(mainSource, /createDesktopPlatform/);
  assert.match(mainSource, /platform\.windowState\.getState\('main'\)/);
  assert.match(mainSource, /platform\.documents\.confirmBeforeClose/);
  assert.match(platformSource, /createJsonStore/);
  assert.match(platformSource, /createPreferencesService/);
  assert.match(platformSource, /createDocumentsService/);
  assert.match(platformSource, /createUploadsService/);
  assert.match(platformSource, /createCommandsService/);
  assert.match(platformSource, /createWindowStateManager/);
  assert.match(platformSource, /CmdOrCtrl\+,/);
  assert.match(platformSource, /CmdOrCtrl\+S/);
  assert.match(platformSource, /uploads\.installIpc/);
  assert.match(platformSource, /commands\.applyMenuState/);
  assert.match(platformSource, /commands\.refreshApplicationMenu/);
});

test('desktop smoke coverage uses the renamed smoke e2e suite', () => {
  const packageSource = fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8');
  const smokeSource = fs.readFileSync(path.resolve(__dirname, '../e2e/desktop-smoke.e2e.ts'), 'utf8');

  assert.match(packageSource, /desktop-smoke\.e2e\.ts/);
  assert.match(smokeSource, /desktop smoke/i);
  assert.equal(fs.existsSync(path.resolve(__dirname, '../e2e/example.e2e.ts')), false);
});
