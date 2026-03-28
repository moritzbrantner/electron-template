const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('desktop main window hides the default menu bar', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/main.ts'), 'utf8');

  assert.match(source, /autoHideMenuBar:\s*true/);
});

test('desktop main window skips DevTools during Playwright e2e runs', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/main.ts'), 'utf8');

  assert.match(source, /process\.env\.PLAYWRIGHT_E2E !== '1'/);
  assert.match(source, /typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined'/);
  assert.match(source, /typeof MAIN_WINDOW_VITE_NAME !== 'undefined'/);
});
