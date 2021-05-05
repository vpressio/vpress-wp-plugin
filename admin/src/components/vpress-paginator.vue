<template>
  <v-row>
    <v-col cols="12">
      <slot/>
      <v-divider/>
    </v-col>
    <v-col>
      <v-pagination
        v-model="page"
        :length="length"
        @input="handlePageChange"
      />
    </v-col>
  </v-row>
</template>
<script>
export default {
  name: 'VpressPagintation',
  props: {
    total: {
      type: Number,
      default: 1
    },
    perPage: {
      type: Number,
      default: 1
    }
  },
  data() {
    return {
      page: 1,
      length: 1
    }
  },
  watch: {
    total(newTotal) {
      this.length = Math.ceil(newTotal / this.perPage);
    }
  },
  methods: {
    handlePageChange() {
      this.$emit('onPageChange', this.page)
    }
  }
}
</script>