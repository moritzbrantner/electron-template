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

function unescapedAngleEnd(text: string, start: number) {
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === '\\') {
      index += text.startsWith('&gt;', index + 1) ? 4 : 1;
    } else if (text.startsWith('&gt;', index)) return index;
  }
  return -1;
}

function parseLinkDestination(text: string) {
  let destination: string;
  let remainder: string;
  if (text.startsWith('&lt;')) {
    const end = unescapedAngleEnd(text, 4);
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

function formatEmphasis(text: string, escapedCharacter?: (index: number) => string | undefined) {
  const fragments: string[] = [];
  type Opener = {
    marker: string;
    remaining: number;
    fragment: number;
    runLength: number;
    canClose: boolean;
    tags: string[];
  };
  const openers: Opener[] = [];
  const allOpeners: Opener[] = [];
  const indices = new Map<string, number[]>();
  const bucket = (marker: string, modulo: number, canClose: boolean) => {
    const key = `${marker}:${modulo}:${canClose}`;
    let values = indices.get(key);
    if (!values) {
      values = [];
      indices.set(key, values);
    }
    return values;
  };
  const popOpener = () => {
    const opener = openers.pop()!;
    bucket(opener.marker, opener.runLength % 3, opener.canClose).pop();
    return opener;
  };
  const findOpener = (marker: string, runLength: number, canOpen: boolean) => {
    let newest = -1;
    for (let modulo = 0; modulo < 3; modulo += 1) {
      for (const openerCanClose of [false, true]) {
        if (
          marker !== '~' &&
          (openerCanClose || canOpen) &&
          (modulo + runLength) % 3 === 0 &&
          (modulo !== 0 || runLength % 3 !== 0)
        )
          continue;
        newest = Math.max(newest, bucket(marker, modulo, openerCanClose).at(-1) ?? -1);
      }
    }
    return newest;
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
    const runLength = end - index;
    let remaining = runLength;
    const before = escapedCharacter?.(index - 1) ?? text[index - 1];
    const after = escapedCharacter?.(end) ?? text[end];
    const beforeSpace = before === undefined || /\s/u.test(before);
    const afterSpace = after === undefined || /\s/u.test(after);
    const beforePunctuation = before !== undefined && /[\p{P}\p{S}]/u.test(before);
    const afterPunctuation = after !== undefined && /[\p{P}\p{S}]/u.test(after);
    const leftFlanking = !afterSpace && (!afterPunctuation || beforeSpace || beforePunctuation);
    const rightFlanking = !beforeSpace && (!beforePunctuation || afterSpace || afterPunctuation);
    const canClose = marker === '_' ? rightFlanking && (!leftFlanking || afterPunctuation) : rightFlanking;
    const canOpen = marker === '_' ? leftFlanking && (!rightFlanking || beforePunctuation) : leftFlanking;
    if (canClose) {
      while (remaining >= (marker === '~' ? 2 : 1)) {
        const openerIndex = findOpener(marker, runLength, canOpen);
        if (openerIndex === -1) break;
        while (openers.length - 1 > openerIndex) popOpener();
        const opener = openers[openerIndex];
        const width = remaining >= 2 && opener.remaining >= 2 ? 2 : 1;
        const tag = marker === '~' ? 'del' : width === 2 ? 'strong' : 'em';
        opener.tags.push(`<${tag}>`);
        fragments.push(`</${tag}>`);
        opener.remaining -= width;
        remaining -= width;
        if (opener.remaining < (marker === '~' ? 2 : 1)) popOpener();
      }
    }
    if (canOpen && remaining >= (marker === '~' ? 2 : 1)) {
      const opener = { marker, remaining, fragment: fragments.length, runLength, canClose, tags: [] };
      bucket(marker, runLength % 3, canClose).push(openers.length);
      openers.push(opener);
      allOpeners.push(opener);
      fragments.push('');
    } else fragments.push(marker.repeat(remaining));
    cursor = end;
    index = end;
  }
  fragments.push(text.slice(cursor));
  for (const opener of allOpeners)
    fragments[opener.fragment] = opener.marker.repeat(opener.remaining) + opener.tags.reverse().join('');
  return fragments.join('');
}

function delimiterPairs(text: string, codeEnds: Map<number, number>) {
  const pairs = new Map<number, number>();
  const brackets: number[] = [];
  const parentheses: number[] = [];
  let nextAngleEnd = unescapedAngleEnd(text, 0);
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
    if (parentheses.length > 0 && text.startsWith('&lt;', index) && text[index - 1] === '(') {
      while (nextAngleEnd !== -1 && nextAngleEnd < index) {
        nextAngleEnd = unescapedAngleEnd(text, nextAngleEnd + 4);
      }
      if (nextAngleEnd !== -1) {
        index = nextAngleEnd + 3;
        continue;
      }
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

function renderCharacterReferences(text: string) {
  // Preserve references as HTML text tokens so the browser decodes them without
  // letting decoded punctuation create Markdown delimiters or HTML elements.
  return text.replace(/&amp;((?:#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[A-Za-z][A-Za-z0-9]*));/gu, '&$1;');
}

function autolinkEnds(text: string) {
  const ends = new Map<number, number>();
  let opening: number | null = null;
  for (const match of text.matchAll(/&lt;|&gt;/gu)) {
    if (match[0] === '&lt;') opening = match.index;
    else if (opening !== null) {
      ends.set(opening, match.index);
      opening = null;
    }
  }
  return ends;
}

function formatLinksAndCode(
  text: string,
  protect: (markup: string, source?: string) => string,
  allowLinks = true,
  emphasize: (value: string) => string = formatEmphasis,
) {
  const codeEnds = codeSpanEnds(text);
  const pairs = delimiterPairs(text, codeEnds);
  const angleEnds = autolinkEnds(text);
  const links = new Map<
    number,
    { labelEnd: number; end: number; link: NonNullable<ReturnType<typeof parseLinkDestination>> }
  >();
  let nearestInner: { start: number; end: number } | null = null;
  if (allowLinks) {
    // Resolve inner candidates first so enclosing links cannot swallow them.
    const starts = [...pairs.keys()].filter((start) => text[start] === '[').sort((left, right) => right - left);
    for (const start of starts) {
      const labelEnd = pairs.get(start)!;
      if (text[labelEnd + 1] !== '(') continue;
      const end = pairs.get(labelEnd + 1);
      if (end === undefined) continue;
      const link = parseLinkDestination(text.slice(labelEnd + 2, end));
      if (!link || (nearestInner && nearestInner.start < labelEnd && nearestInner.end < labelEnd)) continue;
      links.set(start, { labelEnd, end, link });
      nearestInner = { start, end };
    }
  }
  const result: string[] = [];
  let cursor = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '\\' && /[!-/:-@[-`{-~]/u.test(text[index + 1] ?? '')) {
      result.push(text.slice(cursor, index), protect(text[index + 1], text[index + 1]));
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
        result.push(
          text.slice(cursor, index),
          protect(`<code>${code}</code>`, text.slice(index, end + runEnd - index)),
        );
        cursor = end + runEnd - index;
        index = cursor - 1;
      } else {
        index = runEnd - 1;
      }
      continue;
    }
    if (allowLinks && angleEnds.has(index)) {
      const end = angleEnds.get(index)!;
      const label = text.slice(index + 4, end);
      const destination = label.replaceAll('&amp;', '&').replaceAll('&quot;', '"');
      const email =
        /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/u.test(
          destination,
        );
      const uri = /^[A-Za-z][A-Za-z0-9+.-]{1,31}:[^\s<>]*$/u.test(destination);
      const href = email ? `mailto:${destination}` : uri ? destination : null;
      const safeHref = href && sanitizeMarkdownHref(escapeHtml(href));
      if (safeHref) {
        result.push(
          text.slice(cursor, index),
          protect(`<a href="${safeHref}" target="_blank" rel="noreferrer">${label}</a>`, text.slice(index, end + 4)),
        );
        cursor = end + 4;
        index = cursor - 1;
        continue;
      }
    }
    if (!allowLinks || text[index] !== '[') continue;
    const candidate = links.get(index);
    if (!candidate) continue;
    const { labelEnd, end, link } = candidate;
    const safeHref = sanitizeMarkdownHref(decodeMarkdownEscapes(link.destination));
    const label = emphasize(formatLinksAndCode(text.slice(index + 1, labelEnd), protect, false, emphasize));
    result.push(
      text.slice(cursor, index),
      safeHref
        ? protect(
            `<a href="${renderCharacterReferences(safeHref)}"${link.title === null ? '' : ` title="${renderCharacterReferences(decodeMarkdownEscapes(link.title))}"`} target="_blank" rel="noreferrer">${label}</a>`,
            text.slice(index, end + 1),
          )
        : protect(label, text.slice(index, end + 1)),
    );
    cursor = end + 1;
    index = end;
  }
  result.push(text.slice(cursor));
  return renderCharacterReferences(result.join(''));
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
  const contexts: { first: string | undefined; last: string | undefined }[] = [];
  const protect = (markup: string, source = markup.length === 1 ? markup : '') => {
    const token = `${prefix}${tokens.length}\uE001`;
    tokens.push(markup);
    contexts.push({ first: source[0], last: source.at(-1) });
    return token;
  };
  const emphasize = (value: string) =>
    formatEmphasis(value, (index) => {
      let start: number;
      let end: number;
      let last: boolean;
      if (value[index] === '\uE001') {
        start = value.lastIndexOf(prefix, index);
        end = index;
        last = true;
      } else if (value.startsWith(prefix, index)) {
        start = index;
        end = value.indexOf('\uE001', index);
        last = false;
      } else return undefined;
      const context = contexts[Number(value.slice(start + prefix.length, end))];
      return last ? context?.last : context?.first;
    });
  html = formatLinksAndCode(html, protect, true, emphasize);
  html = html.replace(/(?: {2,}|\\)\n/gu, () => protect('<br />', '\n')).replaceAll('\n', ' ');
  html = emphasize(html);
  return restoreMarkup(html, tokens, prefix);
}

function matchCodeFence(line: string) {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/u);
  return match && (match[1][0] !== '`' || !match[2].includes('`')) ? match : null;
}

function closingCodeFence(marker: string) {
  return new RegExp('^ {0,3}' + marker[0] + '{' + marker.length + ',}\\s*$', 'u');
}

function isIndentedCode(line: string) {
  return /^(?: {4}|\t)/u.test(line);
}

function listPaddingWidth(padding: string, startingColumn: number) {
  let column = startingColumn;
  for (const character of padding) column += character === '\t' ? 4 - (column % 4) : 1;
  return column - startingColumn;
}

function isParagraphBoundary(line: string, interruptingParagraph = false) {
  return (
    line.trim().length === 0 ||
    /^ {0,3}(#{1,6})(?:[ \t]+|$)/u.test(line) ||
    /^ {0,3}>[ \t]?/u.test(line) ||
    (interruptingParagraph ? /^ {0,3}[-*+][ \t]+\S/u : /^ {0,3}[-*+][ \t]+/u).test(line) ||
    (interruptingParagraph ? /^ {0,3}1[.)][ \t]+\S/u : /^ {0,3}\d{1,9}[.)][ \t]+/u).test(line) ||
    Boolean(matchCodeFence(line)) ||
    /^ {0,3}([*_-])(?:[ \t]*\1){2,}[ \t]*$/u.test(line)
  );
}

type MarkdownBlockPart = string | { markdown: string; opening: string; closing: string; tightParagraphs?: boolean };

function singleLineListChain(markdown: string): MarkdownBlockPart | null {
  // A thematic-break suffix belongs to the innermost block, not another list.
  let thematicStart = markdown.length;
  let thematicMarker = '';
  let thematicCount = 0;
  while (thematicStart > 0) {
    const character = markdown[thematicStart - 1];
    if (!/\s/u.test(character)) {
      if (!thematicMarker && /[*_-]/u.test(character)) thematicMarker = character;
      if (!thematicMarker || character !== thematicMarker) break;
      thematicCount += 1;
    }
    thematicStart -= 1;
  }
  if (thematicCount < 3) thematicStart = markdown.length;
  const pattern = /([-*+]|\d{1,9}[.)])([ \t]+)/gy;
  const openings: string[] = [];
  const closings: string[] = [];
  let cursor = 0;
  while (cursor < thematicStart) {
    const match = pattern.exec(markdown);
    if (!match || listPaddingWidth(match[2], match.index + match[1].length) > 4) break;
    const ordered = /^\d/u.test(match[1]);
    openings.push(ordered ? `<ol start="${Number.parseInt(match[1], 10)}"><li>` : '<ul><li>');
    closings.push(ordered ? '</li></ol>' : '</li></ul>');
    cursor = pattern.lastIndex;
  }
  if (openings.length < 2) return null;
  return {
    markdown: markdown.slice(cursor),
    opening: openings.join(''),
    closing: closings.reverse().join(''),
    tightParagraphs: true,
  };
}

function* renderMarkdownBlockParts(markdown: string, tightParagraphs = false): Generator<MarkdownBlockPart> {
  const normalizedMarkdown = markdown.replace(/\r\n?/gu, '\n');
  const lines = normalizedMarkdown
    .split('\n')
    .map((line) => line.replace(/^[ \t]+/u, (indentation) => ' '.repeat(listPaddingWidth(indentation, 0))));
  if (lines.length === 1) {
    const chain = singleLineListChain(normalizedMarkdown);
    if (chain) {
      yield chain;
      return;
    }
  }

  for (let index = 0; index < lines.length; ) {
    const line = lines[index];
    const trimmedLine = line.trim();

    if (trimmedLine.length === 0) {
      index += 1;
      continue;
    }

    if (isIndentedCode(line)) {
      const codeLines: string[] = [];
      while (index < lines.length && (/^(?: {4}|\t)/u.test(lines[index]) || !lines[index].trim())) {
        codeLines.push(lines[index].replace(/^(?: {4}|\t)/u, ''));
        index += 1;
      }
      while (codeLines.at(-1)?.trim() === '') codeLines.pop();
      yield `<pre class="markdown-code-block"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`;
      continue;
    }

    const fenceMatch = matchCodeFence(line);
    if (fenceMatch) {
      const language = fenceMatch[2].trim();
      const indentation = line.length - line.trimStart().length;
      const codeIndent = new RegExp('^ {0,' + indentation + '}', 'u');
      const closingFence = closingCodeFence(fenceMatch[1]);
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !closingFence.test(lines[index])) {
        codeLines.push(lines[index].replace(codeIndent, ''));
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      yield `<pre class="markdown-code-block"${language ? ` data-language="${escapeHtml(language)}"` : ''}><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`;
      continue;
    }

    const headingMatch = line.match(/^ {0,3}(#{1,6})(?:[ \t]+|$)(.*)$/u);

    if (headingMatch) {
      const level = headingMatch[1].length;
      yield `<h${level}>${renderInlineMarkdown(headingMatch[2].replace(/(?:^|[ \t]+)#+[ \t]*$/u, '').trim())}</h${level}>`;
      index += 1;
      continue;
    }

    if (/^([*_-])(?:\s*\1){2,}\s*$/u.test(trimmedLine)) {
      yield '<hr />';
      index += 1;
      continue;
    }

    if (/^ {0,3}>[ \t]?/u.test(line)) {
      const quoteLines: string[] = [];

      let lazyParagraph = false;
      let quoteFence: RegExp | null = null;
      while (index < lines.length) {
        const quoteLine = lines[index];
        if (/^ {0,3}>[ \t]?/u.test(quoteLine)) {
          quoteLines.push(quoteLine);
          const content = quoteLine.replace(/^ {0,3}>[ \t]?/u, '');
          const fence = matchCodeFence(content);
          if (quoteFence) {
            if (quoteFence.test(content)) quoteFence = null;
            lazyParagraph = false;
          } else if (fence) {
            quoteFence = closingCodeFence(fence[1]);
            lazyParagraph = false;
          } else {
            lazyParagraph =
              !isIndentedCode(content) && !isParagraphBoundary(content, true) && !/^(?:=+|-+)\s*$/u.test(content);
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
        const prefix = quoteLine.match(/^(?: {0,3}>[ \t]?)+/u)?.[0] ?? '';
        let quoteDepth = 0;
        for (const character of prefix) if (character === '>') quoteDepth += 1;
        return Math.min(minimumDepth, quoteDepth);
      }, Number.POSITIVE_INFINITY);
      const strippedLines = quoteLines.map((quoteLine) => {
        let offset = 0;
        for (let level = 0; level < depth; level += 1) {
          let indentation = 0;
          while (indentation < 3 && quoteLine[offset] === ' ') {
            offset += 1;
            indentation += 1;
          }
          offset += 1;
          if (/[ \t]/u.test(quoteLine[offset] ?? '')) offset += 1;
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

    const listMatch = line.match(/^ {0,3}([-*+]|\d{1,9}[.)])(?:[ \t]+(.*)|$)/u);
    if (listMatch) {
      const ordered = /^\d/u.test(listMatch[1]);
      const itemPattern = ordered
        ? new RegExp(`^ {0,3}\\d{1,9}[${listMatch[1].at(-1)}](?:[ \\t]+(.*)|$)`, 'u')
        : new RegExp(`^ {0,3}[${listMatch[1]}](?:[ \\t]+(.*)|$)`, 'u');
      const items: string[][] = [];
      let loose = false;
      while (index < lines.length) {
        const match = lines[index].match(itemPattern);
        if (!match) break;
        let itemContent = match[1] ?? '';
        let contentIndent = itemContent ? match[0].length - itemContent.length : match[0].trimEnd().length + 1;
        const markerEnd = lines[index].match(/^ {0,3}(?:[-*+]|\d{1,9}[.)])/u)![0].length;
        const padding = lines[index].slice(markerEnd, contentIndent);
        const paddingWidth = listPaddingWidth(padding, markerEnd);
        if (itemContent) contentIndent = markerEnd + paddingWidth;
        if (itemContent && paddingWidth > 4) {
          itemContent = ' '.repeat(paddingWidth - 1) + itemContent;
          contentIndent = markerEnd + 1;
        }
        const itemLines = [itemContent];
        let lazyParagraph = !isIndentedCode(itemContent) && !isParagraphBoundary(itemContent);
        const itemFence = matchCodeFence(itemContent);
        let closingItemFence = itemFence ? closingCodeFence(itemFence[1]) : null;
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
            loose = true;
            lazyParagraph = false;
          } else if (indentation >= contentIndent) {
            const content = continuation.slice(contentIndent);
            itemLines.push(content);
            if (closingItemFence) {
              if (closingItemFence.test(content)) closingItemFence = null;
              lazyParagraph = false;
            } else {
              const fence = matchCodeFence(content);
              closingItemFence = fence ? closingCodeFence(fence[1]) : null;
              lazyParagraph =
                !isIndentedCode(content) &&
                !isParagraphBoundary(content.trimStart(), lazyParagraph) &&
                !/^(?:=+|-+)\s*$/u.test(content.trim());
            }
          } else if (itemPattern.test(continuation) || (ordered && /^ {0,3}\d{1,9}[.)]\s+/u.test(continuation))) {
            break;
          } else if (lazyParagraph && !isParagraphBoundary(continuation.trimStart(), true)) {
            itemLines.push(continuation.trimStart());
          } else {
            break;
          }
          index += 1;
        }
        items.push(itemLines);
      }
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
