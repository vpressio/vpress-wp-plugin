import vpress from '../../utils/vpress.js';
import { firestore } from '../../plugins/firebase';

export default {
  namespaced: true,
  state: {
    chartValues: {
      chart: 'bars',
      xAxis: { title: '', type: '', slug: '' , func: ''},
      yAxis: { title: '', type: '', slug: '', func: ''},
      groupBy: { title: '', type: 'ordinal', slug: ''},
      collapseBy: { title: '', type: 'linear', slug: '', func: '' },
      orderBy: { order: '', slug: '' },
      decimals: 1,
      preffix: '',
      suffix: '',
      stackedBars: false,
      title: 'Título',
      subtitle: 'Subtítulo',
      labels: false,
      opacity: 0.8,
      theme: 'light',
      colors: ['#e66101', '#fdb863', '#f7f7f7', '#b2abd2', '#5e3c99'],
    },
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
    SET_CHART_TYPE(state, payload) {
      state.chartValues.chart = payload;
    },
    SET_STACK_BARS(state, payload) {
      state.chartValues.stackedBars = payload;
    },
    SET_ORDER_BY(state, payload) {
      state.chartValues.orderBy.order = payload;
    },
    SET_SHOW_LABELS(state, payload) {
      state.chartValues.labels = payload;
    },
    SET_CHART_THEME(state, payload) {
      const isDarkThemeActivated = payload;
      isDarkThemeActivated ? (state.chartValues.theme = 'dark') : (state.chartValues.theme = 'light');
    },
    SET_CHART_COLORS(state, payload) {
      state.chartValues.colors = payload;
    },
    SET_CHART_VALUES(state, payload) {
      state.chartValues = payload;
    },
    SET_AXIS_TITLE(state, { valueToUpdate, value }) {
      state.chartValues[valueToUpdate].title = value;
    },
    SET_CHART_VALUE(state, { valueToUpdate, value }) {
      state.chartValues[valueToUpdate] = value;
    }
  },
  actions: {
    async MERGE_CHART_VALUE({ state, commit }, payload) {
      try {
        const newChartValues = await vpress.merge(state.chartValues, payload);
        commit('SET_CHART_VALUES', newChartValues);
        return newChartValues;
      } catch (error) {
        console.warn(error)
      }
    },
    async GET_CHART_BY_ID({ commit }, chartId) {
      try {
        const doc =
          await firestore
            .collection('charts')
            .doc(chartId)
            .get();
        
        if (!doc.exists) {
          throw new Error('No matching documents.');
        }
        commit(
          'SET_CHART_VALUES',
          doc
            .data()
            .chartValues
        )
        return doc
          .data()
          .dataSet
      } catch (error) {
        console.warn(error);
      }
    },
    RESET_CHART_VALUES({ commit }) {
      const initialChartValues = {
        chart: '',
        xAxis: { title: '', type: '', slug: '' , func: ''},
        yAxis: { title: '', type: '', slug: '', func: ''},
        groupBy: { title: '', type: 'ordinal', slug: ''},
        collapseBy: { title: '', type: 'linear', slug: '', func: '' },
        orderBy: { order: '', slug: '' },
        decimals: 1,
        preffix: '',
        suffix: '',
        stackedBars: false,
        title: 'Título',
        subtitle: 'Subtítulo',
        labels: false,
        opacity: 0.8,
        theme: 'light',
        colors: ['#e66101', '#fdb863', '#f7f7f7', '#b2abd2', '#5e3c99'],
      }
      commit('SET_CHART_VALUES', initialChartValues)
    },
    UPDATE_CHART_TYPE({ commit }, payload) {
      commit('SET_CHART_TYPE', payload);
    },
    UPDATE_STACK_BARS({ commit }, payload) {
      commit('SET_STACK_BARS', payload);
    },
    UPDATE_ORDER_BY({ commit }, payload) {

      commit('SET_ORDER_BY', payload)
    },
    UPDATE_SHOW_LABELS({ commit }, payload) {
      commit('SET_SHOW_LABELS', payload);
    },
    UPDATE_CHART_THEME({ commit }, payload) {
      commit('SET_CHART_THEME', payload);
    },
    UPDATE_CHART_COLORS({ commit }, payload) {
      commit('SET_CHART_COLORS', payload);
    },
    UPDATE_CHART_TITLES({ commit }, {valueToUpdate, value}) {
      if (valueToUpdate === 'xAxis' || valueToUpdate === 'yAxis' || valueToUpdate === 'groupBy') {
        commit('SET_AXIS_TITLE', { valueToUpdate, value })
      } else {
        commit('SET_CHART_VALUE', { valueToUpdate, value })
      }
    }
  },
  getters: {
    chart: state => state.chartValues,
    slotVariable: state => {
      return value => state.chartValues[value]
    },
    xAxis: state => state.chartValues.xAxis,
    yAxis: state => state.chartValues.yAxis,
    aggregation: state => {
      if (state.chartValues.chart === 'bars') {
        return state.chartValues.groupBy
      }
      if (state.chartValues.chart === 'heatmap' || state.chartValues.chart === 'spineplot') {
        return state.chartValues.collapseBy
      }
      if (state.chartValues.chart === 'scatter') {
        return state.chartValues.groupBy
      }
      if (state.chartValues.chart === 'timeline') {
        return state.chartValues.groupBy
      }
    },
    theme: state => state.chartValues.theme,
    chartType: state => state.chartValues.chart,
    labels: state => state.chartValues.labels,
    'groupBy.slug': state => state.chartValues.groupBy.slug,
    stackedBars: state => state.chartValues.stackedBars,
    order: state => state.chartValues.orderBy.order,
    availableColors: state => state.availableColors,
    getAvailableCharts: state => {
      return state.availableGraphs.map(chart => {
        if (
          chart.chartCompatibleDataTypes.includes(state.chartValues.xAxis.type) &&
          chart.chartCompatibleDataTypes.includes(state.chartValues.yAxis.type)
        ) {
          if (
            chart.chartCompatibleDataTypes.length > 1 &&
            state.chartValues.xAxis.type === state.chartValues.yAxis.type
          ) {
            return { ...chart, disabled: true };
          }
          if (state.chartValues.chart === 'spineplot' && state.chartValues.collapseBy.slug === '') {
            return { ...chart, disabled: true };
          }
          return { ...chart, disabled: false };
        }
        return { ...chart, disabled: true };
      });
    }
  }
};
