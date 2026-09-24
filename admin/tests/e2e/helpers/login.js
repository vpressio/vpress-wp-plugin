import { expect } from '@playwright/test';

/** Log into WordPress through the real /wp-login.php form. */
export async function login(page, { user, password }) {
  if (!user || !password) {
    throw new Error(
      'Missing E2E credentials: set E2E_USER/E2E_PASSWORD or tests/e2e/.auth/credentials.json'
    );
  }
  await page.goto('/wp-login.php');
  const userField = page.locator('#user_login');
  const passField = page.locator('#user_pass');
  // wp-login.php refocuses #user_login on a timer after load; typing that
  // races it lands the password in the username box. Re-fill until both hold.
  await expect(async () => {
    await userField.fill(user);
    await passField.fill(password);
    await expect(userField).toHaveValue(user, { timeout: 500 });
    await expect(passField).toHaveValue(password, { timeout: 500 });
  }).toPass({ timeout: 10_000 });
  await page.locator('#wp-submit').click();
  await expect(page.locator('#wpadminbar')).toBeVisible();
}
