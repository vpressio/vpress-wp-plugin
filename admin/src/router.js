import Vue from 'vue';
import Router from 'vue-router';
import Demo from './views/Demo.vue';
import Chart from './views/Chart.vue';

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: '/',
      name: 'demo',
      component: Demo
    },
    {
      path: '/chart/:chartid',
      name: 'demoPlusId',
      component: Demo
    },
    {
      path: '/shared/:chartid',
      component: Chart
    }
  ]
});
