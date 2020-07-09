import vpress from '../../utils/vpress.js';
import { VpressChart } from '../../utils/vpressChart.js';
import { firestore } from '../../plugins/firebase';
import axios from 'axios';

export default {
  namespaced: true,
  state: {
    activeChartIndex: 0,
    charts: [new VpressChart().values()],
    loadingChart: false,
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
      colors: ['#e66101'],
    },
    error: {},
    availableGraphs: [
      {
        type: 'bars',
        required: ['collapseBy'],
        slots: [
          {
            slotId: 'xAxis',
            values: ['xAxis', 'groupBy']
          },
          {
            slotId: 'yAxis',
            values: ['yAxis', 'groupBy']
          },
          {
            slotId: 'filter',
            values: ['filters']
          }
        ]
      },
      {
        type: 'heatmap',
        required: ['groupBy'],
        slots: [
          {
            slotId: 'xAxis',
            values: ['xAxis']
          },
          {
            slotId: 'yAxis',
            values: ['yAxis']
          },
          {
            slotId: 'colors',
            values: ['collapseBy']
          },
          {
            slotId: 'filter',
            values: ['filters']
          }
        ]
      },
      {
        type: 'spineplot',
        required: ['groupBy', 'collpaseBy'],
        slots: [
          {
            slotId: 'xAxis',
            values: ['xAxis']
          },
          {
            slotId: 'yAxis',
            values: ['yAxis']
          },
          {
            slotId: 'colors',
            values: ['collapseBy']
          },
          {
            slotId: 'filter',
            values: ['filters']
          }
        ]
      },
      {
        type: 'map',
        required: ['collapseBy'],
        slots: [
          {
            slotId: 'xAxis',
            values: ['xAxis', 'groupBy']
          },
          {
            slotId: 'yAxis',
            values: ['yAxis', 'groupBy']
          },
          {
            slotId: 'filter',
            values: ['filters']
          }
        ]
      },
      {
        type: 'timeline',
        required:['collapseBy'],
        slots: [
          {
            slotId: 'xAxis',
            values: ['xAxis', 'groupBy']
          },
          {
            slotId: 'yAxis',
            values: ['yAxis', 'groupBy']
          },
          {
            slotId: 'filter',
            values: ['filters']
          }
        ]
      },
      {
        type: 'scatter',
        required:[],
        slots: [
          {
            slotId: 'xAxis',
            values: ['xAxis']
          },
          {
            slotId: 'yAxis',
            values: ['yAxis']
          },
          {
            slotId: 'colors',
            values: ['groupBy']
          },
          {
            slotId: 'filter',
            values: ['filters']
          }
        ]
      },
    ],
    colorsEnum: [
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
    },
    SET_CHARTS_ARRAY(state, payload) {
      state.charts = [...payload]
    },
    RESET_CHART_VALUES(state, newValues) {
      state.charts = [ newValues ? newValues : new VpressChart().values() ]
    },
    SET_LOAD_STATE(state, payload) {
      state.loadingChart = payload ? true : false
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
            newValue.mutationType === 'filter' ||
            (
              newValue.mutationType === 'chart' &&
              newValue.value === 'map'
            )
          )
          
        ) {
          commit('SET_LOAD_STATE', true)
          await dispatch(
            'data/GET_CHART_DATA',
            { chartValues: newChartValues, chartIndex: state.activeChartIndex },
            { root: true }
          )
        }
        commit('SET_CHART', newChartValues)
        commit('SET_CHART_VALUES', newChartValues)
        commit('SET_CHART_ERROR', null)
        commit('SET_LOAD_STATE', false)
        return newValue
      } catch (error) {
        commit('SET_CHART_ERROR', { message: error.message, valueName: error.valueName })
        commit('SET_LOAD_STATE', false)
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
        const chart = new VpressChart(chartValues).values();
        
        commit('RESET_CHART_VALUES', chart)
        commit(
          'SET_CHART_VALUES',
          chart
        )
        return document.data()
        } catch (error) {
        throw new Error(error.message)
      }
    },
    RESET_CHART_VALUES({ commit }) {
      commit('RESET_CHART_VALUES')
      commit('SET_CHART_VALUES', new VpressChart().values())
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
    CREATE_CHART({ commit }, payload) {
      const chartValues = new VpressChart(payload).values();
      commit('ADD_CHART', chartValues)
    },
    REMOVE_CHART({ commit, dispatch, state }, payload) {
      const cleanedCharts = state.charts.filter((_, chartIndex) => chartIndex !== payload)
      dispatch('data/REMOVE_CHART_DATA',payload ,{ root: true })
      commit('SET_CHARTS_ARRAY', cleanedCharts)
    },
    async SAVE_CHART({ state }) {
      try {
        const body = {
          dataset_id: 1,
          title: "Covid19",
          tags: "covid19, vpress",
          value: JSON.stringify(state.charts[state.activeChartIndex]),
          owner_id: 1,
          description: "Gráfica creada desde Vpress",
          permissions: "Public",
          img_url: "http://google.com"
      }
        const response = await axios.post(`${process.env.VUE_APP_API_URL_DOMAIN}/wp-json/vpress/v1/chart/create`, body)
        console.log(response)
      } catch (error) {
        throw new Error(error.message)
      } 
    }
  },
  getters: {
    charts: state => state.charts,
    chart: ({ charts, activeChartIndex }) => charts[activeChartIndex],
    activeChartIndex: state => state.activeChartIndex,
    loadingState: ({ loadingChart }) => {
      console.log(loadingChart)
     return loadingChart
    },
    xAxis: (_, { chart }) => {
      // if (
      //   chart.chart === 'bars' ||
      //   chart.chart === 'timeline'
      //   ) {
      //   if (chart.xAxis.type !== 'linear') {
      //     return [chart.xAxis, chart.groupBy].filter(value => value.slug !== '')
      //   } else {
      //     return [chart.xAxis]
      //   }
      // }
      // if (
      //   chart.chart === 'scatter' ||
      //   chart.chart === 'heatmap' ||
      //   chart.chart === 'spineplot'
      // ) {
      //   return [chart.xAxis]
      // }
      return [chart.xAxis]
    },
    yAxis: (_, { chart }) => {
      // if (
      //   chart.chart === 'bars' ||
      //   chart.chart === 'timeline'
      //   ) {
      //   if (chart.yAxis.type !== 'linear') {
      //     return [chart.yAxis, chart.groupBy].filter(value => value.slug !== '')
      //   } else {
      //     return [chart.yAxis]
      //   }
      // }
      // if (
      //   chart.chart === 'scatter' ||
      //   chart.chart === 'heatmap' ||
      //   chart.chart === 'spineplot'
      // ) {
      //   return [chart.yAxis]
      // }
      return [chart.yAxis]
    },
    ordinalAxis: (_, { chart }) => {
      const activeChart = chart;
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
    aggregation: (_, { chart }) => {
      if (
        chart.chart === 'bars' ||
        chart.chart === 'scatter' ||
        chart.chart === 'timeline'
      ) {
        return [chart.groupBy]
      }
      if (
        chart.chart === 'heatmap' ||
        chart.chart === 'spineplot'
      ) {
        return [chart.collapseBy]
      }
    },
    filter: (_, { chart }) => chart.filters,
    theme: (_, { chart }) => chart.theme,
    chartType: (_, { chart }) => chart.chart,
    labels: (_, { chart }) => chart.labels,
    'groupBy.slug': (_, { chart }) => chart.groupBy.slug,
    stackedBars: (_, { chart }) => chart.stackedBars,
    order: (_, { chart }) => chart.orderBy.order,
    error: state => state.error,
    availableColors: state => state.colorsEnum,
    getAvailableCharts: ({ availableGraphs }, { chart }) => {
      return availableGraphs.map(graph => {
        if (chart.xAxis.slug === '' && chart.yAxis.slug === '') {
         return { ...graph, disabled: true }
        }
          switch (graph.type) {
            case 'bars':
              if (
                chart.xAxis.type !== chart.yAxis.type &&
                ((chart.xAxis.type !== 'linear' && chart.yAxis.type === 'linear') ||
                (chart.xAxis.type === 'linear' && chart.yAxis.type !== 'linear'))
              ) {
                return {
                  ...graph,
                  disabled: graph.required.reduce((acc, chartValue) => {
                  if (chartValue[chartValue]) {
                    acc = chart[chartValue].slug === ''
                  }
                  return acc
                  }, false)
                }
              }
              return { ...graph, disabled: true }
            case 'heatmap':
              if (
                chart.xAxis.type === chart.yAxis.type &&
                chart.xAxis.type === 'ordinal'
              ) {
                return {
                  ...graph,
                  disabled: graph.required.reduce((acc, chartValue) => {
                  if (chartValue[chartValue]) {
                    acc = chart[chartValue].slug === ''
                  }
                  return acc
                  }, false)
                }
              }
              return { ...graph, disabled: true };
            case 'spineplot':
              if (
                chart.xAxis.type !== chart.yAxis.type &&
                (chart.xAxis.slug !== '' &&  chart.yAxis.slug !== '')
              ) {
                return {
                  ...graph,
                  disabled: graph.required.reduce((acc, chartValue) => {
                  if (chartValue[chartValue]) {
                    acc = chart[chartValue].slug === ''
                  }
                  return acc
                  }, false)
                };
              }
              return { ...graph, disabled: true };
            case 'map':
              return {
                ...graph,
                disabled: graph.required.reduce((acc, chartValue) => {
                if (chartValue[chartValue]) {
                  acc = chart[chartValue].slug === ''
                }
                return acc
                }, false)
              }
            case 'timeline':
              if (chart.xAxis.type === 'date') {
                return {
                  ...graph,
                  disabled: graph.required.reduce((acc, chartValue) => {
                  if (chartValue[chartValue]) {
                    acc = chart[chartValue].slug === ''
                  }
                  return acc
                  }, false)
                }
              }
              return { ...graph, disabled: true };
            case 'scatter':
              if (
                chart.xAxis.type === chart.yAxis.type &&
                chart.xAxis.type === 'linear'
              ) {
                return {
                  ...graph,
                  disabled: graph.required.reduce((acc, chartValue) => {
                  if (chartValue[chartValue]) {
                    acc = chart[chartValue].slug === ''
                  }
                  return acc
                  }, false)
                }
              }
              return { ...graph, disabled: true };
        }
      })
    }
  }
};
