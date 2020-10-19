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
  data() {
    return {
      editorLoading: false
    }
  },
  methods: {
    async merge_value(payload) {
      try {
        const newValue = payload
        const newChartValues = mergeChartVal(
          this.$store.getters['editor/viz'].values(),
          {
            newValue: newValue.value,
            mutationType: newValue.mutationType
          }
        )
        return newChartValues
      } catch (error) {
        throw new Error(error.message);
      }
    },
    async merge_query(value, mutationType) {
      try {
        const activeChart = this.$store.getters['editor/viz'].values()
        const newChartValues = queryByChart(
          activeChart,
          {
            newValue: value,
            mergeType: mutationType
          }
        )
        const viz = {
          chartValues: newChartValues,
          data: []
        }
        if (
          newChartValues.xAxis.slug !== '' &&
          newChartValues.yAxis.slug !== ''
        ) {
          this.editorLoading = true
          viz.data = await this.createVizQuery(newChartValues)
          this.editorLoading = false
        }
        return viz
      } catch (error) {
        this.editorLoading = false
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
    async query_data(_, queryBody ) {
      try {
        const response = await api.chart.query(queryBody);
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        return response.data.data
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async createVizQuery(
        chartValues,
        dataSetSlug = this.$store.getters['workspace/activeDataset'].slug
    ) {
      try {
        const body = await queryBody(
          chartValues,
          dataSetSlug
        );
        const data = await this.query_data(body)
        return data
      } catch (error) {
        throw new Error(error.message)
      }
    },
  }
}