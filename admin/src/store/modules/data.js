import _ from 'lodash';
import { storage } from '../../plugins/firebase';
import vpress from '../../utils/vpress.js';
import axios from 'axios';

export default {
  namespaced: true,
  state: {
    data: null,
    dataSetName:'',
    filter: {}
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
    }
  },
  actions: {
    saveData({ commit }, { data, dataSetName }) {
      commit('SET_DATA', data);
      commit('SET_DATASET_NAME', dataSetName)
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
    dataType: state => {
      const result = [];
      if (state.data && state.data.length > 0) {
        // eslint-disable-next-line no-restricted-syntax
        for (const [key, value] of Object.entries(state.data[0])) {
          let typeOfValue = 'linear';
          /** @todo Add a date type */
          if (isNaN(+value)) {
            typeOfValue = vpress.validateDataType(value);
          }
          result.push({
            type: typeOfValue,
            title: key,
            slug: key
          });
        }
      }
      return result;
    },
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
