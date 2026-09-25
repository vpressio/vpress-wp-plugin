// Editorial annotations drawn over a chart: reference lines, highlighted
// points, ranges and free notes.
//
// Annotations belong to the CHART, in `chartConfig.annotations`, and every
// one carries a stable `id` — a story step references an annotation by that
// id instead of copying it, so the model here is an interface, not an
// implementation detail. Ids are never reused and never renumbered.
//
// Positions are raw DATA-SPACE values (a category string on an ordinal axis,
// a number on a linear one, a date on a time axis), never pixels: the chart
// may be redrawn at any size. The pixels are derived here from the scales
// dbox already built, which is why drawing happens in the `load(chart)` hook
// where `chart._scales` carries the layer's real domains.

const NS = 'http://www.w3.org/2000/svg';

/** The container element every annotation is drawn into, appended last. */
export const ANNOTATIONS_CLASS = 'vpress-annotations';

/** The shapes an annotation can take. Anything else is ignored, never fatal. */
export const ANNOTATION_TYPES = ['line', 'point', 'range', 'text'];

/** Axes a `line` or a `range` can be pinned to. */
export const ANNOTATION_AXES = ['x', 'y'];

/**
 * Named colour tokens, never a raw hex: the tokens resolve through CSS custom
 * properties that the chart container redefines per theme, so an annotation
 * stays legible on both backgrounds. A hex from a chart author would walk
 * straight past that.
 */
export const ANNOTATION_COLORS = ['signal', 'muted', 'series'];

/** Used when an annotation names no colour, or names one we do not know. */
export const DEFAULT_ANNOTATION_COLOR = 'signal';

/** Mirrors VPRESS_ANNOTATION_MAX in api/services/chart.php. */
export const ANNOTATION_MAX = 20;

const PAINT = {
  signal: 'var(--vpress-annotation-signal, #b0173c)',
  muted: 'var(--vpress-annotation-muted, #4a4a4a)',
  series: 'var(--vpress-annotation-series, currentColor)'
};

export const LABEL_FONT_SIZE = 11;
const LABEL_PAD = 4;
const POINT_RADIUS = 4;
// Where a point's label sits relative to its mark before any flip.
const LEADER_DX = 14;
const LEADER_DY = -16;

/** The position keys one annotation type needs, in stored order. */
export function annotationPositionKeys(type) {
  if (type === 'line') return ['value'];
  if (type === 'range') return ['from', 'to'];
  return ['x', 'y'];
}

/** Whether an annotation type is pinned to a single axis. */
export function annotationHasAxis(type) {
  return type === 'line' || type === 'range';
}

/** Config key holding the highest annotation id number ever issued. */
export const ANNOTATION_SEQ_KEY = 'annotationSeq';

/**
 * The chart's annotation counter: the highest `a{n}` id ever issued.
 *
 * It lives in the chart config beside `annotations` rather than in an editing
 * session, because the guarantee it carries has to survive a reload: delete
 * the highest annotation, reload, add one, and a session-local counter would
 * hand the deleted id straight back. A story step still pointing at that id
 * would then emphasise different content, silently, with no error anywhere.
 *
 * Never decremented by a delete, and never trusted below the highest id
 * actually present — a config hand-edited, tampered with, or saved before
 * this key existed heals upward instead of colliding.
 *
 * @param {Array} annotations Current annotations.
 * @param {number} [declared] The counter as the config carries it.
 * @returns {number}
 */
