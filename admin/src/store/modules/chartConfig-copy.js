import * as _ from 'lodash';

export default {
  namespaced: true,
  state: {
    chart: 'bars',
    xAxis: { title: '', type: '', slug: '', func: '' },
    yAxis: { title: '', type: '', slug: '', func: '' },
    groupBy: { title: '', type: 'ordinal', slug: '' },
    collapseBy: { title: '', type: 'linear', slug: '', func: '' },
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
        chartCompatibleDataTypes: ['linear', 'ordinal'],
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
      state.xAxis = payload;
    },
    SET_Y_AXIS(state, payload) {
      state.yAxis = payload;
    },
    SET_GROUP_BY(state, payload) {
      state.groupBy = payload;
    },
    SET_COLLAPSE_BY() {
      state.collapseBy = payload;
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
      state.theme = payload;
    },
    SET_CHART_COLORS(state, payload) {
      state.colors = payload;
    }
  },
  actions: {
    UPDATE_X_AXIS({ state, commit }, payload) {
      const {
        id,
        variableName,
        variableNameDataType,
        func
      } = payload
      const initialValue = {
        title: '',
        type: '',
        slug: '',
        func: ''
      }

      if (payload === null) {
        commit('SET_X_AXIS', initialValue);
        if (
          !_.includes([state.yAxis.slug, state.groupBy.slug], state.collapseBy.slug)
        ) {
          commit('SET_COLLAPSE_BY', initialValue);
        }
      };
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
          if (
            chart.chartCompatibleDataTypes.length > 1 &&
            state.xAxis.type === state.yAxis.type
          ) {
            return { ...chart, disabled: true };
          }
          if (chart.chart === 'spineplot' && state.collapseBy.slug === '') {
            return { ...chart, disabled: true };
          }
          return { ...chart, disabled: false };
        }
        return { ...chart, disabled: true };
      });
    }
  }
};
