import Vue from 'vue';
import Vuex from 'vuex';

import moduleData from './modules/data';

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    data: moduleData,
  },
});
