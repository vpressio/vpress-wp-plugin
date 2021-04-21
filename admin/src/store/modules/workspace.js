import { Dataset } from '../../models/index.js'
import vpress from '../../vpress/index.js';
import api from '../../utils/axios.js'

export default {
  namespaced: true,
  state: {
    datasetMeta: {},
    activeDataset: null
  },
  mutations: {
    ADD_DATASET_META(state, datasetMeta) {
      // TODO: Reconsider functionality
      state.datasetMeta = {} // Para reiniciar vizzes y omitir los Workspaces
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
    async ADD_DATASET({ commit } , payload) {
      try {
        const { data } = await api.dataset.data(
          {
            page: 1,
            dataset: payload.slug,
            itemsPerPage: 1
          }
        )
        let datasetVariables, datasetDateFormat;

        if (data.data && data.data.length > 0) {
          const {
            variables,
            dateFormat
          } = vpress.extractDataType(data.data[0])
          datasetVariables = variables
          datasetDateFormat = dateFormat
        } else {
          datasetVariables = []
          datasetDateFormat = ''
        }

        const dataset = new Dataset(
          payload.id,
          payload.name,
          payload.slug,
          payload.description,
          payload.owner_id,
          payload.permissions,
          payload.source,
          payload.tag,
          datasetVariables,
          datasetDateFormat,
          payload.rows,
          payload.size
        )


        if (data.error) {
          throw new Error(data.error);
        }
        commit('ADD_DATASET_META', dataset);
        return dataset
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
