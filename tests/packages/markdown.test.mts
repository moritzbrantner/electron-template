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
  assert.equal(renderMarkdownPreview('*foo **bar*'), '<p>*foo *<em>bar</em></p>');
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
      if (selected.startsWith('\t')) {
        assert.equal(
          renderMarkdownPreview(wrapped.content),
          `<pre class="markdown-code-block"><code>${marker}word${marker} </code></pre>`,
        );
        continue;
      }
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

test('non-one ordered markers remain lazy list-item paragraph continuations', () => {
  assert.equal(renderMarkdownPreview('- The finalists are\n2. Alice'), '<ul><li>The finalists are 2. Alice</li></ul>');
  assert.equal(
    renderMarkdownPreview('- The finalists are\n1. Alice'),
    '<ul><li>The finalists are</li></ul><ol start="1"><li>Alice</li></ol>',
  );
});

test('changing unordered bullet markers starts separate lists', () => {
  assert.equal(
    renderMarkdownPreview('- first\n+ second\n* third'),
    '<ul><li>first</li></ul><ul><li>second</li></ul><ul><li>third</li></ul>',
  );
  assert.equal(renderMarkdownPreview('- first\n- second'), '<ul><li>first</li><li>second</li></ul>');
});

test('angle-bracket link destinations allow literal unbalanced parentheses', () => {
  for (const path of ['a(b', 'a)b', 'a(b)c']) {
    assert.equal(
      renderMarkdownPreview(`[x](<https://example.com/${path}>)`),
      `<p><a href="https://example.com/${path}" target="_blank" rel="noreferrer">x</a></p>`,
    );
  }
});

test('lazy list continuation only follows an active paragraph', () => {
  assert.equal(
    renderMarkdownPreview('- # Heading\n2. item'),
    '<ul><li><h1>Heading</h1></li></ul><ol start="2"><li>item</li></ol>',
  );
  assert.equal(
    renderMarkdownPreview('- ```\n  code\n  ```\n2. item'),
    '<ul><li><pre class="markdown-code-block"><code>code</code></pre></li></ul><ol start="2"><li>item</li></ol>',
  );
});

test('ATX headings strip closing hash sequences without changing literal hashes', () => {
  assert.equal(renderMarkdownPreview('# Section #'), '<h1>Section</h1>');
  assert.equal(renderMarkdownPreview('## Section ###  '), '<h2>Section</h2>');
  assert.equal(renderMarkdownPreview('# C#'), '<h1>C#</h1>');
  assert.equal(renderMarkdownPreview('# Section \\#'), '<h1>Section #</h1>');
});

