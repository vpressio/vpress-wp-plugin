import Vue from 'vue';
import Vuetify from 'vuetify/lib';

// import 'vuetify/dist/vuetify.min.css';

Vue.use(Vuetify);

export default new Vuetify({
  theme: {
    themes: {
      light: {
        primary: '#382E82',
        secondary: '#7972AC',
        error: '#EF5350'
      },
    }
  }
});
