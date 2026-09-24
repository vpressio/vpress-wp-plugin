/**
 * Serialized `vpress/chart` block for a chart, ready to paste into the block
 * editor (code editor or a paragraph — the editor parses it into the block).
 *
 * @param {number|string} chartId
 * @returns {string} e.g. `<!-- wp:vpress/chart {"chartId":7} /-->`, or '' for an invalid id.
 */
export function chartBlockMarkup(chartId) {
  const id = typeof chartId === 'string' && /^\d+$/.test(chartId.trim())
    ? Number(chartId.trim())
    : chartId;
  if (!Number.isInteger(id) || id <= 0) return '';
  return `<!-- wp:vpress/chart ${JSON.stringify({ chartId: id })} /-->`;
}
