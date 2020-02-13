import * as _ from 'lodash';

export default {
  namespaced: true,
  state: {
    chart: 'bars',
    xAxis: { title: '', type: 'ordinal', slug: '' },
    yAxis: { title: '', type: 'ordinal', slug: '' },
    groupBy: { title: '', type: 'ordinal', slug: '' },
    collapseBy: { title: '', type: 'linear', slug: '' },
    decimals: 1,
    preffix: '',
    suffix: '',
    stackedBars: false,
    orderBy: { order: 'desc', slug: '' },
    title: '',
    colors: [
      '#a6cee3',
      '#1f78b4',
      '#b2df8a',
      '#33a02c',
      '#fb9a99',
      '#e31a1c',
      '#fdbf6f',
      '#ff7f00',
      '#cab2d6'
    ],
    labels: false,
    availableGraphs:[
      {
        chartType:'bars',
        chartCompatibleDataType:['linear','ordinal']
      },
      {
        chartType:'heatmap',
        chartCompatibleDataType:['ordinal']
      },
      {
        chartType:'spineplot',
        chartCompatibleDataType:['ordinal']
      },
      {
        chartType:'scatter',
        chartCompatibleDataType:['linear']
      },
      {
        chartType:'timeline',
        chartCompatibleDataType:['date', 'linear']
      },
    ]
  },
  mutations: {
    SET_X_AXIS(state, payload) {
      state.xAxis.title = payload ? payload.variableName : '';
      state.xAxis.slug = payload ? payload.variableName : '';
      state.xAxis.type = payload ? payload.variableNameDataType : '';
      if (!state.collapseBy || state.collapseBy.title === '') {
        if (state.xAxis && state.xAxis.type === 'linear') {
          state.collapseBy = state.xAxis;
          state.orderBy.slug = state.collapseBy.slug;
        }
      }
      if (state.xAxis.type === 'ordinal' && state.yAxis.type === 'ordinal') {
        if (!_.includes(['heatmap', 'spineplot'])) {
          console.warn("Ordinal axes can be displayed in 'heatmap' or 'spineplot'");
        }
        state.chart = 'heatmap';
        // state.chart = 'spineplot';
      } else if (state.xAxis.type === 'linear' && state.yAxis.type === 'linear') {
        state.chart = 'scatter';
      } else if (state.xAxis.type === 'date') {
        state.chart = 'timeline';
      } else if (state.xAxis.type !== state.yAxis.type) {
        state.chart = 'bars';
      }
    },
    SET_Y_AXIS(state, payload) {
      state.yAxis.title = payload ? payload.variableName : '';
      state.yAxis.slug = payload ? payload.variableName : '';
      state.yAxis.type = payload ? payload.variableNameDataType : '';
      if (!state.collapseBy || state.collapseBy.title === '') {
        if (state.yAxis && state.yAxis.type === 'linear') {
          state.collapseBy = state.yAxis;
          state.orderBy.slug = state.collapseBy.slug;
        }
      }
      if (state.xAxis.type === 'ordinal' && state.yAxis.type === 'ordinal') {
        if (!_.includes(['heatmap', 'spineplot'])) {
          console.warn("Ordinal axes can be displayed in 'heatmap' or 'spineplot'");
        }
        state.chart = 'heatmap';
        // state.chart = 'spineplot';
      } else if (state.xAxis.type === 'linear' && state.yAxis.type === 'linear') {
        state.chart = 'scatter';
      } else if (state.xAxis.type === 'date') {
        state.chart = 'timeline';
      } else if (state.xAxis.type !== state.yAxis.type) {
        state.chart = 'bars';
      }
    },
    SET_GROUP_BY(state, payload) {
      state.groupBy.title = payload ? payload.variableName : '';
      state.groupBy.slug = payload ? payload.variableName : '';
      state.groupBy.type = payload ? payload.variableNameDataType : '';
    },
    SET_CHART_TYPE(state, payload) {
      state.chart = payload;
      console.log(state.chart);
    }
  },
  actions: {
    UPDATE_X_AXIS({ commit }, payload) {
      commit('SET_X_AXIS', payload);
    },
    UPDATE_Y_AXIS({ commit }, payload) {
      commit('SET_Y_AXIS', payload);
    },
    UPDATE_GROUP_BY({ commit }, payload) {
      commit('SET_GROUP_BY', payload);
    },
    UPDATE_CHART_TYPE({ commit }, payload) {
      commit('SET_CHART_TYPE', payload)
    }
  },
  getters: {
    getChartTypes: state => {
      return state.availableGraphs.map(chart => {
        console.log(chart.chartCompatibleDataType)
        if(chart.chartCompatibleDataType.includes(state.xAxis.type) && chart.chartCompatibleDataType.includes(state.yAxis.type))
        return {...chart, disabled:false};
        return {...chart, disabled:true};
      });
    }
  },
  setters: {}
};
