import Vue from 'vue';
import Router from 'vue-router';

import HelloWorld from '../components/HelloWorld.vue';

Vue.use(Router);


export default new Router({
  routes: [
    {
      path: '/',
      name: 'home',
      component: HelloWorld,
    }, {
      path: '/test',
      name: 'test',
      // route level code-splitting
      // this generates a separate chunk (login.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import(/* webpackChunkName: "login" */ '../views/Test.vue'),
    },
  ],
});
