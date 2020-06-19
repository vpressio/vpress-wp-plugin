import vpress from '../../utils/vpress.js';
import vpressChart from '../../utils/chartModel.js';
import { firestore } from '../../plugins/firebase';

export default {
  namespaced: true,
  state: {
    activeChartIndex: 0,
    charts: [new vpressChart().values()],
    chartValues: {
      chart: 'bars',
      xAxis: { title: '', type: '', slug: '' , func: ''},
      yAxis: { title: '', type: '', slug: '', func: ''},
      groupBy: { title: '', type: 'ordinal', slug: ''},
      collapseBy: { title: '', type: 'linear', slug: '', func: '' },
      orderBy: { order: 'asc', slug: '' },
      decimals: 1,
      preffix: '',
      suffix: '',
      stackedBars: false,
      title: 'Título',
      subtitle: 'Subtítulo',
      labels: false,
      opacity: 1,
      theme: 'light',
      colors: ['#e66101', '#fdb863', '#f7f7f7', '#b2abd2', '#5e3c99'],
    },
    error: {},
    availableGraphs: [
      {
        type: 'bars',
      },
      {
        type: 'heatmap',
      },
      {
        type: 'spineplot',
      },
      {
        type: 'scatter',
      },
      {
        type: 'timeline',
      }
    ],
    availableColors: [
      {
        colorSchemeType: 'SECUENCIAL',
        schemes: [
          ['#7a0177', '#c51b8a', '#f768a1', '#fbb4b9', '#feebe2'],
          ['#253494', '#2c7fb8', '#41b6c4', '#a1dab4', '#ffffcc'],
          ['#54278f', '#756bb1', '#9e9ac8', '#cbc9e2', '#f2f0f7'],
          ['#fcff9d', '#f6ca3b', '#f9901a', '#e85f2e', '#c63d46', '#9e2b5d', '#721968', '#4a0067', '#261045', '#00000e']
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
    SET_ACTIVE_CHART_INDEX(state, payload) {
      state.activeChartIndex = payload
    },
    ADD_CHART(state, payload) {
      state.charts = [...state.charts, payload]
    },
    SET_CHART(state, payload) {
      state.charts[state.activeChartIndex] = payload
    },
    SET_CHART_VALUES(state, payload) {
      state.chartValues = payload;
    },
    SET_AXIS_TITLE(state, { valueToUpdate, value }) {
      state.chartValues[valueToUpdate].title = value;
    },
    SET_CHART_ERROR(state, payload) {
      state.error = payload
    }
  },
  actions: {
    UPDATE_ACTIVE_CHART_INDEX({ commit }, payload) {
      commit('SET_ACTIVE_CHART_INDEX', payload)
    },
    async MERGE_CHART_VALUE({ rootGetters, dispatch, state, commit }, payload) {
      try {
        const newValue = payload
        const newChartValues = await vpress.merge(
          state.charts[state.activeChartIndex],
          {
            newValue: newValue.value,
            mutationType: newValue.mutationType
          }
        )
        if (
          rootGetters['data/origin'] === 'api' &&
          (
            newChartValues.xAxis.slug !== '' &&
            newChartValues.yAxis.slug !== ''
          ) &&
          (
            newValue.mutationType === 'xAxis' ||
            newValue.mutationType === 'yAxis' ||
            newValue.mutationType === 'aggregation' ||
            newValue.mutationType === 'filter'
          )
        ) {
          await dispatch(
            'data/GET_CHART_DATA',
            { chartValues: newChartValues, chartIndex: state.activeChartIndex },
            { root: true }
          )
        }
        commit('SET_CHART', newChartValues)

        commit('SET_CHART_VALUES', newChartValues)
        commit('SET_CHART_ERROR', null)
        return newValue
      } catch (error) {
        commit('SET_CHART_ERROR', { message: error.message, valueName: error.valueName })
        throw new Error(error.message);
      }
    },
    async GET_CHART_BY_ID({ commit }, chartId) {
      try {
        const document = await firestore
          .collection('charts')
          .doc(chartId)
          .get();
        
        if (!document.exists) {
          throw new Error('Lo sentimos, no se encontró la gráfica.');
        }
        const chartValues = document
        .data()
        .chartValues
        const chart = new vpressChart(chartValues).values();
        commit('ADD_CHART', chart)
        commit(
          'SET_CHART_VALUES',
          document
            .data()
            .chartValues
        )
        return document.data()
        } catch (error) {
        throw new Error(error.message)
      }
    },
    RESET_CHART_VALUES({ commit }) {
      commit('ADD_CHART', new vpressChart().values())
      commit('SET_CHART_VALUES', new vpressChart().values())
    },
    async INVERT_AXIS({ state, commit }) {
      try {
        const newChartValues = await vpress.invertAxis({ chartValues: state.charts[state.activeChartIndex] });
        commit('SET_CHART_VALUES', newChartValues)
      } catch (error) {
        throw new Error(error.message)
      }
    },
    UPDATE_CHART_TITLES({ commit }, {valueToUpdate, value}) {
      if (valueToUpdate === 'xAxis' || valueToUpdate === 'yAxis' || valueToUpdate === 'groupBy') {
        commit('SET_AXIS_TITLE', { valueToUpdate, value })
      } else {
        commit('SET_CHART_VALUE', { valueToUpdate, value })
      }
    },
    async CREATE_CHART({ commit }, payload) {
      const chartValues = new vpressChart(payload).values();
      commit('ADD_CHART', chartValues)
    }
  },
  getters: {
    charts: state => state.charts,
    chart: state => state.charts[state.activeChartIndex],
    activeChartIndex: state => state.activeChartIndex,
    xAxis: ({ charts, activeChartIndex }) => {
      const activeChart = charts[activeChartIndex];
      return [activeChart.xAxis]
      // if (
      //   (activeChart.chart === 'bars' || activeChart.chart === 'timeline') &&
      //   (activeChart.xAxis.type === 'ordinal')
      // ) {
      //   return activeChart.groupBy.slug !== ''
      //     ? [ activeChart.xAxis, activeChart.groupBy ]
      //     : [ activeChart.xAxis ]
      // } else {
      //   return [ activeChart.xAxis ]
      // }
    },
    yAxis: ({ charts, activeChartIndex }) => {
      const activeChart = charts[activeChartIndex];
      return [activeChart.yAxis]
      // if (
      //   (activeChart.chart === 'bars' || activeChart.chart === 'timeline') &&
      //   (activeChart.yAxis.type === 'ordinal')
      // ) {
      //   return activeChart.groupBy.slug !== ''
      //     ? [ activeChart.yAxis, activeChart.groupBy ]
      //     : [ activeChart.yAxis ]
      // } else {
      //   return [ activeChart.yAxis ]
      // }
    },
    ordinalAxis: ({ charts, activeChartIndex }) => {
      const activeChart = charts[activeChartIndex];
      if (
        activeChart.chart === 'bars' ||
        activeChart.chart === 'timeline'
      ) {
        return activeChart.xAxis.type === 'ordinal'
          ? 'xAxis'
          : 'yAxis'
      }
      return null
    },
    aggregation: state => {
      if (
        state.charts[state.activeChartIndex].chart === 'bars' ||
        state.charts[state.activeChartIndex].chart === 'scatter' ||
        state.charts[state.activeChartIndex].chart === 'timeline'
      ) {
        return [state.charts[state.activeChartIndex].groupBy]
      }
      if (
        state.charts[state.activeChartIndex].chart === 'heatmap' ||
        state.charts[state.activeChartIndex].chart === 'spineplot'
      ) {
        return [state.charts[state.activeChartIndex].collapseBy]
      }
    },
    filter: state => state.charts[state.activeChartIndex].filters,
    error: state => state.error,
    theme: state => state.charts[state.activeChartIndex].theme,
    chartType: state => state.charts[state.activeChartIndex].chart,
    labels: state => state.charts[state.activeChartIndex].labels,
    'groupBy.slug': state => state.charts[state.activeChartIndex].groupBy.slug,
    stackedBars: state => state.charts[state.activeChartIndex].stackedBars,
    order: state => state.charts[state.activeChartIndex].orderBy.order,
    availableColors: state => state.availableColors,
    getAvailableCharts: state => state.availableGraphs.map(chart => ({ ...chart, disabled: false }))
  }
};
