<template>
<v-toolbar
  flat
  dense
  height="60px"
  color="#D9D9D9"
>
  <v-row>
    <v-col cols="9" class="px-5">
      <v-form
        @submit.prevent="search"
        lazy-validation
      >
        <v-text-field
          v-model="query"
          class="search-bar"
          hide-details
          outlined
          clearable
          placeholder="Buscar por título, descripción o etiquetas."
          append-icon="mdi-magnify"
          @click:clear="clear"
        >
        </v-text-field>
      </v-form>
    </v-col>
    </v-row>
  </v-toolbar>
</template>
<script>
export default {
  name: "VpressDataModuleSearch",
  data() {
    return {
      query: '',
    }
  },
  methods: {
    search() {
      this.$emit('onSearch', this.query)
    },
    clear() {
      this.query = ''
      this.$emit('onSearch', this.query)
    }
  }
}
</script>
<style scoped>
* >>> .search-bar
> .v-input__control
> .v-input__slot {
  min-height: 0px;
  padding: 0px;
  background-color: #FFF;
}
* >>> .search-bar
> .v-input__control
> .v-input__slot 
> .v-input__append-inner {
  margin: 5px 0 5px 0;
}
</style>