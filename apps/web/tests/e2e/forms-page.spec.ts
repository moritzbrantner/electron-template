import { expect, test } from '@playwright/test';

test('user can navigate to the forms page and submit all fields', async ({ page }) => {
  await page.goto('/en');

  await page.getByRole('link', { name: 'Form Demo' }).click();
  await expect(page).toHaveURL('/en/forms');

  await page.getByLabel('First name').fill('Jane');
  await page.getByLabel('Last name').fill('Doe');
  await page.getByLabel('Email').fill('jane@example.com');
  await page.getByLabel('Phone').fill('5551234567');
  await page.getByLabel('Age').fill('34');
  await page.getByLabel('Job title').fill('Engineering Manager');
  await page.getByLabel('Start date').fill('2024-03-01');
  await page.getByLabel('Department').selectOption('Engineering');
  await page.getByLabel('Subscribe to newsletter').check();
  await page.getByLabel('Short bio').fill('I have worked in product engineering for more than a decade.');

  await page.getByRole('button', { name: 'Submit profile' }).click();

  await expect(
    page.getByRole('status').filter({ hasText: 'Jane Doe submitted their profile for the Engineering team.' }),
  ).toBeVisible();
});

test('form displays validation errors when required fields are empty', async ({ page }) => {
  await page.goto('/en/forms');

  await page.getByRole('button', { name: 'Submit profile' }).click();

  await expect(page.getByText('First name is required.')).toBeVisible();
  await expect(page.getByText('Last name is required.')).toBeVisible();
  await expect(page.getByText('Please enter a valid email.')).toBeVisible();
  await expect(page.getByText('Job title is required.')).toBeVisible();
  await expect(page.getByText('Start date is required.')).toBeVisible();
  await expect(page.getByText('Bio must be at least 20 characters.')).toBeVisible();
});
