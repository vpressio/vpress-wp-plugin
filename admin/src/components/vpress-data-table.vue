<template>
  <v-container
    :class="{'data-table--container':$vuetify.breakpoint.xlOnly}"
  >
    <v-data-table
      v-if="dataOrigin === 'api'"
      :headers="headers"
      :items="items"
      :item-key="headers[0] ? headers[0].value : ''"
      :options.sync="options"
      :server-items-length="total"
      :loading="loading"
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
    <v-data-table
      v-else
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
  props: {
    dataOrigin: {
      type: String,
      required: true
    },
    dataset: {
      type: String,
      required: true
    },
    data: {
      type: Array,
      required: false,
      default: function () {
        return []
      }
    }
  },
  data() {
    return {
      loading: true,
      total: 0,
      headers: [],
      items: [],
      options: {}
    }
  },
  watch: {
    dataOrigin(newval, oldval) {
      if (oldval == 'file') this.getDataFromApi()
    },
    data(val) {
      if (val.length > 0) this.headers = this.extractHeaders(this.data[0]);
    },
    options: {
      async handler () {
        await this.getDataFromApi()
      },
      deep: true,
    },
  },
  methods: {
    async getDataFromApi () {
      this.loading = true
      const { page, itemsPerPage } = this.options
      const obj = {
        page,
        dataset: this.dataset,
        itemsPerPage
      }
      const data = await this.$store.dispatch('data/GET_WP_DATASET_DATA', obj);
      this.items = data.data
      this.total = data.total
      this.headers = this.extractHeaders(this.items[0]);
      this.$store.dispatch('chartConfig/RESET_WSP');
      this.$store.dispatch('data/SAVE_DATA', { data: this.items, dataSetName: this.dataset, dataOrigin: this.dataOrigin});
      this.loading = false
    },
    extractHeaders(data) {
      return Object.keys(data).map(o => ({
        text: o,
        value: o,
        sortable: true
      }));
    }
  },
}
</script>

<style lang="scss" scoped>
.data-table--container {
  max-width: 1785px !important;
}
.table-title {
  align-items: center;
  display: inline-flex;
  width: 50%;
}
</style>
