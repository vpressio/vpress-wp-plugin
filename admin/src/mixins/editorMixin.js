import api from '../utils/axios.js'
import vpress from '../vpress/index.js'

const {
  queryByChart,
  mergeChartVal,
  queryBody,
  filterOrdinalParamsQuery,
  filterLinearParamsQuery
} = vpress

export default {
  computed: {
    loadingViz() {
      return this.$store.getters['editor/loadingState']
    }
  }, 
  methods: {
    async merge_value(payload) {
      try {
        this.$store.dispatch('editor/UPDATE_LOADING_STATE', true)
        const newValue = payload
        const chartValues = mergeChartVal(
          this.$store.getters['editor/viz'].getValues(),
          {
            newValue: newValue.value,
            mutationType: newValue.mutationType
          }
        )
        await this.$store.dispatch(
          'editor/UPDATE_VIZ',
          { values: chartValues }
        )
      } catch (error) {
        throw new Error(error.message);
      }
    },
    async merge_query(value, mutationType) {
      try {
        const activeChart = this.$store.getters['editor/viz'].getValues()
        const payload = {
          values: {},
          data: []
        }
        payload.values = queryByChart(
          activeChart,
          {
            newValue: value,
            mergeType: mutationType
          }
          )
        payload.data = await this.createVizQuery(payload.values)
        await this.$store.dispatch(
          'editor/UPDATE_VIZ',
          payload
        )
      } catch (error) {
        throw new Error(error.message);
      }
    },
    async filter_params(payload) {
      try {
        const body = {
          dataset: `vpress_${this.$store.getters['workspace/activeDataset'].slug}`
        }
        if (payload.type !== 'linear') {
          const ordinalBody = filterOrdinalParamsQuery(
            body,
            payload.column
          )
          return await this.query_data(ordinalBody)
        } else {
          const linearBody = filterLinearParamsQuery(
            body,
            payload.column
          )
          return await this.query_data(linearBody)
        }
      } catch (error) {
        throw new Error(error.message)
      }
    },
    
    async createVizQuery(
        chartValues,
        dataSetSlug = this.$store.getters['workspace/activeDataset']
    ) {
      const dataSetSlugo = dataSetSlug ?  dataSetSlug.slug : ''
      try {
        if (
          chartValues.xAxis.slug !== '' &&
          chartValues.yAxis.slug !== ''
        ) {
          this.$store.dispatch('editor/UPDATE_LOADING_STATE', true)
          const body = await queryBody(
            chartValues,
            dataSetSlugo
          )
          const data = await this.query_data(body)
          return data
        } else {
          return []
        }
      } catch (error) {
        this.$store.dispatch('editor/UPDATE_LOADING_STATE', false)
        throw new Error(error.message)
      }
    },
    async query_data(queryBody ) {
      try {
        const response = await api.chart.query(queryBody);
        return response.data.data
      } catch (error) {
        throw new Error(error.message)
      }
    },
  }
}