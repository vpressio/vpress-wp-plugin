import { test as setup } from '@playwright/test';
import { loadCredentials, STORAGE_STATE } from '../helpers/credentials.js';
import { login } from '../helpers/login.js';

setup('log into WordPress as the E2E user', async ({ page }) => {
  await login(page, loadCredentials());
  await page.context().storageState({ path: STORAGE_STATE });
});
