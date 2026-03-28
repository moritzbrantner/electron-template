import { expect, test } from '@playwright/test';

import { TEST_USERS } from '@/src/testing/test-users';

const seededUser = TEST_USERS.find((user) => user.email === 'user@example.com');

if (!seededUser) {
  throw new Error('Expected default e2e test user to exist');
}

test.describe('authentication', () => {
  test('shows client-side validation errors on the registration form', async ({ page }) => {
    await page.goto('/en/register');

    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Email is required.')).toBeVisible();
    await expect(page.getByText('Password is required.')).toBeVisible();
    await expect(page.getByText('Please confirm your password.')).toBeVisible();
  });

  test('shows login errors for invalid credentials', async ({ page }) => {
    await page.goto('/en/login');

    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.getByText('Email or password is incorrect.')).toBeVisible();
    await expect(page).toHaveURL('/en/login');
  });

  test('registers a new account and lands on the profile page', async ({ page }) => {
    const email = `playwright-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const password = 'StrongPass123';

    await page.goto('/en/register');

    await expect(page.getByRole('heading', { name: 'Start with a secure account and get into the app immediately.' })).toBeVisible();

    await page.getByLabel('Display name').fill('Playwright User');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL('/en/profile');
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();

    await page.getByRole('button', { name: 'Open user menu' }).click();
    await page.getByRole('button', { name: 'Log out' }).click();

    await expect(page).toHaveURL('/en');
    await expect(page.getByRole('link', { name: 'Register' })).toBeVisible();
  });

  test('logs in through the custom page and logs out from the profile menu', async ({ page }) => {
    await page.goto('/en/login');

    await expect(page.getByRole('heading', { name: 'Sign in to continue where you left off.' })).toBeVisible();

    await page.getByLabel('Email').fill(seededUser.email);
    await page.getByLabel('Password').fill(seededUser.password);
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL('/en/profile');
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();

    await page.getByRole('button', { name: 'Open user menu' }).click();
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
    await page.getByRole('button', { name: 'Log out' }).click();

    await expect(page).toHaveURL('/en');
    await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
  });
});
