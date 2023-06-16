
import { queryBody, extractDataType } from '../vpress/index.js'
import api from '../utils/axios.js'

import { VpressChartContainer } from './VpressChartContainer.js'

export const Chart =  {
  name: 'Chart',
  components: {
    VpressChartContainer
  },
  data() {
    return {
      chartConfig: {},
      chartData: [],
      dateFormat: undefined,
      iframe:false,
      loading: true,
    }
  },
  template: `
    <VpressChartContainer
    id="empty_chart_0"
    iframe
    :data="chartData"
    :chartConfig="chartConfig"
    :dateFormat="dateFormat"
  />`,
  created  () {
    this.getUrlParams();
  },
  methods: {
    async getUrlParams() {
      console.log('getting params')
      try {
        // eslint-disable-next-line no-undef
        const chart_id = 1;//this.$route.params.chartid || vpress_id
        debugger
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
          this.loading = false
        }
      } catch (error) {
        console.log(error)
      } 
    }
  }
}

