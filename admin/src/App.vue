<template>
  <v-app>
    <v-main>
      <router-view :key="$route.path"/>
    </v-main>
  </v-app>
</template>

<script>
export default {
  name: 'App'
};
</script>

<style lang="scss">
.v-application {
  margin-left: -20px;
}

.v-input {
  input {
    border: none;
    min-height: unset;
  }
  input:focus {
    border: none;
    box-shadow: none;
    outline: none;
  }
}

a:focus, textarea:focus {
  border: none;
  box-shadow: none;
  outline: none;
}

input.readonly,
input[readonly],
textarea.readonly,
textarea[readonly] {
  background-color: transparent;
}

@media (min-width: 1264px) {
  .container {
    max-width: calc(1185px - 160px) !important;
  }
}

@media (min-width: 1904px) {
  .container {
    max-width: calc(1785px - 160px) !important;
  }
}

.v-dialog__content {
  z-index: 9990 !important;
}

.v-dialog.v-dialog--active .v-card__title {
  cursor: grab;
}

.v-dialog.v-dialog--active .v-card__title:active {
  cursor: grabbing;
}
</style>
