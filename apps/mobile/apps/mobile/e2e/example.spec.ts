import { expect, test } from '@playwright/test';

test('renders smoke test page', async ({ page }) => {
  await page.goto('data:text/html,<title>mobile e2e</title><h1>mobile ok</h1>');

  await expect(page).toHaveTitle('mobile e2e');
  await expect(page.getByRole('heading', { name: 'mobile ok' })).toBeVisible();
});
