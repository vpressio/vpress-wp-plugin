
import Chart from './views/Chart.vue'
import Vpress from './views/Vpress.vue'
import VpressChartList from './views/ChartList.vue'
import VpressDatasetList from './views/DatasetList.vue'
import VpressChartEditor from './views/Editor.vue'

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
        { path: '/', component: VpressChartEditor },
        { path: '/chart/list', component: VpressChartList },
        { path: '/dataset/list', component: VpressDatasetList },
      ]
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


