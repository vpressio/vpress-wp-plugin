<template>
  <!-- v-toolbar, not v-app-bar: v3's app-bar is always viewport-fixed (layout
       system), which escapes the WP-admin container and hides under WP's bar. -->
  <v-toolbar density="compact" flat class="gradient v-step-0 v-step-3" :style="cssProps">
    <v-img
      :src="appBarLogo"
      class="ml-5 vpress-image"
      :max-width="`${cssProps['--logo-width']}px`"
      alt="Vpress logo"
    />
    <v-img
      :src="betaIcon"
      class="ml-1"
      max-width="35px"
      alt="Beta image"
    />
    <v-spacer/>
    <v-btn
      class="mx-2"
      v-for="(item, index) in items"
      :key="index"
      :to="item.path"
      variant="text"
      theme="dark"
      size="small"
    >
      <v-icon start theme="dark">
        {{ item.icon }}
      </v-icon>
      {{ item.title }}
    </v-btn>
  </v-toolbar>
</template>
<script>
import { imageUrl } from '../utils/assetUrl.js'
import vpressConfig from '../assets/vpress.theme.json'

export default {
  name: 'VpressAppBar',
  data: () => ({
    betaIcon: imageUrl('btn-beta.png'),
    items: [
      {
        title: 'Gráficas',
        path: '/',
        icon: 'mdi-chart-bar'
      },
      {
        title: 'Bases de datos',
        path: '/datasets',
        icon: 'mdi-database'
      },
    ],
  }),
  computed: {
    cssProps() {
      // Logo + gradient are vpress config, not Vuetify colors — in Vuetify 3
      // non-color theme entries are no longer smuggled through $vuetify.theme.
      return {
        '--logo': vpressConfig.themes.light.logo.file_name,
        '--logo-width': vpressConfig.themes.light.logo.width,
        '--bg-linear-gradient': vpressConfig.themes.light.gradient.bg
      }
    },
    appBarLogo() {
      return imageUrl(this.cssProps['--logo'])
    }
  }
};
</script>
<style lang="scss">
.gradient {
  background: var(--bg-linear-gradient);
}

/* v2 parity: active section renders as a light translucent pill (v3's default
   active overlay comes out dark on the gradient). */
.gradient .v-btn--active {
  background-color: rgba(255, 255, 255, 0.25);
}
.gradient .v-btn--active > .v-btn__overlay {
  opacity: 0;
}
</style>
