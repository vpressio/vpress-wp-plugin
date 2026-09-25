<template>
  <div class="vpress-embed">
    <p
      v-if="error"
      class="vpress-figure__error"
      role="alert"
    >
      {{ error }}
    </p>
    <VpressChartContainer
      v-else-if="chartData.length"
      :id="containerId"
      ref="container"
      iframe
      :data="chartData"
      :chart-config="chartConfig"
      :date-format="dateFormat"
      :alt-text="altText"
      :alt-title="altTitle"
      @chart_loaded="onLoaded"
      @chart_error="onChartError"
    />
    <div
      v-else
      class="vpress-embed__loading"
    >
      <div
        class="vpress-spinner"
        aria-hidden="true"
      />
    </div>
  </div>
</template>

<script>
import VpressChartContainer from '../components/vpress-chart-container.vue';
import { queryBody, extractDataType } from '../vpress/helpers/index.js';
import {
  normalizeStoryOverrides,
  storyQueryKey,
  mergeStoryFilters,
  HIDDEN_CLASS,
  EMPHASIS_CLASS
} from '../charts/story.js';

let uid = 0;

const GENERIC_ERROR = 'No se pudo cargar la gráfica.';
const EMPTY_ERROR = 'Esta gráfica no tiene datos.';

export default {
  name: 'VpressEmbed',
  components: { VpressChartContainer },
  props: {
    chartId: { type: Number, required: true },
    restRoot: { type: String, default: '/wp-json/vpress/v1/' },
    // wp_rest nonce, set for logged-in viewers only.
    nonce: { type: String, default: '' }
  },
  data() {
    return {
      containerId: `vpress-chart-${this.chartId}-${++uid}`,
      chartConfig: {},
      chartData: [],
      dateFormat: undefined,
      // The chart's own config, as saved. A story step overrides parts of it
      // without ever editing it, so this stays the thing to fall back to.
      baseValues: null,
      dataset: null,
      // The figure's server-rendered text alternative and label, handed to
      // the chart's <svg> as <desc>/<title>.
      altText: '',
      altTitle: '',
      // The <figcaption> title as the server rendered it, so a step's title
      // override can be undone by the next step.
      baseTitle: '',
      error: ''
    };
  },
  created() {
    // Not reactive, deliberately: story state is painted onto the drawn SVG
    // by hand, and making it reactive would open a second, invisible redraw
    // path beside the container's chartConfig watcher.
    this.storyOverrides = null;
    this.loadedQueryKey = storyQueryKey(null);
    // Which query is the current one. A reader scrolling fast through steps
    // that each filter differently starts several, and they do not have to
    // come back in the order they left.
    this.queryToken = 0;
    this.load();
  },
  mounted() {
    this.readAltText();
    this.readBaseTitle();
  },
  methods: {
    endpoint(path) {
      const root = this.restRoot.endsWith('/') ? this.restRoot : `${this.restRoot}/`;
      return root + path;
    },
    async request(path, init) {
      const headers = { Accept: 'application/json', ...(init && init.headers) };
      if (this.nonce) headers['X-WP-Nonce'] = this.nonce;
      const res = await window.fetch(this.endpoint(path), {
        credentials: 'same-origin',
        ...init,
        headers
      });
      if (!res.ok) {
        throw new Error(`${path} → HTTP ${res.status}`);
      }
      const body = await res.json();
      return body && body.data;
    },
    async load() {
      try {
        const chart = await this.request(`chart/get/${this.chartId}`);
        if (!chart) throw new Error(`chart ${this.chartId} not found`);
        const dataset = await this.request(`dataset/get/${chart.dataset_id}`);
        if (!dataset) throw new Error(`dataset ${chart.dataset_id} not found`);

        this.baseValues = typeof chart.value === 'string' ? JSON.parse(chart.value) : chart.value;
        this.dataset = dataset;
        await this.runQuery();
      } catch (error) {
        this.fail(GENERIC_ERROR, error);
      }
    },
    /**
     * The chart's config with the active story step's overrides folded in.
     * Only `filters` and `chartType` ever reach the query; everything else a
     * step can say is emphasis, which never needs new rows.
     */
    effectiveValues() {
      const values = { ...(this.baseValues || {}) };
      const overrides = this.storyOverrides;
      if (!overrides) return values;
      if (overrides.filters) {
        values.filters = mergeStoryFilters(values.filters || [], overrides.filters);
      }
      if (overrides.chartType) values.chart = overrides.chartType;
      return values;
    },
    /** Run (or re-run) the chart's query and hand the rows to the container. */
    async runQuery() {
      if (!this.baseValues || !this.dataset) return;
      const values = this.effectiveValues();
      this.loadedQueryKey = storyQueryKey(this.storyOverrides);
      // Defensive `|| 0`: a token that ever became NaN would compare unequal
      // to itself and silently discard every response the chart ever got.
      this.queryToken = (this.queryToken || 0) + 1;
      const token = this.queryToken;
      // A re-query redraws: say so, so anything waiting on the figure being
      // idle waits for the new draw and not the old one.
      if (this.chartData.length) this.setBusy(true);

      try {
        const query = {
          ...queryBody(values, this.dataset.slug, this.dataset.source),
          chart_id: this.chartId
        };
        const rows = await this.request('chart/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(query)
        });

        // A step the reader has already scrolled past. Its rows would draw
        // the wrong chart AND leave loadedQueryKey describing a state the
        // chart is not in, so the next step could decide it needs no query.
        if (token !== this.queryToken) return;

        if (!Array.isArray(rows) || rows.length === 0) {
          this.fail(EMPTY_ERROR, new Error(`chart ${this.chartId} query returned no rows`));
          return;
        }
        this.dateFormat = extractDataType(rows[0]).dateFormat || undefined;
        this.chartData = rows;
        // Title and subtitle are server-rendered in the <figcaption>; blank
        // them here so the chart does not print them a second time. A new
        // object every time: the container redraws on the config's identity.
        this.chartConfig = { ...values, title: '', subtitle: '' };
      } catch (error) {
        if (token !== this.queryToken) return;
        this.fail(GENERIC_ERROR, error);
      }
    },

    /* ------------------------------------------------------------ story */

    /**
     * Apply a story step's state to this chart — the one entry point
     * `admin/src/story.js` uses, reached through the handle `mount()` returns
     * rather than through any Vue internal.
     *
     * `show` / `hide` / `emphasize` are classes on annotations and marks that
     * are already drawn: no redraw, and an id this chart does not have is a
     * no-op. `filters` and `chartType` re-run the chart's own query/redraw
     * path, and only when they actually changed. `title` rewrites the
     * figure's caption, which the chart itself does not own.
     *
     * Safe before the chart has loaded: the state is remembered and the first
     * draw comes out already wearing it.
     *
     * @param {object|string} overrides A step's `overrides`.
     */
    applyStoryState(overrides) {
      const next = normalizeStoryOverrides(overrides);
      this.storyOverrides = next;
      this.applyStoryTitle();

      if (!this.baseValues) return; // load() will pick it up
      if (storyQueryKey(next) !== this.loadedQueryKey) {
        this.runQuery();
        return;
      }
      this.paintStoryState(true);
    },
    /**
     * What the chart is showing right now, for the editor's "Capturar estado
     * actual". Annotation state is read from the DRAWN SVG rather than from
     * what was asked for, so it can only ever report ids this chart has.
     *
     * @returns {{show: string[], emphasize: string[], filters: Array, chartType: string, title: string}}
     */
    readStoryState() {
      const container = this.$refs.container;
      const root = container && container.$el;
      const show = [];
      const emphasize = [];
      if (root && root.querySelectorAll) {
        Array.from(root.querySelectorAll('[data-annotation-id]')).forEach((node) => {
          const id = String(node.getAttribute('data-annotation-id') || '').toLowerCase();
          if (!id || node.classList.contains(HIDDEN_CLASS)) return;
          show.push(id);
          if (node.classList.contains(EMPHASIS_CLASS)) emphasize.push(id);
        });
      }

      const legend = container && container.storyLegendFilter ? container.storyLegendFilter() : null;
      const overrides = this.storyOverrides || {};
      const base = (this.baseValues && this.baseValues.chart) || '';
      const current = (this.chartConfig && this.chartConfig.chart) || '';

      return {
        show,
        emphasize,
        // Only what DIFFERS from the chart's own config: the chart's filters
        // apply anyway, and pinning them into a step would freeze them.
        filters: mergeStoryFilters(overrides.filters || [], legend ? [legend] : []),
        chartType: current && current !== base ? current : '',
        title: overrides.title || ''
      };
    },
    /** Paint the remembered state onto the drawn chart. */
    paintStoryState(animate) {
      const container = this.$refs.container;
      if (!container || !container.applyStoryEmphasis) return null;
      return container.applyStoryEmphasis(this.storyOverrides || {}, { animate: animate === true });
    },
    applyStoryTitle() {
      const figure = this.figure();
      if (!figure) return;
      const node = figure.querySelector('.vpress-figure__title');
      if (!node) return; // the block may be rendered with the caption off
      const title = (this.storyOverrides && this.storyOverrides.title) || '';
      node.textContent = title || this.baseTitle;
    },

    /* ----------------------------------------------------------- status */

    fail(message, detail) {
      console.error(`[vpress] chart ${this.chartId}:`, detail);
      this.error = message;
      this.setBusy(false);
    },
    onChartError(error) {
      this.fail(GENERIC_ERROR, error);
    },
    onLoaded() {
      /*
       * Order is the contract. The step's state is painted with transitions
       * OFF, and only then does the figure say it is idle — so a screenshot,
       * a visual-regression run or the PNG export taken on `aria-busy="false"`
       * finds the story's frame settled rather than a third of the way into a
       * fade. Transitions come on a frame later, which is also what makes the
       * NEXT step animate instead of snapping.
       */
      this.paintStoryState(false);
      this.setBusy(false);
      const container = this.$refs.container;
      if (container && container.enableStoryTransitions) container.enableStoryTransitions();
    },
    figure() {
      return (this.$el && this.$el.closest && this.$el.closest('.vpress-figure')) || null;
    },
    host() {
      return (this.$el && this.$el.closest && this.$el.closest('.vpress-figure__chart')) || null;
    },
    readAltText() {
      const host = this.host();
      if (!host) return;
      this.altTitle = host.getAttribute('aria-label') || '';
      const descId = host.getAttribute('aria-describedby');
      const desc = descId ? host.ownerDocument.getElementById(descId) : null;
      this.altText = desc ? desc.textContent.trim() : '';
    },
    readBaseTitle() {
      const figure = this.figure();
      const node = figure && figure.querySelector('.vpress-figure__title');
      this.baseTitle = node ? node.textContent : '';
    },
    setBusy(busy) {
      const host = this.host();
      if (host) host.setAttribute('aria-busy', busy ? 'true' : 'false');
    }
  }
};
</script>
