<template>
  <v-card flat class="px-2 py-3">
    <v-row>
      <v-col
        class="buttons-header"
        v-show="!$vuetify.breakpoint.smAndDown"
        xl="2"
        lg="3"
      >
        TIPOS DE
        <br/>
        GRÁFICOS
      </v-col>
      <v-col>
        <v-btn
          v-for="(graph, graphIndex) in availableCharts"
          :key="graphIndex"
          text
          @click="setChartType(graph.chartType)"
          :disabled="graph.disabled"
          class="mx-1"
        >
          <v-img
            :class="graph.disabled ? 'disabled-graph-image' : ''"
            :src="requireImg(graph.chartType)"
            :alt="graph.chartType"
            width="30"
            height="30"
          />
        </v-btn>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-btn @click="toggleLabels">ETIQUETAS</v-btn>
        <v-btn v-show="chartIsBarsGrouped" @click="toggleBarsType">{{
          stackedBars ? 'BARRAS AGRUPADAS' : 'BARRAS APILADAS'
        }}</v-btn>
      </v-col>
    </v-row>
  </v-card>
</template>
<script>
export default {
  name: 'VpressChartSelectButtons',
  props: ['availableCharts'],
  data() {
    return {
      labels: false,
      stackedBars: false,
      graphs: []
    };
  },
  created() {
    this.labels = this.$store.getters['chartConfig/labels'];
    this.stackedBars = this.$store.getters['chartConfig/stackedBars'];
  },
  computed: {
    chartIsBarsGrouped() {
      return (
        this.$store.getters['chartConfig/chart'] === 'bars' &&
        this.$store.getters['chartConfig/groupBy.slug']
      );
    }
  },
  methods: {
    setChartType(chartType) {
      this.$store.dispatch('chartConfig/UPDATE_CHART_TYPE', chartType);
    },
    requireImg(chartType) {
      return require(`../assets/images/${chartType}.svg`);
    },
    toggleLabels() {
      this.labels = !this.labels;
      this.$store.dispatch('chartConfig/UPDATE_SHOW_LABELS', this.labels);
    },
    toggleBarsType() {
      this.stackedBars = !this.stackedBars;
      this.$store.dispatch('chartConfig/UPDATE_STACK_BARS', this.stackedBars);
    }
  }
};
</script>
<style scoped>
.buttons-header {
  display: flex;
  justify-content: center;
  align-self: center;
  border-right: solid 0.5px;
  font-weight: 600;
  line-height: initial;
}

.disabled-graph-image {
  filter: opacity(30%);
}
</style>