test('code fences close with up to three leading spaces', () => {
  for (const indentation of ['', ' ', '  ', '   ']) {
    assert.equal(
      renderMarkdownPreview('```\ncode\n' + indentation + '```\n# After'),
      '<pre class="markdown-code-block"><code>code</code></pre><h1>After</h1>',
    );
  }
  assert.match(renderMarkdownPreview('```\ncode\n    ```\n# After'), /<code>code\n    ```\n# After<\/code>/);
});

test('nested list chains materialize only a bounded multiple of the input', () => {
  const depth = 2000;
  const markdown = '- '.repeat(depth) + 'x';
  const originalSplit = String.prototype.split;
  let copiedCharacters = 0;
  let html: string;
  try {
    String.prototype.split = new Proxy(originalSplit, {
      apply(target, receiver, args) {
        if (args[0] === '\n') copiedCharacters += String(receiver).length;
        return Reflect.apply(target, receiver, args);
      },
    });
    html = renderMarkdownPreview(markdown);
  } finally {
    String.prototype.split = originalSplit;
  }
  assert.equal(html, '<ul><li>'.repeat(depth) + 'x' + '</li></ul>'.repeat(depth));
  assert.ok(copiedCharacters <= markdown.length * 8, 'nested lists repeatedly materialize the remaining input');
  assert.equal(renderMarkdownPreview('- - ***'), '<ul><li><ul><li><hr /></li></ul></li></ul>');
  assert.equal(renderMarkdownPreview('- * * *'), '<ul><li><hr /></li></ul>');
});

test('opening code fences allow up to three leading spaces and dedent their content', () => {
  for (const indentation of ['', ' ', '  ', '   ']) {
    assert.equal(
      renderMarkdownPreview(indentation + '```js\ncode\n' + indentation + '```'),
      '<pre class="markdown-code-block" data-language="js"><code>code</code></pre>',
    );
  }
  assert.equal(
    renderMarkdownPreview('  ```\n  code\n  ```'),
    '<pre class="markdown-code-block"><code>code</code></pre>',
  );
});

test('emphasis pairing follows the rule of three for dual-purpose runs', () => {
  assert.equal(renderMarkdownPreview('*foo**bar*'), '<p><em>foo**bar</em></p>');
  assert.equal(renderMarkdownPreview('**foo*bar**'), '<p><strong>foo*bar</strong></p>');
  assert.equal(renderMarkdownPreview('a***b***c'), '<p>a<em><strong>b</strong></em>c</p>');
});

test('ordered lists accept parenthesized markers and keep one delimiter per list', () => {
  assert.equal(renderMarkdownPreview('1) First\n2) Second'), '<ol start="1"><li>First</li><li>Second</li></ol>');
  assert.equal(
    renderMarkdownPreview('1. First\n2) Second'),
    '<ol start="1"><li>First</li></ol><ol start="2"><li>Second</li></ol>',
  );
  assert.equal(renderMarkdownPreview('Text\n1) First'), '<p>Text</p><ol start="1"><li>First</li></ol>');
  assert.equal(renderMarkdownPreview('Text\n2) Second'), '<p>Text 2) Second</p>');
});

test('tilde fences preserve code, matching closers, and nested block context', () => {
  assert.equal(
    renderMarkdownPreview('~~~js\ncode\n~~~'),
    '<pre class="markdown-code-block" data-language="js"><code>code</code></pre>',
  );
  assert.equal(renderMarkdownPreview('~~~\n```\n~~~'), '<pre class="markdown-code-block"><code>```</code></pre>');
  assert.equal(renderMarkdownPreview('```\n~~~\n```'), '<pre class="markdown-code-block"><code>~~~</code></pre>');
  assert.equal(
    renderMarkdownPreview('> ~~~\n> code\n> ~~~\noutside'),
    '<blockquote><pre class="markdown-code-block"><code>code</code></pre></blockquote><p>outside</p>',
  );
  assert.equal(
    renderMarkdownPreview('- ~~~\n  code\n  ~~~\noutside'),
    '<ul><li><pre class="markdown-code-block"><code>code</code></pre></li></ul><p>outside</p>',
  );
  assert.equal(
    renderMarkdownPreview('~~~ a`b\ncode\n~~~~'),
    '<pre class="markdown-code-block" data-language="a`b"><code>code</code></pre>',
  );
});

test('ATX headings allow up to three spaces before their marker', () => {
  for (let indent = 0; indent <= 3; indent += 1) {
    assert.equal(renderMarkdownPreview(`${' '.repeat(indent)}# Heading`), '<h1>Heading</h1>');
    assert.equal(renderMarkdownPreview(`paragraph\n${' '.repeat(indent)}## Next`), '<p>paragraph</p><h2>Next</h2>');
  }
});

test('empty list items remain in their surrounding ordered and unordered lists', () => {
  assert.equal(renderMarkdownPreview('-\n- item'), '<ul><li></li><li>item</li></ul>');
  assert.equal(renderMarkdownPreview('1.\n2. item'), '<ol start="1"><li></li><li>item</li></ol>');
  assert.equal(renderMarkdownPreview('3)\n4) item'), '<ol start="3"><li></li><li>item</li></ol>');
  assert.equal(renderMarkdownPreview('+'), '<ul><li></li></ul>');
});

test('character references render as text while code and escaped references remain literal', () => {
  assert.equal(
    renderMarkdownPreview('Copyright &copy; 2026 &#38; &#x26;'),
    '<p>Copyright &copy; 2026 &#38; &#x26;</p>',
  );
  assert.equal(
    renderMarkdownPreview('&lt;script&gt;alert(1)&lt;/script&gt;'),
    '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
  );
  assert.equal(renderMarkdownPreview('`&copy;` \\&copy;'), '<p><code>&amp;copy;</code> &amp;copy;</p>');
  assert.equal(renderMarkdownPreview('&ast;literal&ast;'), '<p>&ast;literal&ast;</p>');
});

