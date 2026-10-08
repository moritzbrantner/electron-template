import { wrapMarkdownText } from '../../src/platform/shared/markdown-editing.ts';
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
  assert.equal(
    renderMarkdownPreview('__CODE_TOKEN_0__ and `code`'),
    '<p><strong>CODE_TOKEN_0</strong> and <code>code</code></p>',
  );
  assert.equal(
    renderMarkdownPreview('\uE000INLINE_TOKEN:0\uE001 and `code`'),
    '<p>\uE000INLINE_TOKEN:0\uE001 and <code>code</code></p>',
  );
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

test('code spans never rewrite a link destination', () => {
  assert.match(renderMarkdownPreview('[x](https://example.com/a`b`c)'), /href="https:\/\/example.com\/a`b`c"/);
  assert.equal(renderMarkdownPreview('`[x](https://example.com)`'), '<p><code>[x](https://example.com)</code></p>');
  assert.match(renderMarkdownPreview('[`x`](https://example.com)'), /<a [^>]+><code>x<\/code><\/a>/);
});

test('mixed thematic-break delimiters remain paragraph content', () => {
  for (const content of ['*_*', '-*-', '--_']) {
    assert.doesNotMatch(renderMarkdownPreview(content), /<hr/);
  }
  for (const content of ['---', '***', '___', '- - -']) {
    assert.equal(renderMarkdownPreview(content), '<hr />');
  }
});

test('link insertion preserves bracketed labels and selects the destination', async () => {
  const { insertMarkdownLink } = await import('../../src/platform/shared/markdown-editing.ts');
  for (const label of ['array[index]', 'closing]bracket', 'opening[bracket']) {
    const result = insertMarkdownLink(label, 0, label.length);
    assert.match(
      renderMarkdownPreview(result.content),
      new RegExp(`>${label.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}<\\/a>`),
    );
    assert.equal(result.content.slice(result.selectionStart, result.selectionEnd), 'https://example.com');
  }
});

test('many unmatched link openers remain literal', () => {
  const content = '[label]('.repeat(2000);
  assert.equal(renderMarkdownPreview(content), `<p>${content}</p>`);
});

test('code spans match complete backtick runs and preserve literal backticks', () => {
  assert.equal(renderMarkdownPreview('``a ` b``'), '<p><code>a ` b</code></p>');
  assert.equal(renderMarkdownPreview('`` a ` b ``'), '<p><code>a ` b</code></p>');
  assert.equal(renderMarkdownPreview('`one``two`'), '<p><code>one``two</code></p>');
});

test('escaped emphasis markers stay literal, including link labels', () => {
  assert.equal(renderMarkdownPreview('\\*literal\\* and \\~\\~plain\\~\\~'), '<p>*literal* and ~~plain~~</p>');
  assert.match(renderMarkdownPreview('[\\*literal\\*](https://example.com)'), />\*literal\*<\/a>/);
});

test('paragraphs and quotes distinguish hard and soft line breaks', () => {
  assert.equal(renderMarkdownPreview('first  \nsecond\nthird'), '<p>first<br />second third</p>');
  assert.equal(
    renderMarkdownPreview('> first\n> second  \n> third'),
    '<blockquote><p>first second<br />third</p></blockquote>',
  );
});

test('list items retain indented and lazy continuation lines', () => {
  assert.equal(
    renderMarkdownPreview('- first\n  indented\nlazy\n- second'),
    '<ul><li>first indented lazy</li><li>second</li></ul>',
  );
  assert.equal(
    renderMarkdownPreview('3. first  \n   continuation\n4. second'),
    '<ol start="3"><li>first<br />continuation</li><li>second</li></ol>',
  );
});

test('large nested emphasis renders every delimiter pair', () => {
  const delimiters = '*'.repeat(5000);
  assert.equal(
    renderMarkdownPreview(`${delimiters}x${delimiters}`),
    `<p>${'<strong>'.repeat(2500)}x${'</strong>'.repeat(2500)}</p>`,
  );
});

test('inline links separate optional titles from their destination', () => {
  for (const title of ['"Example"', "'Example'", '(Example)']) {
    assert.equal(
      renderMarkdownPreview(`[site](https://example.com ${title})`),
      '<p><a href="https://example.com" title="Example" target="_blank" rel="noreferrer">site</a></p>',
    );
  }
  assert.match(
    renderMarkdownPreview('[site](<https://example.com> "A & B")'),
    /href="https:\/\/example.com" title="A &amp; B"/,
  );
});

test('underscore emphasis preserves intraword underscores', () => {
  assert.equal(
    renderMarkdownPreview('_italic_ and __bold__ and ___both___'),
    '<p><em>italic</em> and <strong>bold</strong> and <em><strong>both</strong></em></p>',
  );
  assert.equal(renderMarkdownPreview('one_two_three and one__two__three'), '<p>one_two_three and one__two__three</p>');
  assert.equal(renderMarkdownPreview('(_italic_)'), '<p>(<em>italic</em>)</p>');
  assert.equal(renderMarkdownPreview('\\_literal\\_'), '<p>_literal_</p>');
});

