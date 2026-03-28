import { expect } from '@playwright/test';
import { test } from './fixtures/electron';

test('renders the default desktop route with a shared package label', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Hello Electron!' })).toBeVisible();
  await expect(page.getByText('shared:desktop-launch')).toBeVisible();
});

test('navigates to the settings route', async ({ page }) => {
  await page.getByRole('link', { name: 'Settings' }).click();

  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Light mode' })).toBeVisible();
});
