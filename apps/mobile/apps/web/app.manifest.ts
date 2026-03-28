export const appManifest = {
  appId: 'web',
  slug: 'web',
  displayName: 'Web',
  platform: 'web',
  packageName: 'web',
  entryWorkspace: 'apps/web',
  releaseCadence: 'independent',
  sharedPackages: ['@repo/ui', '@repo/upload-playbook'],
  featureFlags: ['profiles', 'communication', 'uploads', 'forms', '3d'],
  deployment: {
    runtime: 'nextjs',
    defaultPort: 4001,
  },
} as const;
