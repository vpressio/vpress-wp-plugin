<template>
  <VpressChartContainer
    id="empty_chart_0"
    :data="chartData"
    :chartConfig="chartConfig"
    iframe
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
        // eslint-disable-next-line no-undef
        const chart_id = this.$route.params.chartid || vpress_id
        if( chart_id) {
            const chart = await this.$store.dispatch('chartConfig/SET_WP_CHART', chart_id)
            this.chartData = chart.chartData
            this.chartConfig = chart.chartConfig
        }
      } catch (error) {
        error
      }
    }
  }
}
</script>