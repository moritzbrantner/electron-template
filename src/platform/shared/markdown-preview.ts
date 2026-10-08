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

function formatEmphasis(text: string, protect: (markup: string) => string) {
  let previous: string;
  do {
    previous = text;
    text = text
      .replace(/\*\*([^*]+)\*\*/gu, (_match, content: string) => protect(`<strong>${content}</strong>`))
      .replace(/(?<!\*)\*([^*\n]+)\*/gu, (_match, content: string) => protect(`<em>${content}</em>`))
      .replace(/~~([^~]+)~~/gu, (_match, content: string) => protect(`<del>${content}</del>`));
  } while (text !== previous);
  return text;
}

function delimiterPairs(text: string) {
  const pairs = new Map<number, number>();
  const brackets: number[] = [];
  const parentheses: number[] = [];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '\\') {
      index += 1;
      continue;
    }
    if (text[index] === '[') brackets.push(index);
    if (text[index] === '(') parentheses.push(index);
    const stack = text[index] === ']' ? brackets : text[index] === ')' ? parentheses : null;
    const start = stack?.pop();
    if (start !== undefined) pairs.set(start, index);
  }
  return pairs;
}

function formatCode(text: string, protect: (markup: string) => string) {
  return text.replace(/`([^`\n]+)`/gu, (_match, code: string) => protect(`<code>${code}</code>`));
}

function formatLinksAndCode(text: string, protect: (markup: string) => string) {
  const pairs = delimiterPairs(text);
  const result: string[] = [];
  let cursor = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '\\') {
      index += 1;
      continue;
    }
    if (text[index] === '`') {
      const end = text.indexOf('`', index + 1);
      if (end > index + 1 && !text.slice(index + 1, end).includes('\n')) {
        result.push(text.slice(cursor, index), protect(`<code>${text.slice(index + 1, end)}</code>`));
        cursor = end + 1;
        index = end;
      }
      continue;
    }
    if (text[index] !== '[') continue;
    const labelEnd = pairs.get(index);
    if (labelEnd === undefined || text[labelEnd + 1] !== '(') continue;
    const end = pairs.get(labelEnd + 1);
    if (end === undefined) continue;
    const safeHref = sanitizeMarkdownHref(text.slice(labelEnd + 2, end).replace(/\\([()\\])/gu, '$1'));
    const label = formatEmphasis(
      formatCode(text.slice(index + 1, labelEnd).replace(/\\([\[\]\\])/gu, '$1'), protect),
      protect,
    );
    result.push(
      text.slice(cursor, index),
      safeHref ? protect(`<a href="${safeHref}" target="_blank" rel="noreferrer">${label}</a>`) : label,
    );
    cursor = end + 1;
    index = end;
  }
  result.push(text.slice(cursor));
  return result.join('');
}

function restoreMarkup(html: string, tokens: string[], prefix: string) {
  const tokenPattern = new RegExp(`${prefix}(\\d+)__`, 'gu');
  const pending: { value: string; literal: boolean }[] = [{ value: html, literal: false }];
  const result: string[] = [];
  while (pending.length > 0) {
    const part = pending.pop()!;
    if (part.literal) {
      result.push(part.value);
      continue;
    }
    const matches = [...part.value.matchAll(tokenPattern)];
    let end = part.value.length;
    for (let index = matches.length - 1; index >= 0; index -= 1) {
      const match = matches[index];
      pending.push({ value: part.value.slice(match.index + match[0].length, end), literal: true });
      pending.push({ value: tokens[Number(match[1])], literal: false });
      end = match.index;
    }
    pending.push({ value: part.value.slice(0, end), literal: true });
  }
  return result.join('');
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
  html = formatLinksAndCode(html, protect);
  html = formatEmphasis(html, protect);
  return restoreMarkup(html, tokens, prefix);
}

function isParagraphBoundary(line: string) {
  return (
    line.trim().length === 0 ||
    /^(#{1,6})\s+/u.test(line) ||
    /^>\s?/u.test(line) ||
    /^([-*+])\s+/u.test(line) ||
    /^\d+\.\s+/u.test(line) ||
    /^```/u.test(line) ||
    /^([*_-])(?:\s*\1){2,}\s*$/u.test(line.trim())
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

    const fenceMatch = line.match(/^(`{3,})([^`]*)$/u);
    if (fenceMatch) {
      const language = fenceMatch[2].trim();
      const closingFence = new RegExp('^`{' + fenceMatch[1].length + ',}\\s*$', 'u');
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !closingFence.test(lines[index])) {
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

    if (/^([*_-])(?:\s*\1){2,}\s*$/u.test(trimmedLine)) {
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
