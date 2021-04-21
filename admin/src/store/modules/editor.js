import { Viz, Vizzes } from '../../models/index.js';
import api from '../../utils/axios.js'

export default {
  namespaced: true,
  state: {
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
        required: ['collapseBy'],
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
    SET_WSP_CHART_ID(state, { id, dataset }) {
      state.vizzes[dataset].activeViz.id = id
    },
    SET_VIZZES(state, { dataset, vizzes }) {
      // TODO: Reconsider functionality
      state.vizzes = {} // Para reiniciar vizzes y omitir los Workspaces
      state.vizzes[dataset] = vizzes
    },
    RESET_VIZZES(state, vizzesGroup) {
      state.vizzes = vizzesGroup
    },
    SET_LOADING_STATUS(state, payload) {
      state.loadingChart = payload
    },
    ACTIVE_VIZ(state, payload = new Viz()) {
      state.vizModel = payload
    },
  },
  actions: {
    LOAD_VIZZES(
      { state, commit, rootGetters },
      { vizValues = [], dataset = rootGetters['workspace/activeDataset'] }
    ) {
      const datasetSlug = dataset.slug
      const storedVizzes = state.vizzes[datasetSlug]
      let vizzes
      if (storedVizzes) {
        storedVizzes.add( new Vizzes(vizValues, datasetSlug).vizzes )
        vizzes = storedVizzes
      } else {
        vizzes = new Vizzes(vizValues, datasetSlug)
      }
      commit('ACTIVE_VIZ', vizzes.activeViz)
      commit('SET_VIZZES', { dataset: datasetSlug, vizzes })
      return storedVizzes
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
      { state, commit, rootGetters },
      {
        values,
        data,
        dataset = rootGetters['workspace/activeDataset']
      }
    ) {
      const datasetSlug = dataset.slug
      const storedVizzes = state.vizzes[datasetSlug]
      const activeViz = storedVizzes.activeViz
      activeViz.setData(data || activeViz.getData())
      activeViz.setValues(values || activeViz.getValues())
      commit('SET_VIZZES', { dataset: datasetSlug, vizzes: storedVizzes })
    },
    async REMOVE_VIZ(
      { state, commit, rootGetters },
      { idx = 0, dataset = rootGetters['workspace/activeDataset'] }
    ) {
      const datasetSlug = dataset.slug
      const storedVizzes = state.vizzes[datasetSlug]
      storedVizzes.delete(idx)
      commit('SET_VIZZES', { dataset: dataset.slug, vizzes: storedVizzes })
    },
    async ADD_VIZ(
      { state, commit, rootGetters },
      { dataset = rootGetters['workspace/activeDataset'] }
    ) {
      try {
        const datasetSlug = dataset.slug
        const storedVizzes = state.vizzes[datasetSlug]
        storedVizzes.new()
        commit('SET_VIZZES', { dataset: dataset.slug, vizzes: storedVizzes })
        return storedVizzes.open
      } catch (error) {
        throw new Error(error.message)
      }
    },
    SET_ACTIVE_VIZ(
      { state, commit, rootGetters },
      { idx = 0, dataset = rootGetters['workspace/activeDataset'] }
    ) {
      try {
        const datasetSlug = dataset.slug
        const storedVizzes = state.vizzes[datasetSlug]
        const activeViz = storedVizzes.activate(idx)
        commit('ACTIVE_VIZ', activeViz)
      } catch (error) {
        throw new Error(error.message)
      }
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
    RESET_VIZ(
      { state, commit, rootGetters }
    ) {
      const dataset = rootGetters['workspace/activeDataset']
      const datasetSlug = dataset.slug
      const storedVizzes = state.vizzes[datasetSlug]
      const activeViz = storedVizzes.activeViz
      activeViz.resetValues()
      commit('SET_VIZZES', { dataset: datasetSlug, vizzes: storedVizzes })
    },
  },
  getters: {
    vizzes: ({ vizzes }, _, __, rootGetters) => {
      const activeDataset = rootGetters['workspace/activeDataset']
      return (dataset) => {
        if (dataset && vizzes[dataset]) {
          return vizzes[dataset]
        } else if (!dataset && activeDataset) {
          return vizzes[activeDataset.slug]
        } else {
          return null
        }
      }
    },
    viz: ({ vizModel }) => {
      return vizModel
    },
    chart: (_, { viz }) => {
      const payload= viz.getValues
        ? viz.getValues()
        : new Viz().getValues()
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
