<template>
  <div class="demo-container">
    <VpressAppBar/>
    <VpressConfig/>
  </div>
</template>
<script>
import VpressAppBar from '../components/vpress-app-bar.vue';
import VpressConfig from '../components/vpress-config.vue';

export default {
  name: 'Demo',
  components: {
    VpressConfig,
    VpressAppBar
  },
};
</script>
<style lang="scss">
.demo-container {
  border:solid;
  width:100%;
  height:100vh;
  flex-wrap:wrap;
}
</style>
