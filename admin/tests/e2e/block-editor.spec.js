import { test, expect } from '@playwright/test';
import { collectPageErrors } from './helpers/errors.js';
import { countBarMarks } from './helpers/chart.js';
import { canvas, canvasFrame, openPostEditor, savePost, wpRest } from './helpers/editor.js';

const CHART_ID = 1;
// A page, not a post: vpress-theme has no single.html, so a single post falls
// back to index.html — a query loop of titles + excerpts that never prints
// post content (a dynamic block there renders nothing). page.html prints
// <!-- wp:post-content -->. The block editor is the same for both types.
const ROUTE = 'pages';
const FIGURE = `figure.vpress-figure[data-vpress-chart="${CHART_ID}"]`;
const MIN_MARKS = 5;
const DRAW_TIMEOUT = 15_000;

/** Embed tags in a document's <head>, counted inside that document. */
function embedTags(target) {
  return target.evaluate(() => ({
    script: document.head.querySelectorAll('script[data-vpress-embed]').length,
    css: document.head.querySelectorAll('link[data-vpress-embed-css]').length,
    anywhere: document.querySelectorAll('script[data-vpress-embed], link[data-vpress-embed-css]').length
  }));
}

/** A figure drew its chart: ≥ MIN_MARKS bar <rect>s and aria-busy="false". */
async function expectChartDrawn(target, root, label) {
  await expect
    .poll(() => countBarMarks(target, FIGURE), { message: `${label}: bar marks`, timeout: DRAW_TIMEOUT })
    .toBeGreaterThanOrEqual(MIN_MARKS);
  await expect(root.locator(`${FIGURE} .vpress-figure__chart`)).toHaveAttribute('aria-busy', 'false');
}

/** Parse the attributes JSON of the first `<!-- wp:vpress/chart {…} -->` comment. */
function chartBlockAttributes(content) {
  const match = content.match(/<!-- wp:vpress\/chart (\{.*?\}) \/?-->/);
  return match ? JSON.parse(match[1]) : null;
}

