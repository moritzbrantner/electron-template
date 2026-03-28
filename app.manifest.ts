export const appManifest = {
  appId: 'desktop',
  slug: 'desktop',
  displayName: 'Desktop',
  platform: 'desktop',
  packageName: 'desktop',
  entryWorkspace: 'apps/desktop',
  releaseCadence: 'independent',
  sharedPackages: ['@repo/upload-playbook'],
  featureFlags: ['library', 'uploads', 'react-query'],
  deployment: {
    runtime: 'electron',
    entrypoint: '.vite/build/main.js',
  },
} as const;
