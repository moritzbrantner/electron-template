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
  const fragments: string[] = [];
  const openers: { marker: string; width: number; fragment: number }[] = [];
  let cursor = 0;
  for (let index = 0; index < text.length; ) {
    const marker = text[index];
    if (marker !== '*' && marker !== '~') {
      index += 1;
      continue;
    }
    let end = index + 1;
    while (text[end] === marker) end += 1;
    fragments.push(text.slice(cursor, index));
    let remaining = end - index;
    const canClose = index > 0 && !/\s/u.test(text[index - 1]);
    const canOpen = end < text.length && !/\s/u.test(text[end]);
    if (canClose) {
      while (openers.length > 0) {
        const opener = openers[openers.length - 1];
        if (opener.marker !== marker || opener.width > remaining) break;
        openers.pop();
        const tag = marker === '~' ? 'del' : opener.width === 2 ? 'strong' : 'em';
        fragments[opener.fragment] = `<${tag}>`;
        fragments.push(`</${tag}>`);
        remaining -= opener.width;
      }
    }
    if (canOpen) {
      while (remaining >= (marker === '~' ? 2 : 1)) {
        // An odd asterisk run opens emphasis around its inner strong pairs.
        const width = marker === '*' && remaining % 2 === 1 ? 1 : 2;
        openers.push({ marker, width, fragment: fragments.length });
        fragments.push(marker.repeat(width));
        remaining -= width;
      }
    }
    fragments.push(marker.repeat(remaining));
    cursor = end;
    index = end;
  }
  fragments.push(text.slice(cursor));
  return fragments.join('');
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

function codeSpanEnds(text: string) {
  const ends = new Map<number, number>();
  const nextRuns = new Map<number, number>();
  const runs: { start: number; length: number }[] = [];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== '`') continue;
    const start = index;
    while (text[index + 1] === '`') index += 1;
    runs.push({ start, length: index - start + 1 });
  }
  for (let index = runs.length - 1; index >= 0; index -= 1) {
    const run = runs[index];
    const next = nextRuns.get(run.length);
    if (next !== undefined) ends.set(run.start, next);
    nextRuns.set(run.length, run.start);
  }
  return ends;
}

function formatLinksAndCode(text: string, protect: (markup: string) => string, allowLinks = true) {
  const pairs = delimiterPairs(text);
  const codeEnds = codeSpanEnds(text);
  const result: string[] = [];
  let cursor = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '\\' && /[!-/:-@[-`{-~]/u.test(text[index + 1] ?? '')) {
      result.push(text.slice(cursor, index), protect(text[index + 1]));
      index += 1;
      cursor = index + 1;
      continue;
    }
    if (text[index] === '`') {
      let runEnd = index + 1;
      while (text[runEnd] === '`') runEnd += 1;
      const end = codeEnds.get(index);
      if (end !== undefined) {
        let code = text.slice(runEnd, end).replaceAll('\n', ' ');
        if (code.startsWith(' ') && code.endsWith(' ') && /[^ ]/u.test(code)) code = code.slice(1, -1);
        result.push(text.slice(cursor, index), protect(`<code>${code}</code>`));
        cursor = end + runEnd - index;
        index = cursor - 1;
      } else {
        index = runEnd - 1;
      }
      continue;
    }
    if (!allowLinks || text[index] !== '[') continue;
    const labelEnd = pairs.get(index);
    if (labelEnd === undefined || text[labelEnd + 1] !== '(') continue;
    const end = pairs.get(labelEnd + 1);
    if (end === undefined) continue;
    const safeHref = sanitizeMarkdownHref(text.slice(labelEnd + 2, end).replace(/\\([()\\])/gu, '$1'));
    const label = formatEmphasis(formatLinksAndCode(text.slice(index + 1, labelEnd), protect, false));
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
  html = html.replace(/(?: {2,}|\\)\n/gu, () => protect('<br />')).replaceAll('\n', ' ');
  html = formatEmphasis(html);
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

      html.push(`<blockquote><p>${renderInlineMarkdown(quoteLines.join('\n'))}</p></blockquote>`);
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

        const itemLines = [match[2]];
        index += 1;
        while (index < lines.length && !isParagraphBoundary(lines[index].trimStart())) {
          itemLines.push(lines[index].trimStart());
          index += 1;
        }
        items.push(`<li>${renderInlineMarkdown(itemLines.join('\n'))}</li>`);
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

        const itemLines = [match[1]];
        index += 1;
        while (index < lines.length && !isParagraphBoundary(lines[index].trimStart())) {
          itemLines.push(lines[index].trimStart());
          index += 1;
        }
        items.push(`<li>${renderInlineMarkdown(itemLines.join('\n'))}</li>`);
      }

      html.push(`<ol start="${Number(orderedListMatch[1])}">${items.join('')}</ol>`);
      continue;
    }

    const paragraphLines = [line.trimStart()];
    index += 1;

    while (index < lines.length && !isParagraphBoundary(lines[index])) {
      paragraphLines.push(lines[index].trimStart());
      index += 1;
    }

    html.push(`<p>${renderInlineMarkdown(paragraphLines.join('\n'))}</p>`);
  }

  if (html.length === 0) {
    return '<p class="document-preview__empty">Start typing to preview your markdown document.</p>';
  }

  return html.join('');
}
