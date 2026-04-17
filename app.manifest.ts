export const appManifest = {
  appId: 'desktop',
  slug: 'desktop',
  displayName: 'Desktop',
  platform: 'desktop',
  packageName: 'desktop',
  entryWorkspace: '.',
  releaseCadence: 'independent',
  sharedPackages: [
    '@moritzbrantner/electron-commands',
    '@moritzbrantner/electron-documents',
    '@moritzbrantner/electron-json-store',
    '@moritzbrantner/electron-preferences',
    '@moritzbrantner/electron-window-state',
    '@moritzbrantner/maps',
    '@moritzbrantner/ui',
  ],
  featureFlags: ['desktop-template', 'documents', 'uploads'],
  deployment: {
    runtime: 'electron',
    entrypoint: '.vite/build/main.js',
  },
} as const;
