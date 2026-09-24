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
      iframe
      :data="chartData"
      :chart-config="chartConfig"
      :date-format="dateFormat"
      @chart_loaded="onLoaded"
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

let uid = 0;

const GENERIC_ERROR = 'No se pudo cargar la gráfica.';
const EMPTY_ERROR = 'Esta gráfica no tiene datos.';

export default {
  name: 'VpressEmbed',
  components: { VpressChartContainer },
  props: {
    chartId: { type: Number, required: true },
    restRoot: { type: String, default: '/wp-json/vpress/v1/' }
  },
  data() {
    return {
      containerId: `vpress-chart-${this.chartId}-${++uid}`,
      chartConfig: {},
      chartData: [],
      dateFormat: undefined,
      error: ''
    };
  },
  created() {
    this.load();
  },
  methods: {
    endpoint(path) {
      const root = this.restRoot.endsWith('/') ? this.restRoot : `${this.restRoot}/`;
      return root + path;
    },
    async request(path, init) {
      const res = await window.fetch(this.endpoint(path), {
        credentials: 'same-origin',
        ...init,
        headers: { Accept: 'application/json', ...(init && init.headers) }
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

        const values = typeof chart.value === 'string' ? JSON.parse(chart.value) : chart.value;
        const query = {
          ...queryBody(values, dataset.slug, dataset.source),
          chart_id: this.chartId
        };
        const rows = await this.request('chart/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(query)
        });

        if (!Array.isArray(rows) || rows.length === 0) {
          this.fail(EMPTY_ERROR, new Error(`chart ${this.chartId} query returned no rows`));
          return;
        }
        this.dateFormat = extractDataType(rows[0]).dateFormat || undefined;
        // Title and subtitle are server-rendered in the <figcaption>; blank
        // them here so the chart does not print them a second time.
        this.chartConfig = { ...values, title: '', subtitle: '' };
        this.chartData = rows;
      } catch (error) {
        this.fail(GENERIC_ERROR, error);
      }
    },
    fail(message, detail) {
      console.error(`[vpress] chart ${this.chartId}:`, detail);
      this.error = message;
      this.setBusy(false);
    },
    onLoaded() {
      this.setBusy(false);
    },
    setBusy(busy) {
      const host = this.$el && this.$el.closest && this.$el.closest('.vpress-figure__chart');
      if (host) host.setAttribute('aria-busy', busy ? 'true' : 'false');
    }
  }
};
</script>
