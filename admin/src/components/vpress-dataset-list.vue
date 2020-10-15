<template>
  <v-container>
    <v-form
      ref="form"
      @submit.prevent="getDatasets"
      lazy-validation
    >
      <v-row justify="space-between">
        <v-col>
          <v-text-field
            name="search"
            label="Buscar por nombre, descripción o etiquetas"
            solo
            clearable
            v-model="q"
            hide-details
            prepend-inner-icon="mdi-magnify"
          ></v-text-field>
        </v-col>
        <v-col class="shrink">
          <v-btn
            large
            color="primary"
            type="submit"
          >
            Buscar
          </v-btn>
        </v-col>
        <!-- <v-col class="shrink">
          <v-btn
            large
            color="primary"
            type="submit"
            @click="dialog = true"
          >
            Agregar
          </v-btn>
        </v-col> -->
      </v-row>
    </v-form>
    <v-divider class="my-6"></v-divider>
    <v-row v-show="loading" justify="center" align-content="center" style="height:300px;">
      <v-progress-circular
        :size="70"
        :width="7"
        color="primary"
        indeterminate
      />
    </v-row>
    <v-data-table
      v-show="!loading"
      :headers="headers"
      :items="items"
      :options.sync="options"
      :server-items-length="total"
      :loading="loading"
      hide-default-header
    >
      <template v-slot:item.name="{ item }" >
        <div style="cursor:pointer" @click="selectDataset(item)">
          <p class="text-subtitle-1 font-weight-medium mb-0">{{ item.name }}</p>
          <p class="text-subtitle-2 font-weight-regular mt-0">{{ item.description }}</p>
        </div>
      </template>
      <template v-slot:item.permissions="{ item }">
        <p
          class="text-uppercase"
          :class="{ 'green--text': item.permissions === 'public', 'red--text': item.permissions !== 'public' }"        >
          {{ item.permissions }}
        </p>
      </template>
      <template v-slot:item.size="{ item }">
        {{ item.size }}
      </template>
      <template v-slot:item.rows="{ item }">
        ~{{ intFromat(item.rows) }} filas
      </template>
      <template v-slot:item.tag="{ item }">
        <v-chip color="primary" small class="mr-1" v-for="t in item.tag" :key="t">
          {{ t }}
        </v-chip>
      </template>
      <template v-slot:item.actions="{ item }">
        <v-icon
          class="mr-2"
          @click="editItem(item)"
        >
          mdi-pencil
        </v-icon>
        <v-icon
          @click="deleteItem(item)"
        >
          mdi-delete
        </v-icon>
      </template>
      <template v-slot:no-data>
        <v-btn color="primary" @click="getDatasets">Reiniciar</v-btn>
      </template>
    </v-data-table>
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
                <v-text-field v-model="editedItem.source" label="Fuente"></v-text-field>
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
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="close">Cancelar</v-btn>
          <v-btn color="primary" @click="save">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
<script>
import api from '../helpers/axios'

export default {
  name: 'VpressDatasetList',
  data: () => ({
    q: null,
    total: 0,
    options: {},
    loading: true,
    items: [],
    dialog: false,
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
  }),
  computed: {
    formTitle () {
      return this.editedIndex === -1 ? 'Agregar' : 'Editar'
    },
  },
  watch: {
    options: {
      async handler () {
        await this.getDatasets()
      },
      deep: true,
    },
    dialog (val) {
      val || this.close()
    }
  },
  methods: {
    selectDataset(dataset) {
      try {
        this.loading = true
        this.$router.push(
          {
            path: `/`,
            query: { dataset: dataset.id}}
          )
      } catch (error) {
        this.loading = false
      }
    },
    async getDatasets() {
      try {
        this.loading = true
        const { page, itemsPerPage } = this.options
        const obj = {
          page,
          itemsPerPage,
          q: this.q
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

        this.loading = false
      }
    },
    intFromat(number) {
      return new Intl.NumberFormat().format(number)
    },
    editItem (item) {
      this.editedIndex = this.items.indexOf(item)
      this.editedItem = Object.assign({}, item)
      this.dialog = true
    },
    close () {
      this.dialog = false
      this.$nextTick(() => {
        this.editedItem = Object.assign({}, this.defaultItem)
        this.editedIndex = -1
      })
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
    async deleteItem (item) {
      const index = this.items.indexOf(item)
      if (confirm('¿Esta seguro de eliminar esta base de datos?')) {
        const response = await api.dataset.delete({ data: { id: parseInt(item.id) }});
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        this.items.splice(index, 1)
        this.$store.dispatch('notifications/open', {
          color: 'success',
          text: 'Base de datos eliminada con éxito'
        })
      }
    },
  }
}
</script>