export function annotationSeq(annotations, declared) {
  const highest = (Array.isArray(annotations) ? annotations : []).reduce((max, annotation) => {
    const match = /^a(\d+)$/.exec(String((annotation && annotation.id) || ''));
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  const carried = Number(declared);
  return Math.max(highest, Number.isFinite(carried) ? Math.floor(carried) : 0);
}

/**
 * The next annotation id for a chart at this counter.
 *
 * @param {Array} annotations Current annotations.
 * @param {number} [declared] The counter as the config carries it.
 * @returns {string}
 */
export function nextAnnotationId(annotations, declared) {
  return `a${annotationSeq(annotations, declared) + 1}`;
}

/**
 * A new annotation of `type`, with a fresh id and placeable defaults.
 *
 * Positions default to 0 rather than blank so a freshly-added annotation
 * survives a save: the server drops an entry it cannot place, and losing a
 * half-filled annotation on save is worse than one sitting at the origin
 * until its position is typed.
 *
 * @param {string} type One of ANNOTATION_TYPES.
 * @param {Array} annotations Current annotations (for the id).
 * @param {number} [declared] The chart's annotation counter.
 * @returns {object}
 */
export function createAnnotation(type, annotations, declared) {
  const kind = ANNOTATION_TYPES.includes(type) ? type : 'text';
  const annotation = { id: nextAnnotationId(annotations, declared), type: kind };
  if (annotationHasAxis(kind)) {
    annotation.axis = kind === 'range' ? 'x' : 'y';
  }
  annotationPositionKeys(kind).forEach((key) => {
    annotation[key] = 0;
  });
  annotation.label = '';
  return annotation;
}

/** The colour token an annotation asks for, falling back to the default. */
export function annotationColor(annotation) {
  const token = annotation && annotation.color;
  return ANNOTATION_COLORS.includes(token) ? token : DEFAULT_ANNOTATION_COLOR;
}

function isBandScale(scale) {
  return typeof scale === 'function' && typeof scale.bandwidth === 'function';
}

function isTimeScale(scale) {
  if (typeof scale !== 'function' || typeof scale.domain !== 'function') return false;
  const domain = scale.domain();
  return domain.length > 0 && Object.prototype.toString.call(domain[0]) === '[object Date]';
}

/**
 * One data-space value as a pixel offset inside the plot, or null when the
 * scale cannot place it (an unknown category, a non-numeric value on a
 * linear axis). Null is drawn as nothing — never as 0, which would silently
 * plant the annotation at the origin.
 */
function place(scale, value) {
  if (typeof scale !== 'function') return null;
  if (isBandScale(scale)) {
    const at = scale(String(value));
    return at === undefined || Number.isNaN(at) ? null : at + scale.bandwidth() / 2;
  }
  const coerced = isTimeScale(scale) ? new Date(value) : Number(value);
  if (Number.isNaN(Number(coerced))) return null;
  const at = scale(coerced);
  return Number.isFinite(at) ? at : null;
}

/** The [start, end] pixels a data-space value covers (a band, or a point). */
function extent(scale, value) {
  if (typeof scale !== 'function') return null;
  if (isBandScale(scale)) {
    const at = scale(String(value));
    return at === undefined || Number.isNaN(at) ? null : [at, at + scale.bandwidth()];
  }
  const at = place(scale, value);
  return at === null ? null : [at, at];
}

/**
 * A rough label width; SVG text metrics are not available before layout.
 * Exported so a containment test measures with the same rule the layout uses,
 * rather than restating the constants and drifting from them.
 */
export function labelWidth(text) {
  return String(text || '').length * LABEL_FONT_SIZE * 0.55;
}

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

/**
 * A label anchor kept inside the plot on BOTH edges.
 *
 * A clamp on the right alone is not enough: an `end`-anchored label extends
 * LEFTWARDS from its anchor, so one flipped onto a left-side position runs off
 * at x≈0 and is simply invisible — no overflow, no error, nothing to see.
 */
function anchorInside(x, anchor, text, width) {
  const span = labelWidth(text);
  return anchor === 'end'
    ? clamp(x, Math.min(span, width), width)
    : clamp(x, 0, Math.max(0, width - span));
}

function el(doc, name, attributes) {
  const node = doc.createElementNS(NS, name);
  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== null && value !== undefined) node.setAttribute(key, String(value));
  });
  return node;
}

function paint(node, properties) {
  Object.entries(properties).forEach(([key, value]) => {
    try {
      node.style.setProperty(key, value);
    } catch {
      // A DOM without full CSS support (jsdom) simply keeps the attribute.
    }
    node.setAttribute(key, value);
  });
}

/**
 * The focusable, labelled text of an annotation.
 *
 * Marks made focusable by the a11y pass are reachable by keyboard; an
 * annotation's label is the editorial point of the chart, so it is reachable
 * the same way rather than being decoration a screen-reader user never meets.
 */
function label(doc, text, { x, y, anchor, color }) {
  const node = el(doc, 'text', {
    class: 'vpress-annotation__label',
    x,
    y,
    'text-anchor': anchor,
    'font-size': LABEL_FONT_SIZE,
    'pointer-events': 'auto',
    tabindex: '0',
    role: 'graphics-symbol',
    'aria-label': text
  });
  paint(node, { fill: PAINT[color] });
  node.textContent = text;
  return node;
}

