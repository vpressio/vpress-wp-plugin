<template>
  <v-app-bar dense flat class="gradient v-step-0 v-step-3" :style="cssProps">
    <v-img
      :src="appBarLogo"
      class="ml-5 vpress-image"
      :max-width="`${this.cssProps['--logo-width']}px`"
      alt="Vpress logo"
    />
    <v-img
      :src="require(`../assets/images/btn-beta.png`)"
      class="ml-1"
      max-width="35px"
      alt="Beta image"
    />
    <v-spacer></v-spacer>
    <v-btn
      v-for="(item, index) in items"
      :key="index"
      :to="item.path"
      text
      dark
      small
    >
      <v-icon left dark>
        {{ item.icon }}
      </v-icon>
      {{ item.title }}
    </v-btn>
  </v-app-bar>
</template>
<script>
export default {
  name: 'VpressAppBar',
  data: () => ({
    items: [
      {
        title: 'Análisis',
        path: '/',
        icon: 'mdi-table-search'
      },
      {
        title: 'Gráficas',
        path: '/chart/list',
        icon: 'mdi-chart-bar'
      },
      {
        title: 'Bases de datos',
        path: '/dataset/list',
        icon: 'mdi-database'
      },
    ],
  }),
  computed: {
    cssProps() {
      return {
        '--logo': this.$vuetify.theme.themes.light.logo.file_name,
        '--logo-width': this.$vuetify.theme.themes.light.logo.width,
        '--bg-linear-gradient': this.$vuetify.theme.themes.light.gradient.bg
      }
    },
    appBarLogo() {
      return require(`../assets/images/${this.cssProps['--logo']}`)
    }
  }
};
</script>
<style lang="scss">
.gradient {
  background: var(--bg-linear-gradient);
}
</style>
