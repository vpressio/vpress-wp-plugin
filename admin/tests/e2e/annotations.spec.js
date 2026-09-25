import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { collectPageErrors } from './helpers/errors.js';
import { createChart, deleteChart, getChart } from './helpers/rest.js';

/*
 * An annotated chart on its public page.
 *
 * The chart is created through /chart/create and deleted again, so this
 * never depends on what happens to be seeded. It exercises the SERVED
 * embed bundle: run it against a build that carries the annotation code
 * (the built admin/dist, or `yarn -s dev` on :5180 from this worktree,
 * which the plugin prefers when that port answers).
 */

const ANNOTATION = {
  id: 'a1',
  type: 'line',
  axis: 'y',
  value: 1000000,
  label: 'Meta anual',
  color: 'signal'
};

test.describe('chart annotations on the public page', () => {
  let chartId = null;

  test.afterEach(async ({ page }) => {
    // Runs on failure too: never leave the E2E chart behind.
    if (chartId) {
      await deleteChart(page.request, chartId);
      chartId = null;
    }
  });

  test('a line annotation renders, is keyboard reachable and logs nothing', async ({ page }) => {
    const { errors, report } = collectPageErrors(page);

    // Chart #1's own config, plus one annotation, on chart #1's dataset.
    const source = await getChart(page.request, 1);
    const config = JSON.parse(source.data.value);
    chartId = await createChart(page.request, {
      datasetId: source.data.dataset_id,
      value: { ...config, annotations: [ANNOTATION] }
    });

    await page.goto(`/chart/${chartId}/`);

    const slot = page.locator('.vpress-figure .vpress-figure__chart').first();
    await expect(slot).toHaveAttribute('aria-busy', 'false', { timeout: 20_000 });

    // a. One annotations group, drawn after the marks, with one rule.
    const group = slot.locator('svg .vpress-annotations');
    await expect(group).toHaveCount(1);
    await expect(group.locator('[data-annotation-id="a1"]')).toHaveCount(1);
    await expect(group.locator('.vpress-annotation__rule')).toHaveCount(1);
    expect(
      await group.evaluate((el) => el.parentElement.lastElementChild === el),
      'the annotations group is appended last, so it sits above the marks'
    ).toBe(true);

    // b. The label is reachable by keyboard, like the data marks are.
    const label = group.locator('.vpress-annotation__label');
    await expect(label).toHaveText(ANNOTATION.label);
    await expect(label).toHaveAttribute('aria-label', ANNOTATION.label);
    await expect(label).toHaveAttribute('role', 'graphics-symbol');
    await label.evaluate((el) => el.focus());
    await expect(label).toBeFocused();

    // c. The colour token resolved through its CSS custom property, and the
    //    annotation is at full opacity the moment the figure says it is idle
    //    (no fade-in: anything that screenshots on that signal would catch it
    //    part-way through one).
    expect(
      await label.evaluate((el) => {
        const style = el.ownerDocument.defaultView.getComputedStyle(el);
        return { fill: style.fill, opacity: style.opacity };
      })
    ).toEqual({ fill: 'rgb(176, 23, 60)', opacity: '1' });

    // The server-rendered description names it too; that half is covered by
    // FigureTextTest, which does not need the served PHP to be this branch.

    // d. New focusable SVG content on a public page: axe must still be clean.
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    const blocking = results.violations.filter((v) => ['critical', 'serious'].includes(v.impact));
    expect(
      blocking,
      `critical/serious axe violations:\n${blocking.map((v) => `${v.id}: ${v.help}`).join('\n')}`
    ).toEqual([]);

    await page.screenshot({ path: 'tests/e2e/screenshots/annotations.png', fullPage: true });
    expect(errors, `console/page errors on /chart/${chartId}:${report()}`).toEqual([]);
  });
});