function drawLine(doc, group, annotation, ctx) {
  const { width, height, color } = ctx;
  const scale = annotation.axis === 'x' ? ctx.scales.x : ctx.scales.y;
  const at = place(scale, annotation.value);
  if (at === null) return false;

  const vertical = annotation.axis === 'x';
  // A value beyond the axis domain RESOLVES, by extrapolation — place() only
  // refuses what the scale cannot map at all. Left alone, the commonest
  // editorial annotation there is ("a target above every bar") would draw
  // over the top margin while its label clamped inside the plot, visibly
  // detached from its own rule. Pin the rule to the edge instead, as the
  // range band already does.
  const on = vertical ? clamp(at, 0, width) : clamp(at, 0, height);
  const rule = el(doc, 'line', {
    class: 'vpress-annotation__rule',
    x1: vertical ? on : 0,
    x2: vertical ? on : width,
    y1: vertical ? 0 : on,
    y2: vertical ? height : on,
    'stroke-width': 1.5,
    'stroke-dasharray': '5 4',
    'pointer-events': 'none'
  });
  paint(rule, { stroke: PAINT[color] });
  group.appendChild(rule);

  if (!annotation.label) return true;
  if (vertical) {
    // Keep the label inside the plot: flip to the left of the rule when it
    // would otherwise run off the right edge.
    const flip = on + LABEL_PAD + labelWidth(annotation.label) > width;
    const anchor = flip ? 'end' : 'start';
    group.appendChild(
      label(doc, annotation.label, {
        x: anchorInside(flip ? on - LABEL_PAD : on + LABEL_PAD, anchor, annotation.label, width),
        y: clamp(LABEL_FONT_SIZE, LABEL_FONT_SIZE, height),
        anchor,
        color
      })
    );
  } else {
    group.appendChild(
      label(doc, annotation.label, {
        x: anchorInside(width - LABEL_PAD, 'end', annotation.label, width),
        y: clamp(on - LABEL_PAD, LABEL_FONT_SIZE, height - LABEL_PAD),
        anchor: 'end',
        color
      })
    );
  }
  return true;
}

function drawRange(doc, group, annotation, ctx) {
  const { width, height, color } = ctx;
  const scale = annotation.axis === 'x' ? ctx.scales.x : ctx.scales.y;
  const from = extent(scale, annotation.from);
  const to = extent(scale, annotation.to);
  if (!from || !to) return false;

  const low = Math.min(from[0], from[1], to[0], to[1]);
  const high = Math.max(from[0], from[1], to[0], to[1]);
  const horizontal = annotation.axis === 'x';
  const band = el(doc, 'rect', {
    class: 'vpress-annotation__band',
    x: horizontal ? clamp(low, 0, width) : 0,
    y: horizontal ? 0 : clamp(low, 0, height),
    width: horizontal ? Math.max(0, clamp(high, 0, width) - clamp(low, 0, width)) : width,
    height: horizontal ? height : Math.max(0, clamp(high, 0, height) - clamp(low, 0, height)),
    'fill-opacity': 0.12,
    'pointer-events': 'none'
  });
  paint(band, { fill: PAINT[color] });
  group.appendChild(band);

  if (!annotation.label) return true;
  group.appendChild(
    label(doc, annotation.label, {
      x: anchorInside((horizontal ? clamp(low, 0, width) : 0) + LABEL_PAD, 'start', annotation.label, width),
      y: (horizontal ? 0 : clamp(low, 0, height)) + LABEL_FONT_SIZE + LABEL_PAD,
      anchor: 'start',
      color
    })
  );
  return true;
}

