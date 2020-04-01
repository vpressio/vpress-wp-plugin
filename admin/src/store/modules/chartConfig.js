import * as _ from 'lodash';
import vpress from '../../utils/vpress.js';

export default {
  namespaced: true,
  state: {
    chart: 'bars',
    xAxis: { title: '', type: '', slug: '' , func: ''},
    yAxis: { title: '', type: '', slug: '', func: ''},
    groupBy: { title: '', type: 'ordinal', slug: ''},
    collapseBy: { title: '', type: 'linear', slug: '', func: '' },
    previousState: {
      chart: 'bars',
      xAxis: { title: '', type: '', slug: '' , func: ''},
      yAxis: { title: '', type: '', slug: '', func: ''},
      groupBy: { title: '', type: 'ordinal', slug: ''},
      collapseBy: { title: '', type: 'linear', slug: '', func: '' },
    },
    orderBy: { order: 'desc', slug: '' },
    decimals: 1,
    preffix: '',
    suffix: '',
    stackedBars: false,
    title: 'Título',
    subtitle: 'Subtítulo',
    labels: false,
    opacity: 0.8,
    theme: 'light',
    colors: ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f'],
    availableGraphs: [
      {
        chartType: 'bars',
        chartCompatibleDataTypes: ['linear', 'ordinal'],
      },
      {
        chartType: 'heatmap',
        chartCompatibleDataTypes: ['ordinal']
      },
      {
        chartType: 'spineplot',
        chartCompatibleDataTypes: ['ordinal']
      },
      {
        chartType: 'scatter',
        chartCompatibleDataTypes: ['linear']
      },
      {
        chartType: 'timeline',
        chartCompatibleDataTypes: ['date', 'linear']
      }
    ],
    availableColors: [
      {
        colorSchemeType: 'SECUENCIAL',
        schemes: [
          ['#feebe2', '#fbb4b9', '#f768a1', '#c51b8a', '#7a0177'],
          ['#ffffcc', '#a1dab4', '#41b6c4', '#2c7fb8', '#253494'],
          ['#f2f0f7', '#cbc9e2', '#9e9ac8', '#756bb1', '#54278f']
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
    SET_X_AXIS(state, payload) {
      // If payload === null reset value field.
      state.xAxis.title = payload ? payload.variableName : '';
      state.xAxis.slug = payload ? payload.variableName : '';
      state.xAxis.type = payload ? payload.variableNameDataType : '';
      state.xAxis.func = payload ? payload.func : '';

      // If the other axis include the same variable it will reset collpase field.
      if (!_.includes([state.yAxis.slug, state.groupBy.slug], state.collapseBy.slug)) {
        state.collapseBy = { title: '', type: 'linear', slug: '', func: '' };
      }

      // If collapse is not been set. collapseby will be the axis with the linear data type
      if (!state.collapseBy || state.collapseBy.title === '') {
        if (state.xAxis && state.xAxis.type === 'linear') {
          state.collapseBy = state.xAxis;
        } else if (state.yAxis && state.yAxis.type === 'linear') {
          state.collapseBy = state.yAxis;
        }
      }

      // state.orderBy.slug = state.collapseBy.slug;

      // if both axis are 'ordinal'  you can use heatmap or spineplot
      if (state.xAxis.type === 'ordinal' && state.yAxis.type === 'ordinal') {
        if (!_.includes(['heatmap', 'spineplot'])) {
          console.warn("Ordinal axes can be displayed in 'heatmap' or 'spineplot'");
        }
        state.chart = 'heatmap';
        // state.chart = 'spineplot';

        // else if both linear set to scatter
      } else if (state.xAxis.type === 'linear' && state.yAxis.type === 'linear') {
        state.chart = 'scatter';

        //else if axis = date set to timeline
      } else if (state.xAxis.type === 'date') {
        state.chart = 'timeline';

        // else if  axis are different type set to bars
      } else if (state.xAxis.type !== state.yAxis.type) {
        state.chart = 'bars';
      }
    },
    SET_Y_AXIS(state, payload) {
      if (payload === null) {
        state.yAxis = { title: '', type: '', slug: '' };
      }


      state.yAxis.title = payload ? payload.variableName : '';
      state.yAxis.slug = payload ? payload.variableName : '';
      state.yAxis.type = payload ? payload.variableNameDataType : '';
      state.yAxis.func = payload ? payload.func : '';
      /** Reset yAxis */
      if (!_.includes([state.xAxis.slug, state.groupBy.slug], state.collapseBy.slug)) {
        state.collapseBy = { title: '', type: 'linear', slug: '', func: '' };
      }
      if (!state.collapseBy || state.collapseBy.title === '') {
        if (state.xAxis && state.xAxis.type === 'linear') {
          state.collapseBy = state.xAxis;
        } else if (state.yAxis && state.yAxis.type === 'linear') {
          state.collapseBy = state.yAxis;
        }
      }
      state.orderBy.slug = state.collapseBy.slug;
      if (state.xAxis.type === 'ordinal' && state.yAxis.type === 'ordinal') {
        if (!_.includes(['heatmap', 'spineplot'])) {
          console.warn("Ordinal axes can be displayed in 'heatmap' or 'spineplot'");
        }
        state.chart = 'heatmap';
        // state.chart = 'spineplot';
        if (!state.groupBy.slug) {
          state.groupBy = Object.assign({}, state.yAxis);
        }
      } else if (state.xAxis.type === 'linear' && state.yAxis.type === 'linear') {
        state.chart = 'scatter';
      } else if (state.xAxis.type === 'date') {
        state.chart = 'timeline';
      } else if (state.xAxis.type !== state.yAxis.type) {
        state.chart = 'bars';
      }
    },
    SET_GROUP_BY(state, payload) {
      if (payload === null) {
        state.groupBy = { title: '', type: '', slug: '' };

        // if both are ordinal reset collapse by
        if (state.xAxis.type === 'ordinal' && state.yAxis.type === 'ordinal') {
          state.collapseBy = { title: '', type: '', slug: '', func: '' };
        }
      }

      // if groupBy ordinal 
      if (payload && payload.variableNameDataType === 'ordinal') {
        if (
          //if both axis are the different as groupby and is not heatmap
          payload.variableName !== state.xAxis.slug &&
          payload.variableName !== state.yAxis.slug &&
          state.chart !== 'heatmap'
        ) {
          //Update group By
          state.groupBy.title = payload ? payload.variableName : '';
          state.groupBy.slug = payload ? payload.variableName : '';
          state.groupBy.type = payload ? payload.variableNameDataType : '';
        }
      } else if (
        // If groupBy dataType is linear, the chart will be heatmap
        payload &&
        payload.variableNameDataType === 'linear' &&
        state.chart === 'heatmap'
      ) {
        //Update collapse
        state.collapseBy.title = payload ? payload.variableName : '';
        state.collapseBy.slug = payload ? payload.variableName : '';
        state.collapseBy.type = payload ? payload.variableNameDataType : '';
        state.collapseBy.type = payload ? payload.func : '';
      }
    },
    SET_CHART_TYPE(state, payload) {
      state.chart = payload;
    },
    SET_STACK_BARS(state, payload) {
      state.stackedBars = payload;
    },
    SET_SHOW_LABELS(state, payload) {
      state.labels = payload;
    },
    SET_CHART_THEME(state, payload) {
      const isDarkThemeActivated = payload;
      isDarkThemeActivated ? (state.theme = 'dark') : (state.theme = 'light');
    },
    SET_CHART_COLORS(state, payload) {
      state.colors = payload;
    },
    SET_CHART_VALUES(state, payload) {
      console.log('Into mutation')
      const {
        chart,
        xAxis,
        yAxis,
        groupBy,
        collapseBy,
        orderBy,
      } = state;

      state.previousState = {
        chart: chart,
        xAxis: xAxis,
        yAxis: yAxis,
        groupBy: groupBy,
        collapseBy: collapseBy,
        orderBy: orderBy
      }

      state.chart = payload.chart,
      state.xAxis = payload.xAxis,
      state.yAxis = payload.yAxis,
      state.groupBy = payload.groupBy,
      state.collapseBy = payload.collapseBy
      state.orderBy = payload.orderBy
    }
  },
  actions: {
    async UPDATE_CHART_VALUES({ state, commit }, payload) {
      try {
        console.log(payload)
        const currentChartValues = {
          chart: state.chart,
          xAxis: state.xAxis,
          yAxis: state.yAxis,
          groupBy: state.groupBy,
          collapseBy: state.collapseBy,
          orderBy: state.orderBy
        };
        const newChartValues = await vpress.merge(currentChartValues, payload);
        commit('SET_CHART_VALUES', newChartValues);
      } catch (error) {
        console.warn(error)
      }
    },
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
      commit('SET_CHART_TYPE', payload);
    },
    UPDATE_STACK_BARS({ commit }, payload) {
      commit('SET_STACK_BARS', payload);
    },
    UPDATE_SHOW_LABELS({ commit }, payload) {
      commit('SET_SHOW_LABELS', payload);
    },
    UPDATE_CHART_THEME({ commit }, payload) {
      commit('SET_CHART_THEME', payload);
    },
    UPDATE_CHART_COLORS({ commit }, payload) {
      commit('SET_CHART_COLORS', payload);
    }
  },
  getters: {
    fullConfig: state => state,
    theme: state => state.theme,
    chart: state => state.chart,
    labels: state => state.labels,
    stackedBars: state => state.stackedBars,
    availableColors: state => state.availableColors,
    'groupBy.slug': state => state.groupBy.slug,
    getAvailableCharts: state => {
      return state.availableGraphs.map(chart => {
        if (
          chart.chartCompatibleDataTypes.includes(state.xAxis.type) &&
          chart.chartCompatibleDataTypes.includes(state.yAxis.type)
        ) {
          if (
            chart.chartCompatibleDataTypes.length > 1 &&
            state.xAxis.type === state.yAxis.type
          ) {
            return { ...chart, disabled: true };
          }
          if (chart.chart === 'spineplot' && state.collapseBy.slug === '') {
            return { ...chart, disabled: true };
          }
          return { ...chart, disabled: false };
        }
        return { ...chart, disabled: true };
      });
    }
  }
};
