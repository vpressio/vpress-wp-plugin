<template>
  <v-container fluid>
    <v-layout row justify-center align-center>
      <v-flex xs12>
        <v-toolbar full-width>
          <v-toolbar-title>Carga de datos</v-toolbar-title>
          <div class="flex-grow-1"></div>
          <template>
            <v-btn color="primary" class="mr-1" @click="reset(1)">
              Pega tus datos
            </v-btn>
            <v-btn color="primary" @click="reset(2)">Sube un archivo</v-btn>
          </template>
        </v-toolbar>
      </v-flex>
      <v-flex v-show="data.length === 0 && uploadType === 1" xs12 class="mt-3">
        <textarea
          id="excel_data"
          v-model="pastedData"
          name="excel_data"
          placeholder="Pega tus datos desde Excel"
          class="pl-4 pt-4"
        ></textarea>
        <v-btn
          :disabled="!pastedData"
          color="primary"
          class="float-right"
          @click="parsePastedData()"
        >
          Procesar
        </v-btn>
      </v-flex>
      <v-flex v-show="data.length === 0 && uploadType === 2" xs12 class="mt-3">
        <FilePond
          ref="pond"
          accepted-file-types="
            text/csv,
            application/vnd.ms-excel,
            application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
          "
        />
        <v-btn color="primary" class="float-right" @click="loadFile()">
          Procesar
        </v-btn>
      </v-flex>
      <v-flex v-show="loading" xs12>
        <v-progress-linear indeterminate color="primary"></v-progress-linear>
      </v-flex>
      <div style="height: 2em"></div>
      <v-flex>
        <div v-if="data.length > 0 && headers.length > 0" style="display: flex">
          <h3 class="table-title">
            Datos
          </h3>
          <v-text-field
            v-model="search"
            prepend-icon="mdi-magnify"
            label="Search"
            hide-details
            full-width
            style="width:50%; display: inline-flex"
          ></v-text-field>
        </div>
        <textarea
          v-if="data.length > 0 && headers.length > 0 && !showTable"
          v-model="dataText"
          name="parsedData"
          style="width: 100%; height: 370px"
        ></textarea>
        <v-data-table
          v-show="data.length > 0 && headers.length > 0"
          :headers="headers"
          :items="data"
          :item-key="headers[0] ? headers[0].value : ''"
          :search="search"
          class="elevation-1"
        >
          <template v-slot:item="props">
            <tr>
              <td v-for="header in props.headers" :key="header.value">
                <v-edit-dialog
                  :return-value.sync="props.item[header.value]"
                  large
                  persistent
                  @save="save"
                  @cancel="cancel"
                  @open="open"
                  @close="close"
                >
                  {{ props.item[header.value] }}
                  <template v-slot:input>
                    <v-text-field
                      v-model="props.item[header.value]"
                      label="Edit"
                      single-line
                      counter
                    ></v-text-field>
                  </template>
                </v-edit-dialog>
              </td>
            </tr>
          </template>
        </v-data-table>
        <v-snackbar v-model="snack" :timeout="3000" :color="snackColor">
          {{ snackText }}
          <v-btn text @click="snack = false">Close</v-btn>
        </v-snackbar>
        <v-spacer class="pd-2 ma-2"></v-spacer>
        <v-dialog v-model="dialogValidate" persistent max-width="400">
          <template v-slot:activator="{ on }">
            <v-btn v-show="data.length > 0" color="primary" class="float-right" v-on="on">
              <v-icon left>mdi-content-save</v-icon> Guardar
            </v-btn>
          </template>
          <v-card>
            <v-card-title class="headline">Validación</v-card-title>
            <v-card-text>
              Usted valida que los datos son correctos y serán guardados.
            </v-card-text>
            <v-card-actions>
              <div class="flex-grow-1"></div>
              <v-btn color="primary" text @click="dialogValidate = false">
                Cancelar
              </v-btn>
              <v-btn
                color="primary"
                text
                @click="
                  dialogValidate = false;
                  saveData();
                "
              >
                Aceptar
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-flex>
    </v-layout>
  </v-container>