test.describe('vpress/chart block: editor preview → save → front end', () => {
  let postId = null; // the page this test created; deleted in afterEach

  test.afterEach(async ({ page }) => {
    // Runs on failure too: never leave the E2E page behind.
    if (postId) {
      await wpRest(page.request, 'DELETE', `${ROUTE}/${postId}?force=true`);
      postId = null;
    }
  });

  test('inserts, previews in the canvas, saves and renders for visitors', async ({ page, browser }) => {
    // page.on('console'/'pageerror') also fires for the canvas iframe (a frame
    // of this page), so this one collector covers both documents.
    const { errors, report } = collectPageErrors(page);

    // a. A fresh draft, opened in the block editor.
    const draft = await wpRest(page.request, 'POST', ROUTE, {
      title: 'E2E vpress block',
      status: 'draft'
    });
    postId = draft.id;
    await openPostEditor(page, postId);
    const frame = await canvasFrame(page);
    const doc = canvas(page);

    // b. The editor config PHP prints for the block.
    const config = await page.evaluate(() => window.vpressBlock);
    expect(config, 'window.vpressBlock in the editor window').toBeTruthy();
    for (const key of ['embedUrl', 'embedCss', 'restRoot', 'adminUrl']) {
      expect(typeof config[key] === 'string' && config[key].length > 0, `vpressBlock.${key}`).toBe(true);
    }

    // c. Insert through the real inserter.
    await test.step('insert "Vpress chart" from the inserter', async () => {
      await page.getByRole('button', { name: /^(Block Inserter|Add block|Toggle block inserter)$/ }).first().click();
      const search = page.getByRole('searchbox', { name: /search/i }).first();
      await search.fill('Vpress chart');
      await page.getByRole('option', { name: 'Vpress chart' }).first().click();
    });
    const block = doc.locator('.wp-block-vpress-chart');
    await expect(block).toHaveCount(1);
    const picker = block.getByRole('combobox', { name: 'Chart' });
    await expect(picker).toBeVisible();

    // d. Pick chart #1; it must draw inside the canvas iframe.
    await test.step(`pick chart #${CHART_ID} in the placeholder combobox`, async () => {
      await picker.fill(`Chart #${CHART_ID}`);
      await doc.getByRole('option', { name: `Chart #${CHART_ID}`, exact: true }).click();
    });
    await expect(doc.locator(FIGURE)).toHaveCount(1);
    await expectChartDrawn(frame, doc, 'editor canvas');
    await expect(doc.locator(`${FIGURE} figcaption`)).toHaveCount(1);

    const inCanvas = await embedTags(frame);
    expect(inCanvas, 'embed script/css in the canvas head').toMatchObject({ script: 1, css: 1 });
    expect((await embedTags(page)).anywhere, 'embed script/css in the top document').toBe(0);

    await page.screenshot({ path: 'tests/e2e/screenshots/block-editor-preview.png' });

    // e. Inspector "Show caption": off hides the figcaption, the chart stays.
    const captionToggle = page.getByRole('checkbox', { name: 'Show caption' });
    await expect(captionToggle).toBeChecked();
    await captionToggle.click();
    await expect(captionToggle).not.toBeChecked();
    await expect(doc.locator(`${FIGURE} figcaption`)).toHaveCount(0);
    expect(await countBarMarks(frame, FIGURE), 'marks with the caption off').toBeGreaterThanOrEqual(MIN_MARKS);
    await captionToggle.click();
    await expect(captionToggle).toBeChecked();
    await expect(doc.locator(`${FIGURE} figcaption`)).toHaveCount(1);
    await expectChartDrawn(frame, doc, 'editor canvas, caption back on');

    expect(errors, `console/page errors in the editor (top window + canvas iframe):${report()}`).toEqual([]);

    // f. Save the draft; the stored content holds the block comment.
    await savePost(page);
    const saved = await wpRest(page.request, 'GET', `${ROUTE}/${postId}?context=edit`);
    const attributes = chartBlockAttributes(saved.content.raw);
    expect(attributes, `vpress/chart comment in:\n${saved.content.raw}`).not.toBeNull();
    expect(attributes.chartId).toBe(CHART_ID);
    expect(attributes.showCaption === undefined || attributes.showCaption === true).toBe(true);

    // g. Publish; an anonymous visitor sees the chart auto-mount.
    const published = await wpRest(page.request, 'POST', `${ROUTE}/${postId}`, { status: 'publish' });
    const permalink = published.link;

    const visitorContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    try {
      const visitor = await visitorContext.newPage();
      const visitorErrors = collectPageErrors(visitor);
      await visitor.goto(permalink);
      await expect(visitor.locator('#wpadminbar')).toHaveCount(0);
      await expect(visitor.locator(FIGURE)).toHaveCount(1);
      await expectChartDrawn(visitor, visitor, 'front end (visitor)');
      await expect(visitor.locator(FIGURE)).not.toHaveAttribute('data-vpress-nonce');
      await visitor.screenshot({ path: 'tests/e2e/screenshots/block-front-end.png', fullPage: true });
      expect(visitorErrors.errors, `console/page errors on ${permalink} (visitor):${visitorErrors.report()}`).toEqual(
        []
      );
    } finally {
      await visitorContext.close();
    }

    // h. Logged in, the same figure carries a wp_rest nonce.
    await page.goto(permalink);
    await expect(page.locator('#wpadminbar')).toBeVisible();
    await expect(page.locator(FIGURE)).toHaveAttribute('data-vpress-nonce', /^[a-f0-9]{10}$/);
    await expectChartDrawn(page, page, 'front end (logged in)');
    expect(errors, `console/page errors after save, and on ${permalink} logged in:${report()}`).toEqual([]);
  });
});