test('angle-bracket URI and email autolinks retain the existing safe scheme policy', () => {
  assert.equal(
    renderMarkdownPreview('<https://example.com>'),
    '<p><a href="https://example.com" target="_blank" rel="noreferrer">https://example.com</a></p>',
  );
  assert.equal(
    renderMarkdownPreview('<reader@example.com>'),
    '<p><a href="mailto:reader@example.com" target="_blank" rel="noreferrer">reader@example.com</a></p>',
  );
  assert.equal(renderMarkdownPreview('`<https://example.com>`'), '<p><code>&lt;https://example.com&gt;</code></p>');
  assert.doesNotMatch(renderMarkdownPreview('<javascript:alert(1)> <data:text/html,test>'), /<a /u);
  assert.doesNotMatch(renderMarkdownPreview('&lt;https://example.com&gt;'), /<a /u);
});

test('a marker-only list item with indented content stays tight until a real separator', () => {
  assert.equal(renderMarkdownPreview('-\n  child'), '<ul><li>child</li></ul>');
  assert.equal(renderMarkdownPreview('1.\n   child'), '<ol start="1"><li>child</li></ol>');
  assert.equal(renderMarkdownPreview('-\n\n  child'), '<ul><li></li></ul><p>child</p>');
});

test('blockquote markers accept up to three spaces including nested and continued quotes', () => {
  for (let indent = 0; indent <= 3; indent += 1) {
    assert.equal(renderMarkdownPreview(`${' '.repeat(indent)}> quoted`), '<blockquote><p>quoted</p></blockquote>');
    assert.equal(
      renderMarkdownPreview(`paragraph\n${' '.repeat(indent)}> quoted`),
      '<p>paragraph</p><blockquote><p>quoted</p></blockquote>',
    );
  }
  assert.equal(
    renderMarkdownPreview('   >   > nested'),
    '<blockquote><blockquote><p>nested</p></blockquote></blockquote>',
  );
  assert.equal(renderMarkdownPreview('> first\n   > second'), '<blockquote><p>first second</p></blockquote>');
});

test('list markers accept up to three spaces without losing their content indentation', () => {
  for (let indent = 0; indent <= 3; indent += 1) {
    const prefix = ' '.repeat(indent);
    assert.equal(renderMarkdownPreview(`${prefix}- one\n${prefix}- two`), '<ul><li>one</li><li>two</li></ul>');
    assert.equal(
      renderMarkdownPreview(`${prefix}1. one\n${prefix}2. two`),
      '<ol start="1"><li>one</li><li>two</li></ol>',
    );
    assert.equal(renderMarkdownPreview(`${prefix}-\n${' '.repeat(indent + 2)}child`), '<ul><li>child</li></ul>');
  }
});

test('standalone CR and CRLF line endings preserve the same blocks as LF', () => {
  const source = '# Heading\n\n- one\n- two\n';
  const expected = renderMarkdownPreview(source);
  assert.equal(renderMarkdownPreview(source.replaceAll('\n', '\r')), expected);
  assert.equal(renderMarkdownPreview(source.replaceAll('\n', '\r\n')), expected);
});

test('angle destinations skip escaped closing brackets', () => {
  assert.equal(
    renderMarkdownPreview('[x](<https://example.com/a\\>b>)'),
    '<p><a href="https://example.com/a&gt;b" target="_blank" rel="noreferrer">x</a></p>',
  );
  assert.equal(
    renderMarkdownPreview('[x](<https://example.com/a\\>b(c)>)'),
    '<p><a href="https://example.com/a&gt;b(c)" target="_blank" rel="noreferrer">x</a></p>',
  );
});

