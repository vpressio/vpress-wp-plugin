<template>
  <v-container>
    <VpressSearchBar
      @onSearch="handleSearch"
      btnLabel="Nueva base de datos"
      btnRoute="/data?upload=1"
    />
    <v-row v-show="loading" class="min-height-container" justify="center" align-content="center">
      <v-progress-circular :size="70" :width="7" color="primary" indeterminate />
    </v-row>
    <v-row class="min-height-container" v-show="!loading && total === 0" justify-center>
      <v-col offset-md="3" offset-sm="3" offset-xs="2" md="6" sm="6" xs="10">
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
      <VpressDatasetPanel :items="items" @on-dataset-delete="getDatasets" />
    </VpressPaginator>
  </v-container>
</template>
<script>
import VpressDatasetPanel from '../components/vpress-dataset-panel.vue';
import VpressSearchBar from '../components/vpress-search-bar.vue';
import VpressPaginator from '../components/vpress-paginator.vue';
import api from '../utils/axios';

export default {
  name: 'VpressDatasetList',
  components: {
    VpressDatasetPanel,
    VpressSearchBar,
    VpressPaginator
  },
  data: () => ({
    query: '',
    perPage: 12,
    page: 1,
    total: 0,
    loading: false,
    items: [],
    dialogConfirmDeletion: false,
    totalDelete: 0,
    itemToDelete: null
  }),
  mounted() {
    this.getDatasets();
  },
  methods: {
    handlePageChange(page) {
      this.page = page;
      this.getDatasets();
    },
    handleSearch(query) {
      this.query = query;
      this.getDatasets();
    },
    async getDatasets() {
      this.loading = true;
      let hueDatasets = null;
      const obj = {
        page: this.page,
        itemsPerPage: this.perPage,
        q: this.query
      };
      try {
        hueDatasets = await api.dataset.listHue(obj);
      } catch (error) {
        hueDatasets = {
          data: []
        };
      }
      try {
        const { data } = await api.dataset.list(obj);
        data.data.forEach(element => {
          element.tag = element.tag ? element.tag.split(', ') : (element.tag = []);
        });
        const allDatasets = data.data.concat(hueDatasets.data);
        this.items = allDatasets;
        this.total = data.total;
        this.loading = false;
      } catch (error) {
        this.$store.dispatch('notifications/open', {
          color: 'error',
          text: 'Hubo un error al intentar obtener el dataset'
        });
        this.loading = false;
      }
    }
  }
};
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
