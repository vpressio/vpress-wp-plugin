<template>
  <VpressChartContainer
    id="empty_chart_0"
    iframe
    :data="chartData"
    :chartConfig="chartConfig"
    :dateFormat="dateFormat"
  />
</template>
<script>
import VpressChartContainer from '../components/vpress-chart-container'
import vpress from '../vpress/index.js'
import api from '../utils/axios'

const {
  queryBody,
  extractDataType,
} = vpress

export default {
  name: 'Chart',
  components: {
    VpressChartContainer
  },
  data() {
    return {
      chartConfig: {},
      chartData: [],
      dateFormat: undefined
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
        if( chart_id ) {
          const chartRes = await api.chart.get(chart_id)
          const chart = chartRes.data.data
          const datasetRes = await api.dataset.get(chart.dataset_id)
          const dataset = datasetRes.data.data
          const values = JSON.parse(chart.value)
          const query = queryBody(values, dataset.slug, dataset.source)
          const dataResponse = await api.chart.query(query)
          this.chartConfig = values
          this.chartData = dataResponse.data.data
          const { dateFormat } = extractDataType(this.chartData[0])
          this.dateFormat = dateFormat
        }
      } catch (error) {
        error
      }
    }
  }
}
</script>