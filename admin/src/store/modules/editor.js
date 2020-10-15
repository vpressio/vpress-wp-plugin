import vpress from '../../utils/vpress.js';
import { VpressViz } from '../../utils/vpressViz.js';
import api from '../../utils/axios.js' 

export default {
  namespaced: true,
  state: {
    openViz: 0,
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
      state.openViz = payload
    },
    SET_LOAD_STATE(state, payload) {
      state.loadingChart = payload ? true : false
    },
    SET_VIZ_VALUES(state, { values, dataset }) {
       // eslint-disable-next-line no-debugger
       debugger
      state.vizzes[dataset][state.openViz].setChartValues(values)
    },
    SET_VIZ_DATA(state, { data, dataset }) {
      state.vizzes[dataset][state.openViz].setData(data)
    },
    SET_WSP_CHART_ID(state, { id, dataset }) {
      state.vizzes[dataset][state.openViz].id = id
    },
    SET_VIZZES(state, { dataset, vizzes }) {
      state.vizzes[dataset] = vizzes
    },
    ADD_VIZZES(state, { dataset, vizzes }) {
      state.vizzes[dataset] = [...state.vizzes[dataset], ...vizzes]
    },
    DELETE_VIZZES(state, datasetName) {
      delete state.vizzes[datasetName]
    },
    OPEN_VIZ(state, idx) {
      state.openViz = idx
    }
  },
  actions: {
    async DATA_QUERY(
      { dispatch, state, commit, rootGetters },
      { value, mutationType }
    ) {
      try {
        const dataset = rootGetters['workspace/activeDataset'].slug
        const activeChart = state.vizzes[dataset][state.openViz].values()
        const newChartValues = vpress.queryByChart(
          activeChart,
          {
            newValue: value,
            mergeType: mutationType
          }
        )
        if (
          newChartValues.xAxis.slug !== '' &&
          newChartValues.yAxis.slug !== ''
        ) {
          commit('SET_LOAD_STATE', true)
          const date = await dispatch(
              'workspace/GET_CHART_DATA',
            {
              chartValues: newChartValues,
              chartIndex: state.openViz
            },
              { root: true }
          )
          commit('SET_VIZ_DATA', { date, dataset })
        }
        commit('SET_VIZ_VALUES', { values: newChartValues, dataset })
        commit('SET_LOAD_STATE', false)
      } catch (error) {
        commit('SET_LOAD_STATE', false)
        throw new Error(error.message);
      }
    },
    async MERGE_CHART_VALUE({ state, commit, rootGetters }, payload) {
      try {
        const dataset = rootGetters['workspace/activeDataset'].slug
        const newValue = payload
        const newChartValues = vpress.mergeChartVal(
          state.vizzes[dataset][state.openViz].values,
          {
            newValue: newValue.value,
            mutationType: newValue.mutationType
          }
        )
        commit('SET_VIZ_VALUES', { values: newChartValues, dataset })
        return newValue
      } catch (error) {
        throw new Error(error.message);
      }
    },
    LOAD_VIZZES(
      { state, commit, rootGetters },
      { vizValues = [], dataset = rootGetters['workspace/activeDataset'] }
    ) {
      const datasetSlug = dataset.slug
      const vizzes = vizValues
            .map(viz => new VpressViz(
              viz.values,
              viz.id,
              viz.mapValues,
              viz.dataset_id,
              viz.data,
              viz.description,
              viz.permission,
              viz.img_url,
            ))
      const payload = vizzes.length > 0
        ? vizzes
        : [new VpressViz()]
      const storedVizzes = state.vizzes[datasetSlug]
      if (storedVizzes) {
        commit('ADD_VIZZES', vizzes)
        const lastIdx = vizzes.length - 1
        commit('OPEN_VIZ', lastIdx)
      } else if(vizzes.length < 0) {
        commit('SET_VIZZES', { dataset: datasetSlug, vizzes: payload })
        commit('OPEN_VIZ', 0)
      }
    },
    REMOVE_VIZZES(
      { commit, rootGetters },
      datasetName = rootGetters['workspace/activeDataset']
      ) {
        commit('DELETE_VIZZES', datasetName)
        commit('OPEN_VIZ', 0)
    },
    ADD_VIZ({ state, commit, rootGetters }, viz = new VpressViz()) {
      const activeDataset = rootGetters['workspace/activeDataset']
      const vizzes = state.vizzes[activeDataset].push(viz)
      commit('SET_VIZZES', vizzes)
      const newIdx = vizzes.length - 1
      commit('OPEN_VIZ', newIdx)
    },
    REMOVE_VIZ({ state, commit, rootGetters }, vizIdx) {
      const activeDataset = rootGetters['workspace/activeDataset']
      const vizzes = state.vizzes[activeDataset].slice(vizIdx, 1)
      commit('SET_VIZZES', vizzes)
      if (vizIdx === state.openViz) {
        commit('OPEN_VIZ', 0)
      }
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

        const datasetMeta = rootGetters['workspace/activeDataset']
        const body = {
          value: JSON.stringify(chartValues),
          owner_id: owner_id,
          description: description,
          permissions: permission,
          img_url: img_url
        }
        if (!id) {
          const saveResponse = await api.chart.create(
            { dataset_id: datasetMeta.id, ...body }
          )
          const savedChart = saveResponse.data
          if (saveResponse.data.error) {
            throw new Error(saveResponse.data.error);
          }

          commit('SET_WSP_CHART_ID', { id: savedChart.data, dataset: datasetMeta.slug })
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
    async DELETE_CHART(_, id) {
      try {
        const response = await api.chart.delete({ data: { id: id }})
        return response.data
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async SAVE_IMAGE_CHART(_, payload) {
      try {
        const response = await api
          .chart
          .image({ string: payload })
        return response.data
      } catch (error) {
        throw new Error(error.message)
      }
    },
  },
  getters: {
    workspace: ({ vizzes }, _, __, rootGetters) => {
      const activeDataset = rootGetters['workspace/activeDataset']
        ? rootGetters['workspace/activeDataset'].slug
        : ''
      return (dataset = activeDataset) => vizzes[dataset]
    },
    activeVizIdx: state => state.openViz,
    viz: ({ vizzes, openViz }, _, __, rootGetters) => {
      const dataset = rootGetters['workspace/activeDataset']
      if (!dataset || Object.keys(vizzes).length <= 0 ) return new VpressViz()
      return !vizzes[dataset.slug] || vizzes[dataset.slug].length <= 0
        ? new VpressViz()
        : vizzes[dataset.slug][openViz]
    },
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
    groupBy: (_, { chart }) => [{ variable: chart.groupBy, mutationType: 'groupBy' }],
    collapseBy: (_, { chart }) => [{ variable: chart.collapseBy, mutationType: 'collapseBy' }],
    filter: (_, { chart }) =>  chart.filters.map((filter) => ({ variable: filter, mutationType: 'filter' })),
    theme: (_, { chart }) => chart.theme,
    chartType: (_, { chart }) => chart.chart,
    labels: (_, { chart }) => chart.labels,
    'groupBy.slug': (_, { chart }) => chart.groupBy.slug,
    stackedBars: (_, { chart }) => chart.stackedBars,
    order: (_, { chart }) => chart.orderBy.order,
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
