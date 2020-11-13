<template>
  <v-container style="height:100%">
    <v-row class="search-bar-container">
      <v-col xs=6 sm=8 md=9 lg=10>
        <v-form
          class="list-search-bar"
          ref="form"
          @submit.prevent="getCharts"
          lazy-validation
        >
          <v-text-field
            name="search"
            label="Buscar por título, descripción o etiquetas"
            outlined
            clearable
            v-model="q"
            hide-details
            append-icon="mdi-magnify"
          ></v-text-field>
        </v-form>
      </v-col>
      <v-col xs=6 sm=4 md=3 lg=2>
        <v-btn class="new-viz-btn" depressed color="primary">
          Nueva Gráfica
        </v-btn>
      </v-col>
    </v-row>
    <v-row
      justify="center"
      align-content="center"
    >
      <v-progress-circular
        :size="70"
        :width="7"
        color="primary"
        indeterminate
      />
    </v-row>
    <v-row>
      <v-col
        v-for="item in items"
        :key="item.id"
        lg="4"
        md="6"
        sm="6"
        xs="12"
      >
        <vpress-chart-card
          :id="item.id"
          :dataset_id="item.dataset_id"
          :description="item.description"
          :permissions="item.permissions"
          :img_url="item.img_url"
          :updated="item.updated"
          :value="item.value"
          :tags="item.tags"
        />
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import VpressChartCard from '@/components/vpress-chart-card.vue'
import api from '../utils/axios'

export default {
  name: 'VpressChartList',
  components: {
    VpressChartCard,
  },
  data: () => ({
    q: null,
    total: 0,
    options: {},
    loading: true,
    items: []
  }),
  created() {
    this.getCharts()
  },
  methods: {
    async getCharts() {
      this.loading = true
      const { page, itemsPerPage } = this.options
      const obj = {
        page,
        itemsPerPage,
        q: this.q
      }
      const { data } = await api.chart.list(obj);
      data.data.forEach(element => {
        element.tags = element.tags
          ? element.tags.split(', ')
          : element.tags = []
      });
      this.items = data.data
      this.total = data.total
      this.loading = false
    }
  }
}
</script>
<style scoped>
  .search-bar-container {
    padding: 4% 0;
  }

  .new-viz-btn {
    height: 56px !important;
    width:100%;
    text-transform: capitalize;
  }

  .list-search-bar {
    background-color: #fff;
  }
  * >>> .list-search-bar
  > .v-input
  > .v-input__control{
    color: #CFCFCF;
  }
  * >>> .list-search-bar
  > .v-input
  > .v-input__control
  > .v-input__slot
  > .v-text-field__slot
  > .v-label{
    color: #a19f9f;
    font-weight : 300; 
  }
</style>
