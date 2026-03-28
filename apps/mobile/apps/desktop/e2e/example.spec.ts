import { expect, test } from '@playwright/test';

test('renders smoke test page', async ({ page }) => {
  await page.goto('data:text/html,<title>desktop e2e</title><h1>desktop ok</h1>');

  await expect(page).toHaveTitle('desktop e2e');
  await expect(page.getByRole('heading', { name: 'desktop ok' })).toBeVisible();
});
