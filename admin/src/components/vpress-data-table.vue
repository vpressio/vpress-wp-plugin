<template>
  <v-container
  class="container--height"
    :class="{'data-table--container':$vuetify.breakpoint.xlOnly}"
  >
    <v-data-table
      v-show="data.length > 0 && headers.length > 0"
      :headers="headers"
      :items="data"
      :item-key="headers[0] ? headers[0].value : ''"
      class="elevation-1"
    >
      <template v-slot:item="props">
        <tr class="eltr">
          <td class="eltd" v-for="header in props.headers" :key="header.value">
            {{ props.item[header.value] }}
          </td>
        </tr>
      </template>
    </v-data-table>
  </v-container>
</template>
<script>
export default {
  name:'VpressDataTable',
  props: ['headers', 'data']
}
</script>
<style lang="scss" scoped>

.container--height {
  overflow: scroll;
  max-height: 400px
}

.data-table--container {
  max-width: 1785px !important;
}

.table-title {
  align-items: center;
  display: inline-flex;
  width: 50%;
}

</style>