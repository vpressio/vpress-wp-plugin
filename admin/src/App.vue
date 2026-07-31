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
  margin-left: -15px;
}

.v-input {
  /* WP-admin resets only — v3 fields size themselves via the input's
     min-height, so the old `min-height: unset` hack would collapse them. */
  input {
    border: none;
  }
  input:focus {
    border: none;
    box-shadow: none;
    outline: none;
  }
}

/* WP admin's forms.css pins input[type=text] to min-height:40px, out-ranking
   Vuetify's field sizing. Re-assert the Vuetify 3 rule with higher specificity. */
.v-application .v-field__input {
  min-height: max(
    var(--v-input-control-height, 56px),
    1.5rem + var(--v-field-input-padding-top) + var(--v-field-input-padding-bottom)
  );
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

.v-overlay__content {
  z-index: 9990 !important;
}

.v-overlay--active .v-card-title {
  cursor: grab;
}

.v-overlay--active .v-card-title:active {
  cursor: grabbing;
}
</style>
