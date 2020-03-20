<template>
  <div style="padding: 1% 3% 1% 3%">
      <v-row class="ma-0">
        <v-toolbar full-width flat>
          <v-btn
            color="primary"
            :class="{selectedUploadType: uploadType === 'upload'}"
            class="uploadTypeButton"
            text
            @click="changeUploadType('upload')"
          >
            Sube tus datos
          </v-btn>
          <v-btn
            color="primary"
            :class="{selectedUploadType: uploadType === 'paste'}"
            class="uploadTypeButton"
            text
            @click="changeUploadType('paste')"
          >
            Pega tus datos
          </v-btn>
          <v-spacer/>
        </v-toolbar>
      </v-row>
      <v-row class="ma-0" v-show="uploadType === 'upload'">
        <v-col class="py-0" cols="12">
          <h3>
            DATOS DE PRUEBA
          </h3>
        </v-col>
        <v-col
          cols="3"
          class="pt-1 pb-0"
          v-for="(dataSet, dataSetIndex) in testDatasets"
          :key="dataSetIndex"
        >
          <v-card
            dark
            class="mr-4 mb-2"
            color="primary"
            @click="selectTestDataset(dataSet.name)"
            :loading="dataSetName === dataSet.name  && loading"
          >
            <v-card-title class="px-3 pt-0 pb-3" style="font-size:1rem">
              Datos de prueba
            </v-card-title>
            <v-card-subtitle class="px-3 pb-2" style="line-height:1">
              {{ dataSet.name.replace(/\.[^/.]+$/, "") }}
            </v-card-subtitle>
          </v-card>
        </v-col>
      </v-row>
      <v-row
        xs12
        class="ma-0"
      >
        <v-col cols="12">
          <v-divider class="mb-4"/>
          <div class="dataTableContainer">
            <v-spacer/>
            <v-btn
              class="px-5"
              height="50"
              rounded
              outlined
              @click="cleanDataAndHeaders"
              :disabled="data.length === 0"
            >
              Limpiar
            </v-btn>
            <v-btn
              :disabled="data.length === 0"
              height="50"
              color="primary"
              class="float-right ml-1 px-5"
              @click="saveData()"
              rounded
            >
                Siguiente
              <v-icon class="ml-3">
                mdi-arrow-right
              </v-icon>
            </v-btn>
          </div>
        </v-col>
      </v-row>
      <v-row class="ma-0" v-if="data.length === 0 && uploadType === 'upload'">
        <v-col cols="12" >
          <VpressFilepond :file.sync="files"/>
        </v-col>
        <v-col>
          <v-progress-linear
            v-show="computedFile.length >= 1"
            indeterminate
            color="primary"
          />
        </v-col>
      </v-row>
      <v-row
        v-show="uploadType === 'paste' && data.length === 0"
        xs12
        class="ma-0"
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
            height="50"
            rounded
            :disabled="!pastedData"
            color="primary"
            class="px-5 float-right"
            @click="parsePastedData()"
          >
            Procesar
          </v-btn>
        </v-col>
      </v-row>
      <v-row class="ma-0" v-show="data.length !== 0">
        <v-col class="pa-0" cols="12">
          <VpressDataTable
            :dataText="dataText"
            :headers="headers"
            :data="data"
          />
        </v-col>
        <v-col>
          <v-progress-linear
            v-show="loading"
            indeterminate
            color="primary"
          />
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
      loading: false,
      dataSetName: '',
      showTable: true,
      uploadType: 'upload',
      headers: [],
      data: [],
      pastedData: '',
      testDatasets: [],
      dataSetDir: '/testDatasets',
      files: []
    };
  },
  created() {
    this.getDatasets();
  },
  computed: {
    /** If data-table's data should be displayed in CSV text */
    dataText() {
      return FReader.JSONtoCSV(this.data);
    },
    computedFile() {
      if(this.files.length >= 1){
        this.loadFile(this.files[0].file);
      }
      return this.files
    }
  },
  methods: {
    getDatasets() {
      this.dataSetDir = this.$route.query.datasets
        ? `/${this.$route.query.datasets}`
        : '/testDatasets';

      storage
        .ref()
        .child(this.dataSetDir)
        .listAll()
        .then(res => {
          if(res.items.length === 0) console.log(`Sin coincidencias para ${this.dataSetDir}`);
          this.testDatasets = res.items;
        })
        .catch( err => {
          console.error(err)
        })
    },
    /** Reset to empty values */
    changeUploadType(uploadType) {
      this.uploadType = uploadType;
    },
    cleanDataAndHeaders() {
      this.data= [];
      this.headers= [];
      this.files= []
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
      .child(`${this.dataSetDir}/${fileName}`)
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


.dataTableContainer{
  display:flex;
}

@media (min-width: 1904px) {
  .container {
    max-width: 1264px;
  }
}
</style>
