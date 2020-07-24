import vpress from '../../utils/vpress.js';
import { VpressViz } from '../../utils/vpressViz.js';
import { firestore } from '../../plugins/firebase';
// import Vpress from '../../vpress/index';
import axios from 'axios';

export default {
  namespaced: true,
  state: {
    activeVizIdx: 0,
    charts: [ new VpressViz().values() ],
    workspace: [ new VpressViz() ],
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
        required: ['collpaseBy'],
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
        type: 'treemap',
        required: [],
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
          ['#40348c', '#842f8e', '#ba2982', '#e2346d', '#fc5353', '#ff7b33', '#ffa600'],
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
      state.activeVizIdx = payload
    },
    ADD_CHART(state, payload) {
      state.charts = [...state.charts, payload]
    },
    SET_CHART(state, payload) {
      state.charts[state.activeVizIdx] = payload
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
    SET_LOAD_STATE(state, payload) {
      state.loadingChart = payload ? true : false
    },
    RESET_WSP(state, newViz = new VpressViz() ) {
      state.workspace = [ newViz ]
    },
    ADD_VIZ_TO_WSP(state, payload) {
      state.workspace.push[payload]
      state.charts = state.workspace.map(wsp => wsp.values())
    },
    SET_VIZ_VALUES(state, chartValues) {
      state.workspace[state.activeVizIdx].setChartValues(chartValues)
      state.charts = state.workspace.map(wsp => wsp.values());
    },
    SET_VIZ_DATA(state, data ) {
      state.workspace[state.activeVizIdx].setData(data)
      state.charts = state.workspace.map(wsp => wsp.values());
    },
    SET_WSP_CHART_ID(state, id) {
      state.workspace[state.activeVizIdx].id = id
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
          state.charts[state.activeVizIdx],
          {
            newValue: newValue.value,
            mutationType: newValue.mutationType
          }
        )

        // const get_data = () => dispatch(
        //   'data/GET_CHART_DATA',
        //   { chartValues: newChartValues, chartIndex: state.activeVizIdx },
        //   { root: true }
        // )
        // const activeChartJson = state.charts[state.activeVizIdx]

        // Vpress.query(
        //   'test_chart',
        //   activeChartJson,
        //   { requestData: get_data}
        // )('xAxis', payload)

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
          const data = await dispatch(
            'data/GET_CHART_DATA',
            { chartValues: newChartValues, chartIndex: state.activeVizIdx },
            { root: true }
            )
          commit('SET_VIZ_DATA', data)
        }
        commit('SET_VIZ_VALUES', newChartValues)

        commit('SET_CHART_ERROR', null)
        commit('SET_LOAD_STATE', false)
        return newValue
      } catch (error) {
        commit('SET_CHART_ERROR', { message: error.message, valueName: error.valueName })
        commit('SET_LOAD_STATE', false)
        throw new Error(error.message);
      }
    },
    async GET_ST_CHART({ commit }, chartId) {
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
        
        const viz = new VpressViz(chartValues);
        commit('RESET_WSP', viz)
        return document.data()
      } catch (error) {
        console.error(error.message);
        throw new Error(error.message)
      }
    },
    async GET_WP_CHART({ commit, dispatch }, chartId) {
      try {
        const response = await axios.get(
          `${process.env.VUE_APP_API_URL_DOMAIN}/wp-json/vpress/v1/chart/get/${chartId}`
        )
        const viz = response.data.data
        const chartValues = JSON.parse(viz.value)
        const data = await dispatch(
          'data/GET_CHART_DATA',
          {
            chartValues: chartValues,
            dataSetSlug: 'actividades'
          },
          { root: true }
        )
        commit(
          'ADD_VIZ_TO_WSP',
          new VpressViz(
            chartValues,
            viz.id,
            null,
            viz.dataset_id,
            data,
            viz.description,
            viz.permission,
            viz.img_url,
          )
        )
        return { chartConfig: chartValues, chartData: data }
      } catch (error) {
        throw new Error(error.message)
      }
    },
    RESET_WSP({ commit }, viz) {
      commit('RESET_WSP', viz)
    },
    async INVERT_AXIS({ state, commit }) {
      try {
        const newChartValues = await vpress.invertAxis({ chartValues: state.charts[state.activeVizIdx] });
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
    CREATE_CHART({ commit }) {
      //todo bug create workspace or viz?
      const viz = new VpressViz()
      commit('ADD_VIZ_TO_WSP', viz)
      // const chartValues = viz.values();
      // commit('ADD_CHART', chartValues)
    },
    REMOVE_CHART({ commit, dispatch, state }, removedWspIdx) {
      const cleanedCharts = state.charts.filter((_, chartIndex) => chartIndex !== removedWspIdx)
      dispatch('data/REMOVE_CHART_DATA',removedWspIdx ,{ root: true })
      commit('SET_CHARTS_ARRAY', cleanedCharts)

      // const filteredWsp = state.workspace.filter((_, chartIndex) => chartIndex !== removedWspIdx)

    },
    async SAVE_CHART({ commit, getters, rootGetters }) {
      try {
        const {
          chartValues,
          owner_id,
          description,
          permission,
          img_url
        } = getters.viz

        const datasetMeta = rootGetters['data/datasetMeta']
        const body = {
          dataset_id: datasetMeta.id,
          value: JSON.stringify(chartValues),
          owner_id: owner_id,
          description: description,
          permissions: permission,
          img_url: img_url
        }
        const response = await axios.post(`${process.env.VUE_APP_API_URL_DOMAIN}/wp-json/vpress/v1/chart/create`, body)
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        const savedChart = response.data
        commit('SET_WSP_CHART_ID', savedChart.data)
      } catch (error) {
        throw new Error(error.message)
      } 
    }
  },
  getters: {
    workspace: state => state.workspace,
    activeVizIdx: state => state.activeVizIdx,
    viz: ({ workspace, activeVizIdx }) => workspace[activeVizIdx],
    chart: (_, { viz }) => viz.values(),
    data: (_, { viz }) => viz.vizData(),
    loadingState: ({ loadingChart }) =>  loadingChart,
    xAxis: (_, { chart }) => {
      return [chart.xAxis]
    },
    yAxis: (_, { chart }) => {
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
      if (chart.chart === 'spineplot') {
        if (
          (chart.xAxis.type === chart.yAxis.type) &&
          (chart.yAxis.type === 'ordinal')
        ) {
          return [chart.collapseBy]
        } else {
          return [chart.groupBy]
        }
      }
      if (
        chart.chart === 'bars' ||
        chart.chart === 'scatter' ||
        chart.chart === 'timeline'
      ) {
        return [chart.groupBy]
      }
      if (
        chart.chart === 'heatmap'
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
            case 'treemap':
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
