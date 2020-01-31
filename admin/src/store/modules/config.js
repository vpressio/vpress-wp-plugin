export default {
  namespaced: true,
  state: {
    xAxis: null,
    yAxis: null,
  },
  mutations: {
    'SET_X_AXIS'(state, variable) {
      state.xAxis = variable;
    },
    'SET_Y_AXIS'(state, variable) {
      state.yAxis = variable;
    },
  },
  actions: {
    set({ commit }, config) {
      commit('SET_X_AXIS', config);
    },
  },
  getters: {
  },
};
