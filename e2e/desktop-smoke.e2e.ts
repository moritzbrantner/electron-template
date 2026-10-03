import path from 'node:path';

import { expect, type Page } from '@playwright/test';
import { _electron as electron } from 'playwright';
import electronPath from 'electron';

import { test } from './fixtures/electron';

// Desktop smoke coverage keeps the scaffold contract focused on renderer, settings,
// document, and upload flows instead of example-only behavior.
const shortcutKey = process.platform === 'darwin' ? 'Meta' : 'Control';
const defaultHomeHotkey = 'CmdOrCtrl+1';
const defaultDocumentsHotkey = 'CmdOrCtrl+3';
const defaultUploadsHotkey = 'CmdOrCtrl+4';

function getNavigationHotkeyInput(page: Page, label: string) {
  return page.locator('.hotkey-row').filter({ hasText: label }).locator('input.hotkey-input');
}

async function updateNavigationHotkey(page: Page, label: string, accelerator: string) {
  const input = getNavigationHotkeyInput(page, label);
  await input.fill(accelerator);
  await input.press('Tab');
}

async function runCommand(page: Page, commandId: string) {
  await page.evaluate(async (id) => {
    await window.desktop.commands.run(id);
  }, commandId);
}

async function relaunchElectronApp(userDataDir: string) {
  const appRoot = path.resolve(__dirname, '..');

  return electron.launch({
    executablePath: electronPath as unknown as string,
    args: ['--no-sandbox', '--disable-gpu', appRoot],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PLAYWRIGHT_E2E: '1',
      PLAYWRIGHT_E2E_USER_DATA_DIR: userDataDir,
    },
  });
}

test('renders the default desktop route with a shared package label', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Electron template' })).toBeVisible();
  await expect(page.getByText('shared:desktop-launch')).toBeVisible();
});

test('persists the selected theme across relaunch', async ({ app, page, userDataDir }) => {
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Dark mode' }).click();

  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');

  await app.close();

  const relaunchedApp = await relaunchElectronApp(userDataDir);
  const relaunchedPage = await relaunchedApp.firstWindow();

  await expect
    .poll(() => relaunchedPage.evaluate(() => document.documentElement.dataset.theme))
    .toBe('dark');

  await relaunchedApp.close();
});

test('opens settings through the command registry', async ({ page }) => {
  await runCommand(page, 'app.openPreferences');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});

test('updates a navigation hotkey and keeps it after relaunch', async ({ app, page, userDataDir }) => {
  const uploadsHotkey = 'Alt+Shift+U';

  await page.getByRole('link', { name: 'Settings' }).click();
  await updateNavigationHotkey(page, 'Uploads', uploadsHotkey);

  await expect(getNavigationHotkeyInput(page, 'Uploads')).toHaveValue(uploadsHotkey);

  await page.getByRole('link', { name: 'Home' }).click();
  await page.keyboard.press(uploadsHotkey);
  await expect(page.getByRole('heading', { name: 'Uploads' })).toBeVisible();

  await app.close();

  const relaunchedApp = await relaunchElectronApp(userDataDir);
  const relaunchedPage = await relaunchedApp.firstWindow();

  await relaunchedPage.getByRole('link', { name: 'Settings' }).click();
  await expect(getNavigationHotkeyInput(relaunchedPage, 'Uploads')).toHaveValue(uploadsHotkey);

  await relaunchedPage.getByRole('link', { name: 'Home' }).click();
  await relaunchedPage.keyboard.press(uploadsHotkey);
  await expect(relaunchedPage.getByRole('heading', { name: 'Uploads' })).toBeVisible();

  await relaunchedApp.close();
});

test('rejects conflicting hotkeys and reset restores defaults', async ({ page }) => {
  const homeHotkey = 'Alt+Shift+H';

  await page.getByRole('link', { name: 'Settings' }).click();
  await updateNavigationHotkey(page, 'Home', homeHotkey);
  await expect(getNavigationHotkeyInput(page, 'Home')).toHaveValue(homeHotkey);

  await updateNavigationHotkey(page, 'Uploads', defaultDocumentsHotkey);
  await expect(getNavigationHotkeyInput(page, 'Uploads')).toHaveValue(defaultUploadsHotkey);

  await updateNavigationHotkey(page, 'Uploads', 'CmdOrCtrl+S');
  await expect(getNavigationHotkeyInput(page, 'Uploads')).toHaveValue(defaultUploadsHotkey);

  await page.getByRole('button', { name: 'Reset navigation hotkeys' }).click();

  await expect(getNavigationHotkeyInput(page, 'Home')).toHaveValue(defaultHomeHotkey);
  await expect(getNavigationHotkeyInput(page, 'Uploads')).toHaveValue(defaultUploadsHotkey);

  await page.getByRole('link', { name: 'Settings' }).click();
  await page.keyboard.press(`${shortcutKey}+1`);
  await expect(page.getByRole('heading', { name: 'Electron template' })).toBeVisible();
});

test('saves and reopens a document through the command-backed document flow', async ({ page }) => {
  await page.getByRole('link', { name: 'Documents' }).click();

  const editor = page.locator('textarea.document-editor');
  await editor.fill('# Playwright save flow\n\nThis document came from Playwright.');
  await expect(page.locator('.document-preview h1')).toHaveText('Playwright save flow');

  await runCommand(page, 'document.save');
  await expect(page.getByText(/Saved e2e-document\.md/)).toBeVisible();

  await runCommand(page, 'document.new');
  await expect(editor).toHaveValue(
    '# Untitled document\n\nStart writing in Markdown.\n\n- Add headings, lists, and links\n- Save with CmdOrCtrl+S\n- Reopen from the recent files list',
  );

  await page.getByRole('button', { name: /e2e-document\.md/ }).click();
  await expect(editor).toHaveValue('# Playwright save flow\n\nThis document came from Playwright.');
});

test('queues an upload and restores it after relaunch', async ({ app, page, userDataDir }) => {
  await page.getByRole('link', { name: 'Uploads' }).click();
  await page.getByRole('button', { name: 'Pick files' }).click();

  await expect(page.getByRole('heading', { name: 'upload-success.txt' })).toBeVisible();
  await expect(page.getByText('Queued 1 file for upload.', { exact: true })).toBeVisible();

  await app.close();

  const relaunchedApp = await relaunchElectronApp(userDataDir);
  const relaunchedPage = await relaunchedApp.firstWindow();

  await relaunchedPage.getByRole('link', { name: 'Uploads' }).click();
  await expect(relaunchedPage.getByRole('heading', { name: 'upload-success.txt' })).toBeVisible();
  await expect(relaunchedPage.getByText('Queued 1 file for upload.', { exact: true })).toBeVisible();

  await relaunchedApp.close();
});
