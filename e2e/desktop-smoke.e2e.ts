import { expect } from '@playwright/test';

import { test } from './fixtures/electron';

async function runCommand(page: import('@playwright/test').Page, commandId: string) {
  await page.evaluate(async (id) => {
    await window.desktop.commands.run(id);
  }, commandId);
}

test('renders the default desktop route with a shared package label', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Electron template' })).toBeVisible();
  await expect(page.getByText('shared:desktop-launch')).toBeVisible();
});

test('renders shared navigation and core foundation routes', async ({ page }) => {
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  await page.getByRole('link', { name: 'Uploads' }).click();
  await expect(page.getByRole('heading', { name: 'Uploads' })).toBeVisible();

  await page.getByRole('link', { name: 'Data entry' }).click();
  await expect(page.getByRole('heading', { name: 'Data entry' })).toBeVisible();
});

test('opens settings through the command registry', async ({ page }) => {
  await runCommand(page, 'app.openPreferences');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});

test('keeps the native document page app-owned', async ({ page }) => {
  await page.evaluate(() => {
    window.location.hash = '#/documents';
  });
  await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();
  await expect(page.locator('textarea.document-editor')).toBeVisible();
});