test('indented blocks preserve code and literal Markdown markers', () => {
  assert.equal(
    renderMarkdownPreview('    ---\n    code'),
    '<pre class="markdown-code-block"><code>---\ncode</code></pre>',
  );
  assert.equal(
    renderMarkdownPreview('    first\n\n    second\n\nparagraph'),
    '<pre class="markdown-code-block"><code>first\n\nsecond</code></pre><p>paragraph</p>',
  );
  assert.equal(renderMarkdownPreview('paragraph\n    continuation'), '<p>paragraph continuation</p>');
});

test('ordered markers contain at most nine digits in every context', () => {
  assert.equal(renderMarkdownPreview('1234567890. item'), '<p>1234567890. item</p>');
  assert.equal(renderMarkdownPreview('123456789. item'), '<ol start="123456789"><li>item</li></ol>');
  assert.equal(renderMarkdownPreview('- 1234567890. item'), '<ul><li>1234567890. item</li></ul>');
  assert.equal(
    renderMarkdownPreview('1. first\n1234567890. next'),
    '<ol start="1"><li>first 1234567890. next</li></ol>',
  );
});

test('nested blockquotes do not pull outer lazy paragraphs into inner quotes', () => {
  assert.equal(
    renderMarkdownPreview('> > paragraph\ncontinuation'),
    '<blockquote><blockquote><p>paragraph</p></blockquote></blockquote><p>continuation</p>',
  );
  assert.equal(
    renderMarkdownPreview('> > paragraph\n> continuation'),
    '<blockquote><blockquote><p>paragraph continuation</p></blockquote></blockquote>',
  );
});

test('code toolbar reuses selected boundary newlines', async () => {
  const { insertCodeFence } = await import('../../src/platform/shared/markdown-editing.ts');
  for (const source of ['code\n', '\ncode', '\ncode\n']) {
    const result = insertCodeFence(source, 0, source.length);
    assert.equal(result.content, '```\ncode\n```');
    assert.equal(result.content.slice(result.selectionStart, result.selectionEnd), 'code');
  }
});

test('triple emphasis adapts its nesting to later closers', () => {
  assert.equal(renderMarkdownPreview('***foo* bar**'), '<p><strong><em>foo</em> bar</strong></p>');
  assert.equal(renderMarkdownPreview('***foo** bar*'), '<p><em><strong>foo</strong> bar</em></p>');
  assert.equal(renderMarkdownPreview('***foo***'), '<p><em><strong>foo</strong></em></p>');
});

test('blank list items cannot interrupt an existing paragraph', () => {
  for (const marker of ['+', '*', '1.', '1)'])
    assert.equal(renderMarkdownPreview(`paragraph\n${marker}   `), `<p>paragraph ${marker}   </p>`);
  assert.equal(renderMarkdownPreview('paragraph\n-   '), '<h2>paragraph</h2>');
  assert.equal(renderMarkdownPreview('paragraph\n\n+   '), '<p>paragraph</p><ul><li></li></ul>');
});

test('escaped punctuation retains its emphasis flanking classification', () => {
  assert.equal(renderMarkdownPreview('_foo_\\! _foo_\\.'), '<p><em>foo</em>! <em>foo</em>.</p>');
  assert.equal(renderMarkdownPreview('\\!_foo_'), '<p>!<em>foo</em></p>');
});

test('excess list padding belongs to indented code content', () => {
  assert.equal(
    renderMarkdownPreview('-     foo'),
    '<ul><li><pre class="markdown-code-block"><code>foo</code></pre></li></ul>',
  );
  assert.equal(
    renderMarkdownPreview('1.     foo'),
    '<ol start="1"><li><pre class="markdown-code-block"><code>foo</code></pre></li></ol>',
  );
  assert.equal(
    renderMarkdownPreview('- -     foo'),
    '<ul><li><ul><li><pre class="markdown-code-block"><code>foo</code></pre></li></ul></li></ul>',
  );
  assert.equal(
    renderMarkdownPreview('-     foo\n  outside'),
    '<ul><li><pre class="markdown-code-block"><code>foo</code></pre>outside</li></ul>',
  );
});

