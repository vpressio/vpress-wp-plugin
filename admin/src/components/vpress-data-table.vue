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
        <v-icon dense v-show="showIcon">mdi-pencil</v-icon>
      </span>
      <v-text-field
        ref="edit-title"
        v-show="editTitle"
        dense
        solo
        flat
        v-model="datasetName"
        @keydown.enter.exact.prevent
        @keyup.enter.exact="save"
        @blur="save"
        @click.stop
      />
      <v-divider class="mb-5" />
    </div>
    <v-data-table
      disable-sort
      calculate-widths
      :headers="headers"
      :items="items"
      :item-key="headers[0] ? headers[0].value : ''"
      :options.sync="options"
      :server-items-length="total"
      :loading="loading"
      class="elevation-0"
      :mobile-breakpoint="0"
    >
      <template v-slot:[`header.${header.value}`]="props" v-for="header in headers">
        <div :key="header.value" class="thead-container">
          <div class="header-text">
            {{ props.header.text }}
          </div>
          <v-spacer />
          <v-menu fixed left nudge-left="135" :close-on-content-click="false">
            <template v-slot:activator="{ on }">
              <v-btn v-on="on" x-small icon>
                <v-icon dense>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <v-list>
              <v-list-item
                @click="
                  dialog = true;
                  oldName = props.header.value;
                "
              >
                <v-list-item-title class="font-weight-regular">
                  Renombrar
                </v-list-item-title>
              </v-list-item>
              <v-list-group>
                <template v-slot:activator>
                  <v-list-item-title class="font-weight-regular">
                    Cambiar tipo de dato
                  </v-list-item-title>
                </template>
                <v-list-item @click="changeDataTypeColumn(props.header.value, 'text')">
                  <v-list-item-title class="font-weight-regular pl-4">
                    String
                  </v-list-item-title>
                </v-list-item>
                <v-list-item @click="changeDataTypeColumn(props.header.value, 'int')">
                  <v-list-item-title class="font-weight-regular pl-4">
                    Number
                  </v-list-item-title>
                </v-list-item>
                <v-list-item @click="changeDataTypeColumn(props.header.value, 'date')">
                  <v-list-item-title class="font-weight-regular pl-4">
                    Date
                  </v-list-item-title>
                </v-list-item>
                <v-list-item @click="changeDataTypeColumn(props.header.value, 'boolean')">
                  <v-list-item-title class="font-weight-regular pl-4">
                    Boolean
                  </v-list-item-title>
                </v-list-item>
              </v-list-group>
              <v-list-item @click="deleteColumn(props.header)">
                <v-list-item-title class="font-weight-regular">
                  Eliminar columna
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </template>
      <template v-slot:item="props">
        <tr class="eltr">
          <td class="eltd" v-for="header in props.headers" :key="header.value">
            {{ props.item[header.value] }}
          </td>
        </tr>
      </template>
    </v-data-table>
    <v-dialog v-model="dialog" max-width="500px">
      <v-card>
        <v-card-title>
          <span class="headline">Renombrar</span>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                <v-text-field v-model="newName" label="Nombre"></v-text-field>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="dialog = false">
            Cerrar
          </v-btn>
          <v-btn color="primary" @click="renameColumn">
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script>
import api from '../utils/axios';

export default {
  name: 'VpressDataTable',
  props: {
    dataset: {
      type: Object
    }
  },
  data() {
    return {
      showIcon: false,
      dialog: false,
      loading: false,
      editTitle: false,
      total: 0,
      headers: [],
      items: [],
      options: {},
      datasetName: '',
      newName: null,
      oldName: null
    };
  },
  mounted() {
    if (this.dataset) {
      this.datasetName = `${this.dataset.name}`;
      this.getDataFromApi();
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
      this.getDataFromApi();
    }
  },
  methods: {
    async save() {
      try {
        this.editTitle = false;
        this.showIcon = false;
        const body = { ...this.dataset };
        console.log(body);
        body.name = this.datasetName;
        console.log(body);
        const response = await api.dataset.update(body);
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        this.$store.dispatch('notifications/open', {
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
    async getDataFromApi() {
      try {
        this.loading = true;
        this.items = [];
        this.total = 0;
        this.headers = [];
        const { page, itemsPerPage } = this.options;
        if (this.dataset) {
          const obj = {
            page,
            dataset: this.dataset.slug,
            itemsPerPage,
            dataSource: this.dataset.source
          };
          const response = await api.dataset.data(obj);
          const data = response.data;
          this.items = data.data;
          this.total = data.total;
          this.headers = this.extractHeaders(this.items[0]);
        }
        this.loading = false;
      } catch (error) {
        this.loading = false;
        throw new Error(error.message);
      }
    },
    extractHeaders(data) {
      return Object.keys(data).map(o => ({
        text: o,
        value: o,
        sortable: true
      }));
    },
    async renameColumn() {
      const obj = {
        dataset: this.dataset.slug,
        new: this.newName,
        old: this.oldName
      };
      await api.dataset.rename_column(obj);
      await this.getDataFromApi();
      this.dialog = false;
      this.$store.dispatch('notifications/open', {
        color: 'success',
        text: 'Columna renombrada con éxito'
      });
    },
    async changeDataTypeColumn(column, type) {
      const obj = {
        dataset: this.dataset.slug,
        column: column,
        type
      };
      await api.dataset.change_data_type_column(obj);
      await this.getDataFromApi();
      this.$store.dispatch('notifications/open', {
        color: 'success',
        text: 'Tipo de dato modificado con éxito'
      });
    },
    async deleteColumn(column) {
      const obj = {
        dataset: this.dataset.slug,
        column: column.value
      };
      await api.dataset.delete_column(obj);
      await this.getDataFromApi();
      this.$store.dispatch('notifications/open', {
        color: 'success',
        text: 'Columna eliminada con éxito'
      });
    }
  }
};
</script>
<style lang="scss" scoped>
.table-title {
  align-items: center;
  display: inline-flex;
  width: 50%;
}
::v-deep .v-data-table-header {
  th {
    white-space: nowrap;
    border-bottom: solid 1.5px !important;
    background-color: #f3f3f3;
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
