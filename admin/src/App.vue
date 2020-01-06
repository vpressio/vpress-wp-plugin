<template>
  <v-app>
    <v-app-bar
      app
      color="primary"
      dark
      absolute
    >
      <div class="d-flex align-center">
        <v-img
          alt="Vuetify Logo"
          class="shrink mr-2"
          contain
          src="https://cdn.vuetifyjs.com/images/logos/vuetify-logo-dark.png"
          transition="scale-transition"
          width="40"
        />

        <v-img
          alt="Vuetify Name"
          class="shrink mt-1 hidden-sm-and-down"
          contain
          min-width="100"
          src="https://cdn.vuetifyjs.com/images/logos/vuetify-name-dark.png"
          width="100"
        />
      </div>

      <v-spacer></v-spacer>

      <v-btn
        href="https://github.com/vuetifyjs/vuetify/releases/latest"
        target="_blank"
        text
      >
        <span class="mr-2">Latest Release</span>
        <v-icon>mdi-open-in-new</v-icon>
      </v-btn>
    </v-app-bar>

    <v-content>
      <router-view/>
    </v-content>
  </v-app>
</template>

<script>
import axios from 'axios';

export default {
  name: 'App',

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
