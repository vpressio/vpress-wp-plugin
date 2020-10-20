<template>
  <v-container
    :class="{'data-table--container':$vuetify.breakpoint.xlOnly}"
  >
    <v-row>
      <v-col cols="12">
        <v-data-table
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
              <td
                class="eltd"
                v-for="header in props.headers"
                :key="header.value"
              >
                {{ props.item[header.value] }}
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import api from '../utils/axios'

export default {
  name:'VpressDataTable',
  props: {
    dataset: {
      type: Object,
    }
  },
  data() {
    return {
      loading: false,
      total: 0,
      headers: [],
      items: [],
      options: {},
    }
  },
  created(){
    if(this.dataset){
      this.getDataFromApi()
    }
  },
  watch:{
    dataset() {
      this.getDataFromApi()
    }
  },
  methods: {
    async getDataFromApi () {
      try {
        this.loading = true
        this.items = []
        this.total = 0
        this.headers = []
        const { page, itemsPerPage } = this.options
        if(this.dataset) {
          const obj = {
            page,
            dataset: this.dataset.slug,
            itemsPerPage
          }
          const response = await api.dataset.data(obj);
          const data = response.data
          this.items = data.data
          this.total = data.total
          this.headers = this.extractHeaders(this.items[0]);
        }
          this.loading = false
      } catch (error) {
        this.loading = false
        throw new Error(error.message)
      }
    },
    extractHeaders(data) {
      return Object
        .keys(data)
        .map(o => ({
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
