import _ from 'lodash'

export default {
  namespaced: true,
  state: {
    data: null,
    filter: {}
  },
  mutations: {
    SET_DATA(state, data) {
      state.data = data;
    },
    SET_FILTER(state, data) {
      state.filter = data
    }
  },
  actions: {
    set({ commit }, data) {
      commit('SET_DATA', data);
    },
    setFilter({ commit }, data) {
      commit('SET_FILTER', data);
    },
  },
  getters: {
    dataType: state => {
      const result = [];
      if (state.data && state.data.length > 0) {
        // eslint-disable-next-line no-restricted-syntax
        for (const [key, value] of Object.entries(state.data[0])) {
          let typeOfValue = 'ordinal';
          /** @todo Add a date type */
          if (typeof value === 'number') {
            typeOfValue = 'linear';
          }
          result.push({
            variableNameDataType: typeOfValue,
            variableName: key
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
        console.log(2)
        return _.filter(state.data, function (o) {
          return o[state.filter.column] >= state.filter.value[0] && o[state.filter.column] <= state.filter.value[1]
        });
      } else {
        return state.data
      }
    }
  }
};