test('indented quote code cannot lazily absorb outside prose', () => {
  assert.equal(
    renderMarkdownPreview('>     code\noutside'),
    '<blockquote><pre class="markdown-code-block"><code>code</code></pre></blockquote><p>outside</p>',
  );
  assert.equal(
    renderMarkdownPreview('>     code\n>     next\noutside'),
    '<blockquote><pre class="markdown-code-block"><code>code\nnext</code></pre></blockquote><p>outside</p>',
  );
  assert.equal(
    renderMarkdownPreview('-     code\noutside'),
    '<ul><li><pre class="markdown-code-block"><code>code</code></pre></li></ul><p>outside</p>',
  );
});

test('four-space thematic markers remain paragraph continuations', () => {
  for (const marker of ['---', '***', '___'])
    assert.equal(renderMarkdownPreview(`paragraph\n    ${marker}`), `<p>paragraph ${marker}</p>`);
  assert.equal(renderMarkdownPreview('paragraph\n   ***'), '<p>paragraph</p><hr />');
});

test('tab-padded list content uses visual continuation columns', () => {
  assert.equal(
    renderMarkdownPreview('-\tfoo\n  ```\n  bar\n  ```'),
    '<ul><li>foo</li></ul><pre class="markdown-code-block"><code>bar</code></pre>',
  );
  assert.equal(renderMarkdownPreview('-\tfoo\n\tbar'), '<ul><li>foo bar</li></ul>');
});

test('protected inline markup retains source punctuation for emphasis', () => {
  assert.equal(
    renderMarkdownPreview('_foo_[bar](https://x)'),
    '<p><em>foo</em><a href="https://x" target="_blank" rel="noreferrer">bar</a></p>',
  );
  assert.equal(renderMarkdownPreview('_foo_`bar`'), '<p><em>foo</em><code>bar</code></p>');
  assert.equal(
    renderMarkdownPreview('_foo_<https://x>'),
    '<p><em>foo</em><a href="https://x" target="_blank" rel="noreferrer">https://x</a></p>',
  );
  assert.equal(renderMarkdownPreview('`bar`_foo_'), '<p><code>bar</code><em>foo</em></p>');
  assert.equal(
    renderMarkdownPreview('[_foo_\\!](https://x)'),
    '<p><a href="https://x" target="_blank" rel="noreferrer"><em>foo</em>!</a></p>',
  );
});

test('indented changes of ordered delimiter close the previous list', () => {
  assert.equal(
    renderMarkdownPreview('1. foo\n  2) bar'),
    '<ol start="1"><li>foo</li></ol><ol start="2"><li>bar</li></ol>',
  );
});

test('inner explicit links leave enclosing link syntax literal', () => {
  assert.equal(
    renderMarkdownPreview('[outer [inner](https://inner)](https://outer)'),
    '<p>[outer <a href="https://inner" target="_blank" rel="noreferrer">inner</a>](https://outer)</p>',
  );
  assert.equal(
    renderMarkdownPreview('[outer [literal]](https://outer)'),
    '<p><a href="https://outer" target="_blank" rel="noreferrer">outer [literal]</a></p>',
  );
});

test('fenced code preserves literal leading tabs', () => {
  assert.equal(renderMarkdownPreview('~~~\n\tfoo\n~~~'), '<pre class="markdown-code-block"><code>\tfoo</code></pre>');
});

test('angle destinations allow spaces but reject line endings and unescaped angles', () => {
  assert.match(renderMarkdownPreview('[x](<https://example.com/a b>)'), /<a /);
  assert.doesNotMatch(renderMarkdownPreview('[x](<https://example.com/a\nb>)'), /<a /);
  assert.doesNotMatch(renderMarkdownPreview('[x](<https://example.com/a<b>)'), /<a /);
});

test('indented paragraph continuations preserve quote and list lazy state', () => {
  assert.equal(
    renderMarkdownPreview('> first\n>     second\nthird'),
    '<blockquote><p>first second third</p></blockquote>',
  );
  assert.equal(renderMarkdownPreview('- first\n      second\nthird'), '<ul><li>first second third</li></ul>');
});

test('non-ASCII spaces remain paragraph content', () => {
  for (const space of ['\u00a0', '\u2003']) {
    assert.equal(renderMarkdownPreview(`hello\n${space}\nworld`), `<p>hello ${space} world</p>`);
    assert.equal(renderMarkdownPreview(`${space}hello`), `<p>${space}hello</p>`);
  }
});

