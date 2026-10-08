import type { DocumentSerializer } from '@moritzbrantner/electron-documents/main';

export const desktopDocumentSerializer: DocumentSerializer = {
  deserialize(raw: string, filePath: string) {
    if (typeof raw !== 'string') {
      throw new Error(`Invalid markdown payload in ${filePath}`);
    }

    if (filePath.toLowerCase().endsWith('.json')) {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !('content' in parsed) ||
        typeof parsed.content !== 'string'
      ) {
        throw new Error(`Invalid legacy document payload in ${filePath}`);
      }
      return { content: parsed.content };
    }
    return { content: raw };
  },
  extension: 'md',
  name: 'Markdown document',
  serialize(value, filePath) {
    if (filePath?.toLowerCase().endsWith('.json')) {
      return `${JSON.stringify({ content: value.content, version: 1 }, null, 2)}\n`;
    }
    return value.content;
  },
};
