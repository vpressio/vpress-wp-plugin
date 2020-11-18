<template>
  <v-container>
    <VpressSearchBar
      @onSearch="handleSearch"
      btnLabel="Nueva Base de datos"
      btnRoute="/editor"
    />
    <v-row v-show="loading" justify="center" align-content="center" style="height:300px;">
      <v-progress-circular
        :size="70"
        :width="7"
        color="primary"
        indeterminate
      />
    </v-row>
    <VpressPaginator
      :total="total"
      :perPage="perPage"
      @onPageChange="handlePageChange"
    >
      <v-data-table
        v-show="!loading"
        :headers="headers"
        :items="items"
        :options.sync="options"
        :server-items-length="total"
        :loading="loading"
        :expanded.sync="expanded"
        show-expand
        single-expand
        hide-default-header
      >
        <template v-slot:[`item.name`]="{ item }" >
          <div>
            <v-text-field
              solo
              flat
              dense
              hide-details
              :loading="loading"
              label="Agregar título"
              v-model.trim="item.name"
              background-color="transparent"
              @keyup.enter="editItem(item); save()"
            >
            </v-text-field>
            <v-textarea
              solo
              flat
              dense
              rows="2"
              no-resize
              single-line
              hide-details
              :loading="loading"
              label="Agregar descripción"
              v-model.trim="item.description"
              background-color="transparent"
              @keydown.enter.prevent=""
              @keyup.enter="editItem(item); save()"
            >
            </v-textarea>
          </div>
        </template>
        <template v-slot:[`item.permissions`]="{ item }">
          <p
            @click="editItem(item); editedItem.permissions === 'public' ? editedItem.permissions = 'private' : editedItem.permissions = 'public'; save()"
            class="link text-uppercase font-weight-bold"
            :class="{ 'green--text': item.permissions === 'public', 'red--text': item.permissions !== 'public' }"
          >
            {{ item.permissions }}
          </p>
        </template>
        <template v-slot:[`item.size`]="{ item }">
          {{ item.size }}
        </template>
        <template v-slot:[`item.rows`]="{ item }">
          ~{{ item.rows | intFromat }} filas
        </template>
        <template v-slot:[`item.tag`]="{ item }">
          <v-chip color="primary" small class="mr-1" v-for="t in item.tag" :key="t">
            {{ t }}
          </v-chip>
        </template>
        <template v-slot:[`item.actions`]="{ item }">
          <v-btn icon color="error" @click="confirmDeletion(item)">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </template>
        <template v-slot:no-data>
          <v-btn color="primary" @click="getDatasets">Reiniciar</v-btn>
        </template>
        <template v-slot:expanded-item="{ headers, item }">
          <td :colspan="headers.length">
            <v-container>
              <v-row>
                <v-col cols="4" sm="2">
                  <div class="subtitle-2 mb-2">
                    Base de datos
                  </div>
                  <v-btn
                    small
                    rounded
                    class="mt-12"
                    color="primary"
                    @click="setDataset(item)"
                  >
                    Ver datos
                  </v-btn>
                </v-col>
                <v-col cols="8" sm="10">
                  <div class="subtitle-2 mb-2">
                    Gráficas hechas con la base de datos
                  </div>
                  <v-slide-group
                    show-arrows
                  >
                    <v-slide-item
                      v-for="viz in datasetVizzes"
                      :key="viz.id"
                      center-active
                      v-slot:default="{}"
                    >
                      <v-card
                        outlined
                        class="justify-center"
                        style="border: none;"
                      >
                        <v-img
                          width="200px"
                          contain
                          color="#222A32"
                          :src="viz.img_url"
                        ></v-img>
                        <v-card-actions class="justify-center">
                          <v-btn
                            small
                            rounded
                            class="mt-2"
                            color="primary"
                            @click="loadViz(viz.id, viz.dataset_id)"
                          >
                            Entrar
                          </v-btn>
                        </v-card-actions>
                      </v-card>
                    </v-slide-item>
                  </v-slide-group>
                </v-col>
              </v-row>
            </v-container>
          </td>
        </template>
      </v-data-table>
    </VpressPaginator>
    <v-dialog v-model="dialog" max-width="500px" scrollable>
      <v-card>
        <v-toolbar dark flat color="primary">
          <v-toolbar-title>{{ formTitle }}</v-toolbar-title>
          <v-spacer></v-spacer>
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
    </v-dialog>
    <v-dialog v-model="dialogConfirmDeletion" max-width="500px" scrollable>
      <v-card>
        <v-toolbar dark flat color="primary">
          <v-toolbar-title>Confirmar eliminación</v-toolbar-title>
          <v-spacer/>
          <v-btn icon dark @click="closeDialogConfirmDeletion">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-divider/>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                ¿Está seguro de eliminar la base de datos? Se eliminarán <strong>{{ totalDelete }}</strong> gráficas
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-divider/>
        <v-card-actions>
          <v-spacer/>
          <v-btn color="primary" text @click="closeDialogConfirmDeletion">Cancelar</v-btn>
          <v-btn color="primary" @click="deleteItem">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
