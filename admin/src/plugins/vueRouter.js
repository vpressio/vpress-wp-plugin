import Vue from 'vue';
import Router from 'vue-router';
import { privateRouter, publicRouter } from '../router.js'

Vue.use(Router);

const routerProvider = (context) => {
  const routers = {
    app: privateRouter,
    front: publicRouter,
  }
  const router = routers[context]
  return new Router(router);
}


export default () => {
  if (document.getElementById('app')) {
    return ['app' , routerProvider('app')]
  } else if (document.getElementById('front')) {
    return ['front', routerProvider('front')]
  } else {
    throw new Error('App root element is missing in DOM')
  }
}