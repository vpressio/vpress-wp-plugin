<template>
  <v-card flat class="px-2 py-3">
    <v-row>
      <v-col
        class="buttons-header"
        v-show="!$vuetify.breakpoint.smAndDown"
        xl="2"
        lg="3"
        md="3"
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
          class="mx-1"
        >
          <v-img
            :src="requireImg(graph.chartType)"
            :alt="graph.chartType"
            width="30"
            height="30"
          />
        </v-btn>
      </v-col>
    </v-row>
    <v-row>
      <v-col class="ml-5">
        <v-btn
          class="mr-2"
          @click="toggleLabels"
          small
          color="secondary"
        >
          <v-icon>
            mdi-tag-outline
          </v-icon>
        </v-btn>
        <v-btn
          v-show="chartIsBarsGrouped"
          class="mr-2"
          @click="toggleBarsType"
          small
          color="secondary"
        >
          <v-icon>
            {{ stackedBars ? 'mdi-chart-bar' : 'mdi-chart-bar-stacked'}}
          </v-icon>
        </v-btn>
        <v-btn
          class="mr-2"
          @click="toggleOrder"
          small
          color="secondary"
        >
          <v-icon>
            {{ orderIcon }}
          </v-icon>
        </v-btn>
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
      order: '',
      graphs: []
    };
  },
  created() {
    this.labels = this.$store.getters['chartConfig/labels'];
    this.stackedBars = this.$store.getters['chartConfig/stackedBars'];
    this.order = this.$store.getters['chartConfig/order'];
  },
  computed: {
    chartIsBarsGrouped() {
      return (
        this.$store.getters['chartConfig/chart'].chart === 'bars' &&
        this.$store.getters['chartConfig/groupBy.slug'].length !== 0
      );
    },
    orderIcon() {
      switch (this.order) {
        case 'asc':
          return 'mdi-format-vertical-align-top'
        case 'desc':
          return 'mdi-format-vertical-align-bottom'
        default:
          return 'mdi-fruit-watermelon'
      }
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
    },
    toggleOrder() {
      const order = [ 'asc', 'desc' ];
      const selectedOrderIndex = order.indexOf(this.order);
      if ( (selectedOrderIndex + 1) < order.length) {
        this.order = order[selectedOrderIndex + 1]
      } else {
        this.order = order[0]
      }
      this.$store.dispatch('chartConfig/UPDATE_ORDER_BY', this.order);
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
