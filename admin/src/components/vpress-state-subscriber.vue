<template>
  <div>
    <VpressChartSelectButtons :availableCharts="availableCharts"/>
    <ChartComponent :data="dataChart" :chartConfig="chartConfig"/>
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
      availableCharts: this.$store.getters[
        'chartConfig/getAvailableCharts'
      ]
    };
  },
  created() {
    this.$store.subscribe((mutation, state) => {
      const chartConfig = _.cloneDeep(state.chartConfig);
      this.chartConfig = chartConfig;

      this.availableCharts = this.$store.getters[
      'chartConfig/getAvailableCharts'
    ]
    });
  }
};
</script>
