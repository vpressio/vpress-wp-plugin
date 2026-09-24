import { defineStore } from 'pinia';
import { Viz, Vizzes } from '../models/index.js';
import api from '../utils/axios.js';
import { useWorkspaceStore } from './workspace.js';

export const useEditorStore = defineStore('editor', {
  state: () => ({
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
        required: ['collapseBy'],
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
        required: [],
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
    ]
  }),
  getters: {
    // Kept as a parameterized closure, mirroring the Vuex getter-factory.
    getVizzes(state) {
      const activeDataset = useWorkspaceStore().activeDatasetMeta;
      return (dataset) => {
        if (dataset && state.vizzes[dataset]) {
          return state.vizzes[dataset];
        } else if (!dataset && activeDataset) {
          return state.vizzes[activeDataset.slug];
        } else {
          return null;
        }
      };
    },
    viz(state) {
      return state.vizModel;
    },
    chart() {
      return this.viz.getValues ? this.viz.getValues() : new Viz().getValues();
    },
    loadingState(state) {
      return state.loadingChart;
    },
    xAxis() {
      const chart = this.chart;
      const mainAxis = chart.xAxis;
      const oppsAxis = chart.yAxis;
      const mutationType = 'xAxis';
      const slotVariables = [];
      switch (chart.chart) {
        case 'bars':
          slotVariables.push({ variable: mainAxis, mutationType: mutationType });
          if (oppsAxis.type === 'linear') {
            slotVariables.push({ variable: chart.groupBy, mutationType: 'groupBy' });
          }
          break;
        case 'heatmap':
          slotVariables.push({ variable: mainAxis, mutationType: mutationType });
          break;
        case 'spineplot':
          slotVariables.push({ variable: mainAxis, mutationType: mutationType });
          if (oppsAxis.type === 'linear') {
            slotVariables.push({ variable: chart.groupBy, mutationType: 'groupBy' });
          }
          break;
        case 'map':
          slotVariables.push({ variable: mainAxis, mutationType: mutationType });
          break;
        case 'timeline':
          slotVariables.push({ variable: mainAxis, mutationType: mutationType });
          if (oppsAxis.type === 'linear') {
            slotVariables.push({ variable: chart.groupBy, mutationType: 'groupBy' });
          }
          break;
        case 'scatter':
          slotVariables.push({ variable: mainAxis, mutationType: mutationType });
          break;
        default:
          break;
      }
      return slotVariables;
    },
    yAxis() {
      const chart = this.chart;
      const mainAxis = chart.yAxis;
      const oppsAxis = chart.xAxis;
      const mutationType = 'yAxis';
      const slotVariables = [];
      switch (chart.chart) {
        case 'bars':
          slotVariables.push({ variable: mainAxis, mutationType: mutationType });
          if (oppsAxis.type === 'linear') {
            slotVariables.push({ variable: chart.groupBy, mutationType: 'groupBy' });
          }
          break;
        case 'heatmap':
          slotVariables.push({ variable: mainAxis, mutationType: mutationType });
          break;
        case 'spineplot':
          slotVariables.push({ variable: mainAxis, mutationType: mutationType });
          if (oppsAxis.type === 'linear') {
            slotVariables.push({ variable: chart.groupBy, mutationType: 'groupBy' });
          }
          break;
        case 'map':
          slotVariables.push({ variable: mainAxis, mutationType: mutationType });
          break;
        case 'timeline':
          slotVariables.push({ variable: mainAxis, mutationType: mutationType });
          if (oppsAxis.type === 'linear') {
            slotVariables.push({ variable: chart.groupBy, mutationType: 'groupBy' });
          }
          break;
        case 'scatter':
          slotVariables.push({ variable: mainAxis, mutationType: mutationType });
          break;
      }
      return slotVariables;
    },
    groupBy() {
      return [{ variable: this.chart.groupBy, mutationType: 'groupBy' }];
    },
    collapseBy() {
      return [{ variable: this.chart.collapseBy, mutationType: 'collapseBy' }];
    },
    filter() {
      return this.chart.filters.map((filter) => ({ variable: filter, mutationType: 'filter' }));
    },
    theme() {
      return this.chart.theme;
    },
    chartType() {
      return this.chart.chart;
    },
    labels() {
      return this.chart.labels;
    },
    // Vuex getter was the string key 'groupBy.slug' — renamed for Pinia.
    groupBySlug() {
      return this.chart.groupBy.slug;
    },
    stackedBars() {
      return this.chart.stackedBars;
    },
    order() {
      return this.chart.orderBy.order;
    },
    getAvailableCharts(state) {
      const chart = this.chart;
      const requiredReduce = (acc, requiredField) => acc || chart[requiredField].slug === '';
      return state.availableGraphs.map(graph => {
        if (chart.xAxis.slug === '' && chart.yAxis.slug === '') {
          return { ...graph, disabled: true };
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
              };
            }
            return { ...graph, disabled: true };
          case 'heatmap':
            if (chart.xAxis.type !== 'linear' && chart.yAxis.type !== 'linear') {
              return {
                ...graph,
                disabled: graph.required.reduce(requiredReduce, false)
              };
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
            return { ...graph };
          case 'timeline':
            if (chart.xAxis.type === 'date' && chart.yAxis.type === 'linear') {
              return {
                ...graph,
                disabled: graph.required.reduce(requiredReduce, false)
              };
            }
            return { ...graph, disabled: true };
          case 'scatter':
            return {
              ...graph,
              disabled: graph.required.reduce(requiredReduce, false)
            };
        }
      });
    }
  },
  actions: {
    LOAD_VIZZES({ vizValues = [], dataset = useWorkspaceStore().activeDatasetMeta }) {
      const datasetSlug = dataset.slug;
      const storedVizzes = this.vizzes[datasetSlug];
      let vizzes;
      if (storedVizzes) {
        storedVizzes.add(new Vizzes(vizValues, datasetSlug).vizzes);
        vizzes = storedVizzes;
      } else {
        vizzes = new Vizzes(vizValues, datasetSlug);
      }
      this.vizModel = vizzes.activeViz;
      // Vuex SET_VIZZES mutation: reset then register (omits stale workspaces).
      this.vizzes = { [datasetSlug]: vizzes };
      return storedVizzes;
    },
    REMOVE_VIZZES(datasetName = useWorkspaceStore().activeDatasetMeta.slug) {
      const vizzesSubstract = { ...this.vizzes };
      delete vizzesSubstract[datasetName];
      this.vizzes = vizzesSubstract;
    },
    UPDATE_VIZ({ values, data, dataset = useWorkspaceStore().activeDatasetMeta }) {
      const datasetSlug = dataset.slug;
      const storedVizzes = this.vizzes[datasetSlug];
      const activeViz = storedVizzes.activeViz;
      activeViz.setData(data || activeViz.getData());
      activeViz.setValues(values || activeViz.getValues());
      this.vizzes = { [datasetSlug]: storedVizzes };
    },
    async REMOVE_VIZ({ idx = 0, dataset = useWorkspaceStore().activeDatasetMeta }) {
      const datasetSlug = dataset.slug;
      const storedVizzes = this.vizzes[datasetSlug];
      storedVizzes.delete(idx);
      this.vizzes = { [dataset.slug]: storedVizzes };
    },
    async ADD_VIZ({ dataset = useWorkspaceStore().activeDatasetMeta } = {}) {
      try {
        const datasetSlug = dataset.slug;
        const storedVizzes = this.vizzes[datasetSlug];
        storedVizzes.new();
        this.vizzes = { [dataset.slug]: storedVizzes };
        return storedVizzes.open;
      } catch (error) {
        throw new Error(error.message);
      }
    },
    SET_ACTIVE_VIZ({ idx = 0, dataset = useWorkspaceStore().activeDatasetMeta }) {
      try {
        const datasetSlug = dataset.slug;
        const storedVizzes = this.vizzes[datasetSlug];
        const activeViz = storedVizzes.activate(idx);
        this.vizModel = activeViz;
      } catch (error) {
        throw new Error(error.message);
      }
    },
    UPDATE_LOADING_STATE(state) {
      this.loadingChart = state;
    },
    async SAVE_CHART() {
      try {
        const {
          id,
          chartValues,
          owner_id,
          description,
          permission,
          img_url
        } = this.viz;

        const dataset = useWorkspaceStore().activeDatasetMeta;
        const body = {
          value: JSON.stringify(chartValues),
          owner_id: owner_id,
          description: description,
          permissions: permission,
          img_url: img_url
        };
        if (!id) {
          const saveResponse = await api.chart.create(
            { dataset_id: dataset.id, ...body }
          );
          const savedChart = saveResponse.data;
          if (saveResponse.data.error) {
            throw new Error(saveResponse.data.error);
          }
          // Vuex SET_WSP_CHART_ID mutation.
          this.vizzes[dataset.slug].activeViz.id = savedChart.data;
        } else {
          const updateResponse = await api.chart.update({ id, ...body });
          if (updateResponse.data.error) {
            throw new Error(updateResponse.data.error);
          }
        }
      } catch (error) {
        throw new Error(error.message);
      }
    },
    RESET_VIZ() {
      const dataset = useWorkspaceStore().activeDatasetMeta;
      const datasetSlug = dataset.slug;
      const storedVizzes = this.vizzes[datasetSlug];
      const activeViz = storedVizzes.activeViz;
      activeViz.resetValues();
      this.vizzes = { [datasetSlug]: storedVizzes };
    }
  }
});
