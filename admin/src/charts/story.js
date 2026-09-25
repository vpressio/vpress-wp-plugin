// The state a story step imposes on a chart, and how it reaches the drawn
// SVG. Pure: no Vue, no d3, no network — DOM in, classes out.
//
// A step never copies an annotation, it references one by id (see
// src/charts/annotations.js). Three consequences shape everything here:
//
//   1. An id the chart no longer has is a NO-OP. Not an error, not a warning,
//      not something to repair: a chart can lose an annotation months after a
//      story started pointing at it, and the story must still read.
//   2. A missing `[data-annotation-id]` node does not even mean the id is
//      unknown — an annotation that exists in the config but cannot be placed
//      on this chart draws nothing at all. Same treatment: no-op.
//   3. There is no supported way to redraw a subset. `drawAnnotations()`
//      removes the whole group on every call, so a step toggles CLASSES on
//      the nodes already there and never re-invokes the draw.
//
// Ids are stored lowercased, so they are lowercased here and compared
// case-sensitively afterwards.

/** Class on an annotation the active step does not show. */
export const HIDDEN_CLASS = 'vpress-annotation--hidden';
/** Class on an annotation the active step emphasises. */
export const EMPHASIS_CLASS = 'vpress-annotation--emphasis';
/** Class on a visible annotation while a DIFFERENT one is emphasised. */
export const MUTED_CLASS = 'vpress-annotation--muted';

/** Class on a data mark the active step emphasises. */
export const MARK_EMPHASIS_CLASS = 'vpress-mark--emphasis';
/** Class on a data mark that is not part of the active step's emphasis. */
export const MARK_MUTED_CLASS = 'vpress-mark--muted';

/**
 * Class enabling the between-step transitions, added one frame AFTER the
 * first paint of a draw.
 *
 * It is not decoration: the figure flips `aria-busy="false"` in the same tick
 * as the draw, so anything measuring on that signal — a visual-regression
 * test, a screenshot, the PNG export — must find the step's state already
 * settled, not a third of the way through a fade. The same hazard cost the
 * annotations their fade-in; the answer there was no motion at all, and the
 * answer here is motion that provably cannot be running at that moment.
 */
export const ANIMATED_CLASS = 'vpress-story-animated';

/**
 * Chart types a step may switch to.
 *
 * Mirrors vpress_story_chart_types() in includes/class-vpress-story.php, and
 * both are sourced from the same place: the `chartConfig` watcher in
 * vpress-chart-container.vue, which THROWS on anything outside this list.
 * `treemap` draws but cannot be switched to.
 */
export const STORY_CHART_TYPES = ['bars', 'heatmap', 'spineplot', 'scatter', 'timeline', 'map'];

const ID_PATTERN = /^[a-z0-9_-]{1,32}$/;

function toIds(raw) {
  if (!Array.isArray(raw)) return [];
  const ids = [];
  raw.forEach((value) => {
    if (typeof value !== 'string' && typeof value !== 'number') return;
    const id = String(value).trim().toLowerCase();
    if (ID_PATTERN.test(id) && !ids.includes(id)) ids.push(id);
  });
  return ids;
}

function toFilters(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((clause) => {
      if (!clause || typeof clause !== 'object') return null;
      const slug = typeof clause.slug === 'string' ? clause.slug.trim() : '';
      if (!slug) return null;
      const value = (Array.isArray(clause.value) ? clause.value : [])
        .filter((v) => typeof v === 'string' || typeof v === 'number');
      if (!value.length) return null;
      return { slug, type: clause.type === 'linear' ? 'linear' : 'ordinal', value };
    })
    .filter(Boolean);
}

/**
 * Canonicalise a step's `overrides`, from an attribute, a JSON string or an
 * editor field. Mirrors vpress_story_overrides() in PHP; the server is
 * authoritative, this exists so nothing downstream has to be defensive.
 *
 * Present-versus-absent is load-bearing for `show`, and only for `show`:
 * absent means every annotation stays visible, present means an allow-list —
 * so `show: []` is "none", which is what a checkbox list with nothing ticked
 * produces and what a step that has not revealed anything yet needs.
 *
 * @param {object|string} raw
 * @returns {{show?: string[], emphasize?: string[], hide?: string[], filters?: object[], title?: string, chartType?: string}}
 */
export function normalizeStoryOverrides(raw) {
  let source = raw;
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      return {};
    }
  }
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {};

  const out = {};
  ['show', 'emphasize', 'hide'].forEach((key) => {
    if (Array.isArray(source[key])) out[key] = toIds(source[key]);
  });

  const filters = toFilters(source.filters);
  if (filters.length) out.filters = filters;

  const title = typeof source.title === 'string' ? source.title.trim() : '';
  if (title) out.title = title;

  if (STORY_CHART_TYPES.includes(source.chartType)) out.chartType = source.chartType;

  return out;
}

/**
 * The part of a step's state that changes WHICH ROWS the chart draws, as a
 * comparable string. Two steps with the same key need no new query: their
 * difference is emphasis, which is classes on marks already on screen.
 *
 * @param {object} overrides Already normalised.
 * @returns {string}
 */
export function storyQueryKey(overrides) {
  const o = overrides || {};
  return JSON.stringify({ filters: o.filters || [], chartType: o.chartType || '' });
}

/**
 * Apply a step's annotation state to a drawn chart.
 *
 * @param {Element} root Anything containing the annotation groups (the <svg>).
 * @param {object} overrides Already normalised.
 * @returns {{visible: string[], hidden: string[], emphasized: string[]}} the
 *   ids actually FOUND in this chart — never the ids asked for, so a caller
 *   describing the state to a screen reader describes what is really there.
 */
