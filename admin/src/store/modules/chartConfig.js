export default {
  namespaced: true,
  state: {
    chart:"bars",
    xAxis: { title: '', type: 'ordinal', slug: 'x' },
    yAxis: { title: '', type: 'ordinal', slug: 'y' },
    groupBy: { title: '', type: '', slug: '' },
    collapseBy: { title: '', type: 'linear', slug: 'y' },
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
      state.xAxis.title = payload ? payload.variableName : '';
      state.xAxis.slug = payload ? payload.variableName : '';
      state.xAxis.type = payload ? payload.variableNameDataType : '';
    },
    SET_Y_AXIS(state, payload) {
      state.yAxis.title = payload ? payload.variableName : '';
      state.yAxis.slug = payload ? payload.variableName : '';
      state.yAxis.type = payload ? payload.variableNameDataType : '';
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
