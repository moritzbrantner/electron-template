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
  server: {
    fs: {
      allow: [path.resolve(__dirname, '../platform-packages/packages/maps')],
    },
  },
  resolve: {
    alias: packageAliases,
    dedupe: ['react', 'react-dom'],
  },
});
