// Keyboard access to the data marks a chart draws: every mark becomes a
// focusable, labelled graphics symbol, and focus shows the same tooltip that
// hovering shows. One place for every chart type (bars, scatter, timeline
// points, heatmap cells, map paths).

export const MARK_CLASS = 'vpress-mark';

const SHAPES = 'rect, circle, ellipse, path, polygon';
// Chrome that has hover handlers too (axis tick tips, legend tips) but is not data.
const NOT_DATA = '.axis, .legend, .legendBox, .grid, .gridline, .dbox-label';

/** True when d3 (v4/v5) attached a mouseover listener to the element. */
function hasHoverTip(el) {
  return Array.isArray(el.__on) && el.__on.some((listener) => listener.type === 'mouseover');
}

/**
 * The data marks inside `root`: SVG shapes carrying a d3 datum and a hover
 * listener (that is how dbox wires its tooltips), outside axes and legends.
 *
 * @param {Element} root
 * @returns {Element[]}
 */
export function findMarks(root) {
  if (!root || !root.querySelectorAll) return [];
  return Array.from(root.querySelectorAll(SHAPES)).filter(
    (el) => el.__data__ !== undefined && hasHoverTip(el) && !el.closest(NOT_DATA)
  );
}

function fire(el, type) {
  // Real mouse events, so the chart's own hover handlers run unchanged
  // (dbox calls its d3-tip show/hide with the datum from there).
  const View = (el.ownerDocument && el.ownerDocument.defaultView) || window;
  el.dispatchEvent(new View.MouseEvent(type, { bubbles: true, cancelable: true }));
}

export const hoverTooltip = {
  show: (el) => fire(el, 'mouseover'),
  hide: (el) => fire(el, 'mouseout')
};

/**
 * Make the marks focusable and labelled, and mirror hover on focus.
 *
 * @param {Element} svgEl  Root to search (the chart's <svg> or its container).
 * @param {object} [options]
 * @param {(datum: any, el: Element) => string} [options.getLabel] "{category}: {value}"
 * @param {Element[]} [options.marks]   Explicit marks instead of findMarks(svgEl).
 * @param {{show: Function, hide: Function}} [options.tooltip] Defaults to replaying mouseover/mouseout.
 * @param {string} [options.role]       'graphics-symbol' (default) or 'img'.
 * @returns {Element[]} the marks that were enhanced (the <svg> root, when it has
 *   marks, becomes role=graphics-document)
 */
export function enhanceMarks(svgEl, options = {}) {
  const {
    getLabel = (datum) => String(datum),
    tooltip = hoverTooltip,
    role = 'graphics-symbol'
  } = options;
  const marks = options.marks || findMarks(svgEl);

  // A graphic with focusable, labelled parts is a graphics-document; role=img
  // would make its children presentational.
  const root = svgEl && svgEl.tagName && svgEl.tagName.toLowerCase() === 'svg' ? svgEl : null;
  if (root && marks.length && (!root.hasAttribute('role') || root.getAttribute('role') === 'img')) {
    root.setAttribute('role', 'graphics-document');
  }

  marks.forEach((el) => {
    if (el.getAttribute('data-vpress-mark') === 'true') return;
    el.setAttribute('data-vpress-mark', 'true');
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', role);
    el.classList.add(MARK_CLASS);
    const label = getLabel(el.__data__, el);
    if (label) el.setAttribute('aria-label', label);

    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true;
      tooltip.show(el, el.__data__);
    };
    const hide = () => {
      if (!shown) return;
      shown = false;
      tooltip.hide(el, el.__data__);
    };
    el.addEventListener('focus', show);
    el.addEventListener('blur', hide);
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' || event.key === 'Esc') hide();
    });
  });

  return marks;
}
