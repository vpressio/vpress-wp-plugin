import vpress from '../../utils/vpress.js';
import { VpressViz } from '../../utils/vpressViz.js';
import { firestore } from '../../plugins/firebase';
import axios from 'axios';

export default {
  namespaced: true,
  state: {
    activeVizIdx: 0,
    charts: [ new VpressViz().values() ],
    workspace: [ new VpressViz() ],
    loadingChart: false,
    error: {},
    availableGraphs: [
      {
        type: 'bars',
        required: ['collapseBy'],
        chartRules: [
          {
            msg: 'Para estas gráficas necesitas seleccionar',
            vars: [
              { type: 'Ordinal', msg: '1 ó 2' },
              { type: 'Lineal', msg: '1' },
            ]
          }
        ]
      },
      {
        type: 'heatmap',
        required: ['groupBy'],
        chartRules: [
          {
            msg: 'Para estas gráficas necesitas seleccionar',
            vars: [
              { type: 'Ordinal', msg: '1' },
              { type: 'Ordinal', msg: '1' }
            ]
          },
          {
            msg: 'Color',
            vars: [
              { type: 'Lineal', msg: '1' }
            ]
          }
        ]
      },
      {
        type: 'spineplot',
        required: ['collpaseBy'],
        chartRules: [
          {
            msg: 'Para estas gráficas necesitas seleccionar',
            vars: [
              { type: 'Ordinal', msg: '1 ó 2' },
              { type: 'Lineal', msg: '1' },
            ]
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
        chartRules: [
          {
            msg: 'Para estas gráficas necesitas seleccionar',
            vars: [
              { type: 'Fecha', msg: 'Agrupado por Ordinal' },
              { type: 'Lineal', msg: '1' },
            ]
          }
        ]
      },
      {
        type: 'scatter',
        required:[],
        chartRules: [
          {
            msg: 'Para estas gráficas necesitas seleccionar',
            vars: [
              { type: 'Lineal u Ordinal', msg: '1' },
              { type: 'Lineal u Ordinal', msg: '1' },
            ]
          },
          {
            msg: 'Color',
            vars: [
              { type: 'Ordinal', msg: '1' },
            ]
          },
          {
            msg: 'Tamaño',
            vars: [
              { type: 'Lineal', msg: '1' }
            ]
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
    async DATA_QUERY({ dispatch, state, commit }, { value, mutationType }) {
      try {
        const activeChart = state.charts[state.activeVizIdx]
        const newChartValues = vpress.queryByChart(
          activeChart,
          {
            newValue: value,
            mergeType: mutationType
          }
        )
        if (newChartValues.xAxis.slug !== '' && newChartValues.yAxis.slug !== '') {
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
      } catch (error) {
        commit('SET_CHART_ERROR', { message: error.message, valueName: error.valueName })
        commit('SET_LOAD_STATE', false)
        throw new Error(error.message);
      }
    },
    async MERGE_CHART_VALUE({ state, commit }, payload) {
      try {
        const newValue = payload
        const newChartValues = vpress.mergeChartVal(
          state.charts[state.activeVizIdx],
          {
            newValue: newValue.value,
            mutationType: newValue.mutationType
          }
        ) 
        commit('SET_VIZ_VALUES', newChartValues)
        commit('SET_CHART_ERROR', null)
        return newValue
      } catch (error) {
        commit('SET_CHART_ERROR', { message: error.message, valueName: error.valueName })
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
        throw new Error(error.message)
      }
    },
    async GET_CHART_LIST(_, { page, perPage }) {
      try {
        const response = await axios.post(
          `${process.env.VUE_APP_API_URL_DOMAIN}/wp-json/vpress/v1/chart/list`,
          { page, perPage }
        )
        return response.data
      } catch (error) {
        throw new Error(error.message);
      }
    },
    async GET_WP_CHART({ dispatch }, chartId) {
      try {
        const response = await axios.get(
          `${process.env.VUE_APP_API_URL_DOMAIN}/wp-json/vpress/v1/chart/get/${chartId}`
        )
        const viz = response.data.data
        const chartValues = JSON.parse(viz.value)
        const info = await dispatch(
          'data/GET_WP_DATASET_INFO',
          { column: 'id', value: viz.dataset_id },
          { root: true }
        )
        const data = await dispatch(
          'data/GET_CHART_DATA',
          {
            chartValues: chartValues,
            dataSetSlug: info.slug
          },
          { root: true }
        )
        const context = { chartConfig: chartValues, chartData: data, datasetMeta: { ...info, origin: 'api' } }
        return context
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async SET_WP_CHART({ commit, dispatch }, chartId) {
      try {
        const response = await axios.get(
          `${process.env.VUE_APP_API_URL_DOMAIN}/wp-json/vpress/v1/chart/get/${chartId}`
        )
        const viz = response.data.data
        const chartValues = JSON.parse(viz.value)
        const info = await dispatch(
          'data/GET_WP_DATASET_INFO',
          { column: 'id', value: viz.dataset_id },
          { root: true }
        )
        const datasetMeta = { ...info, origin: 'api'}
        const params = { dataset: datasetMeta.slug, page: 1, perPage: 1 }
        const dataSample = await dispatch('data/GET_WP_DATASET_DATA', params, { root: true })
        await dispatch('data/SAVE_DATA', { data: dataSample, datasetMeta: datasetMeta }, { root: true })
        const data = await dispatch(
          'data/GET_CHART_DATA',
          {
            chartValues: chartValues,
            dataSetSlug: datasetMeta.slug
          },
          { root: true }
        )
        commit(
          'RESET_WSP',
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
        const context = {
          chartConfig: chartValues,
          chartData: data,
          datasetMeta: datasetMeta
        }
        return context
      } catch (error) {
        throw new Error(error.message)
      }
    },
    RESET_WSP({ commit }, viz) {
      commit('RESET_WSP', viz)
    },
    UPDATE_CHART_TITLES(_, {valueToUpdate}) {
      if (valueToUpdate === 'xAxis' || valueToUpdate === 'yAxis' || valueToUpdate === 'groupBy') {
        // commit('SET_AXIS_TITLE', { valueToUpdate, value })
      } else {
        // commit('SET_CHART_VALUE', { valueToUpdate, value })
      }
    },
    CREATE_CHART({ commit }) {
      //todo bug create workspace or viz?
      const viz = new VpressViz()
      commit('ADD_VIZ_TO_WSP', viz)
      // const chartValues = viz.values();
      // commit('ADD_CHART', chartValues)
    },
    REMOVE_CHART({ commit, state }, removedWspIdx) {
      const cleanedCharts = state.charts.filter((_, chartIndex) => chartIndex !== removedWspIdx)
      commit('SET_CHARTS_ARRAY', cleanedCharts)

      // const filteredWsp = state.workspace.filter((_, chartIndex) => chartIndex !== removedWspIdx)

    },
    async SAVE_CHART({ commit, getters, rootGetters }) {
      try {
        const {
          id,
          chartValues,
          owner_id,
          description,
          permission,
          img_url
        } = getters.viz

        const datasetMeta = rootGetters['data/datasetMeta']
        const body = {
          value: JSON.stringify(chartValues),
          owner_id: owner_id,
          description: description,
          permissions: permission,
          img_url: img_url
        }
        if (!id) {
          const saveResponse = await axios.post(
            `${process.env.VUE_APP_API_URL_DOMAIN}/wp-json/vpress/v1/chart/create`,
            { dataset_id: datasetMeta.id, ...body }
          )
          const savedChart = saveResponse.data
          if (saveResponse.data.error) {
            throw new Error(saveResponse.data.error);
          }
          commit('SET_WSP_CHART_ID', savedChart.data)
        } else {
          const updateResponse = await axios.post(
            `${process.env.VUE_APP_API_URL_DOMAIN}/wp-json/vpress/v1/chart/update`,
            { id, ...body }
          )
          if (updateResponse.data.error) {
            throw new Error(updateResponse.data.error);
          }
        }
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
      const mainAxis = chart.xAxis
      const oppsAxis = chart.yAxis
      const mutationType = 'xAxis' 
      const slotVariables = []
      switch (chart.chart) {
        case 'bars':
          slotVariables.push({ variable: mainAxis, mutationType: mutationType })
          if (oppsAxis.type === 'linear') {
            slotVariables.push({ variable: chart.groupBy, mutationType:'groupBy' })
          }
          break;
        case 'heatmap':
          slotVariables.push({ variable: mainAxis, mutationType: mutationType })
          break
        case 'spineplot':
          slotVariables.push({ variable: mainAxis, mutationType: mutationType })
          if (oppsAxis.type === 'linear') {
            slotVariables.push({ variable: chart.groupBy, mutationType: 'groupBy' })
          }
          break
        case 'map':
          slotVariables.push({ variable: mainAxis, mutationType: mutationType })
          break
        case 'timeline':
          slotVariables.push({ variable: mainAxis, mutationType: mutationType })
          if (oppsAxis.type === 'linear') {
            slotVariables.push({ variable: chart.groupBy, mutationType: 'groupBy' })
          }
          break
        case 'scatter':
          slotVariables.push({ variable: mainAxis, mutationType: mutationType })
          break
        default:
          break;
      }
      
      return slotVariables
    },
    yAxis: (_, { chart }) => {
      const mainAxis = chart.yAxis
      const oppsAxis = chart.xAxis
      const mutationType = 'yAxis' 
      const slotVariables = []
      switch (chart.chart) {
        case 'bars':
          slotVariables.push({ variable: mainAxis, mutationType: mutationType })
          if (oppsAxis.type === 'linear') {
            slotVariables.push({ variable: chart.groupBy, mutationType:'groupBy' })
          }
          break;
        case 'heatmap':
          slotVariables.push({ variable: mainAxis, mutationType: mutationType })
          break
        case 'spineplot':
          slotVariables.push({ variable: mainAxis, mutationType: mutationType })
          if (oppsAxis.type === 'linear') {
            slotVariables.push({ variable: chart.groupBy, mutationType: 'groupBy' })
          }
          break
        case 'map':
          slotVariables.push({ variable: mainAxis, mutationType: mutationType })
          break
        case 'timeline':
          slotVariables.push({ variable: mainAxis, mutationType: mutationType })
          if (oppsAxis.type === 'linear') {
            slotVariables.push({ variable: chart.groupBy, mutationType: 'groupBy' })
          }
          break
        case 'scatter':
          slotVariables.push({ variable: mainAxis, mutationType: mutationType })
          break
      }
      return slotVariables
    },
    groupBy: (_, { chart }) => {
        return [{ variable: chart.groupBy, mutationType: 'groupBy' }]
    },
    collapseBy: (_, { chart }) => {
      return [{ variable: chart.collapseBy, mutationType: 'collapseBy' }]
    },
    filter: (_, { chart }) => {
      return chart.filters.map((filter) => {
        return { variable: filter, mutationType: 'filter' }
      })
    },
    theme: (_, { chart }) => chart.theme,
    chartType: (_, { chart }) => chart.chart,
    labels: (_, { chart }) => chart.labels,
    'groupBy.slug': (_, { chart }) => chart.groupBy.slug,
    stackedBars: (_, { chart }) => chart.stackedBars,
    order: (_, { chart }) => chart.orderBy.order,
    error: state => state.error,
    availableColors: state => state.colorsEnum,
    getAvailableCharts: ({ availableGraphs }, { chart }) => {
      const requiredReduce = (acc, chartValue) => chartValue[chartValue]
        ? chart[chartValue].slug === ''
        : acc
      return availableGraphs.map(graph => {
        if (chart.xAxis.slug === '' && chart.yAxis.slug === '') {
         return { ...graph, disabled: true }
        }
          switch (graph.type) {
            case 'bars':
              if (
                !(chart.xAxis.type === 'linear' && chart.yAxis.type === 'linear') &&
                !(chart.xAxis.type !== 'linear' && chart.yAxis.type !== 'linear')
              ) {
                return {
                  ...graph,
                  disabled: graph.required.reduce(requiredReduce, false)
                }
              }
              return { ...graph, disabled: true }
            case 'heatmap':
              if (
                (chart.xAxis.type !== 'linear' && chart.yAxis.type !== 'linear')
              ) {
                return {
                  ...graph,
                  disabled: graph.required.reduce(requiredReduce, false)
                }
              }
              return { ...graph, disabled: true };
            case 'spineplot':
              if (
                !(chart.xAxis.type === 'linear' && chart.yAxis.type === 'linear') &&
                !(chart.xAxis.type !== 'linear' && chart.yAxis.type !== 'linear')
              ) {
                return {
                  ...graph,
                  disabled: graph.required.reduce(requiredReduce, false)
                };
              }
              return { ...graph, disabled: true };
            case 'treemap':
              if (
                !(chart.xAxis.type === 'linear' && chart.yAxis.type === 'linear') &&
                !(chart.xAxis.type !== 'linear' && chart.yAxis.type !== 'linear')
              ) {
                return {
                  ...graph,
                  disabled: graph.required.reduce(requiredReduce, false)
                };
              }
              return { ...graph, disabled: true };
            case 'map':
              return {
                ...graph,
              }
            case 'timeline':
              if (
                (chart.xAxis.type === 'date' &&  chart.yAxis.type === 'linear')
              ) {
                return {
                  ...graph,
                  disabled: graph.required.reduce(requiredReduce, false)
                }
              }
              return { ...graph, disabled: true };
            case 'scatter':
                return {
                  ...graph,
                  disabled: graph.required.reduce(requiredReduce, false)
                }
        }
      })
    }
  }
};