test('quoted link titles ignore internal parentheses and decode destination escapes', () => {
  assert.equal(
    renderMarkdownPreview('[site](https://example.com "Version 2)")'),
    '<p><a href="https://example.com" title="Version 2)" target="_blank" rel="noreferrer">site</a></p>',
  );
  assert.equal(
    renderMarkdownPreview('[site](https://example.com "Version (2")'),
    '<p><a href="https://example.com" title="Version (2" target="_blank" rel="noreferrer">site</a></p>',
  );
  assert.match(renderMarkdownPreview('[x](https://example.com/a\\*b\\!c)'), /href="https:\/\/example.com\/a\*b!c"/);
});

test('unmatched inner emphasis delimiters do not block enclosing spans', () => {
  assert.equal(renderMarkdownPreview('*foo _bar*'), '<p><em>foo _bar</em></p>');
  assert.equal(renderMarkdownPreview('*foo **bar*'), '<p><em>foo **bar</em></p>');
  assert.equal(renderMarkdownPreview('*foo _bar* baz_'), '<p><em>foo _bar</em> baz_</p>');
});

test('blank quoted lines separate paragraphs inside one blockquote', () => {
  assert.equal(renderMarkdownPreview('> First\n>\n> Second'), '<blockquote><p>First</p><p>Second</p></blockquote>');
});

test('non-one ordered starts require a block boundary after prose', () => {
  assert.equal(renderMarkdownPreview('The finalists are\n2. Alice'), '<p>The finalists are 2. Alice</p>');
  assert.equal(
    renderMarkdownPreview('The finalists are\n\n2. Alice'),
    '<p>The finalists are</p><ol start="2"><li>Alice</li></ol>',
  );
  assert.equal(
    renderMarkdownPreview('The finalists are\n1. Alice'),
    '<p>The finalists are</p><ol start="1"><li>Alice</li></ol>',
  );
});

test('link labels treat unmatched code-span brackets as literal content', () => {
  assert.equal(
    renderMarkdownPreview('[foo `]` bar](https://example.com)'),
    '<p><a href="https://example.com" target="_blank" rel="noreferrer">foo <code>]</code> bar</a></p>',
  );
});

test('deep blockquotes render without recursive stack growth', () => {
  const depth = 50000;
  assert.equal(
    renderMarkdownPreview('>'.repeat(depth) + ' text'),
    '<blockquote>'.repeat(depth) + '<p>text</p>' + '</blockquote>'.repeat(depth),
  );
  assert.equal(
    renderMarkdownPreview('> ```\n> > literal code\n> ```'),
    '<blockquote><pre class="markdown-code-block"><code>&gt; literal code</code></pre></blockquote>',
  );
});

test('toolbar emphasis leaves selected whitespace outside the delimiters', () => {
  for (const marker of ['*', '**']) {
    for (const selected of ['word ', ' word', '\tword \n']) {
      const wrapped = wrapMarkdownText(selected, 0, selected.length, marker, marker, 'fallback');
      assert.equal(wrapped.content.slice(wrapped.selectionStart, wrapped.selectionEnd), 'word');
      assert.match(
        renderMarkdownPreview(wrapped.content),
        marker === '**' ? /<strong>word<\/strong>/ : /<em>word<\/em>/,
      );
    }
  }
});

test('indented lists remain child blocks of their parent item', () => {
  assert.equal(renderMarkdownPreview('- Parent\n  - Child'), '<ul><li>Parent<ul><li>Child</li></ul></li></ul>');
  assert.equal(
    renderMarkdownPreview('1. Parent\n   1. Child'),
    '<ol start="1"><li>Parent<ol start="1"><li>Child</li></ol></li></ol>',
  );
  assert.equal(
    renderMarkdownPreview('- Parent\n  1. Child\n- Sibling'),
    '<ul><li>Parent<ol start="1"><li>Child</li></ol></li><li>Sibling</li></ul>',
  );
});

test('blockquote paragraphs consume lazy continuation without crossing block boundaries', () => {
  assert.equal(
    renderMarkdownPreview('> quoted text\ncontinuation'),
    '<blockquote><p>quoted text continuation</p></blockquote>',
  );
  assert.equal(
    renderMarkdownPreview('> quoted text\n\noutside'),
    '<blockquote><p>quoted text</p></blockquote><p>outside</p>',
  );
  assert.equal(
    renderMarkdownPreview('> quoted text\n# Outside'),
    '<blockquote><p>quoted text</p></blockquote><h1>Outside</h1>',
  );
});

test('setext underlines form headings while standalone thematic breaks remain rules', () => {
  assert.equal(renderMarkdownPreview('Section title\n---'), '<h2>Section title</h2>');
  assert.equal(renderMarkdownPreview('Section title\n==='), '<h1>Section title</h1>');
  assert.equal(renderMarkdownPreview('First line\nsecond line\n---'), '<h2>First line second line</h2>');
  assert.equal(renderMarkdownPreview('---'), '<hr />');
});
