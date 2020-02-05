export default {
  namespaced: true,
  state: {
    xAxis: null,
    yAxis: null,
  },
  mutations: {
    SET_X_AXIS(state, variable) {
      state.xAxis = variable;
    },
    SET_Y_AXIS(state, variable) {
      state.yAxis = variable;
    },
  },
  actions: {
    UPDATE_X_AXIS({ commit }, payload) {
      commit('SET_X_AXIS', payload);
    },
    UPDATE_Y_AXIS({ commit }, payload) {
      commit('SET_Y_AXIS', payload);
    },
  },
  getters: {
  },
};
