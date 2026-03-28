import { expect, test } from '@playwright/test';

test('renders smoke test page', async ({ page }) => {
  await page.goto('data:text/html,<title>web e2e</title><h1>web ok</h1>');

  await expect(page).toHaveTitle('web e2e');
  await expect(page.getByRole('heading', { name: 'web ok' })).toBeVisible();
});
