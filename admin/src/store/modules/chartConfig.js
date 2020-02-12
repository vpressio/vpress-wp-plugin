import * as _ from 'lodash';
export default {
  namespaced: true,
  state: {
    chart: 'bars',
    xAxis: { title: '', type: 'ordinal', slug: '' },
    yAxis: { title: 'Total', type: 'linear', slug: 'total_count' },
    groupBy: { title: '', type: 'ordinal', slug: '' },
    collapseBy: { title: '', type: 'linear', slug: '' },
    decimals: 1,
    preffix: '',
    suffix: '',
    stackedBars: false,
    orderBy: { order: 'desc', slug: '' },
    title: 'Título',
    subtitle: 'Subtítulo',
    colors: [
      '#a6cee3',
      '#1f78b4',
      '#b2df8a',
      '#33a02c',
      '#fb9a99',
      '#e31a1c',
      '#fdbf6f',
      '#ff7f00',
      '#cab2d6'
    ],
    opacity: 0.8,
    theme: 'light',
    labels: false
  },
  mutations: {
    SET_X_AXIS(state, payload) {
      state.xAxis.title = payload ? payload.variableName : '';
      state.xAxis.slug = payload ? payload.variableName : '';
      state.xAxis.type = payload ? payload.variableNameDataType : '';
      state.collapseBy = { title: '', type: 'linear', slug: '' };
      if (!state.collapseBy || state.collapseBy.title === '') {
        if (state.xAxis && state.xAxis.type === 'linear') {
          state.collapseBy = state.xAxis;
          state.orderBy.slug = state.collapseBy.slug;
        } else if (state.yAxis && state.yAxis.type === 'linear') {
          state.collapseBy = state.yAxis;
          state.orderBy.slug = state.collapseBy.slug;
        }
      }
      if (state.xAxis.type === 'ordinal' && state.yAxis.type === 'ordinal') {
        if (!_.includes(['heatmap', 'spineplot'])) {
          console.warn("Ordinal axes can be displayed in 'heatmap' or 'spineplot'");
        }
        state.chart = 'heatmap';
        // state.chart = 'spineplot';
      } else if (state.xAxis.type === 'linear' && state.yAxis.type === 'linear') {
        state.chart = 'scatter';
      } else if (state.xAxis.type === 'date') {
        state.chart = 'timeline';
      } else if (state.xAxis.type !== state.yAxis.type) {
        state.chart = 'bars';
      }
    },
    SET_Y_AXIS(state, payload) {
      state.yAxis.title = payload ? payload.variableName : '';
      state.yAxis.slug = payload ? payload.variableName : '';
      state.yAxis.type = payload ? payload.variableNameDataType : '';
      /** Reset yAxis */
      if (payload === null) {
        state.yAxis = { title: 'Total', type: 'linear', slug: 'total_count' };
      }
      state.collapseBy = { title: '', type: 'linear', slug: '' };
      if (!state.collapseBy || state.collapseBy.title === '') {
        if (state.xAxis && state.xAxis.type === 'linear') {
          state.collapseBy = state.xAxis;
          state.orderBy.slug = state.collapseBy.slug;
        } else if (state.yAxis && state.yAxis.type === 'linear') {
          state.collapseBy = state.yAxis;
          state.orderBy.slug = state.collapseBy.slug;
        }
      }
      if (state.xAxis.type === 'ordinal' && state.yAxis.type === 'ordinal') {
        if (!_.includes(['heatmap', 'spineplot'])) {
          console.warn("Ordinal axes can be displayed in 'heatmap' or 'spineplot'");
        }
        state.chart = 'heatmap';
        // state.chart = 'spineplot';
        state.groupBy = state.yAxis;
      } else if (state.xAxis.type === 'linear' && state.yAxis.type === 'linear') {
        state.chart = 'scatter';
      } else if (state.xAxis.type === 'date') {
        state.chart = 'timeline';
      } else if (state.xAxis.type !== state.yAxis.type) {
        state.chart = 'bars';
      }
    },
    SET_GROUP_BY(state, payload) {
      state.groupBy.title = payload ? payload.variableName : '';
      state.groupBy.slug = payload ? payload.variableName : '';
      state.groupBy.type = payload ? payload.variableNameDataType : '';
    }
  },
  actions: {
    UPDATE_X_AXIS({ commit }, payload) {
      commit('SET_X_AXIS', payload);
    },
    UPDATE_Y_AXIS({ commit }, payload) {
      commit('SET_Y_AXIS', payload);
    },
    UPDATE_GROUP_BY({ commit }, payload) {
      commit('SET_GROUP_BY', payload);
    }
  },
  getters: {},
  setters: {}
};
