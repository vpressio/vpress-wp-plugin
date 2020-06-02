<template>
  <div class="data-loader--container" :style="cssProps">
    <v-row class="ma-0">
      <v-toolbar full-width flat>
        <v-btn
          color="primary"
          :class="{selecteduploadMethod: uploadMethod === 'upload'}"
          class="uploadMethodButton"
          text
          @click="switchUploadMethod('upload')"
        >Sube tus datos</v-btn>
        <v-btn
          color="primary"
          :class="
            {
              selecteduploadMethod: uploadMethod === 'paste'
            }
          "
          class="uploadMethodButton"
          text
          @click="switchUploadMethod('paste')"
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
        lg="3"
        xl="2"
        class="pt-1 pb-0"
        v-for="(dataSet, dataSetIndex) in storageDataSets"
        :key="`STORAGE_${dataSetIndex}`"
        :class="{'v-step-1': dataSetIndex === 0}"
      >
        <v-card dark class color="primary" @click="selectStorageDataset(dataSet.name)">
          <v-card-title
            class="px-3 pt-3 pb-5"
            style="font-size:1rem;line-height:1"
          >{{ dataSet.name.replace(/\.[^/.]+$/, "") }}</v-card-title>
          <v-card-subtitle
            class="px-3 pb-3"
            style="line-height:1"
          >{{ `.${dataSet.name.split('.').pop()}` }}</v-card-subtitle>
        </v-card>
      </v-col>
      <v-col
        md="3"
        lg="3"
        xl="2"
        class="pt-1 pb-0"
        v-for="(dataSet, dataSetIndex) in WPDataSets"
        :key="`WP_${dataSetIndex}`"
        :class="{'v-step-1': dataSetIndex === 0}"
      >
        <v-card dark class color="primary" @click="selectWPDataset(dataSet.name)">
          <v-card-title
            class="px-3 pt-3 pb-5"
            style="font-size:1rem;line-height:1"
          >{{ dataSet.name }}</v-card-title>
          <v-card-subtitle
            class="px-3 pb-3"
            style="line-height:1"
          >{{ dataSet.size }}</v-card-subtitle>
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
            class="btn-datos float-right ml-1 px-5  v-step-2"
            @click="nextTab"
            rounded
          >
            Siguiente
            <v-icon class="ml-3 icon-arrow">
              mdi-arrow-right
            </v-icon>
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

export default {
  name: 'VpressDataLoader',
  components: {
    VpressFilepond,
    VpressDataTable
  },
  props: ['tabChange', 'tourFile'],
  data() {
    return {
      data: [],
      dataOrigin: '',
      dataSetName: '',
      errorMessage: '',
      files: [],
      headers: [],
      loading: false,
      pastedData: '',
      showTable: true,
      storageDataSets: [],
      storageDataSetsDir: '/stc',
      uploadMethod: 'upload',
      WPDataSets: []
    };
  },
  created() {
    this.getStorageDatasets();
    this.getWPDatasets();
    this.getUrlParams();
  },
  watch: {
    files(newFiles) {
      if (newFiles.length >= 1){
        this.dataSetName = this.files[0].file.name
        this.loadFile(this.files[0].file);
      } 
    },
    tourFile(newTourFile) {
      if (!newTourFile.error){
        this.dataSetName = newTourFile.fileName;
        this.storageDataSetsDir = newTourFile.fileDir;
        this.getStorageDatasets();
        this.loadFile(newTourFile.file)
        .then(() => this.saveData(this.data, this.dataSetName, this.dataOrigin));
      }
    }
  },
  computed: {
    cssProps() {
      return {
        '--primary': this.$vuetify.theme.themes.light.primary
      }
    }
  },
  methods: {
    async getUrlParams() {
      try {
        const self = this;
        if( this.$route.params.chartid ) {
          const document = await self.$store.dispatch(`chartConfig/GET_CHART_BY_ID`, this.$route.params.chartid );
          this.storageDataSetsDir = '/savedDatasets';
          const dataSetData = await this.selectStorageDataset(document.dataSet);
          await this.$store.dispatch('data/SAVE_DATA', { data: dataSetData, dataSetName: this.dataSetName });
          this.$emit('update:tabChange', 1);
        }
      } catch (error) {
        this.$router.push('/')
      }
    },
    async getStorageDatasets() {
      try {
        if (Object.keys(this.$route.query).includes('datasets')) {
          this.storageDataSetsDir = this.$route.query.datasets
        }
        const files  = await this.$store.dispatch('data/GET_DATASETS', this.storageDataSetsDir);
        if (files.items.length === 0) {
          throw new Error(`Sin coincidencias para ${this.storageDataSetsDir}`);
        }
        this.storageDataSets = files.items;
      } catch (error){
        this.$router.push('/')
      }
    },
    async selectStorageDataset(fileName) {
      try {
        const self = this;
        self.loading = true;
        self.dataSetName = fileName;
        const file = await this.$store.dispatch('data/GET_DATASET_BY_NAME', { dataSetDir: this.storageDataSetsDir, file: this.dataSetName })
        return await self.loadFile(file)
      } catch (error) {
        this.errorMessage = error.message;
      }
    },
    async getWPDatasets() {
      try {
        const dataSets = await this.$store.dispatch('data/GET_WP_DATASETS')
        this.WPDataSets = dataSets;
      } catch(error) {
        this.errorMessage = error.message;
      }
    },
    async selectWPDataset(dataSetName) {
      try {
        this.loading = true;
        this.dataOrigin = 'api'
        this.dataSetName = dataSetName;
        const data = await this.$store.dispatch('data/GET_WP_DATASET_DATA', dataSetName);
        this.data = data;
        this.headers = this.extractSampleHeaders(data[0]);
        this.loading = false;
      } catch(error) {
        this.errorMessage = error.message;
      }
    },
    async loadFile(file) {
      try {
        const self = this;
        self.dataOrigin = 'file'
        self.loading = true;
        const content = await this.$store.dispatch('data/READ_FILE', file);
        self.headers = self.extractSampleHeaders(content[0]);
          // eslint-disable-next-line
          self.data = content;
          setTimeout(() => {
            self.loading = false;
          }, 0);
        return content
      } catch (error) {
        self.loading = false;
        this.errorMessage = error.message;
      }
    },
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
      self.dataSetName = 'Dataset copiado';
    },
    extractSampleHeaders(dataSample) {
      return Object.keys(dataSample).map(o => ({
        text: o,
        value: o,
        sortable: true
      }));
    },
    cleanComponentData() {
      this.data = [];
      this.headers = [];
      this.files = [];
      this.$store.dispatch('data/SAVE_DATA', { data: [], dataSetName: '', dataOrigin:'' });
    },
    nextTab() {
      this.$emit('update:tabChange', 1);
      this.saveData(this.data, this.dataSetName, this.dataOrigin);
    },
    saveData(data, dataSetName, dataOrigin) {
      this.$store.dispatch('chartConfig/RESET_CHART_VALUES');
      this.$store.dispatch('data/SAVE_DATA', { data: data, dataSetName: dataSetName, dataOrigin: dataOrigin});
    },
    switchUploadMethod(method) {
      this.uploadMethod = method;
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
  border-bottom: solid 3px var(--primary) !important;
  border-radius: 0px;
  color: var(--primary) !important;
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
  color: var(--primary) !important;
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
