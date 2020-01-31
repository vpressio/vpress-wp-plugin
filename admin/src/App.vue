<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png" />
    <div id="nav">
      <router-link to="/home">Home</router-link> | <router-link to="/test">Test</router-link> |
      <router-link to="/chart">Chart</router-link>
    </div>
    <router-view></router-view>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'app',
  mounted: () => {
    axios.get('http://localhost:8888/kellogg-mexico-wp/wp-json/wp/v2/posts').then(response => {});

    axios({
      method: 'post',
      headers: { 'X-WP-Nonce': window.wpApiSettings.nonce },
      url: 'http://localhost:8888/kellogg-mexico-wp/wp-json/wp/v2/posts',
      data: {
        title: 'test'
      }
    })
      .then(response => {})
      .catch(error => {});
  }
};
</script>
<style lang="stylus">
#app
  font-family 'Avenir', Helvetica, Arial, sans-serif
  -webkit-font-smoothing antialiased
  -moz-osx-font-smoothing grayscale
  text-align center
  color #2c3e50
  margin-top 60px
</style>
