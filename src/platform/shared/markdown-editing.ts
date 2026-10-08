export function insertCodeFence(text: string, start: number, end: number) {
  const selected = text.slice(start, end) || 'code block';
  let longestRun = 0;
  for (const match of selected.matchAll(/`+/gu)) longestRun = Math.max(longestRun, match[0].length);
  const fence = '`'.repeat(Math.max(3, longestRun + 1));
  const prefix = `${start > 0 && text[start - 1] !== '\n' ? '\n' : ''}${fence}\n`;
  const suffix = `\n${fence}${end < text.length && text[end] !== '\n' ? '\n' : ''}`;
  return {
    content: text.slice(0, start) + prefix + selected + suffix + text.slice(end),
    selectionStart: start + prefix.length,
    selectionEnd: start + prefix.length + selected.length,
  };
}

export function prefixMarkdownLines(text: string, start: number, end: number, prefix: string, fallback: string) {
  const lineStart = start === 0 ? 0 : text.lastIndexOf('\n', start - 1) + 1;
  const lastSelected = end > start ? end - 1 : end;
  const nextNewline = text.indexOf('\n', lastSelected);
  const lineEnd = nextNewline < 0 ? text.length : nextNewline;
  const selected = text.slice(lineStart, lineEnd) || fallback;
  const replacement = selected
    .split('\n')
    .map((line) => prefix + line)
    .join('\n');
  return {
    content: text.slice(0, lineStart) + replacement + text.slice(lineEnd),
    selectionStart: lineStart,
    selectionEnd: lineStart + replacement.length,
  };
}
