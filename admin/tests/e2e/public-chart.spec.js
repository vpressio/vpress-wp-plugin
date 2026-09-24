import { test, expect } from '@playwright/test';
import { collectPageErrors } from './helpers/errors.js';
import { countBarMarks } from './helpers/chart.js';

// The public chart page is what anonymous visitors see.
test.use({ storageState: { cookies: [], origins: [] } });

test('public chart /chart/1 draws its bars with no console errors', async ({ page }) => {
  const { errors, report } = collectPageErrors(page);

  await page.goto('/chart/1/');

  await expect(page.locator('.chart-container .empty-chart svg rect').first()).toBeAttached({
    timeout: 15_000
  });
  await expect
    .poll(() => countBarMarks(page, '.chart-container .empty-chart'), {
      message: 'bar <rect> marks drawn by dbox in the public chart'
    })
    .toBeGreaterThan(0);

  await page.screenshot({ path: 'tests/e2e/screenshots/public-chart.png', fullPage: true });
  expect(errors, `console/page errors on /chart/1:${report()}`).toEqual([]);
});
