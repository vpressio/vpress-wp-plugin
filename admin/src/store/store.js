import Vue from 'vue';
import Vuex from 'vuex';

import moduleData from './modules/data.js';
import moduleConfig from './modules/config.js';

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    data: moduleData,
    config:moduleConfig
  },
});
