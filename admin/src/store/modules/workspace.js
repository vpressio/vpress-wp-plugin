import vpress from '../../utils/vpress.js';
import api from '../../utils/axios.js'

export default {
  namespaced: true,
  state: {
    datasetMeta: {},
    activeDataset: null
  },
  mutations: {
    ADD_DATASET_META(state, datasetMeta) {
      state.datasetMeta[datasetMeta.slug] = datasetMeta
    },
    REMOVE_DATASET_META(state, dataset) {
      delete state.datasetMeta[dataset]
    },
    SET_ACTIVE_DATASET(state, dataset) {
      state.activeDataset = dataset
    }
  },
  actions: {
    async GET_QUERY_DATA(_, queryBody ) {
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
    async GET_CHART_DATA(
      { dispatch, getters },
      {
        chartValues,
        dataSetSlug = getters['workspace/activeDataset'].slug
      }
    ) {
      try {
        const body = await vpress.queryBody(
          chartValues,
          dataSetSlug
        );
        const response = await dispatch('GET_QUERY_DATA', body)
        return response
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async GET_FILTER_PARAMS({ getters, dispatch }, payload) {
      try {
        const body = {
          dataset: `vpress_${getters['workspace/activeDataset'].slug}`
        }
        if (payload.type !== 'linear') {
          const ordinalBody = vpress.filterOrdinalParamsQuery(
            body,
            payload.column
          )
          return await dispatch('GET_QUERY_DATA', ordinalBody)
        } else {
          const linearBody = vpress.filterLinearParamsQuery(
            body,
            payload.column
          )
          return await dispatch('GET_QUERY_DATA', linearBody)
        }
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async ADD_DATASET({ commit } , payload) {
      try {
        const datasetMeta = {
            id: payload.id,
            slug: payload.slug,
            name: payload.name,
            description: payload.description,
            owner_id: payload.owner_id,
            permissions: payload.permissions,
            source: payload.source,
            tags: payload.tag
        }
        const { data } = await api.dataset.data(
          {
            page: 1,
            dataset: payload.slug,
            itemsPerPage: 1
          }
        )
        if (data.data && data.data.length > 0) {
          const {
            variables,
            dateFormat
          } = vpress.extractDataType(data.data[0])
          datasetMeta.variables= variables,
          datasetMeta.dateFormat= dateFormat
        } else {
          datasetMeta.variables= [],
          datasetMeta.dateFormat= ''
        }
        if (data.error) {
          throw new Error(data.error);
        }
        commit('ADD_DATASET_META', datasetMeta);
        return datasetMeta
      } catch (error) {
        throw new Error(error.message)
      }
    },
    REMOVE_DATASET({ state, commit, dispatch }) {
      commit("REMOVE_DATASET_META", state.activeDataset)
      const datasets = Object.values(state.datasetMeta)
      if (datasets.length > 0) {
        dispatch('UPDATE_ACTIVE_DATASET', datasets[0].slug)
        return datasets[0]
      } else {
        dispatch('UPDATE_ACTIVE_DATASET', null)
        return {}
      }
    },
    UPDATE_ACTIVE_DATASET({ commit }, dataset) {
      commit('SET_ACTIVE_DATASET', dataset)
    },
  },
  getters: {
    activeDataset: ({ datasetMeta, activeDataset }) => activeDataset
      ? datasetMeta[activeDataset]
      : null,
    dataType: (_, { activeDataset }) => activeDataset
      ? activeDataset.variables
      : [],
    dateFormat: (_, { activeDataset }) => activeDataset
      ? activeDataset.dateFormat
      : '',
    dataSetName: (_, { activeDataset }) => activeDataset
      ? activeDataset.name
      : '',
    datasetMeta: state => state.datasetMeta
  }
};
