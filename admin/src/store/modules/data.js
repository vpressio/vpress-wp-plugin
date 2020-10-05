import vpress from '../../utils/vpress.js';
import api from '../../helpers/axios.js'

export default {
  namespaced: true,
  state: {
    data: [],
    datasetMeta: {},
    dataVariables : [],
    dateFormat: ''
  },
  mutations: {
    SET_DATASET_META(state, datasetMeta) {
      state.datasetMeta = datasetMeta
    },
    SET_DATE_FORMAT(state, format) {
      state.dateFormat = format
    },
    SET_ORIGIN(state, payload) {
      state.origin = payload
    },
    SET_VARIABLE_DATA(state, payload) {
      state.dataVariables = payload
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
      { state, dispatch },
      {
        chartValues,
        dataSetSlug = state.datasetMeta.slug
      }
    ) {
      try {
        const body = await vpress.queryBody(chartValues, dataSetSlug);
        const response = await dispatch('GET_QUERY_DATA', body)
        return response
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async GET_FILTER_PARAMS({ state, dispatch }, payload) {
      try {
        const body = {
          dataset: `vpress_${state.datasetMeta.slug}`
        }
        if (payload.type !== 'linear') {
          const ordinalBody = vpress.filterOrdinalParamsQuery(body, payload.column)
          return await dispatch('GET_QUERY_DATA', ordinalBody)
        } else {
          const linearBody = vpress.filterLinearParamsQuery(body, payload.column)
          return await dispatch('GET_QUERY_DATA', linearBody)
        }
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async GET_WP_DATASET_INFO( _ , payload) {
      try {
        const response = await api.dataset.info({ id: payload.id })
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        const dataset = response.data.datasets[0]
        return {
          id: dataset.id,
          slug: dataset.slug,
          name: dataset.name,
          description: dataset.description,
          owner_id: dataset.owner_id,
          permissions: dataset.permissions,
          source: dataset.source,
          tags: dataset.tag
        }
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async GET_WP_DATASET_DATA(_, payload) {
      let { dataset, page, perPage } = payload
      if (!page) page = 1
      if (!perPage) perPage = 10
      try {
        const response = await api.dataset.data({ dataset, page, perPage });
        return response.data
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async SAVE_DATA({ commit }, { data, datasetMeta }) {
      try {
        if (data.length > 0) {
          const typedVariabales = vpress.extractDataType(data[0])
          commit('SET_VARIABLE_DATA', typedVariabales.variables)
          commit('SET_DATE_FORMAT', typedVariabales.dateFormat);
        } else {
          commit('SET_VARIABLE_DATA', [])
        }
        commit('SET_DATASET_META', datasetMeta);
      } catch (error) {
        throw new Error(error.message)
      }

    },
    async GET_CHART_LIST(_, payload) {
      let { page, itemsPerPage, q } = payload
      if (!page) page = 1
      if (!itemsPerPage) itemsPerPage = 10
      if (!q) q = ''
      try {
        const response = await api.chart.list({ page, itemsPerPage, q });
        return response.data
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async UPLOAD_DATASET(_, payload) {
      try {
        const response = await api.dataset.upload(
          payload,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        )
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        return response.data.data
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async CREATE_DATASET(_, payload) {
      try {
        const response = await api.dataset.create(
          {
            name: payload,
            slug: payload,
            permissions: "public",
            owner_id: window.userSettings.uid
          }
        )
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        return response.data.data
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async UPDATE_DATASET(_, payload) {
      try {
        const response = await api.dataset.update(
          {
            id: payload.id,
            name: payload.name,
            description: payload.description,
            tag: payload.tag,
            source: payload.source,
            permissions: payload.permissions,
            owner_id: window.userSettings.uid
          }
        )
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        return response.data.data
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async DELETE_DATASET(_, id) {
      try {
        const response = await api.dataset.delete(
          { data: { id: id }}
        )
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        return response.data.data
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async GET_DATASET_LIST(_, payload) {
      let { page, itemsPerPage, q } = payload
      if (!page) page = 1
      if (!itemsPerPage) itemsPerPage = 10
      if (!q) q = ''
      try {
        const response = await api.dataset.list(payload);
        if(response.data )
        return response.data
      } catch (error) {
        throw new Error(error.message)
      }
    },
  },
  getters: {
    dataType: state => state.dataVariables,
    dateFormat: state => state.dateFormat,
    dataSetName: state => state.datasetMeta.name,
    origin: state => state.datasetMeta.origin,
    datasetMeta: state => state.datasetMeta
  }
};
