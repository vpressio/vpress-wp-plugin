import { createRouter, createWebHashHistory } from 'vue-router';
import { privateRouter, publicRouter } from '../router.js';

const routerProvider = (context) => {
  const routers = {
    app: privateRouter,
    front: publicRouter
  };
  return createRouter({
    history: createWebHashHistory(),
    routes: routers[context].routes
  });
};

export default () => {
  if (document.getElementById('app')) {
    return ['app', routerProvider('app')];
  } else if (document.getElementById('front')) {
    return ['front', routerProvider('front')];
  } else {
    throw new Error('App root element is missing in DOM');
  }
};
