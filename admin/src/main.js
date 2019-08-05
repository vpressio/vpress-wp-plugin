import Vue from 'vue';
import App from './App.vue';

import router from './router/index';
import store from './store';
import './registerServiceWorker';

Vue.config.productionTip = false;


document.addEventListener('DOMContentLoaded', () => {
  new Vue({
    router,
    store,
    render: h => h(App),
  }).$mount('#app');
});
