import { expect, test } from '@playwright/test';

test('the user can open the about page from the home page', async ({ page }) => {
  await page.goto('/en');

  await page.getByRole('link', { name: 'About' }).click();

  await expect(page).toHaveURL('/en/about');
  await expect(page.getByRole('heading', { name: 'About This Project' })).toBeVisible();
});
