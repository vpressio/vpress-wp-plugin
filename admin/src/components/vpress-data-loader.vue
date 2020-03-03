<template>
  <v-container fluid>
      <v-row>
        <v-toolbar full-width flat>
          <v-btn
            color="primary"
            :class="{selectedUploadType: uploadType === 1}"
            class="uploadTypeButton"
            text
            @click="reset(1)"
          >
            Sube tus datos
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
          <v-spacer/>
        </v-toolbar>
      </v-row>
      <v-row
        v-show="uploadType === 1"
        xs12
        class="mt-3"
      >
      <v-row class="ma-0">
        <v-col cols="12">
          <h4>
            DATOS DE PRUEBA
          </h4>
        </v-col>
        <v-col cols="3" class="mx-4" v-for="(dataSet, dataSetIndex) in testDatasets" :key="dataSetIndex">
          <v-btn
            
            color="primary"
            @click="selectTestDataset(dataSet.name)"
            :loading="dataSetName === dataSet.name  && loading"
          >
            {{ dataSet.name }}
          </v-btn>
        </v-col>
        </v-row>
        <v-col style="display:flex;" cols="12">
          <v-spacer/>
          <v-btn
            outlined
            rounded
            @click="cleanDataAndHeaders"
          >
            Limpiar
          </v-btn>
          <v-btn
            :disabled="data.length === 0"
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
        </v-col>
        <v-col cols="12" v-show="data.length === 0 && uploadType === 1">
          <FilePond
            v-model="loadedFile"
            ref="pond"
            accepted-file-types="
              text/dbf
              text/csv,
              application/vnd.ms-excel,
              application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
            "
          />
        </v-col>
        <v-col cols="12" v-show="data.length !== 0">
          <VpressDataTable
            :dataText="dataText"
            :headers="headers"
            :data="data"
          />
        </v-col>
      </v-row>
      <v-row
        v-show="uploadType === 2"
        xs12
        class="mt-3"
      >
        <v-col v-show="data.length === 0">
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
        </v-col>
        <v-col v-show="data.length !== 0">
          <v-row>
            <v-spacer/>
            <v-btn
              outlined
              rounded
              @click="cleanDataAndHeaders"
            >
              Limpiar
            </v-btn>
            <v-btn
              :disabled="data.length === 0"
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
          </v-row>
          <v-row>
            <VpressDataTable
              :dataText="dataText"
              :headers="headers"
              :data="data"
            />
          </v-row>
        </v-col>
      </v-row>
      <v-row v-show="loading" xs12>
        <v-progress-linear
          indeterminate
          color="primary"
        />
      </v-row>
  </v-container>
</template>
<script>
/* eslint-disable guard-for-in */
/* eslint-disable no-loop-func */
/* eslint-disable vue/valid-v-for */
/* eslint-disable no-restricted-syntax */
import VpressDataTable from './vpress-data-table';
import vueFilePond from 'vue-filepond'; // Import FilePond
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type/dist/filepond-plugin-file-validate-type.esm'; // Import plugins
import { FReader } from '../plugins/fileReader';
import { storage } from '../plugins/firebase';
import 'filepond/dist/filepond.min.css'; // Import styles

export default {
  name: 'VpressDataLoader',
  components: {
    // Create FilePond component
    FilePond: vueFilePond(FilePondPluginFileValidateType),
    VpressDataTable
  },
  props: ['tabChange'],
  data() {
    return {
      loading: false,
      dataSetName: '',
      showTable: true,
      uploadType: 1,
      headers: [],
      data: [],
      pastedData: '',
      loadedFile: [],
      testDatasets: []

    };
  },
  created() {
    storage
      .ref()
      .child('/testDatasets')
      .listAll()
      .then(res =>{
        this.testDatasets = res.items;
      });
  },
  computed: {
    /** If data-table's data should be displayed in CSV text */
    dataText() {
      return FReader.JSONtoCSV(this.data);
    }
  },
  watch: {
    loadedFile(oldFileArray, newFileArray) {
      if (oldFileArray[0] !== newFileArray[0] && oldFileArray[0]) {
        this.loadFile();
      }
    },
    
  },
  methods: {
    /** Reset to empty values */
    reset(uploadType) {
      this.uploadType = uploadType;
    },
    cleanDataAndHeaders() {
      this.data = [];
      this.headers = [];
      this.$refs.pond.removeFile();
      this.$store.dispatch('data/set', this.data);
    },
    /**
     * Read spreadsheets file, parsed into JSON data
     * Set headers and data for data-table
     */
    loadFile(file) {
      const self = this;
      const files = file || self.$refs.pond.getFiles()[0].file;
      if (files['name'] && files['name'].indexOf('.csv') >= 0) {
        FReader.readCSV(files)
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
            self.loading = false
          }, 200);
        })
        .catch(error => {
          // eslint-disable-next-line
          self.loading = false
          console.error(error);
        });
      } else {
        FReader.readExcel(files)
          .then(content => {
            // eslint-disable-next-line
            self.loading = false
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
            self.loading = false
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
    async selectTestDataset(fileName) {
      const self = this;
      self.loading = true;
      self.dataSetName = fileName;
      storage
      .ref()
      .child(`/testDatasets/${fileName}`)
      .getDownloadURL()
      .then(DownloadURL => {
        fetch(DownloadURL)
          .then(file =>{
            file
              .blob()
              .then(res =>{
                self.loadFile(res)
                
              })
          });
      })
    }
  }
};
</script>
<style lang="scss" scoped>
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
