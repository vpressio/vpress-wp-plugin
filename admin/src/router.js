import Chart from './views/Chart.vue'
import Vpress from './views/Vpress.vue'
import VpressChartList from './views/ChartList.vue'
import VpressDatasetList from './views/DatasetList.vue'
import VpressEditor from './views/EditorModule.vue'
import VpressDataModule from './views/DataModule.vue'

const EmptyView = { render: () => null };

export const privateRouter = {
  routes: [
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    },
    {
      path: '/',
      component: Vpress,
      props: true,
      children: [
        { path: '', component: VpressChartList },
        { path: 'datasets', component: VpressDatasetList },
      ]
    },
    {
      path: '/data',
      component: VpressDataModule,
      props: true,
      children: [
        { path: '', component: EmptyView },
        { path: 'upload', component: EmptyView },
        { path: 'paste', component: EmptyView },
        { path: 'url', component: EmptyView },
      ]
    },
    {
      path: '/editor/:section',
      component: VpressEditor,
      props: true
    }
  ]
}

export const publicRouter = {
  routes: [
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    },
    {
      path: '/',
      component: Chart
    },
  ]
}
