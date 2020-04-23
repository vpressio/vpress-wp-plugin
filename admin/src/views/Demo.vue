<template>
<div>
  <div class="beta-banner-container">
    <img class="beta-banner" src="../assets/images/vpress-beta.png" alt="beta">
  </div>
  <Vpress/>
</div>
</template>
<script>
import Vpress from '../components/vpress.vue';

export default {
  name: 'Demo',
  components: {
    Vpress
  },
};
</script>
<style lang="scss" scoped>
.beta-banner-container {
  position: absolute;
  z-index: 3;
  margin-left: calc(100vw - 100px);
  display: flex;
  justify-content: flex-end;
}

.beta-banner {
  width: 100px
}

</style>
