<template>
  <v-app-bar dense flat class="gradient v-step-0 v-step-3" :style="cssProps">
    <v-img
      :src="appBarLogo"
      class="ml-5 vpress-image logo-margin"
      :max-width="`${this.cssProps['--logo-width']}px`"
      alt="Vpress logo"
    />
    <span class="ml-10 grey--text">
      Selecciona
    </span>
    <v-menu attach=".v-main">
      <template v-slot:activator="{ on, attrs }">
        <v-btn
          color="white"
          dark
          v-bind="attrs"
          v-on="on"
          text
        >
          {{ currentRoute }}
          <v-icon right dark>mdi-menu-down</v-icon>
        </v-btn>
      </template>
      <v-list>
        <v-list-item
          v-for="(item, index) in items"
          :key="index"
          :to="item.path"
          link
        >
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </v-app-bar>
</template>
<script>
export default {
  name: 'VpressAppBar',
  data: () => ({
    items: [
      {
        title: 'Análisis',
        path: '/'
      },
      {
        title: 'Gráficas',
        path: '/chart/list'
      },
      {
        title: 'Bases de datos',
        path: '/dataset/list'
      },
    ],
  }),
  computed: {
    cssProps() {
      return {
        '--logo':this.$vuetify.theme.themes.light.logo.file_name,
        '--logo-width': this.$vuetify.theme.themes.light.logo.width,
        '--bg-linear-gradient': this.$vuetify.theme.themes.light.gradient.bg
      }
    },
    appBarLogo() {
      return require(`../assets/images/${this.cssProps['--logo']}`)
    },
    currentRoute() {
      let name = '';
      if (this.$route.path === '/' || this.$route.params.chartid) {
        name = 'Análisis';
      } else if (this.$route.path === '/chart/list') {
        name = 'Gráficas';
      } else if (this.$route.path === '/dataset/list') {
        name = 'Bases de datos';
      }
      return name;
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
