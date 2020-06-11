import vpress from '../../utils/vpress.js';
import vpressChart from '../../utils/chartModel.js';
import { firestore } from '../../plugins/firebase';

export default {
  namespaced: true,
  state: {
    activeChartIndex: 0,
    charts: [],
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
    SET_CHART_TYPE(state, payload) {
      state.chartValues.chart = payload;
    },
    SET_STACK_BARS(state, payload) {
      state.chartValues.stackedBars = payload;
    },
    SET_ORDER(state, payload) {
      state.chartValues.orderBy.order = payload;
    },
    SET_ORDER_BY(state, payload) {
      state.chartValues.orderBy.slug = payload;
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
        // const newChartValues = await vpress.merge(state.charts[state.activeChartIndex], { newValue: payload.value, mutationType: payload.slot })
        // commit('SET_CHART', newChartValues)
        const newChartValues = await vpress.merge(
          state.chartValues,
          {
            newValue: payload.value,
            mutationType: payload.slot
          }
        );
        if (rootGetters['data/origin'] === 'api' && (newChartValues.xAxis.slug !== '' && newChartValues.yAxis.slug !== '')) {
          const chartValues = await dispatch('data/GET_CHART_DATA', newChartValues, { root: true })
          commit('SET_CHART_VALUES', chartValues)
        } else {
          commit('SET_CHART_VALUES', newChartValues)
        }
        commit('SET_CHART_ERROR', null)
        return payload
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
        const newChartValues = await vpress.invertAxis({ chartValues: state.chartValues });
        commit('SET_CHART_VALUE', { valueToUpdate: 'xAxis', value: newChartValues.xAxis })
        commit('SET_CHART_VALUE', { valueToUpdate: 'yAxis', value: newChartValues.yAxis })
      } catch (error) {
        throw new Error(error.message)
      }
    },
    UPDATE_CHART_TYPE({ commit }, payload) {
      commit('SET_CHART_TYPE', payload);
    },
    UPDATE_STACK_BARS({ commit }, payload) {
      commit('SET_STACK_BARS', payload);
    },
    UPDATE_ORDER_BY({ commit }, payload) {
      if (payload === 'asc' || payload === 'desc') {
        commit('SET_ORDER', payload);
      } else {
        commit('SET_ORDER_BY', payload);
      }
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
    },
    async CREATE_CHART({ commit }, payload) {
      const chartValues = new vpressChart(payload).values();
      commit('ADD_CHART', chartValues)
    }
  },
  getters: {
    charts: state => {
      return state.charts
    },
    chart: state => state.chartValues,
    xAxis: state => state.chartValues.xAxis,
    yAxis: state => state.chartValues.yAxis,
    aggregation: state => {
      if (
        state.chartValues.chart === 'bars' ||
        state.chartValues.chart === 'scatter' ||
        state.chartValues.chart === 'timeline'
      ) {
        return state.chartValues.groupBy
      }
      if (
        state.chartValues.chart === 'heatmap' ||
        state.chartValues.chart === 'spineplot'
      ) {
        return state.chartValues.collapseBy
      }
    },
    filter: state => state.chartValues.collapseBy,
    currentColumns: state => {
      const columns = {
        chart_type: state.chartValues.chart,
        column_1: state.chartValues.xAxis.slug,
        column_2: state.chartValues.yAxis.slug, 
      }
      if (
        state.chartValues.groupBy.slug !== '' ||
        state.chartValues.collapseBy.slug !== ''
      ) {
        if (
          state.chartValues.chart === 'bars' ||
          state.chartValues.chart === 'scatter' ||
          state.chartValues.chart === 'timeline'
        ) {
          columns.column_3 = state.chartValues.groupBy.slug
        }
        if (
          state.chartValues.chart === 'heatmap' ||
          state.chartValues.chart === 'spineplot'
        ) {
          columns.column_3 = state.chartValues.collapseBy.slug
        }
      }

      if (state.chartValues.xAxis.slug === 'total_count' || state.chartValues.yAxis.slug === 'total_count') {
        columns.aggregate = 'COUNT',
        columns.column_2 = '*'
      }
      return columns
    },
    error: state => state.error,
    theme: state => state.chartValues.theme,
    chartType: state => state.chartValues.chart,
    labels: state => state.chartValues.labels,
    'groupBy.slug': state => state.chartValues.groupBy.slug,
    stackedBars: state => state.chartValues.stackedBars,
    order: state => state.chartValues.orderBy.order,
    availableColors: state => state.availableColors,
    getAvailableCharts: state => {
      return state.availableGraphs.map(chart => {
        switch (chart.type) {
          case 'bars':
            if (
              (
                state.chartValues.xAxis.type === 'linear' ||
                state.chartValues.yAxis.type === 'linear'
              ) &&
              (
                state.chartValues.xAxis.slug === state.chartValues.collapseBy.slug ||
                state.chartValues.yAxis.slug === state.chartValues.collapseBy.slug
              ) && 
              (
                state.chartValues.yAxis !== state.chartValues.xAxis
              )
            ) {
              return { ...chart, disabled: false };
            } 
            return { ...chart, disabled: true };
          case 'heatmap':
            if (state.chartValues.collapseBy.slug === '') {
              return { ...chart, disabled: false };
            }
            return { ...chart, disabled: false };
          case 'spineplot':
            if (state.chartValues.collapseBy.slug !== '') {
              return { ...chart, disabled: false };
            }
            return { ...chart, disabled: true };
          case 'scatter':
            if (
              state.chartValues.xAxis.slug === 'total_count' ||
              state.chartValues.yAxis.slug === 'total_count'
            ) {
              return { ...chart, disabled: true };
            }
            return { ...chart, disabled: false };
          case 'timeline':
            if (
                (
                state.chartValues.xAxis === state.chartValues.collapseBy ||
                state.chartValues.yAxis === state.chartValues.collapseBy
                ) &&
                (
                  state.chartValues.xAxis.type === 'date' &&
                  state.chartValues.yAxis.type !== 'date'
                ) && 
                (
                  state.chartValues.xAxis.type !== state.chartValues.yAxis.type
                )
            ) {
              return { ...chart, disabled: false };
            }
            return { ...chart, disabled: true };
        }
      });
    }
  }
};
