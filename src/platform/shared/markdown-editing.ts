export function insertCodeFence(text: string, start: number, end: number) {
  const selected = text.slice(start, end) || 'code block';
  const prefix = `${start > 0 && text[start - 1] !== '\n' ? '\n' : ''}\`\`\`\n`;
  const suffix = `\n\`\`\`${end < text.length && text[end] !== '\n' ? '\n' : ''}`;
  return {
    content: text.slice(0, start) + prefix + selected + suffix + text.slice(end),
    selectionStart: start + prefix.length,
    selectionEnd: start + prefix.length + selected.length,
  };
}