test('quote marker tabs retain unconsumed indentation columns', () => {
  assert.equal(
    renderMarkdownPreview('>\t  code'),
    '<blockquote><pre class="markdown-code-block"><code>code</code></pre></blockquote>',
  );
});

test('link titles reject unescaped interior matching delimiters', () => {
  for (const title of ['"a"b"', "'a'b'", '(a)b)'])
    assert.doesNotMatch(renderMarkdownPreview(`[x](https://example.com ${title})`), /<a /);
  assert.match(renderMarkdownPreview('[x](https://example.com "a\\"b")'), /<a /);
});

test('nested list tabs use the original line column', () => {
  assert.equal(renderMarkdownPreview('- -\t  x'), '<ul><li><ul><li>x</li></ul></li></ul>');
});

test('character references retain source delimiter flanking', () => {
  assert.equal(renderMarkdownPreview('&#65;_foo_'), '<p>&#65;<em>foo</em></p>');
  assert.equal(renderMarkdownPreview('_foo_&#65;'), '<p><em>foo</em>&#65;</p>');
});

test('reference links resolve full collapsed and shortcut labels', () => {
  assert.equal(
    renderMarkdownPreview('[guide][DOCS]\n\n[docs]: https://example.com "Guide"'),
    '<p><a href="https://example.com" title="Guide" target="_blank" rel="noreferrer">guide</a></p>',
  );
  assert.equal(
    renderMarkdownPreview('[docs][] [docs]\n\n[docs]: https://example.com'),
    '<p><a href="https://example.com" target="_blank" rel="noreferrer">docs</a> <a href="https://example.com" target="_blank" rel="noreferrer">docs</a></p>',
  );
  assert.doesNotMatch(renderMarkdownPreview('[unsafe]\n\n[unsafe]: javascript:alert(1)'), /<a /);
  assert.equal(renderMarkdownPreview('[missing]'), '<p>[missing]</p>');
});

test('reference definitions inside code remain literal', () => {
  assert.equal(
    renderMarkdownPreview('[docs]\n\n~~~\n[docs]: https://example.com\n~~~'),
    '<p>[docs]</p><pre class="markdown-code-block"><code>[docs]: https://example.com</code></pre>',
  );
});

test('nested blank lines keep the enclosing list tight', () => {
  assert.equal(
    renderMarkdownPreview('- ```\n  a\n\n  b\n  ```\n- c'),
    '<ul><li><pre class="markdown-code-block"><code>a\n\nb</code></pre></li><li>c</li></ul>',
  );
  assert.equal(
    renderMarkdownPreview('- - a\n\n  - b\n- c'),
    '<ul><li><ul><li><p>a</p></li><li><p>b</p></li></ul></li><li>c</li></ul>',
  );
});

test('reference definitions use the first definition and span line breaks', () => {
  assert.equal(
    renderMarkdownPreview(
      '[guide][  Some   Docs ]\n\n[Some Docs]:\n  https://example.com\n  "Guide"\n\n[Some Docs]: https://other.example',
    ),
    '<p><a href="https://example.com" title="Guide" target="_blank" rel="noreferrer">guide</a></p>',
  );
  assert.equal(
    renderMarkdownPreview('[docs]\n\n> [docs]: https://example.com'),
    '<p><a href="https://example.com" target="_blank" rel="noreferrer">docs</a></p><blockquote></blockquote>',
  );
});

test('reference definitions reject unbalanced bare destinations', () => {
  assert.doesNotMatch(renderMarkdownPreview('[doc]\n\n[doc]: https://example.com/('), /<a /);
  assert.match(
    renderMarkdownPreview('[doc]\n\n[doc]: https://example.com/a(b)'),
    /href="https:\/\/example.com\/a\(b\)"/,
  );
  assert.match(
    renderMarkdownPreview('[doc]\n\n[doc]: https://example.com/a\\(b'),
    /href="https:\/\/example.com\/a\(b"/,
  );
  assert.doesNotMatch(renderMarkdownPreview('[known][missing]\n\n[known]: https://example.com'), /<a /);
});
