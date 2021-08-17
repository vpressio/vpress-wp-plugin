import vpress from '../vpress/index.js'
import api from '../utils/api.js'

  const {
      queryBody,
      extractDataType,
    } = vpress

  Vue.component('chart', {
    name: 'chart',
    template:`
    <h1>hello chart
      {{chartData}}
    </h1>
    `,
   /*  template:
      `<VpressChartContainer
        id="empty_chart_0"
        iframe
        :data="chartData"
        :chartConfig="chartConfig"
        :dateFormat="dateFormat"
      />`,
    components: {
      VpressChartContainer
    },  */
    props:{
      vpress:{
        type:Number,
        default:0
      }
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
          const chart_id = this.vpress
          if( chart_id ) {
            const chartRes = await api.chart.get(chart_id)
            const chart = chartRes.data.data
            const datasetRes = await api.dataset.get(chart.dataset_id)
            const dataset = datasetRes.data.data
            const values = JSON.parse(chart.value)
            const query = queryBody(values, dataset.slug)
            const dataResponse = await api.chart.query(query)
            this.chartConfig = values
            this.chartData = dataResponse.data.data
            const { dateFormat } = extractDataType(this.chartData[0])
            this.dateFormat = dateFormat
          }
        } catch (error) {
          console.log(error)
        }
      }
    }
  });