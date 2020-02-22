import Vue from 'vue';
import Vuex from 'vuex';
// import Vpress from 'vpress-vue';
import App from './App.vue';
import router from './router';
import store from './store/store';
import './registerServiceWorker';
import vuetify from './plugins/vuetify';
// import 'vpress-vue/dist/css/main.css';
Vue.config.productionTip = false;
Vue.use(Vuex);
// Vue.use(Vpress);

Vue.config.productionTip = false;

document.addEventListener('DOMContentLoaded', () => {
  new Vue({
    router,
    store,
    vuetify,
    render: h => h(App),
  }).$mount('#app');
});
