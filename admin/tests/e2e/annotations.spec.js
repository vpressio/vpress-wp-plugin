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

// In the axis domain.
const ANNOTATION = {
  id: 'a1',
  type: 'line',
  axis: 'y',
  value: 1000000,
  label: 'Meta anual',
  color: 'signal'
};

// Far ABOVE it — "a target line above every bar", the commonest editorial
// annotation there is. A linear scale extrapolates past its domain rather
// than refusing, so this used to draw over the top margin with its label
// clamped inside the plot, visibly detached from its own rule.
const ABOVE_DOMAIN = {
  id: 'a2',
  type: 'line',
  axis: 'y',
  value: 99999999,
  label: 'Meta imposible',
  color: 'muted'
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
      value: { ...config, annotations: [ANNOTATION, ABOVE_DOMAIN] }
    });

    await page.goto(`/chart/${chartId}/`);

    const slot = page.locator('.vpress-figure .vpress-figure__chart').first();
    await expect(slot).toHaveAttribute('aria-busy', 'false', { timeout: 20_000 });

    // a. One annotations group, drawn after the marks, one rule each.
    const group = slot.locator('svg .vpress-annotations');
    await expect(group).toHaveCount(1);
    await expect(group.locator('[data-annotation-id="a1"]')).toHaveCount(1);
    await expect(group.locator('.vpress-annotation__rule')).toHaveCount(2);
    expect(
      await group.evaluate((el) => el.parentElement.lastElementChild === el),
      'the annotations group is appended last, so it sits above the marks'
    ).toBe(true);

    // a2. WHERE the rules land, not just that they exist. The plot's own
    //     height is the y of the x-axis baseline, in the same local
    //     coordinates the annotations are drawn in.
    const geometry = await group.evaluate((el) => {
      const plot = el.parentElement;
      // The x axis is translated down by exactly the plot height, in the same
      // local coordinates the annotations are drawn in. Read it through the
      // SVG transform API rather than parsing the attribute.
      const axis = plot.querySelector('.x.axis');
      const matrix = axis && axis.transform.baseVal.consolidate();
      const rule = (id) => {
        const line = plot.querySelector(`[data-annotation-id="${id}"] .vpress-annotation__rule`);
        return line ? Number(line.getAttribute('y1')) : null;
      };
      return {
        height: matrix ? matrix.matrix.f : null,
        inDomain: rule('a1'),
        aboveDomain: rule('a2')
      };
    });

    expect(geometry.height, 'plot height read off the x-axis transform').toBeGreaterThan(0);
    expect(geometry.inDomain).toBeGreaterThan(0);
    expect(geometry.inDomain).toBeLessThan(geometry.height);
    expect(
      geometry.aboveDomain,
      'a value past the top of the axis pins to the plot edge, never over the margin'
    ).toBe(0);

    // b. The label is reachable by keyboard, like the data marks are.
    const label = group.locator('[data-annotation-id="a1"] .vpress-annotation__label');
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
