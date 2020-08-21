<template>
  <v-app>
    <v-main>
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
    </v-main>
  </v-app>
</template>

<script>
export default {
  name: 'App'
};
</script>

<style>
.v-input input {
  border: none;
}
</style>
