<template>
  <v-container>
    <VpressSearchBar
      @onSearch="handleSearch"
      btnLabel="Nueva gráfica"
      btnRoute="/editor"
    />
    <v-row
      class="min-height-container"
      justify="center"
      align-content="center"
      v-show="loading"
    >
      <v-progress-circular
        :size="70"
        :width="7"
        color="primary"
        indeterminate
      />
    </v-row>
    <v-row
      class="min-height-container"
      v-show="!loading && items.length === 0"
      justify-center
    > 
      <v-col offset-md="3" offset-sm="3" offset-xs="2" md="6" sm="6" xs="10">
        <h1 class="initial-msg-title">Te damos la bienvenida a Vpress</h1>
        <span class="initial-msg">
          Aquí se mostrarán tus visualizaciones, una vez que se hayan creado.
        </span>
      </v-col>
    </v-row>
    <VpressPagination
      v-show="!loading && total > 0"
      :total="total"
      :perPage="perPage"
      @onPageChange="handlePageChange"
    >
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
            @onDeleted="getCharts"
          />
        </v-col>
      </v-row>
    </VpressPagination>
  </v-container>
</template>
<script>
import VpressChartCard from '@/components/vpress-chart-card.vue'
import VpressSearchBar from '@/components/vpress-search-bar.vue'
import VpressPagination from '@/components/vpress-paginator.vue'
import api from '../utils/axios'

export default {
  name: 'VpressChartList',
  components: {
    VpressChartCard,
    VpressSearchBar,
    VpressPagination
  },
  data: () => ({
    query: '',
    perPage: 6,
    page: 1,
    total: 1,
    loading: true,
    items: []
  }),
  mounted() {
    this.getCharts()
  },
  methods: {
    handlePageChange(page) {
      this.page = page
      this.getCharts()
    },
    handleSearch(query) {
      this.query = query
      this.getCharts()
    },
    async getCharts() {
      try {
        this.loading = true
        const obj = {
          page: this.page,
          itemsPerPage: this.perPage,
          q: this.query
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
      } catch (error) {
        console.error(error.message);
        this.loading = false
      }
    }
  }
}
</script>
<style scoped>
  .min-height-container {
    min-height: 450px;
  }
  .initial-msg-title {
    display: flex;
    justify-content: center;
    text-align: center;
  }

  .initial-msg {
    display: flex;
    justify-content: center;
    font-size: 1.2rem;
    text-align: center;
    color: #a19f9f;
  }
</style>