</template>
<script>
/* eslint-disable guard-for-in */
/* eslint-disable no-loop-func */
/* eslint-disable vue/valid-v-for */
/* eslint-disable no-restricted-syntax */

import vueFilePond from 'vue-filepond'; // Import FilePond
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type/dist/filepond-plugin-file-validate-type.esm'; // Import plugins
import { FReader } from '../plugins/fileReader';
import 'filepond/dist/filepond.min.css'; // Import styles

export default {
  name: 'LoadData',
  components: {
    // Create FilePond component
    FilePond: vueFilePond(FilePondPluginFileValidateType)
  },
  data() {
    return {
      dialogValidate: false,
      loading: false,
      showTable: true,
      uploadType: 1,
      search: '',
      selected: [],
      empty: [],
      headers: [],
      data: [],
      pastedData: '',
      snack: false,
      snackColor: '',
      snackText: ''
    };
  },
  computed: {
    /** If data-table's data should be displayed in CSV text */
    dataText() {
      return FReader.JSONtoCSV(this.data);
    }
  },
  mounted() {},
  methods: {
    /** Reset to empty values */
    reset(uploadType) {
      this.uploadType = uploadType;
      this.data = [];
      this.headers = [];
      this.$refs.pond.removeFile();
    },
    /**
     * Read spreadsheets file, parsed into JSON data
     * Set headers and data for data-table
     */
    loadFile() {
      const self = this;
      const files = this.$refs.pond.getFiles();
      // eslint-disable-next-line
      FReader.readExcel(files[0].file)
        .then(content => {
          // eslint-disable-next-line
          self.headers = Object.keys(content[0]).map(o => ({
            text: o,
            value: o,
            sortable: true
          }));
          // eslint-disable-next-line
          setTimeout(() => {
            self.data = content;
          }, 200);
        })
        .catch(error => {
          // eslint-disable-next-line
          console.error(error);
        });
    },
    /**
     * Parse pasted data into JSON object array
     * Set headers and data for data-tables
     */
    parsePastedData() {
      const self = this;
      self.loading = true;
      self.data = [];
      self.headers = [];
      const data = self.pastedData;
      const rows = data.split('\n');
      let headers = [];
      for (const y in rows) {
        const cells = rows[y].split('\t');
        if (+y === 0) {
          /** First row, used for headers */
          headers = cells;
          /** Generate headers for data-table */
          self.headers = headers.map(o => ({
            text: o,
            value: o
              .toLowerCase()
              .split(' ')
              .join('_'),
            sortable: true
          }));
        } else {
          /** Parse pasted rows to JSON objects */
          const cellObj = cells.reduce((previousObject, currentValue, currentIndex) => {
            const key = headers[currentIndex]
              .toLowerCase()
              .split(' ')
              .join('_');
            const value = currentValue;
            return Object.assign(previousObject, {
              [key]: value
            });
          }, {});
          if (!self.data[0] || Object.keys(cellObj).length >= Object.keys(self.data[0]).length) {
            self.data.push(cellObj);
          }
        }
      }
      /** Reset pastedData */
      self.pastedData = '';
      self.loading = false;
    },
    saveData() {
      this.$store.dispatch('data/set', this.data);
    },
    save() {
      this.snack = true;
      this.snackColor = 'success';
      this.snackText = 'Data saved';
    },
    cancel() {
      this.snack = true;
      this.snackColor = 'error';
      this.snackText = 'Canceled';
    },
    open() {
      this.snack = true;
      this.snackColor = 'info';
      this.snackText = 'Dialog opened';
    },
    close() {
      console.log('Dialog closed');
    }
  }
};
</script>
<style lang="scss" scoped>
textarea {
  border: solid 2px #666;
  width: 100%;
  height: 200px;
}
.table-title {
  align-items: center;
  display: inline-flex;
  width: 50%;
}
@media (min-width: 1904px) {
  .container {
    max-width: 1264px;
  }
}
</style>
