/**
 * Drag a Vpress variable card onto a slot's drop zone with the real mouse.
 *
 * The editor uses native HTML5 drag-and-drop: vpress-variable-card.vue writes
 * the variable into dataTransfer.setData('variableJson', …) on dragstart and
 * vpress-slot.vue reads it back on drop (`@drop.stop.self` on .slot_border).
 *
 * locator.dragTo() is not enough here: it jumps straight to the target, so
 * Chromium fires dragenter but never dragover — the slot's
 * `@dragover.prevent` never runs, the drop is not accepted, and no drop event
 * fires. Moving in steps (and nudging once over the target) drives the full
 * dragstart → dragenter → dragover… → drop sequence through Chromium's own
 * drag pipeline, custom dataTransfer payload included.
 */
export async function dragVariableToSlot(page, source, target) {
  await source.scrollIntoViewIfNeeded();
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error('drag source or target is not rendered');

  const toX = to.x + to.width / 2;
  const toY = to.y + to.height / 2;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(toX, toY, { steps: 10 });
  await page.mouse.move(toX + 2, toY + 2, { steps: 3 });
  await page.mouse.up();
}
