import Vue from 'vue';
import App from './App.vue';
import './utils/LogRocket.js'
import {
  store,
  vuetify,
  useRouter,
  vpress
} from './plugins/index.js'

Vue.config.productionTip = false

document.addEventListener('DOMContentLoaded', () => {
  const [id, router] = useRouter()
  new Vue({
    router,
    store,
    vuetify,
    vpress,
    render: h => h(App),
  }).$mount(`#${id}`)
})
