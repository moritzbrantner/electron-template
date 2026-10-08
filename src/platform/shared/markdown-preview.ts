function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function sanitizeMarkdownHref(href: string) {
  const trimmedHref = href.trim();

  if (!/^(https?:\/\/|mailto:)/iu.test(trimmedHref)) {
    return null;
  }

  // Inline parsing receives already-escaped text, including the destination.
  return trimmedHref;
}

function formatEmphasis(text: string) {
  return text
    .replace(/\*\*([^*]+)\*\*/gu, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/gu, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/gu, '<del>$1</del>');
}

function renderInlineMarkdown(text: string) {
  let html = escapeHtml(text);
  let prefix = '__INLINE_TOKEN_';
  while (html.includes(prefix)) prefix += '_';
  const tokens: string[] = [];
  const protect = (markup: string) => {
    const token = `${prefix}${tokens.length}__`;
    tokens.push(markup);
    return token;
  };
  html = html.replace(/`([^`\n]+)`/gu, (_match, code: string) => protect(`<code>${code}</code>`));
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gu, (_match, label: string, href: string) => {
    const safeHref = sanitizeMarkdownHref(href);
    return safeHref
      ? protect(`<a href="${safeHref}" target="_blank" rel="noreferrer">${formatEmphasis(label)}</a>`)
      : label;
  });
  html = formatEmphasis(html);
  // Links can contain protected code spans, so restore the outer link before its inner code.
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    html = html.replaceAll(`${prefix}${index}__`, tokens[index]);
  }
  return html;
}

function isParagraphBoundary(line: string) {
  return (
    line.trim().length === 0 ||
    /^(#{1,6})\s+/u.test(line) ||
    /^>\s?/u.test(line) ||
    /^([-*+])\s+/u.test(line) ||
    /^\d+\.\s+/u.test(line) ||
    /^```/u.test(line) ||
    /^([-*_]){3,}\s*$/u.test(line.trim())
  );
}

export function renderMarkdownPreview(markdown: string) {
  const normalizedMarkdown = markdown.replaceAll('\r\n', '\n');
  const lines = normalizedMarkdown.split('\n');
  const html: string[] = [];

  for (let index = 0; index < lines.length; ) {
    const line = lines[index];
    const trimmedLine = line.trim();

    if (trimmedLine.length === 0) {
      index += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      html.push(
        `<pre class="markdown-code-block"${language ? ` data-language="${escapeHtml(language)}"` : ''}><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`,
      );
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/u);

    if (headingMatch) {
      const level = headingMatch[1].length;
      html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2].trim())}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^([-*_]){3,}\s*$/u.test(trimmedLine)) {
      html.push('<hr />');
      index += 1;
      continue;
    }

    if (/^>\s?/u.test(line)) {
      const quoteLines: string[] = [];

      while (index < lines.length && /^>\s?/u.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/u, ''));
        index += 1;
      }

      html.push(
        `<blockquote><p>${quoteLines.map((quoteLine) => renderInlineMarkdown(quoteLine)).join('<br />')}</p></blockquote>`,
      );
      continue;
    }

    const unorderedListMatch = line.match(/^([-*+])\s+(.*)$/u);

    if (unorderedListMatch) {
      const items: string[] = [];

      while (index < lines.length) {
        const match = lines[index].match(/^([-*+])\s+(.*)$/u);

        if (!match) {
          break;
        }

        items.push(`<li>${renderInlineMarkdown(match[2].trim())}</li>`);
        index += 1;
      }

      html.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    const orderedListMatch = line.match(/^(\d+)\.\s+(.*)$/u);

    if (orderedListMatch) {
      const items: string[] = [];

      while (index < lines.length) {
        const match = lines[index].match(/^\d+\.\s+(.*)$/u);

        if (!match) {
          break;
        }

        items.push(`<li>${renderInlineMarkdown(match[1].trim())}</li>`);
        index += 1;
      }

      html.push(`<ol start="${Number(orderedListMatch[1])}">${items.join('')}</ol>`);
      continue;
    }

    const paragraphLines = [trimmedLine];
    index += 1;

    while (index < lines.length && !isParagraphBoundary(lines[index])) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    html.push(`<p>${renderInlineMarkdown(paragraphLines.join(' '))}</p>`);
  }

  if (html.length === 0) {
    return '<p class="document-preview__empty">Start typing to preview your markdown document.</p>';
  }

  return html.join('');
}