function drawPoint(doc, group, annotation, ctx) {
  const { width, height, color } = ctx;
  const at = { x: place(ctx.scales.x, annotation.x), y: place(ctx.scales.y, annotation.y) };
  if (at.x === null || at.y === null) return false;
  // As for a line: a value past the axis domain extrapolates rather than
  // failing, so pin the dot to the plot edge instead of drawing it over the
  // margin with its label clamped somewhere else.
  const px = clamp(at.x, 0, width);
  const py = clamp(at.y, 0, height);

  const dot = el(doc, 'circle', {
    class: 'vpress-annotation__dot',
    cx: px,
    cy: py,
    r: POINT_RADIUS,
    'fill-opacity': 0,
    'stroke-width': 2,
    'pointer-events': 'none'
  });
  paint(dot, { stroke: PAINT[color] });
  group.appendChild(dot);

  if (!annotation.label) return true;

  // Flip the leader rather than let it (or its label) leave the plot.
  const flipX = px + LEADER_DX + labelWidth(annotation.label) > width;
  const flipY = py + LEADER_DY - LABEL_FONT_SIZE < 0;
  const dx = flipX ? -LEADER_DX : LEADER_DX;
  const dy = flipY ? -LEADER_DY : LEADER_DY;
  const tipX = clamp(px + dx, 0, width);
  const tipY = clamp(py + dy, LABEL_FONT_SIZE, height);

  const leader = el(doc, 'line', {
    class: 'vpress-annotation__leader',
    x1: px + (flipX ? -POINT_RADIUS : POINT_RADIUS),
    y1: py,
    x2: tipX,
    y2: tipY,
    'stroke-width': 1,
    'pointer-events': 'none'
  });
  paint(leader, { stroke: PAINT[color] });
  group.appendChild(leader);

  const anchor = flipX ? 'end' : 'start';
  group.appendChild(
    label(doc, annotation.label, {
      x: anchorInside(tipX + (flipX ? -LABEL_PAD : LABEL_PAD), anchor, annotation.label, width),
      y: tipY - LABEL_PAD,
      anchor,
      color
    })
  );
  return true;
}

function drawText(doc, group, annotation, ctx) {
  const { width, height, color } = ctx;
  const px = place(ctx.scales.x, annotation.x);
  const py = place(ctx.scales.y, annotation.y);
  if (px === null || py === null) return false;
  if (!annotation.label) return true;

  const flip = px + labelWidth(annotation.label) > width;
  const anchor = flip ? 'end' : 'start';
  group.appendChild(
    label(doc, annotation.label, {
      x: anchorInside(clamp(px, 0, width), anchor, annotation.label, width),
      y: clamp(py, LABEL_FONT_SIZE, height),
      anchor,
      color
    })
  );
  return true;
}

const DRAW = { line: drawLine, range: drawRange, point: drawPoint, text: drawText };

/**
 * Draw a chart's annotations into `svgNode`, replacing any previous pass.
 *
 * @param {Element} svgNode The element the plot is drawn in, in plot-local
 *   coordinates — for dbox that is `chart._svg.node()`, the <g> translated by
 *   the chart margins, so (0,0) is the plot origin.
 * @param {Array} annotations The chart's `annotations` array.
 * @param {{x: Function, y: Function}} scales dbox's own scales (`chart._scales`).
 * @param {{width: number, height: number}} opts Plot size in pixels
 *   (`chart._width` / `chart._height`).
 * @returns {Element|null} The annotations group, or null when there was
 *   nothing to draw into.
 */
export function drawAnnotations(svgNode, annotations, scales, opts = {}) {
  if (!svgNode || typeof svgNode.querySelector !== 'function') return null;
  const doc = svgNode.ownerDocument;
  if (!doc) return null;

  const previous = svgNode.querySelector(`:scope > .${ANNOTATIONS_CLASS}`);
  if (previous) previous.remove();

  const list = Array.isArray(annotations) ? annotations : [];
  if (list.length === 0) return null;

  const width = Number(opts.width);
  const height = Number(opts.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;

  // Appended last so annotations sit above the marks; the group itself is
  // inert — only each label takes focus.
  const group = el(doc, 'g', { class: ANNOTATIONS_CLASS, 'pointer-events': 'none' });

  list.slice(0, ANNOTATION_MAX).forEach((annotation) => {
    if (!annotation || !DRAW[annotation.type]) return;
    const color = annotationColor(annotation);
    const one = el(doc, 'g', {
      class: 'vpress-annotation',
      'data-annotation-id': annotation.id,
      'data-annotation-type': annotation.type,
      'data-annotation-color': color
    });
    const drawn = DRAW[annotation.type](doc, one, annotation, {
      scales: scales || {},
      width,
      height,
      color
    });
    if (drawn) group.appendChild(one);
  });

  if (!group.firstChild) return null;
  svgNode.appendChild(group);
  return group;
}
