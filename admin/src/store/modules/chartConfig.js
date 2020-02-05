export default {
  namespaced: true,
  state: {
    chart:"bars",
    xAxis: null,
    yAxis: null,
    groupBy: { title: '', type: '', slug: '' },
    collapseBy: { title: 'Total de personas', type: 'linear', slug: 'y' },
    decimals: 1,
    preffix: '',
    suffix: '',
    stackedBars: false,
    orderBy: { order: 'desc', slug: 'y' },
    title: 'Título',
    colors: ['red', 'green', 'blue'],
    labels: false
  },
  mutations: {
    SET_X_AXIS(state, payload) {
      state.xAxis = payload;
    },
    SET_Y_AXIS(state, payload) {
      state.yAxis = payload;
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
