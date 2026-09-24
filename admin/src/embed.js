// Public embed entry: renders every server-rendered Vpress <figure> on the
// page. Deliberately free of Vuetify, Pinia, vue-router and LogRocket.
import { createApp } from 'vue';
import VpressEmbed from './embed/VpressEmbed.vue';
import './embed/embed.css';

const DEFAULT_REST_ROOT = '/wp-json/vpress/v1/';
const SELECTOR = '[data-vpress-chart]';

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
    app.mount(target);
    // Marked only once mounted, so a failed mount can be retried by mount().
    figure.dataset.vpressMounted = 'true';
    return app;
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
 * @returns {Array} the Vue apps created by this call
 */
export function mount(el = document) {
  if (!el) return [];
  const figures = el.matches && el.matches(SELECTOR)
    ? [el]
    : Array.from(el.querySelectorAll(SELECTOR));
  return figures.map(mountFigure).filter(Boolean);
}

window.vpress = Object.assign(window.vpress || {}, { mount });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => mount());
} else {
  mount();
}
