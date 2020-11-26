
import Chart from './views/Chart.vue'
import Vpress from './views/Vpress.vue'
import VpressChartList from './views/ChartList.vue'
import VpressDatasetList from './views/DatasetList.vue'
import VpressChartEditor from './views/Editor.vue'
import VpressDataModule from './views/DataModule.vue'

export const privateRouter = {
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
        { path: '/', component: VpressChartList },
        { path: '/datasets', component: VpressDatasetList },
      ]
    },
    {
      path: '/data',
      component: VpressDataModule,
      props: true,
      children: [
        { path: '/', component: null },
        { path: '/upload', component: null },
        { path: '/paste', component: null },
        { path: '/api', component: null },
      ]
    },
    {
      path: '/editor', component: VpressChartEditor
    }
  ]
}

export const publicRouter = {
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


