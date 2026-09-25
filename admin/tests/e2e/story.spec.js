import { test, expect } from '@playwright/test';
import { collectPageErrors } from './helpers/errors.js';
import { createChart, deleteChart, getChart, updateChart } from './helpers/rest.js';
import { wpRest } from './helpers/editor.js';

/*
 * A published Vpress story: one chart, three steps, scrolled.
 *
 * This is the case that matters, because everything the story adds lives in
 * the browser. It exercises the SERVED embed bundle: run it against a build
 * that carries admin/src/story.js (the built admin/dist, or `yarn -s dev` on
 * :5180 from this worktree, which the plugin prefers when that port answers).
 *
 * The chart and the page are created through REST and deleted again, on
 * failure too, so this never depends on what happens to be seeded.
 */

const ROUTE = 'pages'; // vpress-theme has no single.html; page.html prints post content.
const FIGURE = 'figure.vpress-figure';
const DRAW_TIMEOUT = 20_000;

// Two reference lines on the VALUE axis. Placeable on any linear scale, so
// they do not depend on what chart #1's data happens to contain — and
// emphasising one must NOT dim the marks, which is asserted below.
const META = { id: 'a1', type: 'line', axis: 'y', value: 1000000, label: 'Meta anual', color: 'signal' };
const PISO = { id: 'a2', type: 'line', axis: 'y', value: 500000, label: 'Piso histórico', color: 'muted' };

/** The story, as an author's block markup. */
function storyContent(chartId, steps) {
  const inner = steps
    .map((step) => `<!-- wp:vpress/story-step ${JSON.stringify(step)} /-->`)
    .join('\n');
  return `<!-- wp:vpress/story ${JSON.stringify({ chartId })} -->\n${inner}\n<!-- /wp:vpress/story -->`;
}

/** Annotation ids the drawn chart currently shows, and which are emphasised. */
function annotationState(page) {
  return page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('[data-annotation-id]'));
    const visible = (node) => !node.classList.contains('vpress-annotation--hidden');
    return {
      visible: nodes.filter(visible).map((n) => n.getAttribute('data-annotation-id')),
      hidden: nodes.filter((n) => !visible(n)).map((n) => n.getAttribute('data-annotation-id')),
      emphasized: nodes
        .filter((n) => n.classList.contains('vpress-annotation--emphasis'))
        .map((n) => n.getAttribute('data-annotation-id')),
      muted: nodes
        .filter((n) => n.classList.contains('vpress-annotation--muted'))
        .map((n) => n.getAttribute('data-annotation-id')),
      mutedMarks: document.querySelectorAll('.vpress-mark--muted').length,
      emphasizedMarks: document.querySelectorAll('.vpress-mark--emphasis').length
    };
  });
}

