import path from 'node:path';
import { defineConfig } from 'vite';

import { packageAliases } from './vite.package-aliases';

export default defineConfig({
  base: './',
  build: {
    emptyOutDir: false,
    outDir: '.vite/renderer/main_window',
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
    },
  },
  resolve: {
    alias: {
      ...packageAliases,
      // @moritzbrantner/maps imports named exports from polygon-clipping, whose ESM build only has a
      // default export. Rollup rejects that, so resolve the CommonJS build, which interop handles.
      // Remove once moritzbrantner/maps#183 is fixed.
      'polygon-clipping': path.resolve(
        __dirname,
        'node_modules/polygon-clipping/dist/polygon-clipping.cjs.js',
      ),
    },
  },
});
