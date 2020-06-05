import _ from 'lodash';
import { storage } from '../../plugins/firebase';
import { FReader } from '../../plugins/fileReader';
import vpress from '../../utils/vpress.js';
import axios from 'axios';

export default {
  namespaced: true,
  state: {
    data: null,
    dataSetName:'',
    dataVariables : [],
    dateFormat: '',
    filter: {},
    origin: ''
  },
  mutations: {
    SET_DATA(state, data) {
      state.data = data;
    },
    SET_DATASET_NAME(state, dataSetName) {
      state.dataSetName = dataSetName
    },
    SET_DATE_FORMAT(state, format) {
      state.dateFormat = format
    },
    SET_FILTER(state, data) {
      state.filter = data
    },
    SET_ORIGIN(state, payload) {
      state.origin = payload
    },
    SET_VARIABLE_DATA(state, payload) {
      state.dataVariables = payload
    }
  },
  actions: {
    async GET_CHART_DATA({ state, commit } , payload) {
      try {
        const body = {
          dataset: `vpress_${state.dataSetName}`,
          chart_type: payload.chart,
          column_1: payload.xAxis.slug === 'total_count' ? null : vpress.sanitizeSpaces(payload.xAxis.slug),
          column_2: payload.yAxis.slug === 'total_count' ? null : vpress.sanitizeSpaces(payload.yAxis.slug),
          order_by: payload.orderBy.order !== '' ? payload.orderBy.order.toUpperCase() : null,
          limit: ''
        };
        if (payload.xAxis.slug === 'total_count' || payload.yAxis.slug === 'total_count') {
          body['aggregate'] = 'COUNT'
          body['aggregate_column'] = '*'
        } else  if ((payload.xAxis.slug !== 'linear' && payload.yAxis.type !== 'linear') && (payload.xAxis.type !== '' && payload.yAxis.type !== '')) {
          body['group_by'] = `${vpress.sanitizeSpaces(payload.xAxis.slug)}, ${vpress.sanitizeSpaces(payload.yAxis.slug)}`
        } else if (payload.yAxis.type !== 'linear') {
          body['group_by'] = vpress.sanitizeSpaces(payload.yAxis.slug)
          body['subquery_column'] = vpress.sanitizeSpaces(payload.xAxis.slug)
          body['subquery_aggregate'] = 'COUNT'
        } else if (payload.xAxis.type !== 'linear') {
          body['group_by'] = vpress.sanitizeSpaces(payload.xAxis.slug)
          body['subquery_column'] = vpress.sanitizeSpaces(payload.yAxis.slug)
          body['subquery_aggregate'] = 'COUNT'
        }

        console.log(body);
        const response = await axios.post(
          `${process.env.VUE_APP_API_URL_DOMAIN}/wp-json/vpress/v1/test/columns`,
          body
        );
        console.log(response.data)
        commit('SET_DATA', response.data.data);
        commit('chartConfig/SET_CHART_VALUES', payload, { root: true });
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
    async SAVE_DATA({ commit }, { data, dataSetName, dataOrigin }) {
      try {
        if (data.length > 0) {
          const variables = vpress.sortByDataType(data[0])
          commit('SET_VARIABLE_DATA', variables)
          commit('SET_DATE_FORMAT',vpress.extractDateFormat(variables));
        } else {
          commit('SET_VARIABLE_DATA', [])
        }
        commit('SET_DATA', data);
        commit('SET_DATASET_NAME', dataSetName);
        commit('SET_ORIGIN', dataOrigin)
        return { data: data, dataSetName: dataSetName }
      } catch (error) {
        throw new Error(error.message)
      }

    },
    setFilter({ commit }, data) {
      commit('SET_FILTER', data);
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
    dataFiltered: state => {
      if (_.isEmpty(state.filter)) {
        return state.data
      } else if (state.filter.type && state.filter.type == 'ordinal') {
        return _.filter(state.data, function (o) {
          return _.includes(o[state.filter.column], state.filter.value);
        });
      } else if (state.filter.type && state.filter.type == 'linear') {
        return _.filter(state.data, function (o) {
          return o[state.filter.column] >= state.filter.value[0] && o[state.filter.column] <= state.filter.value[1]
        });
      } else {
        return state.data
      }
    },
    origin: state => state.origin
  }
};
