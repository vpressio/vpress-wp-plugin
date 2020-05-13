<template>
  <v-app-bar dense flat class="gradient v-step-0 v-step-3" :style="cssProps" max-height="40">
      <v-img
        :src="appBarLogo"
        class="ml-5 vpress-image logo-margin"
        :max-width="`${this.cssProps['--logo-width']}px`"
        alt="Vpress logo"
      />
  </v-app-bar>
</template>
<script>
export default {
  name: 'VpressAppBar',
  computed: {
    cssProps() {
      return {
        '--logo':this.$vuetify.theme.themes.light.logo.file_name,
        '--logo-width': this.$vuetify.theme.themes.light.logo.width,
        '--bg-linear-gradient': this.$vuetify.theme.themes.light.gradient.bg
      }
    },
    appBarLogo(){
      return require(`../assets/images/${this.cssProps['--logo']}`)
    }
  }
};
</script>
<style lang="scss">
.gradient {
  background: var(--bg-linear-gradient);
}
.logo-margin {
  margin: 0 0 10px 30px !important;
}
</style>