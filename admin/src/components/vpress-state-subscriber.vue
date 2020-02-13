<template>
  <div>
    <!-- <p>{{ dataChart }}</p>
    <p>{{ displayChartConfig }}</p> -->
    <VpressChartSelectButtons :availableCharts="availableCharts"/>
    <ChartComponent :data="dataChart" :chartConfig="chartConfig"></ChartComponent>
  </div>
</template>
<script>
import * as _ from 'lodash';
import ChartComponent from '../components/ChartComponent.vue';
import VpressChartSelectButtons from './vpress-chart-select-buttons.vue';

export default {
  name: 'vpress-state-subscriber',
  components: {
    ChartComponent,
    VpressChartSelectButtons
  },
  data() {
    return {
      dataChart: this.$store.state.data.data,
      chartConfig: this.$store.state.chartConfig,
      availableCharts: this.$store.getters['chartConfig/getChartTypes']
    };
  },
  created() {
    this.$store.subscribe((mutation, state) => {
      console.log(mutation);
      console.log(state.data);
      console.log(state.chartConfig);
      const chartConfig = _.cloneDeep(state.chartConfig);
      this.chartConfig = chartConfig;

      this.availableCharts = this.$store.getters[
      'chartConfig/getChartTypes'
    ]
    });
  },
  computed: {
    displayChartConfig() {
      return this.chartConfig;
    }
  }
};
</script>
