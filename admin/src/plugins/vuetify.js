import Vue from 'vue';
import Vuetify from 'vuetify/lib';
import '@mdi/font/css/materialdesignicons.css'
import vpressConfig from '../vpress.config.json';
Vue.use(Vuetify);

export default new Vuetify({
  theme: {
    themes: vpressConfig.themes
  },
});
