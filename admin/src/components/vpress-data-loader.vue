<template>
  <v-container>
    <v-layout row justify-center align-center>
      <v-flex xs12>
        <v-toolbar full-width flat>
          <v-btn
            color="primary"
            :class="{selectedUploadType: uploadType === 1}"
            class="uploadTypeButton"
            text
            @click="reset(1)"
          >
            Sube un archivo
          </v-btn>
          <v-btn
            color="primary"
            :class="{selectedUploadType: uploadType === 2}"
            class="uploadTypeButton"
            text
            @click="reset(2)"
          >
            Pega tus datos
          </v-btn>
          <v-btn
            color="primary"
            :class="{selectedUploadType: uploadType === 3}"
            class="uploadTypeButton"
            text
            @click="reset(3)"
          >
            Datos de prueba
          </v-btn>
          <v-spacer/>
          <v-btn
            v-show="data.length > 0"
            color="primary"
            class="float-right ml-1"
            @click="saveData()"
            rounded
          >
              Siguiente
            <v-icon class="ml-3">
              mdi-arrow-right
            </v-icon>
          </v-btn>
        </v-toolbar>
      </v-flex>
      <v-flex
        v-show="data.length === 0 && uploadType === 1"
        xs12
        class="mt-3"
      >
        <FilePond
          ref="pond"
          accepted-file-types="
            text/html,
            text/csv,
            application/vnd.ms-excel,
            application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
          "
        />
        <v-btn
          color="primary"
          class="float-right"
          @click="loadFile()"
        >
          Procesar
        </v-btn>
      </v-flex>
      <v-flex
        v-show="data.length === 0 && uploadType === 2"
        xs12
        class="mt-3"
      >
        <v-textarea
          id="excel_data"
          v-model="pastedData"
          name="excel_data"
          outlined
          placeholder="Pega tus datos desde Excel"
          class="pl-4 pt-4"
        ></v-textarea>
        <v-btn
          :disabled="!pastedData"
          color="primary"
          class="float-right"
          @click="parsePastedData()"
        >
          Procesar
        </v-btn>
      </v-flex>
      <v-flex
        v-show="data.length === 0 && uploadType === 3"
        style="width:100%"
      >
        <v-row class="ma-0">
          <v-col cols="3" class="pa-2">
            <v-card
              hover
              color="primary"
              dark
              class="pa-1"
              @click="selectTestDataset"
            >
              <v-card-title>
                Créditos
              </v-card-title>
              <v-card-text>
                Datos prueba
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-flex>
      <v-flex v-show="loading" xs12>
        <v-progress-linear
          indeterminate
          color="primary"
        />
      </v-flex>
      <v-flex>
        <div
          v-if="data.length > 0 && headers.length > 0"
          style="display: flex"
        >
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
            class="mb-5"
          ></v-text-field>
        </div>
        <v-textarea
          v-if="data.length > 0 && headers.length > 0 && !showTable"
          v-model="dataText"
          name="parsedData"
          outlined
          style="width: 100%; height: 370px"
        ></v-textarea>
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
        <v-snackbar
          v-model="snack"
          :timeout="3000"
          :color="snackColor"
        >
          {{ snackText }}
          <v-btn text @click="snack = false">
            Close
          </v-btn>
        </v-snackbar>
        <v-spacer class="pd-2 ma-2"></v-spacer>
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
  name: 'VpressDataLoader',
  components: {
    // Create FilePond component
    FilePond: vueFilePond(FilePondPluginFileValidateType)
  },
  props: ['tabChange'],
  data() {
    return {
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
    loadFile(file) {
      const self = this;
      const files = file || this.$refs.pond.getFiles()[0].file;
      // eslint-disable-next-line
      console.log(this.$refs.pond.getFiles())
      FReader.readExcel(files)
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
      this.$emit('update:tabChange', 1);
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
    close() {},
    async selectTestDataset() {
      let url = 'https://firebasestorage.googleapis.com/v0/b/vpress-def8f.appspot.com/o/peliculas.csv?alt=media&token=4c1e963c-4337-426b-b35c-b5e366ab86e3';
      let blob = await fetch(url).then(r => r.blob());
      this.loadFile(blob)
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

.selectedUploadType {
  border-bottom: solid 3px #382E82 !important;
  border-radius: 0px;
}

.uploadTypeButton {
  border-bottom: 3px solid transparent;
  padding: 0 !important;
  margin: 0 20px 0 0;
}

@media (min-width: 1904px) {
  .container {
    max-width: 1264px;
  }
}
</style>
