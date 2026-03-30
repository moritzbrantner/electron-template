import path from 'node:path';
import { test as base, expect, type ElectronApplication, type Page } from '@playwright/test';
import { _electron as electron } from 'playwright';
import electronPath from 'electron';

type ElectronFixtures = {
  app: ElectronApplication;
  page: Page;
};

export const test = base.extend<ElectronFixtures>({
  app: async ({}, use) => {
    const appRoot = path.resolve(__dirname, '../..');

    const app = await electron.launch({
      executablePath: electronPath as unknown as string,
      args: ['--no-sandbox', '--disable-gpu', appRoot],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PLAYWRIGHT_E2E: '1',
      },
    });

    await use(app);
    await app.close();
  },
  page: async ({ app }, use) => {
    const page = await app.firstWindow();
    await expect(page.locator('#app')).toBeVisible();
    await use(page);
  },
});

export { expect };