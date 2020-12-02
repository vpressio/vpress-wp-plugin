<template>
  <v-row v-show="$store.getters['editor/chart'].chart !== 'map'">
    <v-col class="ml-5 v-step-7">
      <v-btn
        class="mr-2"
        @click="toggleLabels"
        small
        dark
        color="color2"
      >
        <v-icon>
          mdi-tag-outline
        </v-icon>
      </v-btn>
      <v-btn
        v-show="chartIsBarsGrouped
        "
        class="mr-2"
        @click="toggleBarsType"
        small
        dark
        color="color2"
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
        color="color2"
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
        color="color2"
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
        color="color2"
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
        color="color2"
      >
        <v-img
          :src="requireImg('invertir')"
          :alt="'Invertir ejes'"
          width="10"
        />
      </v-btn>
    </v-col>
  </v-row>
</template>
<script>
import { editorMixin } from '../mixins/index.js'

export default {
  name: 'VpressVizButtons',
  mixins: [editorMixin],
  data() {
    return {
      labels: false,
      stackedBars: false,
      order: this.$store.getters['editor/order'],
    };
  },
  created() {
    this.labels = this.$store.getters['editor/labels'];
    this.stackedBars = this.$store.getters['editor/stackedBars'];
  },
  computed: {
    chartIsBarsGrouped() {
      return (
        this.$store.getters['editor/chart'].chart === 'bars' &&
        this.$store.getters['editor/groupBy.slug'].length !== 0
      );
    }
  },
  methods: {
    requireImg(chartType) {
      try {
        return require(`../assets/images/${chartType}.svg`);
      } catch (error) {
        return require('../assets/images/spineplot.svg')
      }
    },
    toggleLabels() {
      this.labels = !this.labels;
      this.merge_value(
        { mutationType: 'labels' ,value: this.labels }
      );
    },
    toggleBarsType() {
      this.stackedBars = !this.stackedBars;
      this.merge_value(
        { mutationType: 'stackedBars' ,value: this.stackedBars
      });
    },
    toggleOrder() {
      const order = [ 'asc', 'desc' ];
      const selectedOrderIndex = order.indexOf(this.order);
      if ( (selectedOrderIndex + 1) < order.length) {
        this.order = order[selectedOrderIndex + 1]
      } else {
        this.order = order[0]
      }
      this.merge_value(
        { mutationType: 'orderBy' ,value: this.order}
      );
    },
    orderByAlphabetical() {
      const chartValues = this.$store.getters['editor/chart'];
      if (chartValues.xAxis.slug !== chartValues.yAxis.slug) {
        if (chartValues.xAxis.type === 'ordinal' ) {
          this.merge_value(
            { mutationType: 'orderBy' ,value: chartValues.xAxis.slug }
          );
        }
        if (chartValues.yAxis.type === 'ordinal' ) {
          this.merge_value(
            { mutationType: 'orderBy' ,value: chartValues.yAxis.slug }
          );
        }

      } else if (chartValues.xAxis.type === 'ordinal') {
        this.merge_value(
          { mutationType: 'orderBy' ,value: chartValues.xAxis.slug }
        );
      } else {
        this.merge_value(
          { mutationType: 'orderBy' ,value: '' }
        );
      }
    },
    orderByNumerical() {
      const chartValues = this.$store.getters['editor/chart'];
      if (chartValues.xAxis.slug !== chartValues.yAxis.slug) {
        if (chartValues.xAxis.type === 'linear' ) {
          this.merge_value(
            { mutationType: 'orderBy' ,value: chartValues.xAxis.slug }
          );
        }
        if (chartValues.yAxis.type === 'linear' ) {
          this.merge_value(
            { mutationType: 'orderBy' ,value: chartValues.yAxis.slug }
          );
        }
      } else if (chartValues.xAxis.type === 'linear') {
        this.merge_value(
          { mutationType: 'orderBy' ,value: chartValues.xAxis.slug }
        );
      } else {
        this.merge_value(
          { mutationType: 'orderBy' ,value: 'total_count' }
        );
      }
    },
    invertAxis() {
      this.merge_value(
        { mutationType: 'invertAxis' }
      );
    }
  }
}
</script>
