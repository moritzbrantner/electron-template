const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('desktop main window hides the default menu bar', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/main.ts'), 'utf8');

  assert.match(source, /autoHideMenuBar:\s*true/);
});
