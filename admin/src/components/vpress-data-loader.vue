<template>
  <div class="data-loader--container">
    <v-row class="ma-0">
      <v-toolbar full-width flat>
        <v-btn
          color="#b3aed1"
          :class="{selecteduploadMethod: uploadMethod === 'upload'}"
          class="uploadMethodButton"
          text
          @click="ChangeUploadDataMethod('upload')"
        >Sube tus datos</v-btn>
        <v-btn
          color="#b3aed1"
          :class="
            {
              selecteduploadMethod: uploadMethod === 'paste'
            }
          "
          class="uploadMethodButton"
          text
          @click="ChangeUploadDataMethod('paste')"
        >Pega tus datos</v-btn>
        <v-spacer />
      </v-toolbar>
    </v-row>
    <v-row v-show="uploadMethod === 'upload'" class="ma-0">
      <v-col class="py-0" cols="12">
        <h3 class="dato-prueba">DATOS DE PRUEBA</h3>
      </v-col>
      <v-col
        md="3"
        lg="2"
        class="pt-1 pb-0"
        v-for="(dataSet, dataSetIndex) in testDatasets"
        :key="dataSetIndex"
      >
        <v-card dark class color="primary" @click="selectTestDataset(dataSet.name)">
          <v-card-title
            class="px-3 pt-3 pb-5"
            style="font-size:1rem;line-height:0.8"
          >Datos de prueba</v-card-title>
          <v-card-subtitle
            class="px-3 pb-3"
            style="line-height:1"
          >{{ dataSet.name.replace(/\.[^/.]+$/, "") }}</v-card-subtitle>
        </v-card>
      </v-col>
    </v-row>
    <v-row xs12 class="ma-0">
      <v-col cols="12">
        <v-divider class="mb-4" />
        <div class="dataTableContainer">
          <v-spacer />
          <v-btn
            class="px-5 btn-datos-2"
            height="43"
            rounded
            outlined
            @click="cleanComponentData"
            :disabled="data.length === 0"
          >Limpiar</v-btn>
          <v-btn
            :disabled="data.length === 0"
            height="43"
            color="primary"
            class="btn-datos float-right ml-1 px-5"
            @click="saveData()"
            rounded
          >
            Siguiente
            <v-icon class="ml-3 icon-arrow">mdi-arrow-right</v-icon>
          </v-btn>
        </div>
      </v-col>
      <v-progress-linear class="mx-5 px-5" v-show="loading" indeterminate color="primary" />
    </v-row>
    <v-row v-if="data.length === 0 && uploadMethod === 'upload'" class="ma-0">
      <v-col>
        <VpressFilepond :file.sync="files" />
      </v-col>
    </v-row>
    <v-row v-show="uploadMethod === 'paste' && data.length === 0" class="ma-0">
      <v-col v-show="data.length === 0">
        <v-textarea
          class="pl-4 pt-4"
          id="excel_data"
          v-model="pastedData"
          name="excel_data"
          outlined
          placeholder="Pega tus datos desde Excel"
        ></v-textarea>
        <v-btn
          class="px-5 float-right"
          height="50"
          rounded
          :disabled="!pastedData"
          color="primary"
          @click="parsePastedData()"
        >Procesar</v-btn>
      </v-col>
    </v-row>
    <v-row v-show="data.length !== 0" class="ma-0">
      <v-col class="pa-0" cols="12">
        <VpressDataTable :headers="headers" :data="data" />
      </v-col>
    </v-row>
  </div>
</template>
<script>
import VpressFilepond from './vpress-filepond.vue';
import VpressDataTable from './vpress-data-table.vue';
import { FReader } from '../plugins/fileReader';
import { storage } from '../plugins/firebase';

export default {
  name: 'VpressDataLoader',
  components: {
    VpressFilepond,
    VpressDataTable
  },
  props: ['tabChange'],
  data() {
    return {
      dataSetDir: '/testDatasets',
      uploadMethod: 'upload',
      dataSetName: '',
      pastedData: '',
      showTable: true,
      loading: false,
      headers: [],
      data: [],
      testDatasets: [],
      files: []
    };
  },
  created() {
    this.getStorageDatasets();
  },
  watch: {
    files(newFiles) {
      if (newFiles.length >= 1) this.loadFile(this.files[0].file);
    }
  },
  methods: {
    getStorageDatasets() {
      this.dataSetDir = this.$route.query.datasets
        ? `/${this.$route.query.datasets}`
        : '/testDatasets';

      storage
        .ref()
        .child(this.dataSetDir)
        .listAll()
        .then(res => {
          if (res.items.length === 0)
            console.warn(`Sin coincidencias para ${this.dataSetDir}`);
          this.testDatasets = res.items;
        })
        .catch(err => {
          console.error(err);
        });
    },
    selectTestDataset(fileName) {
      const self = this;
      self.loading = true;
      self.dataSetName = fileName;
      storage
        .ref()
        .child(`${this.dataSetDir}/${fileName}`)
        .getDownloadURL()
        .then(DownloadURL => {
          fetch(DownloadURL).then(file => {
            file.blob().then(res => {
              self.loadFile(res);
            });
          });
        });
    },
    ChangeUploadDataMethod(method) {
      this.uploadMethod = method;
    },
    cleanComponentData() {
      this.data = [];
      this.headers = [];
      this.files = [];
      this.$store.dispatch('data/set', this.data);
    },
    /**
     * Read spreadsheets file, parsed into JSON data
     * Set headers and data for data-table
     */
    loadFile(file) {
      const self = this;
      self.loading = true;

      if (file.type === 'text/csv') {
        FReader.readCSV(file)
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
              self.loading = false;
            }, 0);
          })
          .catch(error => {
            // eslint-disable-next-line
            self.loading = false;
            console.error(error);
          });
      } else {
        FReader.readExcel(file)
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
              self.loading = false;
            }, 0);
          })
          .catch(error => {
            // eslint-disable-next-line
            self.loading = false;
            console.error(error);
          });
      }
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
          const cellObj = cells.reduce(
            (previousObject, currentValue, currentIndex) => {
              const key = headers[currentIndex]
                .toLowerCase()
                .split(' ')
                .join('_');
              const value = currentValue;
              return Object.assign(previousObject, {
                [key]: value
              });
            },
            {}
          );
          if (
            !self.data[0] ||
            Object.keys(cellObj).length >= Object.keys(self.data[0]).length
          ) {
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
    }
  }
};
</script>
<style lang="scss" scoped>
.data-loader--container {
  padding: 1% 3% 1% 3%;
}
.dato-prueba {
  font-size: 1rem;
  font-weight: 800;
  margin-top: 12px;
}

.selecteduploadMethod {
  border-bottom: solid 3px #382e82 !important;
  border-radius: 0px;
  color: #382e82 !important;
}

.uploadMethodButton {
  border-bottom: 3px solid transparent;
  padding: 0 !important;
  margin: 0 20px 0 0;
  font-size: 0.9rem;
  letter-spacing: 0.7px;
}

.dataTableContainer {
  display: flex;
}

.btn-datos {
  font-size: 1rem;
  text-transform: none;
}
.btn-datos-2 {
  font-size: 1rem;
  text-transform: none;
  color: #382e82 !important;
}

.icon-arrow {
  font-size: 20px;
}

@media (min-width: 1904px) {
  .container {
    max-width: 1264px;
  }
}
</style>
