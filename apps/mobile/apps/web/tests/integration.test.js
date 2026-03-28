import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('web navigation groups library and personal destinations', () => {
  const source = readFileSync(new URL('../app/site-nav.tsx', import.meta.url), 'utf8');

  assert.match(source, /Libraries/);
  assert.match(source, /Communication/);
  assert.match(source, /Personal/);
  assert.match(source, /href=\{`\/profile\/@\$\{currentUser\.username\}`\}/);
  assert.match(source, /href="\/communication#websockets"/);
  assert.match(source, /href="\/communication#crdts"/);
  assert.match(source, /href="\/settings"/);
  assert.match(source, /href="\/three"/);
  assert.match(source, /href="\/react-hook-form"/);
  assert.match(source, /href="\/uploads"/);
  assert.match(source, /Websockets/);
  assert.match(source, /CRDTs/);
  assert.match(source, /Uploads/);
  assert.match(source, /Forms/);
});
