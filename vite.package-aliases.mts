import path from 'node:path';

const configDirectory = import.meta.dirname;

export const packageAliases = {
  '@moritzbrantner/electron-commands/main': path.resolve(configDirectory, 'packages/electron-commands/src/main.ts'),
  '@moritzbrantner/electron-commands/preload': path.resolve(
    configDirectory,
    'packages/electron-commands/src/preload.ts',
  ),
  '@moritzbrantner/electron-commands/renderer': path.resolve(
    configDirectory,
    'packages/electron-commands/src/renderer.ts',
  ),
  '@moritzbrantner/electron-commands/shared': path.resolve(configDirectory, 'packages/electron-commands/src/shared.ts'),
  '@moritzbrantner/electron-documents/main': path.resolve(configDirectory, 'packages/electron-documents/src/main.ts'),
  '@moritzbrantner/electron-documents/preload': path.resolve(
    configDirectory,
    'packages/electron-documents/src/preload.ts',
  ),
  '@moritzbrantner/electron-documents/renderer': path.resolve(
    configDirectory,
    'packages/electron-documents/src/renderer.ts',
  ),
  '@moritzbrantner/electron-documents/shared': path.resolve(
    configDirectory,
    'packages/electron-documents/src/shared.ts',
  ),
  '@moritzbrantner/electron-json-store/main': path.resolve(configDirectory, 'packages/electron-json-store/src/main.ts'),
  '@moritzbrantner/electron-json-store/shared': path.resolve(
    configDirectory,
    'packages/electron-json-store/src/shared.ts',
  ),
  '@moritzbrantner/electron-preferences/main': path.resolve(
    configDirectory,
    'packages/electron-preferences/src/main.ts',
  ),
  '@moritzbrantner/electron-preferences/preload': path.resolve(
    configDirectory,
    'packages/electron-preferences/src/preload.ts',
  ),
  '@moritzbrantner/electron-preferences/renderer': path.resolve(
    configDirectory,
    'packages/electron-preferences/src/renderer.ts',
  ),
  '@moritzbrantner/electron-preferences/shared': path.resolve(
    configDirectory,
    'packages/electron-preferences/src/shared.ts',
  ),
  '@moritzbrantner/electron-window-state/main': path.resolve(
    configDirectory,
    'packages/electron-window-state/src/main.ts',
  ),
  '@moritzbrantner/electron-window-state/shared': path.resolve(
    configDirectory,
    'packages/electron-window-state/src/shared.ts',
  ),
};
