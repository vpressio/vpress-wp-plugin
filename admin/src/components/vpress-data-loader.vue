<template>
  <div class="data-loader--container" :style="cssProps">
    <v-row class="ma-0">
      <v-toolbar full-width flat>
        <v-btn
          color="primary"
          :class="
            {
              selecteduploadMethod: uploadMethod === 'upload'
            }
          "
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
        <h3 class="dato-prueba">DATASETS</h3>
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
        <v-card dark class color="primary" @click="selectWPDataset(dataSet)">
          <v-card-title
            class="px-3 pt-3 pb-5"
            style="font-size:1rem;line-height:1"
          >{{ dataSet.name }}</v-card-title>
          <v-card-subtitle
            class="px-3 pb-3"
            style="line-height:1"
          >
            {{ dataSet.size }} | ~{{ intFromat(dataSet.rows) }} filas
          </v-card-subtitle>
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
            :disabled="data.length === 0 && datasetMeta.origin !== 'api'"
          >Limpiar</v-btn>
          <v-btn
            :disabled="data.length === 0 && datasetMeta.origin !== 'api'"
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
    <v-row v-if="uploadMethod === 'upload' && !datasetMeta.slug" class="ma-0">
      <v-col>
        <VpressFilepond :file.sync="files" />
      </v-col>
    </v-row>
    <v-row v-if="uploadMethod === 'paste' && !datasetMeta.slug" class="ma-0">
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
    <v-row v-if="datasetMeta.slug" class="ma-0">
      <v-col class="pa-0" cols="12">
        <VpressDataTable :datasetMeta="datasetMeta" :data="data"/>
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
      datasetMeta: {},
      errorMessage: '',
      files: [],
      headers: [],
      loading: false,
      pastedData: '',
      showTable: true,
      uploadMethod: 'upload',
      WPDataSets: []
    };
  },
  created() {
    this.getWPDatasets();
    this.getUrlParams();
  },
  watch: {
    files(newFiles) {
      if (Array.isArray(newFiles) && newFiles.length >= 1){
        this.datasetMeta.slug = this.files[0].file.name
        this.loadFile(this.files[0].file);
      } else {
        this.getWPDatasets();
      }
    },
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
        if( this.$route.params.chartid && this.$store.getters['data/datasetMeta'].slug) {
          this.datasetMeta = this.$store.getters['data/datasetMeta']
          this.nextTab()
        } else if (this.$route.params.chartid) {
          const payload = await this.$store.dispatch('chartConfig/SET_WP_CHART', this.$route.params.chartid)
          this.datasetMeta = payload.datasetMeta
          this.data = []
          this.nextTab()
        }
      } catch (error) {
        this.$router.push('/')
        throw new Error(error.message)
      }
    },
    async getWPDatasets() {
      try {
        const dataSets = await this.$store.dispatch(
          'data/GET_DATASET_LIST',
          { page: 1, itemsPerPage: 4 }
          )
        this.WPDataSets = dataSets.data;
      } catch(error) {
        this.errorMessage = error.message;
      }
    },
    async selectWPDataset(dataset) {
      try {
        this.data = []
        const info = await this.$store.dispatch(
          'data/GET_WP_DATASET_INFO',
          { id: dataset.id }
        )
        this.datasetMeta = {
          ...info,
          origin: 'api'
        }
      } catch(error) {
        this.errorMessage = error.message;
      }
    },
    async loadFile(file) {
      try {
        const self = this;
        self.datasetMeta.origin = 'file'
        self.loading = true;
        const content = await this.$store.dispatch('data/READ_FILE', file);
        self.headers = self.extractSampleHeaders(content[0]);
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
      self.datasetMeta.slug = 'Dataset copiado';
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
      this.datasetMeta.origin = 'file'
      this.files = [];
      this.$store.dispatch('data/SAVE_DATA', { data: [], datasetMeta: {} });
    },
    nextTab() {
      this.$emit('update:tabChange', 1);
      if (this.datasetMeta.origin !== 'api') this.saveData(this.data, this.datasetMeta);
    },
    saveData(data, datasetMeta) {
      this.$store.dispatch('chartConfig/RESET_WSP');
      this.$store.dispatch('data/SAVE_DATA', { data: data, datasetMeta: datasetMeta});
    },
    switchUploadMethod(method) {
      this.uploadMethod = method;
    },
    intFromat(number) {
      return new Intl.NumberFormat().format(number)
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
