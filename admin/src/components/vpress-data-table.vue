<template>
  <div>
    <div class="px-9">
      <span
        v-if="!editTitle"
        class="text-h6"
        @click.stop="toggleInput('editTitle', 'edit-title')"
        @mouseover="showIcon = true"
        @mouseleave="showIcon = false"
      >
        {{ this.dataset ? this.datasetName : '' }}
        <v-icon size="small" v-show="showIcon">mdi-pencil</v-icon>
      </span>
      <v-text-field
        ref="edit-title"
        v-show="editTitle"
        density="compact"
        variant="solo"
        flat
        v-model="datasetName"
        @keydown.enter.exact.prevent
        @keyup.enter.exact="save"
        @blur="save"
        @click.stop
      />
      <v-divider class="mb-5"/>
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
                variant="text"
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
      showIcon: false,
      editTitle: false,
      datasetName: '',
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
  computed: {
    ...mapStores(useNotificationsStore)
  },
  mounted() {
    if (this.dataset) {
      this.datasetName = `${this.dataset.name}`;
    }
  },
  watch: {
    dialog(val) {
      if (!val) {
        this.newName = null;
        this.oldName = null;
      }
    },
    dataset() {
      if (this.dataset) this.datasetName = `${this.dataset.name}`;
      this.getDataFromApi()
    }
  },
  methods: {
    async save() {
      try {
        this.editTitle = false;
        this.showIcon = false;
        const body = { ...this.dataset };
        body.name = this.datasetName;
        const response = await api.dataset.update(body);
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        this.notificationsStore.open({
          color: 'success',
          text: 'Base de datos actualizada con éxito'
        });
        this.loading = false;
      } catch (error) {
        this.loading = false;
        throw new Error(error.message);
      }
    },
    async toggleInput(field, element) {
      this[field] = true;
      await this.$nextTick();
      // Focus on the deepest node (input) of the vuetify element
      this.$refs[element].focus();
    },
    updateOptions(options) {
      this.options = options
      this.getDataFromApi()
    },
    async getDataFromApi () {
      try {
        this.loading = true
        this.items = []
        this.headers = []
        // NOTE: total is NOT zeroed here — :items-length="0" would make
        // Vuetify clamp the pager back to page 1 mid-request.
        const { page, itemsPerPage } = this.options
        if(this.dataset) {
          const obj = {
            page,
            dataset: this.dataset.slug,
            itemsPerPage,
            dataSource: this.dataset.source
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
