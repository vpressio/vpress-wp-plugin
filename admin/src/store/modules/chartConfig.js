import * as _ from 'lodash';

export default {
  namespaced: true,
  state: {
    chart: 'bars',
    xAxis: { title: '', type: 'linear', slug: '' },
    yAxis: { title: '', type: 'linear', slug: '' },
    groupBy: { title: '', type: 'ordinal', slug: '' },
    collapseBy: { title: '', type: 'linear', slug: '' },
    decimals: 1,
    preffix: '',
    suffix: '',
    stackedBars: false,
    orderBy: { order: 'desc', slug: '' },
    title: 'Título',
    subtitle: 'Subtítulo',
    labels: false,
    opacity: 0.8,
    theme: 'light',
    colors: ['#f2f0f7', '#cbc9e2', '#9e9ac8', '#756bb1', '#54278f'],
    availableGraphs: [
      {
        chartType: 'bars',
        chartCompatibleDataTypes: ['linear', 'ordinal']
      },
      {
        chartType: 'heatmap',
        chartCompatibleDataTypes: ['ordinal']
      },
      {
        chartType: 'spineplot',
        chartCompatibleDataTypes: ['ordinal']
      },
      {
        chartType: 'scatter',
        chartCompatibleDataTypes: ['linear']
      },
      {
        chartType: 'timeline',
        chartCompatibleDataTypes: ['date', 'linear']
      }
    ],
    availableColors: [
      {
        colorSchemeType: 'SECUENCIAL',
        schemes: [
          ['#feebe2', '#fbb4b9', '#f768a1', '#c51b8a', '#7a0177'],
          ['#ffffcc', '#a1dab4', '#41b6c4', '#2c7fb8', '#253494'],
          ['#f2f0f7', '#cbc9e2', '#9e9ac8', '#756bb1', '#54278f']
        ]
      },
      {
        colorSchemeType: 'DIVERGENTE',
        schemes: [
          ['#e66101', '#fdb863', '#f7f7f7', '#b2abd2', '#5e3c99'],
          ['#d7191c', '#fdae61', '#ffffbf', '#abd9e9', '#2c7bb6']
        ]
      },
      {
        colorSchemeType: 'CUALITATIVO',
        schemes: [
          ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f'],
          ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628']
        ]
      }
    ]
  },
  mutations: {
    SET_X_AXIS(state, payload) {
      state.xAxis.title = payload ? payload.variableName : '';
      state.xAxis.slug = payload ? payload.variableName : '';
      state.xAxis.type = payload ? payload.variableNameDataType : '';
      if (!_.includes([state.yAxis.slug, state.groupBy.slug], state.collapseBy.slug)) {
        state.collapseBy = { title: '', type: 'linear', slug: '' };
      }
      if (!state.collapseBy || state.collapseBy.title === '') {
        if (state.xAxis && state.xAxis.type === 'linear') {
          state.collapseBy = state.xAxis;
        } else if (state.yAxis && state.yAxis.type === 'linear') {
          state.collapseBy = state.yAxis;
        }
      }
      state.orderBy.slug = state.collapseBy.slug;
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
      if (payload === null) {
        state.yAxis = { title: '', type: '', slug: '' };
      }
      state.yAxis.title = payload ? payload.variableName : '';
      state.yAxis.slug = payload ? payload.variableName : '';
      state.yAxis.type = payload ? payload.variableNameDataType : '';
      /** Reset yAxis */
      if (!_.includes([state.xAxis.slug, state.groupBy.slug], state.collapseBy.slug)) {
        state.collapseBy = { title: '', type: 'linear', slug: '' };
      }
      if (!state.collapseBy || state.collapseBy.title === '') {
        if (state.xAxis && state.xAxis.type === 'linear') {
          state.collapseBy = state.xAxis;
        } else if (state.yAxis && state.yAxis.type === 'linear') {
          state.collapseBy = state.yAxis;
        }
      }
      state.orderBy.slug = state.collapseBy.slug;
      if (state.xAxis.type === 'ordinal' && state.yAxis.type === 'ordinal') {
        if (!_.includes(['heatmap', 'spineplot'])) {
          console.warn("Ordinal axes can be displayed in 'heatmap' or 'spineplot'");
        }
        state.chart = 'heatmap';
        // state.chart = 'spineplot';
        if (!state.groupBy.slug) {
          state.groupBy = Object.assign({}, state.yAxis);
        }
      } else if (state.xAxis.type === 'linear' && state.yAxis.type === 'linear') {
        state.chart = 'scatter';
      } else if (state.xAxis.type === 'date') {
        state.chart = 'timeline';
      } else if (state.xAxis.type !== state.yAxis.type) {
        state.chart = 'bars';
      }
    },
    SET_GROUP_BY(state, payload) {
      if (payload === null) {
        state.groupBy = { title: '', type: '', slug: '' };
        if (state.xAxis.type === 'ordinal' && state.yAxis.type === 'ordinal') {
          state.collapseBy = { title: '', type: '', slug: '' };
        }
      }
      if (payload && payload.variableNameDataType === 'ordinal') {
        if (
          payload.variableName !== state.xAxis.slug &&
          payload.variableName !== state.yAxis.slug &&
          state.chart !== 'heatmap'
        ) {
          state.groupBy.title = payload ? payload.variableName : '';
          state.groupBy.slug = payload ? payload.variableName : '';
          state.groupBy.type = payload ? payload.variableNameDataType : '';
        }
      } else if (
        payload &&
        payload.variableNameDataType === 'linear' &&
        state.chart === 'heatmap'
      ) {
        state.collapseBy.title = payload ? payload.variableName : '';
        state.collapseBy.slug = payload ? payload.variableName : '';
        state.collapseBy.type = payload ? payload.variableNameDataType : '';
      }
    },
    SET_CHART_TYPE(state, payload) {
      state.chart = payload;
    },
    SET_STACK_BARS(state, payload) {
      state.stackedBars = payload;
    },
    SET_SHOW_LABELS(state, payload) {
      state.labels = payload;
    },
    SET_CHART_THEME(state, payload) {
      const isDarkThemeActivated = payload;

      isDarkThemeActivated ? (state.theme = 'dark') : (state.theme = 'light');
    },
    SET_CHART_COLORS(state, payload) {
      state.colors = payload;
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
    },
    UPDATE_CHART_TYPE({ commit }, payload) {
      commit('SET_CHART_TYPE', payload);
    },
    UPDATE_STACK_BARS({ commit }, payload) {
      commit('SET_STACK_BARS', payload);
    },
    UPDATE_SHOW_LABELS({ commit }, payload) {
      commit('SET_SHOW_LABELS', payload);
    },
    UPDATE_CHART_THEME({ commit }, payload) {
      commit('SET_CHART_THEME', payload);
    },
    UPDATE_CHART_COLORS({ commit }, payload) {
      commit('SET_CHART_COLORS', payload);
    }
  },
  getters: {
    getAvailableCharts: state => {
      return state.availableGraphs.map(chart => {
        if (
          chart.chartCompatibleDataTypes.includes(state.xAxis.type) &&
          chart.chartCompatibleDataTypes.includes(state.yAxis.type)
        ) {
          return { ...chart, disabled: false };
        }
        return { ...chart, disabled: true };
      });
    }
  }
};
