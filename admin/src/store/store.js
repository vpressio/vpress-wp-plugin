import Vue from 'vue';
import Vuex from 'vuex';
import LogRocket from 'logrocket';
import createPlugin from 'logrocket-vuex';

import moduleWorkspace from './modules/workspace.js';
import notifications from './modules/notifications.js';
import moduleChartConfig from './modules/chartConfig.js';

const logrocketPlugin = createPlugin(LogRocket);

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    workspace: moduleWorkspace,
    notifications: notifications,
    chartConfig: moduleChartConfig
  },
  plugins: [logrocketPlugin]
});
