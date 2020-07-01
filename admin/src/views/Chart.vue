<template>
  <VpressChartContainer
    :data="chartData"
    :chartConfig="chartConfig"
  />
</template>
<script>
import VpressChartContainer from '../components/vpress-chart-container'

export default {
  name: 'Chart',
  components: {
    VpressChartContainer
  },
  data() {
    return {
      chartConfig: {},
      chartData: []
    }
  },
  created () {
    this.getUrlParams();
  },
  methods: {
    async getUrlParams() {
      try {
        if( this.$route.params.chartid ) {
          const document = await this.$store.dispatch(`chartConfig/GET_CHART_BY_ID`, this.$route.params.chartid );
          this.chartConfig = document.chartValues;
          const file = await this.$store.dispatch('data/GET_DATASET_BY_NAME', { dataSetDir: '/savedDatasets', file: document.dataSet })
          const data = await this.$store.dispatch('data/READ_FILE', file);
          await this.$store.dispatch('data/SAVE_DATA', { data: data, dataSetName: document.dataSet });
          this.chartData = this.$store.getters['data/activeChartData'](this.$store.getters['chartConfig/activeChartIndex']);
        }
      } catch (error) {
        console.warn(error);
        this.$router.push('/');
      }
    }
  }
}
</script>