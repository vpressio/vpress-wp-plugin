import VpressViz from '../../utils/vpressViz.js';
import api from '../../utils/axios.js'

export default {
  namespaced: true,
  state: {
    openViz: 0,
    vizModel: {},
    vizzes: {},
    loadingChart: false,
    availableGraphs: [
      {
        type: 'bars',
        required: ['collapseBy'],
        chartRules: [
          {
            msg: 'Para estas gráfica necesita seleccionar',
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
            msg: 'Para estas gráfica necesita seleccionar',
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
            msg: 'Para esta gráfica necesitas seleccionar',
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
        chartRules: [
          {
            msg: 'Crear un mapa con',
            vars: [
              { type: 'Polígonos', msg: 'Identificador' },
              { type: 'Lineal', msg: '1' },
            ]
          }
        ]
      },
      {
        type: 'timeline',
        required:['collapseBy'],
        chartRules: [
          {
            msg: 'Para esta gráfica necesitas seleccionar',
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
            msg: 'Para esta gráfica necesitas seleccionar',
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
  },
  mutations: {
    SET_VIZ_VALUES(state, { values, dataset }) {
      state.vizzes[dataset][state.openViz].setValues(values)
    },
    SET_VIZ_DATA(state, { data, dataset }) {
      state.vizzes[dataset][state.openViz].setData(data)
    },
    SET_WSP_CHART_ID(state, { id, dataset }) {
      state.vizzes[dataset][state.openViz].id = id
    },
    SET_VIZZES(state, { dataset, vizzes = [] }) {
      state.vizzes[dataset] = vizzes
    },
    ADD_VIZZES(state, { dataset, vizzes }) {
      state.vizzes[dataset] = [...state.vizzes[dataset], ...vizzes]
    },
    RESET_VIZZES(state, vizzesGroup) {
      state.vizzes = vizzesGroup
    },
    OPEN_VIZ(state, idx) {
      state.openViz = idx
    },
    SET_LOADING_STATUS(state, payload) {
      state.loadingChart = payload
    },
    ACTIVE_VIZ(state, payload = new VpressViz()) {
      state.vizModel = payload
    },
  },
  actions: {
    UPDATE_OPEN_VIZ({ commit }, vizIdx) {
      commit('OPEN_VIZ', vizIdx)
    },
    LOAD_VIZZES(
      { state, commit, rootGetters },
      { vizValues = [], dataset = rootGetters['workspace/activeDataset'] }
    ) {
      const datasetSlug = dataset.slug
      const vizzes = vizValues
        .map((viz) => new VpressViz(
          JSON.parse(viz.value),
          viz.id,
          viz.mapValues,
          viz.dataset_id,
          viz.data,
          viz.description,
          viz.permissions,
          viz.img_url
        ))
      const storedVizzes = state.vizzes[datasetSlug]
      if (storedVizzes) {
        commit('ADD_VIZZES', { dataset: datasetSlug, vizzes: vizzes })
      } else if (vizzes.length >= 0) {
        const payload = vizzes.length > 0
          ? vizzes
          : [ new VpressViz() ]
        commit('SET_VIZZES', { dataset: datasetSlug, vizzes: payload })
      }
      return state.vizzes[datasetSlug]
    },
    REMOVE_VIZZES(
      {
        commit,
        rootGetters,
        state,
      },
      datasetName = rootGetters['workspace/activeDataset'].slug
    ) {
      const vizzesSubstract = { ...state.vizzes }
      delete vizzesSubstract[datasetName.slug]
      commit('RESET_VIZZES', vizzesSubstract)
    },
    UPDATE_VIZ(
      { state, commit, rootGetters, dispatch },
      {
        values,
        data,
        dataset = rootGetters['workspace/activeDataset'],
        idx = state.openViz
      }
    ) {
      const vizzes = [...state.vizzes[dataset.slug]]
      vizzes[idx].setData(data)
      vizzes[idx].setValues(values)
      commit('SET_VIZZES', { dataset: dataset.slug, vizzes })
      dispatch('SET_ACTIVE_VIZ', { vizzes: vizzes, vizIdx: idx })
    },
    async REMOVE_VIZ(
      { state, commit, rootGetters },
      { idx = 0, dataset = rootGetters['workspace/activeDataset'] }
    ) {
      const vizzes = [...state.vizzes[dataset.slug]]
      vizzes.splice(idx, 1)
      commit('SET_VIZZES', { dataset: dataset.slug, vizzes })
    },
    async ADD_VIZ(
      { commit, rootGetters },
      { dataset = rootGetters['workspace/activeDataset'] }
    ) {
      try {
        commit('ADD_VIZZES', { dataset: dataset.slug, vizzes: [ new VpressViz]})
      } catch (error) {
        throw new Error(error.message)        
      }
    },
    SET_ACTIVE_VIZ({ commit }, { vizzes = [ new VpressViz() ], vizIdx = 0 }) {
      commit('ACTIVE_VIZ', vizzes ? vizzes[vizIdx] : undefined)
      commit('OPEN_VIZ', vizIdx)
    },
    UPDATE_LOADING_STATE({ commit }, state) {
      commit('SET_LOADING_STATUS' ,state)
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

        const dataset = rootGetters['workspace/activeDataset']
        const body = {
          value: JSON.stringify(chartValues),
          owner_id: owner_id,
          description: description,
          permissions: permission,
          img_url: img_url
        }
        if (!id) {
          const saveResponse = await api.chart.create(
            { dataset_id: dataset.id, ...body }
            )
          const savedChart = saveResponse.data
          if (saveResponse.data.error) {
            throw new Error(saveResponse.data.error);
          }
          commit('SET_WSP_CHART_ID', { id: savedChart.data, dataset: dataset.slug })
        } else {
          const updateResponse = await api.chart.update({ id, ...body })
          if (updateResponse.data.error) {
            throw new Error(updateResponse.data.error);
          }
        }
      } catch (error) {
        throw new Error(error.message)
      }
    },
  },
  getters: {
    vizzes: ({ vizzes }, _, __, rootGetters) => {
      const activeDataset = rootGetters['workspace/activeDataset']
      return (dataset) => {
        if (dataset) {
          return vizzes[dataset]
        } else if (activeDataset) {
          return vizzes[activeDataset.slug]
        } else {
          return null
        }
      }
    },
    viz: ({ vizModel }) => {
      return vizModel
    },
    openViz: ({ openViz }) => {
      return openViz
    },
    chart: (_, { viz }) => {
      const payload= viz.getValues
        ? viz.getValues()
        : new VpressViz().getValues()
      return payload
    },
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
    groupBy: (_, { chart }) => [{ variable: chart.groupBy, mutationType: 'groupBy' }],
    collapseBy: (_, { chart }) => [{ variable: chart.collapseBy, mutationType: 'collapseBy' }],
    filter: (_, { chart }) =>  chart.filters.map((filter) => ({ variable: filter, mutationType: 'filter' })),
    theme: (_, { chart }) => chart.theme,
    chartType: (_, { chart }) => chart.chart,
    labels: (_, { chart }) => chart.labels,
    'groupBy.slug': (_, { chart }) => chart.groupBy.slug,
    stackedBars: (_, { chart }) => chart.stackedBars,
    order: (_, { chart }) => chart.orderBy.order,
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
