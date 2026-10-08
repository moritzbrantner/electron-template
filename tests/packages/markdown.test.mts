import assert from 'node:assert/strict';
import { test } from 'bun:test';
import { desktopDocumentSerializer } from '../../src/platform/shared/document-serializer.ts';
import { renderMarkdownPreview } from '../../src/platform/shared/markdown-preview.ts';

test('legacy documents reopen their content and retain their format on save', () => {
  const filePath = '/tmp/notes.desktop.json';
  const content = '# Legacy notes\n';
  assert.equal(
    desktopDocumentSerializer.deserialize(JSON.stringify({ content, version: 1 }), filePath).content,
    content,
  );
  const saved = desktopDocumentSerializer.serialize({ content: '# Edited legacy\n' }, filePath);
  assert.equal(JSON.parse(saved).content, '# Edited legacy\n');
  assert.equal(desktopDocumentSerializer.deserialize(saved, filePath).content, '# Edited legacy\n');
  assert.equal(desktopDocumentSerializer.serialize({ content }, '/tmp/notes.md'), content);
});

test('Markdown link queries are escaped once and unsafe schemes stay unlinked', () => {
  const html = renderMarkdownPreview('[search](https://example.com/?a=1&b=2)');
  assert.match(html, /href="https:\/\/example\.com\/\?a=1&amp;b=2"/);
  assert.doesNotMatch(html, /amp;amp/);
  assert.doesNotMatch(renderMarkdownPreview('[unsafe](javascript:alert)'), /<a /);
  assert.match(renderMarkdownPreview('[quote](https://example.com/?a="value")'), /&quot;value&quot;/);
});

test('inline formatting preserves link destinations and literal token-like text', () => {
  assert.match(renderMarkdownPreview('[x](https://example.com/a*b*c)'), /href="https:\/\/example.com\/a\*b\*c"/);
  assert.equal(renderMarkdownPreview('__CODE_TOKEN_0__ and `code`'), '<p>__CODE_TOKEN_0__ and <code>code</code></p>');
});

test('ordered list previews retain their starting number', () => {
  assert.equal(
    renderMarkdownPreview('3. Third item\n4. Fourth item'),
    '<ol start="3"><li>Third item</li><li>Fourth item</li></ol>',
  );
});

test('code fences occupy their own lines around nonempty text', async () => {
  const { insertCodeFence } = await import('../../src/platform/shared/markdown-editing.ts');
  const inserted = insertCodeFence('before after', 7, 7);
  assert.equal(inserted.content, 'before \n```\ncode block\n```\nafter');
  assert.match(renderMarkdownPreview(inserted.content), /<code>code block<\/code>/);
  assert.equal(inserted.content.slice(inserted.selectionStart, inserted.selectionEnd), 'code block');
});

test('external link handling denies child windows and unsafe protocols', async () => {
  const { createExternalLinkHandler } = await import('../../src/platform/main/external-links.ts');
  const opened: string[] = [];
  const handler = createExternalLinkHandler(async (url) => {
    opened.push(url);
  });
  for (const url of ['https://example.com/?a=1&b=2', 'mailto:reader@example.com']) {
    assert.equal(handler({ url }).action, 'deny');
  }
  for (const url of [
    'javascript:alert(1)',
    'file:///etc/passwd',
    'data:text/html,test',
    'custom:open',
    'https://user:pass@example.com',
    'not a URL',
  ]) {
    assert.equal(handler({ url }).action, 'deny');
  }
  assert.deepEqual(opened, ['https://example.com/?a=1&b=2', 'mailto:reader@example.com']);
});

test('generic JSON legacy documents preserve their payload on save', () => {
  const path = '/tmp/legacy.json';
  const loaded = desktopDocumentSerializer.deserialize('{"content":"Legacy","version":1}', path);
  assert.equal(loaded.content, 'Legacy');
  assert.equal(JSON.parse(desktopDocumentSerializer.serialize({ content: 'Edited' }, path)).content, 'Edited');
});

test('Markdown content survives an exact save/reopen round trip', () => {
  for (const content of ['hello', 'hello\n', '', 'hello\r\nworld']) {
    const saved = desktopDocumentSerializer.serialize({ content }, '/tmp/notes.md');
    assert.equal(desktopDocumentSerializer.deserialize(saved, '/tmp/notes.md').content, content);
  }
});

test('preview preserves balanced link destination parentheses', () => {
  assert.equal(
    renderMarkdownPreview('[Function](https://en.wikipedia.org/wiki/Function_(mathematics))'),
    '<p><a href="https://en.wikipedia.org/wiki/Function_(mathematics)" target="_blank" rel="noreferrer">Function</a></p>',
  );
});

test('preview renders nested toolbar emphasis', () => {
  assert.equal(renderMarkdownPreview('**bold and *italic***'), '<p><strong>bold and <em>italic</em></strong></p>');
  assert.equal(renderMarkdownPreview('*italic and **bold***'), '<p><em>italic and <strong>bold</strong></em></p>');
  assert.equal(renderMarkdownPreview('***both***'), '<p><em><strong>both</strong></em></p>');
});

test('code insertion encloses embedded backtick fences', async () => {
  const { insertCodeFence } = await import('../../src/platform/shared/markdown-editing.ts');
  const content = '```js\nconst x = 1;\n```\n````';
  const result = insertCodeFence(content, 0, content.length);
  assert.match(result.content, /^`````\n/);
  assert.equal(renderMarkdownPreview(result.content), `<pre class="markdown-code-block"><code>${content}</code></pre>`);
});

test('block toolbar insertion prefixes whole selected lines', async () => {
  const { prefixMarkdownLines } = await import('../../src/platform/shared/markdown-editing.ts');
  for (const prefix of ['# ', '- ', '> ']) {
    const result = prefixMarkdownLines('hello world\nnext', 5, 5, prefix, 'fallback');
    assert.equal(result.content, `${prefix}hello world\nnext`);
    assert.equal(result.content.slice(result.selectionStart, result.selectionEnd), `${prefix}hello world`);
  }
  assert.equal(prefixMarkdownLines('one\ntwo\nthree', 2, 6, '> ', 'fallback').content, '> one\n> two\nthree');
});
