import { createApp } from 'vue';
import App from './App.vue';
import './utils/LogRocket.js';
import { pinia } from './store/index.js';
import vuetify from './plugins/vuetify.js';
import useRouter from './plugins/vueRouter.js';
import vpressPlugin from './plugins/vpress.js';

document.addEventListener('DOMContentLoaded', () => {
  const [id, router] = useRouter();
  const app = createApp(App);
  app.use(pinia);
  app.use(router);
  app.use(vuetify);
  app.use(vpressPlugin);
  app.mount(`#${id}`);
});
