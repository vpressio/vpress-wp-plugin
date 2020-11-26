<template>
  <v-row>
    <v-col  cols="12">
      <VpressDataModuleSearch/>
      <h2 class="px-10 font-weight-medium">Selecciona una base de datos para generar tus gráficas</h2>
      <VpressPaginator>
        <v-card  flat
          v-for="(item, idx) in items"
          :key="idx"
          @click="$emit('dataset', item)"
          class="px-10"
        >
          <VpressDatasetCard
            :id="item.id"
            :permissions="item.permissions"
            :name="item.name"
            :slug="item.slug"
            :description="item.description"
            :tag="item.tag"
            :source="item.source"
            :size="item.size"
            :rows="item.rows"
            :updated="item.updated"
            cardColor="#FFF"
            @onDatasetDelete="$emit('on-dataset-delete')"
          />
        </v-card>
      </VpressPaginator>
    </v-col>
  </v-row>
</template>
<script>
import VpressPaginator from './vpress-paginator.vue'
import VpressDatasetCard from './vpress-dataset-card.vue'
import VpressDataModuleSearch from './vpress-data-module-search.vue'
import api from '../utils/axios.js'

export default {
  name: 'VpressDatasetSelect',
  components: {
    VpressDatasetCard,
    VpressPaginator,
    VpressDataModuleSearch
  },
  data() {
    return {
      page: 0,
      perPage: 12,
      query: '',
      loading: false,
      total: null,
      items: [],
    }
  },
  mounted() {
    this.getDatasets()
  },
  methods: {
    async getDatasets() {
      try {
        this.loading = true
        const obj = {
          page: this.page ,
          itemsPerPage: this.perPage,
          q: this.query
        }
        const { data } = await api.dataset.list(obj);
        data.data.forEach(element => {
          element.tag = element.tag
            ? element.tag.split(', ')
            : element.tag = []
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