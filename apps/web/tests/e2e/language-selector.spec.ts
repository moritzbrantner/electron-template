import { expect, test } from '@playwright/test';

test('user can switch locale from the navbar and stay on the same route', async ({ page }) => {
  await page.goto('/en/story');

  await expect(page).toHaveURL('/en/story');
  await expect(page.getByRole('heading', { name: 'Story Scroll Demo' })).toBeVisible();

  await page.getByRole('group', { name: 'Language selector' }).getByRole('link', { name: 'DE' }).click();

  await expect(page).toHaveURL('/de/story');
  await expect(page.getByRole('heading', { name: 'Story-Scroll-Demo' })).toBeVisible();
});
