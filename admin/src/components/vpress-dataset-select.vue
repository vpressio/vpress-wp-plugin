<template>
  <v-row>
    <v-col cols="12">
      <VpressDataModuleSearch @onSearch="handleSearch"/>
      <h2 class="px-10 text-h5 font-weight-medium">
        Selecciona una base de datos para generar tus gráficas
      </h2>
      <v-row
          v-show="loading"
          class="min-height-container"
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
        <v-row
          class="min-height-container"
          v-show="!loading && total === 0"
          justify="center"
        >
          <v-col offset="2" offset-sm="3" offset-md="3" cols="10" sm="6" md="6">
            <h1 class="initial-msg-title">Vpress</h1>
            <span class="initial-msg">
              Parece que no hay nada aquí.
            </span>
          </v-col>
        </v-row>
      <VpressPaginator
        v-show="!loading && total > 0"
        :total="total"
        :perPage="perPage"
        @onPageChange="handlePageChange"
      >
        <v-card
          flat
          v-for="item in items"
          :key="item.id"
          @click="$emit('dataset', item)"
          class="px-10"
        >
          <VpressDatasetCard
            :dataset="item"
            cardColor="#FFF"
            @on-dataset-delete="$emit('on-dataset-delete')"
            readonly
          />
        </v-card>
      </VpressPaginator>
    </v-col>
  </v-row>
</template>
<script>
import { mapStores } from 'pinia'
import VpressPaginator from './vpress-paginator.vue'
import VpressDatasetCard from './vpress-dataset-card.vue'
import VpressDataModuleSearch from './vpress-data-module-search.vue'
import { useNotificationsStore } from '../store/index.js'
import api from '../utils/axios.js'

export default {
  name: 'VpressDatasetSelect',
  components: {
    VpressDatasetCard,
    VpressPaginator,
    VpressDataModuleSearch
  },
  emits: ['dataset', 'on-dataset-delete'],
  computed: {
    ...mapStores(useNotificationsStore)
  },
  data() {
    return {
      page: 1,
      perPage: 12,
      query: '',
      loading: false,
      total: 0,
      items: [],
    }
  },
  mounted() {
    this.getDatasets()
  },
  methods: {
    handlePageChange(page) {
      this.page = page
      this.getDatasets()
    },
    handleSearch(query) {
      this.query = query
      this.getDatasets()
    },
    async getDatasets() {
      this.loading = true
      let hueDatasets
      const obj = {
        page: this.page,
        itemsPerPage: this.perPage,
        q: this.query
      }
      try {
        hueDatasets = await api.dataset.listHue(obj)
      } catch (error) {
        hueDatasets = {
          data: []
        }
      }
      try {
        const { data } = await api.dataset.list(obj);
        data.data.forEach(element => {
          element.tag = element.tag
            ? element.tag.split(', ')
            : element.tag = []
        });
        const allDatasets = data.data.concat(hueDatasets.data)
        this.items = allDatasets
        this.total = data.total
        this.loading = false
      } catch (error) {
        this.notificationsStore.open({
          color: 'error',
          text: 'Hubo un error al intentar obtener el dataset'
        })
        this.loading = false
      }
    }
  }
}
</script>
<style lang="scss" scoped>
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
