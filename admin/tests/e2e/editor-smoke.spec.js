import { test, expect } from '@playwright/test';
import { collectPageErrors } from './helpers/errors.js';
import { dragVariableToSlot } from './helpers/drag.js';
import { listCharts, deleteChart } from './helpers/rest.js';
import { countBarMarks } from './helpers/chart.js';

const DATASET_NAME = 'vpress_test_ventas';
const ADMIN_PAGE = '/wp-admin/admin.php?page=vpress';

/** A VpressSlot (vpress-slot.vue) is the `.ma-1` block labelled "Eje x" / "Eje y". */
function slotDropZone(page, label) {
  return page
    .locator('div.ma-1')
    .filter({ has: page.locator('span', { hasText: new RegExp(`^\\s*${label}\\s*$`) }) })
    .locator('.slot_border')
    .first();
}

/** A draggable variable card in the variable container (not one already in a slot). */
function variableCard(page, title) {
  return page
    .locator('.draggable-card[draggable="true"]')
    .filter({ hasText: new RegExp(`^\\s*${title}\\s*$`) })
    .first();
}

test.describe('editor smoke: drag → render → save', () => {
  let createdChartId = null;

  test.afterEach(async ({ page }) => {
    // Keep the run repeatable: remove the chart this test saved.
    if (createdChartId) {
      await deleteChart(page.request, createdChartId);
      createdChartId = null;
    }
  });

  test('bars render under Vue 3 and the chart saves', async ({ page }) => {
    const { errors, report } = collectPageErrors(page);
    const before = await listCharts(page.request);

    // 1. The Vue app mounts with every Vuetify component resolved.
    await page.goto(ADMIN_PAGE);
    const app = page.locator('#app');
    await expect(app.locator('.v-toolbar').first()).toBeVisible();
    expect((await app.innerHTML()).trim().length).toBeGreaterThan(0);
    const unknownTags = await page.evaluate(() =>
      [...document.querySelectorAll('#app *')]
        .map((el) => el.tagName.toLowerCase())
        .filter((tag) => tag.startsWith('v-'))
    );
    expect(unknownTags, 'unresolved <v-*> elements in #app').toEqual([]);

    // 2. Dataset list → dataset card → data module.
    await app.getByRole('link', { name: /Bases de datos/ }).click();
    await expect(page).toHaveURL(/#\/datasets$/);
    await app
      .locator('.dataset-name span', { hasText: new RegExp(`^\\s*${DATASET_NAME}\\s*$`) })
      .first()
      .click();
    await expect(page).toHaveURL(/#\/data$/);

    // 3. Data module → editor.
    await app.getByRole('link', { name: /Siguiente/ }).click();
    await expect(page).toHaveURL(/#\/editor\/config$/);

    // 4. Drag estado → X axis, ventas → Y axis (native HTML5 DnD).
    const estado = variableCard(page, 'estado');
    const ventas = variableCard(page, 'ventas');
    await expect(estado).toBeVisible();
    await expect(ventas).toBeVisible();

    // Nothing is drawn until both axes hold a variable.
    expect(await countBarMarks(page, '#empty_chart_0')).toBe(0);

    await dragVariableToSlot(page, estado, slotDropZone(page, 'Eje x'));
    await expect(
      page.locator('.draggable-card[draggable="true"]', { hasText: /estado\s*ordinal/ })
    ).toBeVisible();

    await dragVariableToSlot(page, ventas, slotDropZone(page, 'Eje y'));
    await expect(
      page.locator('.draggable-card[draggable="true"]', { hasText: /ventas.*\s*linear/ })
    ).toBeVisible();

    // 5. dbox/d3 draws the bar chart.
    // 8 estados in the seeded dataset → 8 bars; ≥ 5 leaves room for data edits.
    await expect
      .poll(() => countBarMarks(page, '#empty_chart_0'), {
        timeout: 15_000,
        message: 'bar <rect> marks drawn by dbox in #empty_chart_0'
      })
      .toBeGreaterThanOrEqual(5);
    await page.locator('#empty_chart_0').screenshot({ path: 'tests/e2e/screenshots/editor-bars.png' });

    // 6. Save through the toolbar's Guardar control.
    const created = page.waitForResponse(
      (res) => res.url().includes('/wp-json/vpress/v1/chart/create') && res.request().method() === 'POST'
    );
    // Toolbar actions are Guardar / Descargar / Compartir, in that order
    // (vpress-viz-toolbar.vue). The icons carry no alt text and the build
    // inlines the small SVGs as data: URIs, so the file name is not in the DOM.
    await page.locator('.tri-actions-container .v-btn').first().click();
    const createRes = await created;
    expect(createRes.status()).toBe(200);
    createdChartId = (await createRes.json()).data;
    expect(Number(createdChartId)).toBeGreaterThan(0);
    await expect(page.getByText('Gráfica guardada con éxito')).toBeVisible();

    const after = await listCharts(page.request);
    expect(after.total).toBe(before.total + 1);
    expect(after.data.map((c) => Number(c.id))).toContain(Number(createdChartId));

    expect(errors, `console/page errors in the editor:${report()}`).toEqual([]);
  });
});
