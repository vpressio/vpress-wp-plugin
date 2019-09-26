<template>
  <v-app>
    <v-app-bar app absolute>
      <v-toolbar-title class="headline text-uppercase">
        <span>Vuetify</span>
        <span class="font-weight-light">MATERIAL DESIGN</span>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn
        text
        href="https://github.com/vuetifyjs/vuetify/releases/latest"
        target="_blank"
      >
        <span class="mr-2">Latest Release</span>
      </v-btn>
    </v-app-bar>

    <v-content>
      <HelloWorld/>
    </v-content>
  </v-app>
</template>

<script>
import HelloWorld from './components/HelloWorld.vue';

const axios = require('axios');

export default {
  name: 'App',
  components: {
    HelloWorld,
  },
  data: () => ({
    //
  }),
  mounted: () => {
    console.log('Alecs', window.wpApiSettings.nonce);
    axios.get('http://localhost:8888/kellogg-mexico-wp/wp-json/wp/v2/posts').then((response) => {
      console.log(response);
    });
    /* axios({
      method: 'post',
      headers: { 'X-WP-Nonce': window.wpApiSettings.nonce },
      url: 'http://localhost:8888/kellogg-mexico-wp/wp-json/wp/v2/posts',
      data: {
        title: 'test',
      },
    }).then((response) => {
      console.log(response);
    }).catch((error) => {
      console.log(error);
    }); */
  },
};
</script>

<style scoped lang="scss">
.v-content{
  background:blue;
}
</style>
