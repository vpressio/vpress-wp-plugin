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
          :disabled="graph.disabled"
          text
          @click="setChartType(graph.type)"
          class="mx-1"
        >
          <v-img
            :class="graph.disabled ? 'disabled-graph-image' : ''"
            :src="requireImg(graph.type)"
            :alt="graph.type"
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
          dark
          color="grey"
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
          dark
          color="grey"
        >
          <v-icon>
            {{ stackedBars ? 'mdi-chart-bar' : 'mdi-chart-bar-stacked'}}
          </v-icon>
        </v-btn>
        <v-btn
          class="mr-2"
          @click="toggleOrder"
          small
          dark
          color="grey"
        >
          <v-img
            :src="requireImg('totales')"
            :alt="'Ordenar'"
            width="10"
          />
        </v-btn>
        <v-btn
          class="mr-2"
          @click="orderByAlphabetical"
          small
          dark
          :color="this.sortedBy === 'alphabetical' ? 'primary' : 'grey'"
        >
          <v-img
            :src="requireImg('alfabeto')"
            :alt="'Invertir ejes'"
            width="10"
          />
        </v-btn>
        <v-btn
          class="mr-2"
          @click="orderByNumerical"
          small
          dark
          :color="this.sortedBy === 'numerical' ? 'primary' : 'grey'"
        >
          <v-img
            :src="requireImg('numerico')"
            :alt="'Invertir ejes'"
            width="10"
          />
        </v-btn>
        <v-btn
          class="mr-2"
          @click="invertAxis"
          small
          dark
          color="grey"
        >
          <v-img
            :src="requireImg('invertir')"
            :alt="'Invertir ejes'"
            width="10"
          />
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
      order: this.$store.getters['chartConfig/order'],
      sortedBy: ''
    };
  },
  created() {
    this.labels = this.$store.getters['chartConfig/labels'];
    this.stackedBars = this.$store.getters['chartConfig/stackedBars'];
  },
  computed: {
    chartIsBarsGrouped() {
      return (
        this.$store.getters['chartConfig/chart'].chart === 'bars' &&
        this.$store.getters['chartConfig/groupBy.slug'].length !== 0
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
    },
    orderByAlphabetical() {
      const chartValues = this.$store.getters['chartConfig/chart'];
      if (chartValues.xAxis.slug !== chartValues.yAxis.slug) {
        if (chartValues.xAxis.type === 'ordinal' ) {
          this.$store.dispatch('chartConfig/UPDATE_ORDER_BY', chartValues.xAxis.slug);
        }
        if (chartValues.yAxis.type === 'ordinal' ) {
          this.$store.dispatch('chartConfig/UPDATE_ORDER_BY', chartValues.yAxis.slug);
        }
        
      } else if (chartValues.xAxis.type === 'ordinal') {
        this.$store.dispatch('chartConfig/UPDATE_ORDER_BY', chartValues.xAxis.slug);
      } else {
        this.$store.dispatch('chartConfig/UPDATE_ORDER_BY', '');
      }
      this.sortedBy = 'alphabetical';
    },
    orderByNumerical() {
      const chartValues = this.$store.getters['chartConfig/chart'];
      if (chartValues.xAxis.slug !== chartValues.yAxis.slug) {
        if (chartValues.xAxis.type === 'linear' ) {
          this.$store.dispatch('chartConfig/UPDATE_ORDER_BY', chartValues.xAxis.slug);
        }
        if (chartValues.yAxis.type === 'linear' ) {
          this.$store.dispatch('chartConfig/UPDATE_ORDER_BY', chartValues.yAxis.slug);
        }
      } else if (chartValues.xAxis.type === 'linear') {
        this.$store.dispatch('chartConfig/UPDATE_ORDER_BY', chartValues.xAxis.slug);
      } else {
        this.$store.dispatch('chartConfig/UPDATE_ORDER_BY', 'total_count');
      }
      this.sortedBy = 'numerical';
    },
    invertAxis() {
      this.$store.dispatch('chartConfig/INVERT_AXIS')
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
