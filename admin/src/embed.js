// Public embed entry: renders every server-rendered Vpress <figure> on the
// page, and wires every server-rendered Vpress story. Deliberately free of
// Vuetify, Pinia, vue-router and LogRocket.
import { createApp } from 'vue';
import VpressEmbed from './embed/VpressEmbed.vue';
import { initStories } from './story.js';
import './embed/embed.css';

const DEFAULT_REST_ROOT = '/wp-json/vpress/v1/';
const SELECTOR = '[data-vpress-chart]';

// figure element -> the handle mount() returned for it, so a story can reach
// the chart inside it without anyone reaching into Vue.
const handles = typeof WeakMap === 'function' ? new WeakMap() : null;

function mountFigure(figure) {
  if (figure.dataset.vpressMounted) return null;
  const chartId = Number.parseInt(figure.dataset.vpressChart, 10);
  const target = figure.querySelector('.vpress-figure__chart');
  if (!Number.isInteger(chartId) || chartId <= 0 || !target) return null;

  const props = {
    chartId,
    restRoot: figure.dataset.vpressRest || DEFAULT_REST_ROOT
  };
  // Present only for logged-in viewers; anonymous markup carries no nonce.
  if (figure.dataset.vpressNonce) props.nonce = figure.dataset.vpressNonce;

  try {
    const app = createApp(VpressEmbed, props);
    // app.mount() returns the root component instance — the component's own
    // public surface. Everything a story needs goes through it; nothing here
    // reaches into a Vue internal.
    const instance = app.mount(target);
    // Marked only once mounted, so a failed mount can be retried by mount().
    figure.dataset.vpressMounted = 'true';

    const handle = {
      chartId,
      figure,
      app,
      /** Kept from the previous return value: callers still do app.unmount(). */
      unmount: () => app.unmount(),
      /** Apply a story step's state. See VpressEmbed for the contract. */
      applyStoryState: (overrides) => instance.applyStoryState(overrides),
      /** What the chart is showing now, for the editor's state capture. */
      readStoryState: () => instance.readStoryState()
    };
    if (handles) handles.set(figure, handle);
    return handle;
  } catch (error) {
    console.error(`[vpress] could not mount chart ${chartId}:`, error);
    return null;
  }
}

/**
 * Mount a figure, or every figure inside `el` (defaults to the document).
 * Already-mounted figures are skipped, so calling this repeatedly is safe.
 *
 * @param {Element|Document} [el]
 * @returns {Array<{chartId: number, figure: Element, app: object, unmount: Function,
 *   applyStoryState: Function, readStoryState: Function}>} one handle per
 *   figure this call mounted. `unmount()` is on it because the block editor
 *   has always called that on what this returns.
 */
export function mount(el = document) {
  if (!el) return [];
  const figures = el.matches && el.matches(SELECTOR)
    ? [el]
    : Array.from(el.querySelectorAll(SELECTOR));
  return figures.map(mountFigure).filter(Boolean);
}

/** The handle for an already-mounted figure, if this page mounted it. */
export function handleFor(figure) {
  return (handles && figure && handles.get(figure)) || null;
}

/**
 * Wire every story in `el`. Separate from mount() on purpose: the block
 * editor mounts a preview it drives from the selected step, and must not
 * also get a scroll observer competing for the same chart.
 *
 * @param {Element|Document} [el]
 * @returns {object[]} the story controllers created by this call
 */
export function stories(el = document) {
  return initStories(el, handleFor);
}

window.vpress = Object.assign(window.vpress || {}, { mount, stories, handleFor });

function boot() {
  mount();
  stories();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
