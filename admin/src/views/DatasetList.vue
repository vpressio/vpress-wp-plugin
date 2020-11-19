<template>
  <v-container>
    <VpressSearchBar
      @onSearch="handleSearch"
      btnLabel="Nueva Base de datos"
      btnRoute="/editor"
    />
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
      justify-center
    > 
      <v-col offset-md="3" offset-sm="3" offset-xs="2" md="6" sm="6" xs="10">
        <h1 class="initial-msg-title">Te damos la bienvenida a Vpress</h1>
        <span class="initial-msg">
          Aquí se mostrarán tus bases de datos, una vez que se hayan creado.
        </span>
      </v-col>
    </v-row>
    <VpressPaginator
      v-show="!loading && total > 0"
      :total="total"
      :perPage="perPage"
      @onPageChange="handlePageChange"
    >
      <VpressDatasetPanel
        :items="items"
      />
    </VpressPaginator>
    <!-- <v-dialog v-model="dialog" max-width="500px" scrollable>
      <v-card>
        <v-toolbar dark flat color="primary">
          <v-toolbar-title>{{ formTitle }}</v-toolbar-title>
          <v-spacer/>
          <v-btn icon dark @click="close">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-divider></v-divider>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                <v-text-field v-model="editedItem.name" label="Nombre"></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="editedItem.description"
                  rows="2"
                  auto-grow
                  label="Descripción"
                ></v-textarea>
              </v-col>
              <v-col cols="12">
                <v-combobox
                  v-model="editedItem.tag"
                  label="Etiquetas"
                  multiple
                  chips
                  deletable-chips
                ></v-combobox>
              </v-col>
              <v-col cols="12">
                <v-text-field v-model="editedItem.source" label="Fuente"/>
              </v-col>
              <v-col cols="12">
                <v-select
                  v-model="editedItem.permissions"
                  :items="[
                    { value: 'public', text: 'Público' },
                    { value: 'private', text: 'Privado' },
                  ]"
                  label="Permisos"
                ></v-select>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-divider/>
        <v-card-actions>
          <v-spacer/>
          <v-btn color="primary" text @click="close">Cancelar</v-btn>
          <v-btn color="primary" @click="save">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog> -->
  </v-container>
</template>
<script>
import VpressDatasetPanel from '../components/vpress-dataset-panel.vue'
import VpressSearchBar from '../components/vpress-search-bar.vue'
import VpressPaginator from '../components/vpress-paginator.vue'
import api from '../utils/axios'

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
    loading: true,
    items: [],
    dialogConfirmDeletion: false,
    totalDelete: 0,
    itemToDelete: null
  }),
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
    },
    closeDialogConfirmDeletion() {
      this.dialogConfirmDeletion = false
    },
    async confirmDeletion(item) {
      this.itemToDelete = item
      const { data } = await api.dataset.charts(parseInt(this.itemToDelete.id));
      this.totalDelete = data.total
      this.dialogConfirmDeletion = true
    },
    async deleteItem () {
      const response = await api.dataset.delete({ data: { id: parseInt(this.itemToDelete.id) }});
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      this.$store.dispatch('notifications/open', {
        color: 'success',
        text: 'Base de datos eliminada con éxito'
      })
      this.totalDelete = 0
      this.itemToDelete = null
      this.dialogConfirmDeletion = false
    }
  }
}
</script>
<style lang="scss" scoped>
.min-height-container {
  min-height: 450px;
}

.initial-msg {
  display: flex;
  justify-content: center;
  font-size: 1.2rem;
  text-align: center;
  color: #a19f9f;
}
</style>
