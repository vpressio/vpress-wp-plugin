import Vue from 'vue';
import Vuex from 'vuex';
// eslint-disable-next-line import/no-extraneous-dependencies
import Vpress from 'vpress-vue';
import App from './App.vue';
import router from './router';
import store from './store';
import './registerServiceWorker';
import vuetify from './plugins/vuetify';
// eslint-disable-next-line import/no-extraneous-dependencies
import 'vpress-vue/dist/css/main.css';
Vue.config.productionTip = false;
Vue.use(Vuex);
Vue.use(Vpress);

Vue.config.productionTip = false;

document.addEventListener('DOMContentLoaded', () => {
  new Vue({
    router,
    store,
    vuetify,
    render: h => h(App),
  }).$mount('#app');
});
