import _ from 'lodash';
import { storage } from '../../plugins/firebase';
import vpress from '../../utils/vpress.js';
import axios from 'axios';

export default {
  namespaced: true,
  state: {
    data: null,
    dataSetName:'',
    filter: {},
    dateFormat: '',
    dataVariables : []
  },
  mutations: {
    SET_DATA(state, data) {
      state.data = data;
    },
    SET_FILTER(state, data) {
      state.filter = data
    },
    SET_DATASET_NAME(state, dataSetName) {
      state.dataSetName = dataSetName
    },
    SET_DATE_FORMAT(state, format) {
      state.dateFormat = format
    },
    SET_VARIABLE_DATA(state, payload) {
      state.dataVariables = payload
    },
  },
  actions: {
    async SAVE_DATA({ commit }, { data, dataSetName }) {
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
        return { data: data, dataSetName: dataSetName }
      } catch (error) {
        console.warn(error)
      }
      
    },
    setFilter({ commit }, data) {
      commit('SET_FILTER', data);
    },
    async GET_DATASET_BY_NAME(_context, payload) {
      try {
        const datasetUrl = await storage
        .ref()
        .child(`savedDatasets/${payload}`)
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
        console.warn(error);
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
    }
  }
};
