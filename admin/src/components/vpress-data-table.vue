<template>
  <div>
    <div class="px-9">
      <span class="text-h6">
        {{ this.dataset ? this.dataset.name : null}}
        <v-divider class="mb-5"/>
      </span>
    </div>
    <v-data-table-server
      :headers="headers"
      :items="items"
      :item-value="headers[0] ? headers[0].key : ''"
      :items-length="total"
      :loading="loading"
      class="elevation-0"
      :mobile-breakpoint="0"
      @update:options="updateOptions"
    >
      <template v-for="header in headers" v-slot:[`header.${header.key}`]="{ column }" :key="header.key">
        <div class="thead-container">
          <div class="header-text">
            {{ column.title }}
          </div>
          <v-spacer/>
          <v-menu
            location="left"
            :close-on-content-click="false"
          >
            <template v-slot:activator="{ props }">
              <v-btn
                v-bind="props"
                size="x-small"
                icon
              >
                <v-icon size="small">mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <v-list>
              <v-list-item @click="dialog = true; oldName = column.key">
                <v-list-item-title class="font-weight-regular">
                  Renombrar
                </v-list-item-title>
              </v-list-item>
              <v-list-group>
                <template v-slot:activator="{ props }">
                  <v-list-item v-bind="props">
                    <v-list-item-title class="font-weight-regular">
                      Cambiar tipo de dato
                    </v-list-item-title>
                  </v-list-item>
                </template>
                <v-list-item @click="changeDataTypeColumn(column.key, 'text')">
                  <v-list-item-title class="font-weight-regular pl-4">
                    String
                  </v-list-item-title>
                </v-list-item>
                <v-list-item @click="changeDataTypeColumn(column.key, 'int')">
                  <v-list-item-title class="font-weight-regular pl-4">
                    Number
                  </v-list-item-title>
                </v-list-item>
                <v-list-item @click="changeDataTypeColumn(column.key, 'date')">
                  <v-list-item-title class="font-weight-regular pl-4">
                    Date
                  </v-list-item-title>
                </v-list-item>
                <v-list-item @click="changeDataTypeColumn(column.key, 'boolean')">
                  <v-list-item-title class="font-weight-regular pl-4">
                    Boolean
                  </v-list-item-title>
                </v-list-item>
              </v-list-group>
              <v-list-item @click="deleteColumn(column)">
                <v-list-item-title class="font-weight-regular">
                  Eliminar columna
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </template>
      <template v-slot:item="{ item, columns }">
        <tr class="eltr">
          <td
            class="eltd"
            v-for="column in columns"
            :key="column.key"
          >
            {{ item[column.key] }}
          </td>
        </tr>
      </template>
    </v-data-table-server>
    <v-dialog
      v-model="dialog"
      max-width="500px"
    >
      <v-card>
        <v-card-title>
          <span class="text-h5">Renombrar</span>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="newName"
                  label="Nombre"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="blue-darken-1"
            variant="text"
            @click="dialog = false"
          >
            Cerrar
          </v-btn>
          <v-btn
            color="primary"
            @click="renameColumn"
          >
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script>
import { mapStores } from 'pinia'
import { useNotificationsStore } from '../store/index.js'
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
      dialog: false,
      loading: false,
      total: 0,
      headers: [],
      items: [],
      options: {},
      newName: null,
      oldName: null
    }
  },
  mounted() {
    if (this.dataset) this.getDataFromApi()
  },
  computed: {
    ...mapStores(useNotificationsStore)
  },
  watch: {
    dialog(val) {
      if (!val) {
        this.newName = null;
        this.oldName = null;
      }
    },
    dataset() {
      this.getDataFromApi()
    }
  },
  methods: {
    updateOptions(options) {
      this.options = options
      this.getDataFromApi()
    },
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
      return Object.keys(data).map(o => ({
        title: o,
        key: o,
        sortable: false
      }));
    },
    async renameColumn() {
      const obj = {
        dataset: this.dataset.slug,
        new: this.newName,
        old: this.oldName
      }
      await api.dataset.rename_column(obj);
      await this.getDataFromApi()
      this.dialog = false;
      this.notificationsStore.open({
        color: 'success',
        text: 'Columna renombrada con éxito'
      })
    },
    async changeDataTypeColumn(column, type) {
      const obj = {
        dataset: this.dataset.slug,
        column: column,
        type
      }
      await api.dataset.change_data_type_column(obj);
      await this.getDataFromApi()
      this.notificationsStore.open({
        color: 'success',
        text: 'Tipo de dato modificado con éxito'
      })
    },
    async deleteColumn(column) {
      const obj = {
        dataset: this.dataset.slug,
        column: column.key
      }
      await api.dataset.delete_column(obj);
      await this.getDataFromApi()
      this.notificationsStore.open({
        color: 'success',
        text: 'Columna eliminada con éxito'
      })
    },
  },
}
</script>
<style lang="scss" scoped>
.table-title {
  align-items: center;
  display: inline-flex;
  width: 50%;
}
:deep(.v-data-table__thead) {
  th {
    white-space: nowrap;
    border-bottom: solid  1.5px !important;
    background-color: #F3F3F3;
  }

}

.thead-container {
  display: flex;
  align-items: center;
}

.header-text {
  min-height: 60px;
  display: flex;
  align-items: center;
}

</style>