export function applyAnnotationClasses(root, overrides) {
  const found = { visible: [], hidden: [], emphasized: [] };
  if (!root || typeof root.querySelectorAll !== 'function') return found;

  const o = overrides || {};
  const allow = Array.isArray(o.show) ? o.show : null;
  const hide = o.hide || [];
  const emphasize = o.emphasize || [];

  // Read the attribute off every node rather than building a selector from an
  // id: an id is author data, and interpolating it into a selector is a way
  // to throw on input that should only ever be ignored.
  const nodes = Array.from(root.querySelectorAll('[data-annotation-id]'));
  const state = nodes.map((node) => {
    const id = String(node.getAttribute('data-annotation-id') || '').toLowerCase();
    const hidden = hide.includes(id) || (allow !== null && !allow.includes(id));
    return { node, id, hidden, emphasized: !hidden && emphasize.includes(id) };
  });

  const anyEmphasis = state.some((entry) => entry.emphasized);
  state.forEach((entry) => {
    entry.node.classList.toggle(HIDDEN_CLASS, entry.hidden);
    entry.node.classList.toggle(EMPHASIS_CLASS, entry.emphasized);
    entry.node.classList.toggle(MUTED_CLASS, !entry.hidden && anyEmphasis && !entry.emphasized);
    if (entry.hidden) found.hidden.push(entry.id);
    else found.visible.push(entry.id);
    if (entry.emphasized) found.emphasized.push(entry.id);
  });

  return found;
}

/**
 * Which data marks an emphasised annotation singles out.
 *
 * Only an annotation that names a position on the CATEGORY axis can: a target
 * line on the value axis says something about every mark, so emphasising it
 * must not dim the whole chart. That is the safety property here — when
 * nothing selects a mark this returns `null`, and the caller then touches no
 * mark at all rather than muting everything.
 *
 * @param {Array} annotations The chart's annotations.
 * @param {string[]} emphasize Ids the step emphasises.
 * @param {string[]} markKeys Each drawn mark's category value, in draw order.
 * @returns {number[]|null} indices into markKeys, or null.
 */
export function markSelection(annotations, emphasize, markKeys) {
  const list = Array.isArray(annotations) ? annotations : [];
  const ids = Array.isArray(emphasize) ? emphasize : [];
  const keys = Array.isArray(markKeys) ? markKeys.map((k) => String(k)) : [];
  if (!ids.length || !keys.length) return null;

  const selected = new Set();
  let selects = false;

  list.forEach((annotation) => {
    if (!annotation || !ids.includes(String(annotation.id || '').toLowerCase())) return;
    const type = annotation.type;

    if (type === 'point' || type === 'text') {
      if (annotation.x === undefined || annotation.x === null) return;
      selects = true;
      keys.forEach((key, i) => {
        if (key === String(annotation.x)) selected.add(i);
      });
      return;
    }
    if (type === 'line' && annotation.axis === 'x') {
      if (annotation.value === undefined || annotation.value === null) return;
      selects = true;
      keys.forEach((key, i) => {
        if (key === String(annotation.value)) selected.add(i);
      });
      return;
    }
    if (type === 'range' && annotation.axis === 'x') {
      const from = keys.indexOf(String(annotation.from));
      const to = keys.indexOf(String(annotation.to));
      if (from !== -1 && to !== -1) {
        selects = true;
        for (let i = Math.min(from, to); i <= Math.max(from, to); i += 1) selected.add(i);
        return;
      }
      // Not categories: a numeric band on a linear or time axis.
      const lo = Number(annotation.from);
      const hi = Number(annotation.to);
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return;
      selects = true;
      keys.forEach((key, i) => {
        const value = Number(key);
        if (Number.isFinite(value) && value >= Math.min(lo, hi) && value <= Math.max(lo, hi)) selected.add(i);
      });
    }
    // line/range on the value axis, and anything unrecognised: says nothing
    // about which marks matter, so it selects none and dims none.
  });

  if (!selects) return null;
  return Array.from(selected).sort((a, b) => a - b);
}

/**
 * Apply a mark selection. `null` (nothing selects marks) clears every class,
 * so the chart is never left dimmed by a step that only moved a rule.
 *
 * @param {Element[]} marks Drawn marks, in the same order as markKeys.
 * @param {number[]|null} selection Indices from markSelection().
 * @returns {number} how many marks were emphasised.
 */
export function applyMarkClasses(marks, selection) {
  const list = Array.isArray(marks) ? marks : [];
  const chosen = selection && selection.length ? new Set(selection) : null;
  list.forEach((mark, i) => {
    if (!mark || !mark.classList) return;
    mark.classList.toggle(MARK_EMPHASIS_CLASS, Boolean(chosen && chosen.has(i)));
    mark.classList.toggle(MARK_MUTED_CLASS, Boolean(chosen && !chosen.has(i)));
  });
  return chosen ? chosen.size : 0;
}

/**
 * Merge a step's filter clauses over the chart's own: a clause replaces the
 * chart's for the same column, and the chart's other columns survive. Same
 * rule the editor's own filter panel uses (setFilters in vpress/helpers).
 *
 * @param {Array} base Chart config filters.
 * @param {Array} override Step filters.
 * @returns {Array}
 */
export function mergeStoryFilters(base, override) {
  const kept = (Array.isArray(base) ? base : []).filter(
    (clause) => !(Array.isArray(override) ? override : []).some((o) => o.slug === (clause && clause.slug))
  );
  return kept.concat(Array.isArray(override) ? override : []);
}
