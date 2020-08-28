<template>
  <div style="display:flex;justify-content:center;height:100%;width:100%;align-items:center">
    <VpressChartContainer
      id="empty_chart_0"
      :data="chartData"
      :chartConfig="chartConfig"
      iframe
      :margin="{ top: 10, right: 100, bottom: 5, left: 100 }"
    /> 
  </div>
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
          //Todo: validate with route /wp for wordpress api, and /st for storage
          // if(this.$store.getters['data/origin'] === 'api') {
            const chart = await this.$store.dispatch('chartConfig/GET_WP_CHART', this.$route.params.chartid )
            this.chartData = chart.chartData
            this.chartConfig = chart.chartConfig
          // } else {
            // const document = await this.$store.dispatch(`chartConfig/GET_ST_CHART`, this.$route.params.chartid );
            // this.chartConfig = document.chartValues;
            // const file = await this.$store.dispatch('data/GET_DATASET_BY_NAME', { dataSetDir: '/savedDatasets', file: document.dataSet })
            // const data = await this.$store.dispatch('data/READ_FILE', file);
            // await this.$store.dispatch('data/SAVE_DATA', { data: data, dataSetInfo: document.dataSet });
          // }
        }
      } catch (error) {
        console.warn(error);
      }
    }
  }
}
</script>