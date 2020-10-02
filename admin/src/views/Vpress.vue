<template>
<div class="vpress-navigator">
  <div class="vpress-app-bar">
    <VpressAppBar/>
  </div>
  <v-card class="vpress-sidebar" tile flat color="#222A32">
    <v-card class="pa-2" tile height="50" color="#181D25" flat>
      <v-img src="../assets/images/logo.svg" />
    </v-card>
  </v-card>
  <div class='vpress-navigation-view'>
    <router-view :key="$route.path"/>
    <v-snackbar
      dark
      top
      right
      v-model="$store.state.notifications.show"
      :timeout="$store.state.notifications.timeout"
      :color="$store.state.notifications.color"
    >
      {{ $store.state.notifications.text }}
      <template v-slot:action="{ attrs }">
        <v-btn
          color="white"
          text
          v-bind="attrs"
          @click="snackbar = $store.dispatch('notifications/close')"
        >
          Cerrar
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</div>
</template>
<script>
import VpressAppBar from '../components/vpress-app-bar.vue';

export default {
  name: 'Vpress',
  components: {
    VpressAppBar
  },
}
</script>
<style lang="scss" scoped>
.vpress-navigator {
  display: grid;
  height:100%;
  grid-template-columns: 45px 1fr;
  grid-template-rows: 45px 1fr;
}

.vpress-app-bar {
  grid-area: 1/1/2/3;
}

.vpress-navigation-view {
  grid-area: 2/2;
}
.vpress-sidebar {
  grid-area: 2/1/2/2;
}
.beta-banner-container {
  position: absolute;
  z-index: 3;
  margin-left: calc(100% - 100px);
  display: flex;
  justify-content: flex-end;
}

.beta-banner {
  width: 100px
}

.v-input input {
  border: none;
}
.v-snack:not(.v-snack--absolute) {
  z-index: 99999 !important;
}
</style>
