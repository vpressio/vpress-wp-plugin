<template>
  <div>
    <!-- <p>{{ dataChart }}</p>
    <p>{{ displayChartConfig }}</p> -->
    <ChartComponent :data="dataChart" :chartConfig="chartConfig"></ChartComponent>
  </div>
</template>
<script>
import * as _ from 'lodash';
import ChartComponent from '../components/ChartComponent.vue';

export default {
  name: 'vpress-state-subscriber',
  components: {
    ChartComponent
  },
  data() {
    return {
      dataChart: this.$store.state.data.data,
      chartConfig: this.$store.state.chartConfig
    };
  },
  created() {
    this.$store.subscribe((mutation, state) => {
      console.log(mutation);
      console.log(state.data);
      console.log(state.chartConfig);
      const chartConfig = _.cloneDeep(state.chartConfig);
      this.chartConfig = chartConfig;
    });
  },
  computed: {
    displayChartConfig() {
      return this.chartConfig;
    }
  }
};
</script>
