import Vue from 'vue';
import Router from 'vue-router';
import Chart from './views/Chart.vue';
import Vpress from './views/Vpress.vue';
import VpressChartEditor from './components/vpress-chart-editor.vue';

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: '*',
      redirect: '/'
    },
    {
      path: '/shared/:chartid',
      component: Chart
    },
    {
      path: '/',
      component: Vpress,
      props: true,
      children: [
        { path: '/', component: VpressChartEditor },
        { path: '/chart/:chartid', component: VpressChartEditor }
      ]
    }
  ]
});
