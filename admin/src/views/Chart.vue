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
import vpress from '../utils/vpress'
import api from '../helpers/axios'

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
            const chartRes = await api.chart.get(chart_id)
            const chart = chartRes.data.data
            const datasetRes = await api.dataset.get(chart.dataset_id)
            const dataset = datasetRes.data.data
            await this.$store.dispatch('workspace/ADD_DATASET', dataset)
            const values = JSON.parse(chart.value)
            const obj = vpress.queryBody(values, dataset.slug)
            const dataResponse = await api.chart.query(obj)
            this.chartData = dataResponse.data.data
            this.chartConfig = values
        }
      } catch (error) {
        error
      }
    }
  }
}
</script>