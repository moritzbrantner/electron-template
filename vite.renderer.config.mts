import path from 'node:path';
import { defineConfig } from 'vite';

import { packageAliases } from './vite.package-aliases.mts';

export default defineConfig({
  base: './',
  build: {
    emptyOutDir: false,
    outDir: '.vite/renderer/main_window',
    rolldownOptions: {
      input: path.resolve(import.meta.dirname, 'index.html'),
      onLog(level, log, handler) {
        // This is a client-only Electron bundle, so React Server Component
        // boundary hints have no server/client distinction to preserve.
        if (log.code === 'MODULE_LEVEL_DIRECTIVE' && log.message.includes('"use client"')) {
          return;
        }
        handler(level, log);
      },
    },
  },
  resolve: {
    alias: {
      ...packageAliases,
      // @moritzbrantner/maps imports named exports from polygon-clipping, whose ESM build only has a
      // default export. Rollup rejects that, so resolve the CommonJS build, which interop handles.
      // Remove once moritzbrantner/maps#183 is fixed.
      'polygon-clipping': path.resolve(
        import.meta.dirname,
        'node_modules/polygon-clipping/dist/polygon-clipping.cjs.js',
      ),
    },
  },
});