<script>
import VpressSearchBar from '../components/vpress-search-bar.vue'
import VpressPaginator from '../components/vpress-paginator.vue'
import api from '../utils/axios'
import { loaderMixin, editorMixin } from '../mixins/index.js'

export default {
  name: 'VpressDatasetList',
  mixins: [loaderMixin, editorMixin],
  components: {
    VpressSearchBar,
    VpressPaginator
  },
  data: () => ({
    options: {},
    query: '',
    perPage: 10,
    page: 1,
    total: 1,
    loading: true,
    items: [],
    expanded: [],
    dialog: false,
    dialogConfirmDeletion: false,
    headers: [
      { text: 'Nombre', value: 'name' },
      { text: 'Permisos', value: 'permissions' },
      { text: 'Tamaño', value: 'size' },
      { text: 'Total', value: 'rows' },
      { text: 'Etiquetas', value: 'tag' },
      { text: 'Actualizado', value: 'updated' },
      { text: 'Etiquetas', value: 'tags' },
      { text: 'Acciones', value: 'actions' },
    ],
    editedIndex: -1,
    editedItem: {
      name: null,
      description: null,
      tag: null,
      source: null,
      permissions: null
    },
    defaultItem: {
      name: null,
      description: null,
      tag: null,
      permissions: 'public'
    },
    datasetVizzes: [],
    totalDelete: 0,
    itemToDelete: null
  }),
  computed: {
    formTitle () {
      return this.editedIndex === -1 ? 'Agregar' : 'Editar'
    },
  },
  watch: {
    async expanded (val) {
      if (val && val.length > 0) {
        const { data } = await api.dataset.charts(val[0].id);
        this.datasetVizzes = data.data
      } else {
        this.datasetVizzes = []
      }
    },
  },
  mounted() {
    this.getDatasets()
  },
  methods: {
    async loadViz(id, dataset_id) {
      const viz = await api.chart.get(id)
      const dataset = await api.dataset.get(dataset_id)
      await this.loadSavedViz(viz.data.data, dataset.data.data)
      this.$router.push({ path: `/editor`, query: { tab: 1 } })
    },
    async selectDataset(dataset) {
      try {
        this.loading = true
        await this.editorInit(dataset)
        this.$router.push(
          {
            path: `/`,
            query: { dataset: dataset.id}}
          )
      } catch (error) {
        this.loading = false
      }
    },
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
    editItem (item) {
      this.editedIndex = this.items.indexOf(item)
      this.editedItem = Object.assign({}, item)
    },
    close () {
      this.dialog = false
      this.$nextTick(() => {
        this.editedItem = Object.assign({}, this.defaultItem)
        this.editedIndex = -1
      })
    },
    closeDialogConfirmDeletion() {
      this.dialogConfirmDeletion = false
    },
    async save () {
      if (this.editedIndex > -1) {
        try {
          Object.assign(this.items[this.editedIndex], this.editedItem)
          const response = await api.dataset.update({
            id: parseInt(this.editedItem.id),
            name: this.editedItem.name,
            description: this.editedItem.description,
            tag: this.editedItem.tag,
            source: this.editedItem.source,
            permissions: this.editedItem.permissions
          });
          if (response.data.error) {
            throw new Error(response.data.error);
          }
          this.$store.dispatch('notifications/open', {
            color: 'success',
            text: 'Base de datos actualizada con éxito'
          })
        } catch (error) {
          throw new Error(error.message)
        }
      } else {
        this.items.push(this.editedItem)
      }
      this.close()
    },
    async confirmDeletion(item) {
      this.itemToDelete = item
      const { data } = await api.dataset.charts(parseInt(this.itemToDelete.id));
      this.totalDelete = data.total
      this.dialogConfirmDeletion = true
    },
    async deleteItem () {
      const index = this.items.indexOf(this.itemToDelete)
      const response = await api.dataset.delete({ data: { id: parseInt(this.itemToDelete.id) }});
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      this.items.splice(index, 1)
      this.$store.dispatch('notifications/open', {
        color: 'success',
        text: 'Base de datos eliminada con éxito'
      })
      this.totalDelete = 0
      this.itemToDelete = null
      this.dialogConfirmDeletion = false
    },
    async setDataset (dataset) {
      try {
        await this.editorInit(dataset)
        this.$router.push('/dataset')
      } catch(error) {
        this.errorMessage = error.message;
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.link {
  cursor: pointer
}
a:hover {
  text-decoration: underline;
}
::v-deep.v-text-field > .v-input__control > .v-input__slot {
  padding-left: 0 !important;
  padding-right: 0 !important;
}
::v-deep.v-text-field .v-input__append-inner {
  display: none !important;
}
::v-deep.v-input input {
  background-color: transparent !important;
}
::v-deep.v-textarea textarea {
  line-height: normal;
  background-color: transparent !important;
}
</style>
