import { defineConfig } from '@playwright/test';

import { createE2EEnvironment, getE2EBaseURL } from '@/tests/e2e/environment';

const baseURL = getE2EBaseURL();
const e2eEnvironment = createE2EEnvironment(baseURL);

export default defineConfig({
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  testDir: 'tests/e2e',
  timeout: 60_000,
  use: {
    baseURL,
    channel: 'chrome',
  },
  webServer: {
    command: `./scripts/e2e/start-playwright-server.sh ${new URL(baseURL).port}`,
    env: e2eEnvironment,
    url: baseURL,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
