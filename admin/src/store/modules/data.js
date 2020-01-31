export default {
  namespaced: true,
  state: {
    data: null,
  },
  mutations: {
    SET_DATA(state, data) {
      state.data = data;
    },
  },
  actions: {
    set({ commit }, data) {
      commit('SET_DATA', data);
    },
  },
  getters: {
    dataType: (state) => {
      const result = [];
      if (state.data && state.data.length > 0) {
        // eslint-disable-next-line no-restricted-syntax
        for (const [key, value] of Object.entries(state.data[0])) {
          result.push({
            [key]: typeof value,
          });
        }
      }
      return result;
    },
  },
};
