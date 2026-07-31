<template>
  <v-row v-show="editorStore.chart.chart !== 'map'">
    <v-col class="ml-5 v-step-7">
      <v-btn
        class="mr-2"
        rounded="0"
        @click="toggleLabels"
        size="small"
        theme="dark"
        color="color2"
        title="Etiquetas"
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
        rounded="0"
        size="small"
        theme="dark"
        color="color2"
        title="Agrupar"
      >
        <v-icon>
          {{ stackedBars ? 'mdi-chart-bar' : 'mdi-chart-bar-stacked'}}
        </v-icon>
      </v-btn>
      <!-- Removed upstream (2021-09 wave): manual asc/desc toggle superseded by the
           alphabetical/numerical order buttons below.
      <v-btn
        class="mr-2"
        @click="toggleOrder"
        rounded="0"
        size="small"
        theme="dark"
        color="color2"
        title="Ordenar"
      >
        <v-img
          :src="requireImg('totales')"
          :alt="'Ordenar'"
          width="10"
        />
      </v-btn> -->
      <v-btn
        class="mr-2"
        @click="orderByAlphabetical"
        rounded="0"
        size="small"
        theme="dark"
        color="color2"
        title="Ordenar alfabéticamente"
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
        rounded="0"
        size="small"
        theme="dark"
        color="color2"
        title="Ordenar numéricamente"
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
        rounded="0"
        size="small"
        theme="dark"
        color="color2"
        title="Invertir eje"
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
import { imageUrl } from '../utils/assetUrl.js'

export default {
  name: 'VpressVizButtons',
  mixins: [editorMixin],
  data() {
    return {
      labels: false,
      stackedBars: false,
      order: null,
    };
  },
  created() {
    this.order = this.editorStore.order;
    this.labels = this.editorStore.labels;
    this.stackedBars = this.editorStore.stackedBars;
  },
  computed: {
    chartIsBarsGrouped() {
      return (
        this.editorStore.chart.chart === 'bars' &&
        this.editorStore.groupBySlug.length !== 0
      );
    }
  },
  methods: {
    requireImg(chartType) {
      try {
        return imageUrl(`${chartType}.svg`);
      } catch (error) {
        return imageUrl('spineplot.svg')
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
      const chartValues = this.editorStore.chart;
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
      const chartValues = this.editorStore.chart;
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
