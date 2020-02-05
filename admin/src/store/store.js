import Vue from 'vue';
import Vuex from 'vuex';

import moduleData from './modules/data.js';
import moduleChartConfig from './modules/chartConfig.js';

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    data: moduleData,
    chartConfig:moduleChartConfig
  },
});
