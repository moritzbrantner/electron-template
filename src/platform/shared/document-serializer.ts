import type { DocumentSerializer } from '@moritzbrantner/electron-documents/main';

export const desktopDocumentSerializer: DocumentSerializer = {
  deserialize(raw: string, filePath: string) {
    if (typeof raw !== 'string') {
      throw new Error(`Invalid markdown payload in ${filePath}`);
    }

    return {
      content: raw.replaceAll('\r\n', '\n'),
    };
  },
  extension: 'md',
  name: 'Markdown document',
  serialize(value) {
    if (value.content.length === 0) {
      return '';
    }

    return value.content.endsWith('\n') ? value.content : `${value.content}\n`;
  },
};
