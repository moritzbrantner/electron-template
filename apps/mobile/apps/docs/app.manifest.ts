export const appManifest = {
  appId: 'docs',
  slug: 'docs',
  displayName: 'Docs',
  platform: 'web',
  packageName: 'docs',
  entryWorkspace: 'apps/docs',
  releaseCadence: 'independent',
  sharedPackages: ['@repo/ui'],
  featureFlags: ['docs-home'],
  deployment: {
    runtime: 'nextjs',
    defaultPort: 3001,
  },
} as const;