/** Scroll a step to the middle of the viewport, where the band is. */
async function scrollToStep(page, index) {
  await page.locator('[data-vpress-step]').nth(index).evaluate((el) => {
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
  await expect(page.locator('[data-vpress-step]').nth(index)).toHaveClass(/is-active/, { timeout: 5_000 });
}

test.describe('a published Vpress story', () => {
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

  test('scrolls, re-emphasises the chart, announces, and logs nothing', async ({ page, browser }) => {
    const { errors, report } = collectPageErrors(page);

    // a. Chart #1's own config on chart #1's dataset, with two reference lines.
    const source = await getChart(page.request, 1);
    const config = JSON.parse(source.data.value);
    chartId = await createChart(page.request, {
      datasetId: source.data.dataset_id,
      value: { ...config, annotations: [META, PISO], annotationSeq: 2 }
    });

    /*
     * b. A point annotation on a category this chart really has. Read from
     *    the drawn marks rather than guessed: whatever chart #1 is seeded
     *    with, this lands on a real bar, which is what makes the mark
     *    emphasis below an assertion about behaviour and not about fixtures.
     */
    await page.goto(`/chart/${chartId}/`);
    await expect(page.locator(`${FIGURE} .vpress-figure__chart`)).toHaveAttribute('aria-busy', 'false', {
      timeout: DRAW_TIMEOUT
    });
    // From an x-axis TICK, which on a band scale is a domain value verbatim.
    // Not from a mark's aria-label: a grouped bar labels itself
    // "{category}, {series}: {value}", which is not something a scale can
    // place — and picking it apart would be re-deriving the band domain.
    const category = await page.evaluate(() => {
      const tick = document.querySelector('.x.axis .tick text');
      return tick ? tick.textContent.trim() : '';
    });
    expect(category, 'a category read off the x axis').toBeTruthy();
    const totalMarks = await page.locator('.vpress-mark').count();
    expect(totalMarks).toBeGreaterThan(1);

    const PICO = { id: 'a3', type: 'point', x: category, y: 1000000, label: `El pico de ${category}` };
    await updateChart(page.request, {
      id: chartId,
      value: { ...config, annotations: [META, PISO, PICO], annotationSeq: 3 }
    });
    const stored = JSON.parse((await getChart(page.request, chartId)).data.value);
    expect(stored.annotations.map((a) => a.id), 'the third annotation reached the row').toEqual([
      'a1',
      'a2',
      'a3'
    ]);
    expect(stored.annotations[2].x, `the category read off a mark ("${category}")`).toBe(category);

    // c. A page carrying the story: three steps, three different states.
    const steps = [
      { heading: 'Todo el año', text: 'La serie completa, sin nada subrayado.', overrides: { show: [] } },
      {
        heading: 'La meta',
        text: 'Una línea de referencia, y nada más.',
        overrides: { show: ['a1'], emphasize: ['a1'] }
      },
      {
        heading: 'El pico',
        text: 'Una categoría, destacada sobre el resto.',
        overrides: { show: ['a1', 'a2', 'a3'], emphasize: ['a3'] }
      }
    ];
    const draft = await wpRest(page.request, 'POST', ROUTE, {
      title: 'E2E vpress story',
      status: 'publish',
      content: storyContent(chartId, steps)
    });
    postId = draft.id;
    const permalink = draft.link;

    await page.goto(permalink);
    await expect(page.locator('[data-vpress-story]')).toHaveCount(1);
    await expect(page.locator(`${FIGURE} .vpress-figure__chart`)).toHaveAttribute('aria-busy', 'false', {
      timeout: DRAW_TIMEOUT
    });

    // d. Complete at rest. No scroll has happened, and the first step is on.
    const stepNodes = page.locator('[data-vpress-step]');
    await expect(stepNodes).toHaveCount(3);
    await expect(stepNodes.nth(0)).toHaveClass(/is-active/);
    await expect(stepNodes.nth(0)).toHaveAttribute('aria-current', 'step');
    const status = page.locator('[data-vpress-story-status]');
    await expect(status).toHaveAttribute('aria-live', 'polite');
    await expect(status).toHaveText('Todo el año');

    const atRest = await annotationState(page);
    expect(atRest.visible, 'an empty allow-list shows none').toEqual([]);
    expect(atRest.hidden.sort()).toEqual(['a1', 'a2', 'a3']);
    expect(atRest.mutedMarks, 'nothing is dimmed before a step says to').toBe(0);

    // The figure is sticky and nothing in the story traps focus in it.
    expect(
      await page
        .locator('.vpress-story__figure')
        .evaluate((el) => el.ownerDocument.defaultView.getComputedStyle(el).position)
    ).toBe('sticky');

    await page.screenshot({ path: 'tests/e2e/screenshots/story-step-1.png', fullPage: false });

    // e. Step two: one reference line, emphasised — and no mark dimmed,
    //    because a line on the VALUE axis says something about every mark.
    await scrollToStep(page, 1);
    await expect(status).toHaveText('La meta');
    await expect(stepNodes.nth(0)).not.toHaveClass(/is-active/);

    const second = await annotationState(page);
    expect(second.visible).toEqual(['a1']);
    expect(second.emphasized).toEqual(['a1']);
    expect(second.mutedMarks, 'emphasising a target line must not grey out the chart').toBe(0);

    // f. Step three: everything visible, the point emphasised — and NOW the
    //    marks it does not name are dimmed.
    await scrollToStep(page, 2);
    await expect(status).toHaveText('El pico');

    const third = await annotationState(page);
    expect(third.visible.sort()).toEqual(['a1', 'a2', 'a3']);
    expect(third.emphasized).toEqual(['a3']);
    expect(third.muted.sort(), 'the others fade while one is emphasised').toEqual(['a1', 'a2']);
    expect(third.emphasizedMarks).toBeGreaterThan(0);
    expect(third.mutedMarks).toBe(totalMarks - third.emphasizedMarks);

    await page.screenshot({ path: 'tests/e2e/screenshots/story-step-3.png', fullPage: false });

    // g. The change reached a screen reader in words, not only in pixels.
    const described = await page.evaluate(() => {
      const slot = document.querySelector('.vpress-figure__chart');
      const ids = (slot.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      return ids.map((id) => {
        const node = document.getElementById(id);
        return node ? node.textContent.trim() : null;
      });
    });
    expect(described.length, 'the chart keeps its own description and gains the step').toBe(2);
    expect(described[1]).toContain('Paso 3 de 3: El pico.');
    expect(described[1]).toContain(`El pico de ${category}`);

    // h. A hidden annotation is not left focusable while it is invisible:
    //    visibility, not opacity alone, or its label stays in the tab order
    //    and stays read out while the chart claims to have hidden it.
    await scrollToStep(page, 1); // a2 and a3 hidden here
    expect(
      await page.evaluate(() => {
        const visibility = (id) => {
          const node = document.querySelector(`[data-annotation-id="${id}"]`);
          return node ? window.getComputedStyle(node).visibility : null;
        };
        return { shown: visibility('a1'), hiddenOne: visibility('a2') };
      })
    ).toEqual({ shown: 'visible', hiddenOne: 'hidden' });
    await scrollToStep(page, 2);

    /*
     * i. The rule that keeps the no-JavaScript path honest, tested where a
     *    stylesheet is certainly loaded. Without it a step that is not the
     *    active one sits at 45% opacity — which is what EVERY step would do
     *    on a page where the controller never runs: present in the markup,
     *    and barely readable.
     *
     *    Polled rather than read once: the steps fade over 300ms, so a
     *    single read lands mid-transition and reports 0.63.
     */
    const stepOpacity = () =>
      page
        .locator('[data-vpress-step]')
        .evaluateAll((nodes) =>
          nodes.map((node) => node.ownerDocument.defaultView.getComputedStyle(node).opacity).join(',')
        );
    const story = page.locator('[data-vpress-story]');

    await expect.poll(stepOpacity, { message: 'wired: only the step the reader is on is lit' }).toBe('0.45,0.45,1');
    await story.evaluate((el) => el.removeAttribute('data-vpress-story-ready'));
    await expect
      .poll(stepOpacity, { message: 'unwired — with scripting off, the only state there is' })
      .toBe('1,1,1');
    await story.evaluate((el) => el.setAttribute('data-vpress-story-ready', 'true'));

    expect(errors, `console/page errors on ${permalink}:${report()}`).toEqual([]);

    /*
     * i. The claim most likely to rot: the story reads with scripting OFF.
     *    A separate context, because javaScriptEnabled is a context option.
     */
    const noJs = await browser.newContext({ javaScriptEnabled: false });
    try {
      const reader = await noJs.newPage();
      const readerErrors = collectPageErrors(reader);
      await reader.goto(permalink);

      // The figure is there, with its text alternative and its data table.
      await expect(reader.locator(FIGURE)).toHaveCount(1);
      await expect(reader.locator(`${FIGURE} .vpress-figure__alt`)).toHaveCount(1);
      await expect(reader.locator(`${FIGURE} .vpress-figure__data table`)).toHaveCount(1);
      expect(
        (await reader.locator(`${FIGURE} .vpress-figure__data tbody tr`).count()),
        'the data table is the chart, for a reader who gets no chart'
      ).toBeGreaterThan(0);

      // Every step's prose is present, in document order and fully legible —
      // no step is dimmed, because without the controller none is "active".
      await expect(reader.locator('[data-vpress-step]')).toHaveCount(3);
      for (const step of steps) {
        await expect(reader.locator('.vpress-story__steps')).toContainText(step.heading);
        await expect(reader.locator('.vpress-story__steps')).toContainText(step.text);
      }
      // No step is active, so the un-dimming rule applies — see (i), which
      // asserts that rule where a stylesheet is certainly loaded. Here the
      // honest check is that nothing marked the story as wired: with the
      // dev server the embed stylesheet is injected BY the script, so a
      // no-JS page gets no Vpress CSS at all and an opacity assertion would
      // pass whatever the rule said.
      await expect(reader.locator('[data-vpress-story]')).not.toHaveAttribute('data-vpress-story-ready');
      await expect(reader.locator('[data-vpress-step].is-active')).toHaveCount(0);

      /*
       * The live region is not empty either, and this is the ONLY place that
       * proves it: vpress_story_first_heading() reads $block->parsed_block,
       * which PHPUnit can only hand it a stand-in for. With the controller
       * running, the region would say the same thing whether or not the
       * server ever filled it.
       */
      await expect(reader.locator('[data-vpress-story-status]')).toHaveText(steps[0].heading);

      // The reading order is figure, then narrative — the story's own two
      // children, in the order blocks/story/render.php prints them.
      expect(
        await reader.evaluate(() =>
          Array.from(document.querySelector('[data-vpress-story]').children).map((el) => el.className)
        )
      ).toEqual(['vpress-story__figure', 'vpress-story__steps']);

      await reader.screenshot({ path: 'tests/e2e/screenshots/story-no-js.png', fullPage: true });
      expect(readerErrors.errors, `errors with scripting off:${readerErrors.report()}`).toEqual([]);
    } finally {
      await noJs.close();
    }
  });
});
