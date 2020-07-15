<template>
  <div class="iframe-margin">
    <VpressChartContainer
      id="empty_chart_0"
      :data="chartData"
      :chartConfig="chartConfig"
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
            console.log(this.chartData)
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
<style scoped>
.iframe-margin{
  padding: 50px 10px;
  flex-wrap: wrap;
  overflow: hidden;
  height: 400px;
}
</style>