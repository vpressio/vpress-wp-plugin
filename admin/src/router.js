import Vue from 'vue';
import Router from 'vue-router';
import Chart from './views/Chart.vue';
import Vpress from './views/Vpress.vue';
import reunionDonantes from './views/reunionDonantes.vue'
import VpressChartEditor from './components/vpress-chart-editor.vue';
import VpressChartList from './components/vpress-chart-list.vue';
import VpressDataset from './components/vpress-dataset.vue';
import VpressDatasetList from './components/vpress-dataset-list.vue';
import Sandbox from './views/Sandbox.vue'

Vue.use(Router);

export default (strategy) => {

  const router = {
    app: {
      routes: [
        {
          path: '*',
          redirect: '/'
        },
        {
          path: '/',
          component: Vpress,
          props: true,
          children: [
            { path: '/', component: VpressChartEditor },
            { path: '/chart/list', component: VpressChartList },
            { path: '/dataset/list', component: VpressDatasetList },
            { path: '/dataset', component: VpressDataset },
          ]
        },
        {
          path: '/reunionDonantes',
          component: reunionDonantes
        },
        {
          path: '/sandbox',
          component: Sandbox
        }
      ]
    },
    front: {
      routes: [
        {
          path: '*',
          redirect: '/'
        },
        {
          path: '/',
          component: Chart
        },
      ]
    }
  }[strategy]

  return new Router(router);
}



