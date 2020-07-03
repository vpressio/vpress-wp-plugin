import Vue from 'vue';
import Vuetify from 'vuetify/lib';
import vpressConfig from '../stc.config.json';
Vue.use(Vuetify);

export default new Vuetify({
  theme: {
    themes: vpressConfig.themes
  },  
});
