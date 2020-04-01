<template>
  <v-app-bar dense flat class="gradient" max-height="40">
    <v-img
      src="../assets/images/vpress.svg"
      class="ml-5 vpress-image logo-margin"
      max-width="100px"
      alt="Vpress logo"
    />
  </v-app-bar>
</template>
<script>
export default {
  name: 'VpressAppBar'
};
</script>
<style lang="scss">
.gradient {
  background: linear-gradient(
    45deg,
    rgba(42, 49, 125, 1) 0%,
    rgba(155, 51, 229, 1) 100%
  );
}
.logo-margin {
  margin: 0 0 10px 30px !important;
}
</style>