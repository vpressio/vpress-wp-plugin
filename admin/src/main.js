import Vue from 'vue';
import Vuex from 'vuex';
import App from './App.vue';
import router from './router';
import store from './store/store';
import './registerServiceWorker';
import VueTour from 'vue-tour';
import vuetify from './plugins/vuetify';

require('vue-tour/dist/vue-tour.css')

Vue.config.productionTip = false;
Vue.use(Vuex);
Vue.use(VueTour)

document.addEventListener('DOMContentLoaded', () => {
  new Vue({
    router,
    store,
    vuetify,
    render: h => h(App),
  }).$mount('#app');
});
