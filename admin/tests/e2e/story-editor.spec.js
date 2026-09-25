import { test, expect } from '@playwright/test';
import { collectPageErrors } from './helpers/errors.js';
import { canvas, canvasFrame, openPostEditor, savePost, wpRest } from './helpers/editor.js';
import { countBarMarks } from './helpers/chart.js';
import { createChart, deleteChart, getChart } from './helpers/rest.js';

/*
 * The story block in the REAL block editor.
 *
 * The JSDOM tests beside blocks/story cover the component logic against a
 * stubbed `window.wp`; what they cannot check is that the WordPress this
 * plugin ships against actually has the pieces the script reaches for —
 * PlainText, useInnerBlocksProps' real signature, and above all whether a
 * dynamic parent block whose save returns InnerBlocks.Content keeps its
 * children through a save. That last one fails silently: the steps just
 * stop being there.
 *
 * Exercises the SERVED plugin, so run it against a checkout that carries
 * this branch's blocks/ and includes/ (or `yarn -s dev` on :5180 plus them).
 */

const ROUTE = 'pages';
const ANNOTATIONS = [
  { id: 'a1', type: 'line', axis: 'y', value: 1500000, label: 'Meta anual', color: 'signal' },
  { id: 'a2', type: 'line', axis: 'y', value: 500000, label: 'Piso', color: 'muted' }
];

test.describe('vpress/story in the block editor', () => {
  let chartId = null;
  let postId = null;

  test.afterEach(async ({ page }) => {
    // Runs on failure too: never leave the E2E page or chart behind.
    if (postId) {
      await wpRest(page.request, 'DELETE', `${ROUTE}/${postId}?force=true`);
      postId = null;
    }
    if (chartId) {
      await deleteChart(page.request, chartId);
      chartId = null;
    }
  });

  test('inserts two steps, drives the preview from the selected one, and saves them', async ({ page }) => {
    const { errors, report } = collectPageErrors(page);

    const source = await getChart(page.request, 1);
    const config = JSON.parse(source.data.value);
    chartId = await createChart(page.request, {
      datasetId: source.data.dataset_id,
      value: { ...config, annotations: ANNOTATIONS, annotationSeq: 2 }
    });

    const draft = await wpRest(page.request, 'POST', ROUTE, { title: 'E2E vpress story editor', status: 'draft' });
    postId = draft.id;
    await openPostEditor(page, postId);
    const doc = canvas(page);
    const frame = await canvasFrame(page);

    // a. Insert through the real inserter; a story arrives with two steps.
    await page.getByRole('button', { name: /^(Block Inserter|Add block|Toggle block inserter)$/ }).first().click();
    await page.getByRole('searchbox', { name: /search/i }).first().fill('Vpress story');
    await page.getByRole('option', { name: 'Vpress story' }).first().click();

    await expect(doc.locator('.wp-block-vpress-story')).toHaveCount(1);
    const steps = doc.locator('.wp-block-vpress-story-step');
    await expect(steps, 'one step is not a story').toHaveCount(2);

    // b. Pick the chart; it draws inside the canvas iframe.
    const figure = `figure[data-vpress-chart="${chartId}"]`;
    const picker = doc.locator('.wp-block-vpress-story').getByRole('combobox', { name: 'Chart' });
    await picker.fill(`Chart #${chartId}`);
    await doc.getByRole('option', { name: `Chart #${chartId}`, exact: true }).click();
    await expect(doc.locator(figure)).toHaveCount(1);
    await expect
      .poll(() => countBarMarks(frame, figure), { message: 'bar marks in the canvas', timeout: 20_000 })
      .toBeGreaterThanOrEqual(5);

    // c. The step Inspector lists the CHART's own annotations, by label.
    await steps.first().click();
    expect(await page.locator('.vpress-story-step__annotation-label').allTextContents()).toEqual([
      'Meta anual (a1)',
      'Piso (a2)'
    ]);
    const show = page.getByRole('checkbox', { name: 'Show' });
    await expect(show, 'no allow-list yet, so everything is visible').toHaveCount(2);
    for (const box of await show.all()) await expect(box).toBeChecked();

    // d. Editing the step drives the live preview, which is what makes the
    //    editor show what the reader will get at this point in the scroll.
    await show.first().click();
    await expect
      .poll(
        () =>
          frame.evaluate(() => {
            const node = document.querySelector('[data-annotation-id="a1"]');
            return node ? node.classList.contains('vpress-annotation--hidden') : 'missing';
          }),
        { message: 'the preview hid the annotation the step hides', timeout: 10_000 }
      )
      .toBe(true);

    // e. "Capturar estado actual" writes what the chart is really showing.
    await page.getByRole('button', { name: 'Capturar estado actual' }).click();
    await expect(page.locator('.vpress-story-step__notice')).toHaveText('Captured: 1 visible.');

    await page.screenshot({ path: 'tests/e2e/screenshots/story-editor.png' });

    // f. The save keeps the steps. A dynamic parent whose save returned null
    //    would serialize to a self-closing comment and drop them, silently.
    await savePost(page);
    const saved = await wpRest(page.request, 'GET', `${ROUTE}/${postId}?context=edit`);
    expect(saved.content.raw).toContain('<!-- /wp:vpress/story -->');
    const stepComments = saved.content.raw.match(/<!-- wp:vpress\/story-step/g) || [];
    expect(stepComments, 'both steps survived the save').toHaveLength(2);

    const first = saved.content.raw.match(/<!-- wp:vpress\/story-step (\{.*?\}) \/?-->/);
    expect(first, `a step comment in:\n${saved.content.raw}`).not.toBeNull();
    expect(JSON.parse(first[1]).overrides).toEqual({ show: ['a2'], emphasize: [] });

    expect(errors, `console/page errors in the editor (top window + canvas):${report()}`).toEqual([]);
  });
});
