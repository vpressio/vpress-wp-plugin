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
</style>
