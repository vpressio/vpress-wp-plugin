import process from 'node:process';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { collectPageErrors } from './helpers/errors.js';

/*
 * Accessibility of the public chart figure (chart #1: grouped bars).
 *
 * Runs against the standalone chart page /chart/1/ of the served site, or,
 * when E2E_FIXTURE_URL is set, against the static fixture that
 * tests/php/render-fixture.php generates from vpress_render_figure(1)
 * (the server markup can be checked before that PHP is what MAMP serves):
 *
 *   php tests/php/render-fixture.php && (cd admin && yarn build)
 *   python3 -m http.server 5188 --directory admin
 *   E2E_FIXTURE_URL=http://localhost:5188/tests/fixtures/embed.html yarn test:e2e a11y --no-deps
 */
const TARGET = process.env.E2E_FIXTURE_URL || '/chart/1/';
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa'];

// Anonymous visitors.
test.use({ storageState: { cookies: [], origins: [] } });

async function openChart(page) {
  await page.goto(TARGET);
  const slot = page.locator('.vpress-figure .vpress-figure__chart').first();
  await expect(slot).toHaveAttribute('aria-busy', 'false', { timeout: 20_000 });
  await expect(slot.locator('svg rect[tabindex="0"]').first()).toBeAttached();
  return slot;
}

test('chart #1 has no critical or serious axe violations (WCAG 2.1 AA)', async ({ page }) => {
  const { errors, report } = collectPageErrors(page);
  await openChart(page);

  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const blocking = results.violations.filter((v) => ['critical', 'serious'].includes(v.impact));
  const summary = results.violations
    .map((v) => `${v.impact} ${v.id}: ${v.help}\n${v.nodes.map((n) => `    ${n.target.join(' ')}`).join('\n')}`)
    .join('\n');
  if (summary) console.log(`axe violations on ${TARGET}:\n${summary}`);

  expect(blocking, `critical/serious axe violations:\n${summary}`).toEqual([]);
  expect(errors, `console/page errors:${report()}`).toEqual([]);
});

test('the figure carries the server-rendered description and data table', async ({ page }) => {
  const slot = await openChart(page);
  const figure = page.locator('.vpress-figure').first();
  const figureId = await figure.getAttribute('id');

  await expect(slot).toHaveAttribute('aria-describedby', `${figureId}-desc`);
  const desc = page.locator(`[id="${figureId}-desc"]`);
  await expect(desc).toHaveClass(/vpress-figure__alt/);
  await expect(desc).toHaveText(/Bar chart of .* by .*, \d+ categories/);

  const rows = figure.locator('details.vpress-figure__data table tbody tr');
  expect(await rows.count()).toBeGreaterThanOrEqual(1);

  // The same text reaches the chart's <svg> as its <desc>.
  await expect(slot.locator('svg > desc')).toHaveText(await desc.textContent());
});

test('Tab from the figure focuses the first bar and shows its tooltip; Escape hides it', async ({ page }) => {
  await openChart(page);
  const figure = page.locator('.vpress-figure').first();
  const firstMark = figure.locator('svg rect[tabindex="0"]').first();

  // Start from the figure itself (made programmatically focusable).
  await figure.evaluate((el) => {
    el.setAttribute('tabindex', '-1');
    el.focus();
  });
  await page.keyboard.press('Tab');

  await expect(firstMark).toBeFocused();
  await expect(firstMark).toHaveAttribute('aria-label', /.+: .+/);
  await expect(firstMark).toHaveCSS('outline-style', 'solid');

  const tip = page.locator('.d3-tip');
  await expect(tip).toHaveCSS('opacity', '1');
  await expect(tip).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(tip).toHaveCSS('opacity', '0');
  await expect(firstMark).toBeFocused();
});

test('a multi-series chart saved with labels off still shows direct value labels', async ({ page }) => {
  // Chart #1 has three canal series and "labels": false.
  const slot = await openChart(page);
  const labels = slot.locator('svg .dbox-label');
  await expect(labels.first()).toBeVisible();
  // Each label carries its own value with a unit, e.g. "2,1 M" / "690 mil".
  await expect(labels.first()).toHaveText(/\d.*\S/);
  expect(await labels.evaluateAll((els) => els.filter((el) => window.getComputedStyle(el).display !== 'none').length)).toBe(24);
});
