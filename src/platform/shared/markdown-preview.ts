function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function decodeMarkdownEscapes(text: string) {
  return text.replace(/\\([!-/:-@[-`{-~])/gu, '$1');
}

function sanitizeMarkdownHref(href: string) {
  const trimmedHref = href.trim();

  if (!/^(https?:\/\/|mailto:)/iu.test(trimmedHref)) {
    return null;
  }

  // Inline parsing receives already-escaped text, including the destination.
  return trimmedHref;
}

function parseLinkDestination(text: string) {
  let destination: string;
  let remainder: string;
  if (text.startsWith('&lt;')) {
    const end = text.indexOf('&gt;', 4);
    if (end === -1) return null;
    destination = text.slice(4, end);
    remainder = text.slice(end + 4).trim();
  } else {
    const end = text.search(/\s/u);
    destination = end === -1 ? text : text.slice(0, end);
    remainder = end === -1 ? '' : text.slice(end).trim();
  }
  let title: string | null = null;
  if (remainder) {
    const delimiters = [
      ['&quot;', '&quot;'],
      ["'", "'"],
      ['(', ')'],
    ];
    const pair = delimiters.find(
      ([open, close]) =>
        remainder.startsWith(open) && remainder.endsWith(close) && remainder.length >= open.length + close.length,
    );
    if (!pair) return null;
    title = remainder.slice(pair[0].length, -pair[1].length);
  }
  return { destination, title };
}

function formatEmphasis(text: string) {
  const fragments: string[] = [];
  const openers: { marker: string; width: number; fragment: number }[] = [];
  const indices = new Map<string, number[]>();
  const bucket = (marker: string, width: number) => {
    const key = `${marker}:${width}`;
    let values = indices.get(key);
    if (!values) {
      values = [];
      indices.set(key, values);
    }
    return values;
  };
  const popOpener = () => {
    const opener = openers.pop()!;
    bucket(opener.marker, opener.width).pop();
    return opener;
  };
  let cursor = 0;
  for (let index = 0; index < text.length; ) {
    const marker = text[index];
    if (marker !== '*' && marker !== '_' && marker !== '~') {
      index += 1;
      continue;
    }
    let end = index + 1;
    while (text[end] === marker) end += 1;
    fragments.push(text.slice(cursor, index));
    let remaining = end - index;
    const before = text[index - 1];
    const after = text[end];
    const beforeSpace = before === undefined || /\s/u.test(before);
    const afterSpace = after === undefined || /\s/u.test(after);
    const beforePunctuation = before !== undefined && /[\p{P}\p{S}]/u.test(before);
    const afterPunctuation = after !== undefined && /[\p{P}\p{S}]/u.test(after);
    const leftFlanking = !afterSpace && (!afterPunctuation || beforeSpace || beforePunctuation);
    const rightFlanking = !beforeSpace && (!beforePunctuation || afterSpace || afterPunctuation);
    const canClose = marker === '_' ? rightFlanking && (!leftFlanking || afterPunctuation) : rightFlanking;
    const canOpen = marker === '_' ? leftFlanking && (!rightFlanking || beforePunctuation) : leftFlanking;
    if (canClose) {
      while (remaining > 0) {
        const single = marker === '~' ? -1 : (bucket(marker, 1).at(-1) ?? -1);
        const double = remaining >= 2 ? (bucket(marker, 2).at(-1) ?? -1) : -1;
        const openerIndex = Math.max(single, double);
        if (openerIndex === -1) break;
        // Unmatched inner openers stay literal; discard their stack entries so
        // later closers cannot create crossing spans. Each opener is removed once.
        while (openers.length - 1 > openerIndex) popOpener();
        const opener = popOpener();
        const tag = marker === '~' ? 'del' : opener.width === 2 ? 'strong' : 'em';
        fragments[opener.fragment] = `<${tag}>`;
        fragments.push(`</${tag}>`);
        remaining -= opener.width;
      }
    }
    if (canOpen) {
      while (remaining >= (marker === '~' ? 2 : 1)) {
        // An odd asterisk run opens emphasis around its inner strong pairs.
        const width = marker !== '~' && remaining % 2 === 1 ? 1 : 2;
        bucket(marker, width).push(openers.length);
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

function delimiterPairs(text: string, codeEnds: Map<number, number>) {
  const pairs = new Map<number, number>();
  const brackets: number[] = [];
  const parentheses: number[] = [];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '\\') {
      index += 1;
      continue;
    }
    const codeEnd = codeEnds.get(index);
    if (codeEnd !== undefined) {
      let runEnd = index + 1;
      while (text[runEnd] === '`') runEnd += 1;
      index = codeEnd + runEnd - index - 1;
      continue;
    }
    if (parentheses.length > 0 && /\s/u.test(text[index - 1] ?? '')) {
      const quote = text.startsWith('&quot;', index) ? '&quot;' : text[index] === "'" ? "'" : null;
      if (quote) {
        let end = index + quote.length;
        while (end < text.length && !text.startsWith(quote, end)) {
          if (text[end] === '\\') end += 1;
          end += 1;
        }
        if (end < text.length) {
          index = end + quote.length - 1;
          continue;
        }
      }
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
  const codeEnds = codeSpanEnds(text);
  const pairs = delimiterPairs(text, codeEnds);
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
    const link = parseLinkDestination(text.slice(labelEnd + 2, end));
    if (!link) continue;
    const safeHref = sanitizeMarkdownHref(decodeMarkdownEscapes(link.destination));
    const label = formatEmphasis(formatLinksAndCode(text.slice(index + 1, labelEnd), protect, false));
    result.push(
      text.slice(cursor, index),
      safeHref
        ? protect(
            `<a href="${safeHref}"${link.title === null ? '' : ` title="${decodeMarkdownEscapes(link.title)}"`} target="_blank" rel="noreferrer">${label}</a>`,
          )
        : label,
    );
    cursor = end + 1;
    index = end;
  }
  result.push(text.slice(cursor));
  return result.join('');
}

function restoreMarkup(html: string, tokens: string[], prefix: string) {
  const tokenPattern = new RegExp(`${prefix}(\\d+)\uE001`, 'gu');
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
  let prefix = '\uE000INLINE_TOKEN:';
  while (html.includes(prefix)) prefix += ':';
  const tokens: string[] = [];
  const protect = (markup: string) => {
    const token = `${prefix}${tokens.length}\uE001`;
    tokens.push(markup);
    return token;
  };
  html = formatLinksAndCode(html, protect);
  html = html.replace(/(?: {2,}|\\)\n/gu, () => protect('<br />')).replaceAll('\n', ' ');
  html = formatEmphasis(html);
  return restoreMarkup(html, tokens, prefix);
}

function isParagraphBoundary(line: string, interruptingParagraph = false) {
  return (
    line.trim().length === 0 ||
    /^(#{1,6})\s+/u.test(line) ||
    /^>\s?/u.test(line) ||
    /^([-*+])\s+/u.test(line) ||
    (interruptingParagraph ? /^1\.\s+/u : /^\d+\.\s+/u).test(line) ||
    /^```/u.test(line) ||
    /^([*_-])(?:\s*\1){2,}\s*$/u.test(line.trim())
  );
}

type MarkdownBlockPart = string | { markdown: string; opening: string; closing: string; tightParagraphs?: boolean };

function* renderMarkdownBlockParts(markdown: string, tightParagraphs = false): Generator<MarkdownBlockPart> {
  const normalizedMarkdown = markdown.replaceAll('\r\n', '\n');
  const lines = normalizedMarkdown.split('\n');

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

      yield `<pre class="markdown-code-block"${language ? ` data-language="${escapeHtml(language)}"` : ''}><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/u);

    if (headingMatch) {
      const level = headingMatch[1].length;
      yield `<h${level}>${renderInlineMarkdown(headingMatch[2].trim())}</h${level}>`;
      index += 1;
      continue;
    }

    if (/^([*_-])(?:\s*\1){2,}\s*$/u.test(trimmedLine)) {
      yield '<hr />';
      index += 1;
      continue;
    }

    if (/^>\s?/u.test(line)) {
      const quoteLines: string[] = [];

      let lazyParagraph = false;
      let quoteFenceWidth = 0;
      while (index < lines.length) {
        const quoteLine = lines[index];
        if (/^>\s?/u.test(quoteLine)) {
          quoteLines.push(quoteLine);
          const content = quoteLine.replace(/^(?:>\s?)+/u, '');
          const fence = content.match(/^(`{3,})([^`]*)$/u);
          if (quoteFenceWidth > 0) {
            if (fence && fence[1].length >= quoteFenceWidth && !fence[2].trim()) quoteFenceWidth = 0;
            lazyParagraph = false;
          } else if (fence) {
            quoteFenceWidth = fence[1].length;
            lazyParagraph = false;
          } else {
            lazyParagraph = !isParagraphBoundary(content, true) && !/^(?:=+|-+)\s*$/u.test(content);
          }
        } else if (lazyParagraph && !isParagraphBoundary(quoteLine, true)) {
          quoteLines.push('> ' + quoteLine);
        } else {
          break;
        }
        index += 1;
      }

      // Consume the shared quote prefix in one pass, including very deep quotes.
      const depth = quoteLines.reduce((minimumDepth, quoteLine) => {
        const prefix = quoteLine.match(/^(?:>\s?)+/u)?.[0] ?? '';
        let quoteDepth = 0;
        for (const character of prefix) if (character === '>') quoteDepth += 1;
        return Math.min(minimumDepth, quoteDepth);
      }, Number.POSITIVE_INFINITY);
      const strippedLines = quoteLines.map((quoteLine) => {
        let offset = 0;
        for (let level = 0; level < depth; level += 1) {
          offset += 1;
          if (/\s/u.test(quoteLine[offset] ?? '')) offset += 1;
        }
        return quoteLine.slice(offset);
      });
      yield {
        markdown: strippedLines.join('\n'),
        opening: '<blockquote>'.repeat(depth),
        closing: '</blockquote>'.repeat(depth),
      };
      continue;
    }

    const listMatch = line.match(/^([-*+]|\d+\.)\s+(.*)$/u);
    if (listMatch) {
      const ordered = /^\d/u.test(listMatch[1]);
      const itemPattern = ordered ? /^\d+\.\s+(.*)$/u : /^[-*+]\s+(.*)$/u;
      const items: string[][] = [];
      while (index < lines.length) {
        const match = lines[index].match(itemPattern);
        if (!match) break;
        const contentIndent = match[0].length - match[1].length;
        const itemLines = [match[1]];
        index += 1;
        while (index < lines.length) {
          const continuation = lines[index];
          const indentation = continuation.match(/^ +/u)?.[0].length ?? 0;
          if (!continuation.trim()) {
            let next = index + 1;
            while (next < lines.length && !lines[next].trim()) next += 1;
            if (
              next === lines.length ||
              (!itemPattern.test(lines[next]) && (lines[next].match(/^ +/u)?.[0].length ?? 0) < contentIndent)
            )
              break;
            itemLines.push('');
          } else if (indentation >= contentIndent) {
            itemLines.push(continuation.slice(contentIndent));
          } else if (!isParagraphBoundary(continuation.trimStart())) {
            itemLines.push(continuation.trimStart());
          } else {
            break;
          }
          index += 1;
        }
        items.push(itemLines);
      }
      const loose = items.some((item) => item.includes(''));
      yield ordered ? `<ol start="${Number.parseInt(listMatch[1], 10)}">` : '<ul>';
      for (const item of items) {
        yield { markdown: item.join('\n'), opening: '<li>', closing: '</li>', tightParagraphs: !loose };
      }
      yield ordered ? '</ol>' : '</ul>';
      continue;
    }

    const paragraphLines = [line.trimStart()];
    index += 1;

    while (
      index < lines.length &&
      !isParagraphBoundary(lines[index], true) &&
      !/^ {0,3}(?:=+|-+)\s*$/u.test(lines[index])
    ) {
      paragraphLines.push(lines[index].trimStart());
      index += 1;
    }

    const underline = lines[index]?.match(/^ {0,3}(=+|-+)\s*$/u);
    if (underline) {
      const level = underline[1][0] === '=' ? 1 : 2;
      yield `<h${level}>${renderInlineMarkdown(paragraphLines.join('\n').trim())}</h${level}>`;
      index += 1;
    } else {
      const paragraph = renderInlineMarkdown(paragraphLines.join('\n'));
      yield tightParagraphs ? paragraph : `<p>${paragraph}</p>`;
    }
  }
}

function renderMarkdownBlocks(markdown: string) {
  const html: string[] = [];
  const frames = [{ parts: renderMarkdownBlockParts(markdown), closing: '' }];
  while (frames.length > 0) {
    const frame = frames[frames.length - 1];
    const next = frame.parts.next();
    if (next.done) {
      html.push(frame.closing);
      frames.pop();
    } else if (typeof next.value === 'string') {
      html.push(next.value);
    } else {
      html.push(next.value.opening);
      frames.push({
        parts: renderMarkdownBlockParts(next.value.markdown, next.value.tightParagraphs),
        closing: next.value.closing,
      });
    }
  }
  return html.join('');
}

export function renderMarkdownPreview(markdown: string) {
  return (
    renderMarkdownBlocks(markdown) ||
    '<p class="document-preview__empty">Start typing to preview your markdown document.</p>'
  );
}
