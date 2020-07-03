import { storage } from '../../plugins/firebase';
import { FReader } from '../../plugins/fileReader';
import vpress from '../../utils/vpress.js';
import axios from 'axios';

export default {
  namespaced: true,
  state: {
    data: [],
    dataSetName:'',
    dataVariables : [],
    dateFormat: '',
    origin: ''
  },
  mutations: {
    SET_DATA(state, { index ,data }) {
      state.data[`${index}`] = data;
    },
    SET_CLEANED_DATA(state, dataArray) {
      state.data = dataArray
    },
    SET_DATASET_NAME(state, dataSetName) {
      state.dataSetName = dataSetName
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
        const response = await axios.post(
          `${process.env.VUE_APP_API_URL_DOMAIN}/wp-json/vpress/v1/test/columns`,
          queryBody
        );
        console.log(queryBody)
        console.info(response.data.query)
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        return response.data.data
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async GET_CHART_DATA({ state, commit, dispatch } , { chartValues, chartIndex }) {
      try {
        const body = await vpress.prepareQuery(chartValues, state.dataSetName);
        const response = await dispatch('GET_QUERY_DATA', body)
        commit('SET_DATA',{ index: chartIndex, data: response })
        return chartValues
      } catch (error) {
        throw new Error(error.message)
      }
    },
    REMOVE_CHART_DATA({ state, commit }, payload) {
      const cleanedChartsData = state.data.filter((_, chartIndex) => chartIndex !== payload)
      commit('SET_CLEANED_DATA', cleanedChartsData)
    },
    async GET_FILTER_PARAMS({ state, dispatch, rootGetters }, payload) {
      try {
        const body = {
          dataset: `vpress_${state.dataSetName}`,
          chart_type: rootGetters['chartConfig/chart'].chart
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
    async GET_WP_DATASETS() {
      try {
        const response = await axios.get(`${process.env.VUE_APP_API_URL_DOMAIN}/wp-json/vpress/v1/dataset/list`);
        return response.data.data
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async GET_WP_DATASET_DATA(_, payload) {
      let { dataset, page, perPage } = payload
      if (!page) page = 1
      if (!perPage) perPage = 10
      let url = `${process.env.VUE_APP_API_URL_DOMAIN}/wp-json/vpress/v1/dataset/${dataset}/?page=${page}&perPage=${perPage}`
      try {
        const response = await axios.get(url);
        return response.data
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async SAVE_DATA({ state, commit }, { data, dataSetName, dataOrigin }) {
      try {
        if (data.length > 0) {
          const variables = vpress.sortByDataType(data[0])
          commit('SET_VARIABLE_DATA', variables)
          commit('SET_DATE_FORMAT',vpress.extractDateFormat(variables));
        } else {
          commit('SET_VARIABLE_DATA', [])
        }
        commit('SET_ORIGIN', dataOrigin)
        commit('SET_DATASET_NAME', dataSetName);
        if(state.origin !== 'api') commit('SET_DATA', { index: 0, data: data });
        return { data: data, dataSetName: dataSetName }
      } catch (error) {
        throw new Error(error.message)
      }

    },
    async GET_DATASET_BY_NAME(_context, { dataSetDir, file }) {
      try {
        const datasetUrl = await storage
        .ref()
        .child(`${dataSetDir}/${file}`)
        .getDownloadURL()

        const dataset = await axios.get(
          datasetUrl,
          {
            responseType: 'blob',
            timeout: 30000
          }
        );
        return dataset.data;
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async GET_DATASETS(_context, dataSetDir) {
      try {
       return await storage
          .ref()
          .child(dataSetDir)
          .listAll();
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async READ_FILE(_context, file) {
      try {
        let content;
        if (file.type === 'text/csv') {
          content = await FReader.readCSV(file);
        } else {
          content = await FReader.readExcel(file);
        }
        return content
      } catch (error) {
        throw new Error(error.message)
      }
    }
  },
  getters: {
    data: state => state.data,
    dataSetName: state => state.dataSetName,
    dataType: state => state.dataVariables.map(({ type, title, slug }) => ({ type: type.dataType, title: title, slug: slug })),
    dateFormat: state => state.dateFormat,
    activeChartData: state =>  state.origin !== 'api' ? () => state.data[0] : index => state.data[index],
    origin: state => state.origin
  }
};
