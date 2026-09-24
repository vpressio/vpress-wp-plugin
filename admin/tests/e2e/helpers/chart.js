/**
 * Count the data marks dbox/d3 drew inside a chart container: SVG <rect>s
 * with a real, positive size that are not legend chrome (dbox also draws
 * legend checkboxes and a legend background as <rect>s).
 */
export function countBarMarks(page, containerSelector) {
  return page.evaluate((selector) => {
    const rects = document.querySelectorAll(`${selector} svg rect`);
    return [...rects].filter((rect) => {
      if (rect.closest('.legend, .legendBox')) return false;
      const { width, height } = rect.getBBox();
      return width > 0 && height > 0;
    }).length;
  }, containerSelector);
}
