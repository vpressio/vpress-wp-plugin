<template>
  <v-row class="search-bar-container" :style="cssProps">
    <v-form
      class="list-search-bar"
      ref="form"
      @submit.prevent="search"
    >
      <v-text-field
        name="search"
        label="Buscar por título, descripción o etiquetas"
        variant="outlined"
        clearable
        @click:clear="clear"
        v-model="query"
        hide-details
        append-inner-icon="mdi-magnify"
      ></v-text-field>
    </v-form>
    <v-btn
      ref="link-button"
      class="new-viz-btn"
      variant="flat"
      color="primary"
      @click="$router.push(btnRoute)"
    >
      {{ btnLabel }}
    </v-btn>
  </v-row>
</template>
<script>
export default {
  name: 'VpressSeachBar',
  props: {
    btnLabel: {
      type: String,
    },
    btnRoute: {
      type: String
    }
  },
  emits: ['onSearch'],
  data() {
    return {
      query: '',
      btnWidth: 0
    }
  },
  mounted() {
    this.btnWidth = `${(this.$refs["link-button"].$el.offsetWidth + 21)}px`
  },
  computed: {
    cssProps() {
      return {
        '--buttonWidth': this.btnWidth
      }
    },
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
  .search-bar-container {
    padding: 2% 12px;
  }

  .new-viz-btn {
    height: 56px !important;
    text-transform: none;
    font-size: 0.8rem;
    margin-left: 20px;
  }

  .list-search-bar {
    background-color: #fff;
    width: calc(100% - var(--buttonWidth));

  }
  /* The decorative #CFCFCF text color below leaks into v3's outline
     (border = currentColor); pin the outline to the default border black
     so the 0.38 opacity lands at v2's #9E9E9E look. */
  .list-search-bar :deep(.v-field__outline) {
    color: #000;
  }
  * :deep(.list-search-bar
  > .v-input
  > .v-input__control){
    color: #CFCFCF;
  }
  * :deep(.list-search-bar
  > .v-input
  > .v-input__control
  > .v-input__slot
  > .v-text-field__slot
  > .v-label){
    color: #a19f9f;
    font-weight : 300;
  }
</style>
