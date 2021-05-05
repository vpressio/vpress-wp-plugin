<template>
  <div class="vpress-navigation-view">
    <VpressAppBar/>
    <v-row class="px-5">
      <v-col
        cols="12"
        sm="12"
        md="4"
        lg="2"
        xl="2"
        class="pb-0"
      >
        <VpressSectionBar :disableEditor="activeDataset === null" />
      </v-col>
      <v-col
        v-show="($vuetify.breakpoint.smAndDown && !activeDataset) || !$vuetify.breakpoint.smAndDown"
        cols="12"
        :sm="activeDataset ? 12 : 4"
        md="8"
        lg="10"
        xl="10"
        class="pb-0"
      >
        <v-tabs
          v-model="tabs"
          :light="$vuetify.breakpoint.smAndDown"
          :dark="$vuetify.breakpoint.mdAndUp"
          :height="$vuetify.breakpoint.mdAndUp ? 58 : null"
          flat
          :background-color="$vuetify.breakpoint.mdAndUp ? 'primary' : null"
          :vertical="$vuetify.breakpoint.smAndDown"
          :grow="$vuetify.breakpoint.smAndDown"
        >
          <v-tabs-slider :color="$vuetify.breakpoint.smAndDown ? 'primary' : null"/>
          <v-tab
            v-for="(section, secIdx) in sections"
            :key="`section-${secIdx}`"
            :href="`#${section.ref}`"
            class="dis-text-transform font-weight-regular"
            :class="{ 'text-caption': $vuetify.breakpoint.smAndDown }"
            @click="proxyScreen = false"
            >
            {{ section.name }}
          </v-tab>
        </v-tabs>
      </v-col>
      <v-col cols="12" :sm="activeDataset ? 12 : 8" md="12" lg="12" xl="12" class="pt-0">
        <v-card
          v-if="proxyScreen"
        >
          <v-row>
            <v-col cols="12" sm="12" md="8" lg="9" style="display:flex;">

              <v-slide-group
                show-arrows
              >
                <div class="pl-5" style="display:flex;">
                  <v-slide-item
                    v-for="(dataset, idx) in datasets"
                    :key="idx"
                    center-active
                    v-slot:default="{}"
                  >
                    <div>
                      <v-icon class="mr-5">
                        mdi-database
                      </v-icon>
                      <v-btn
                        outlined
                        color="primary"
                        class="py-5 mr-4"
                        @click="selectDataset(dataset)"
                      >
                        <div >
                          <div class="text-left dis-text-transform">
                            {{ dataset.name }}
                          </div>
                          <div class="font-weight-light text-caption text-left">
                          {{ ~ dataset.rows | intFormat }} | {{ dataset.size }}
                          </div>
                        </div>
                      </v-btn>
                    </div>
                  </v-slide-item>
                </div>
                <v-btn x-small class="mr-4" fab color="primary" @click="proxyScreen = false">
                  <v-icon>
                    mdi-plus
                  </v-icon>
                </v-btn>
              </v-slide-group>
            </v-col>
            <v-col class="px-5" cols="12" sm="12" md="4" lg="3" style="display:flex;">
              <v-spacer v-show="!$vuetify.breakpoint.smAndDown"/>
              <v-btn
                class="text-caption elevation-0 dis-text-transform ml-1 px-5"
                height="43"
                color="error1"
                rounded
                outlined
                @click="cleanComponentData"
              >
                Remover
              </v-btn>
              <v-spacer v-show="$vuetify.breakpoint.smAndDown"/>
              <v-btn
                class="text-caption elevation-0 dis-text-transform ml-1 px-5"
                height="43"
                color="primary"
                rounded
                to="/editor/config"
              >
                Siguiente
                <v-icon small class="ml-3 icon-arrow">
                  mdi-arrow-right
                </v-icon>
              </v-btn>
            </v-col>
            <v-col cols="12">
              <VpressDataTable :dataset="activeDataset" />
            </v-col>
          </v-row>
        </v-card>
        <v-card
          v-else
        >
          <v-tabs-items v-model="tabs">
            <v-tab-item
              :value="'search'"
            >
              <VpressDatasetSelect @dataset="selectDataset"/>
            </v-tab-item>
            <v-tab-item
              :value="'upload'"
            >
            <div class="pa-10" style="height:100%;">
              <VpressFilepond @uploaded="uploaded"/>
            </div>
            </v-tab-item>
            <v-tab-item
              :value="'paste'"
            >
              <div class="pa-10" style="height:100%;">
                <div class="paste-area mb-4">
                  <v-textarea
                    id="excel_data"
                    name="excel_data"
                    height="400px"
                    solo
                    flat
                    hide-details
                    placeholder="Pegue aquí sus datos desde otras aplicaciones."
                  />
                </div>
                <span class="text-subtitle-1 font-weight-medium">
                  Copie y pegue sus datos de otras aplicaciones o sitios web. Puede utilizar datos tabulares formato CSV
                </span>
              </div>
            </v-tab-item>
          </v-tabs-items>
        </v-card>
      </v-col>
    </v-row>
    <v-snackbar
      dark
      bottom
      right
      v-model="$store.state.notifications.show"
      :timeout="$store.state.notifications.timeout"
      :color="$store.state.notifications.color"
    >
      {{ $store.state.notifications.text }}
      <template v-slot:action="{ attrs }">
        <v-btn
          color="white"
          text
          v-bind="attrs"
          @click="snackbar = $store.dispatch('notifications/close')"
        >
          Cerrar
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>
<script>
import VpressAppBar from '../components/vpress-app-bar.vue'
import VpressFilepond from '../components/vpress-filepond.vue'
import VpressDatasetSelect from '../components/vpress-dataset-select.vue'
import VpressDataTable from '../components/vpress-data-table.vue'
import VpressSectionBar from '../components/vpress-section-bar.vue'
import { editorMixin, loaderMixin } from '../mixins/index.js'
import { readCSV } from '../utils/fileReader'

export default {
  name: 'VpressDataModule',
  mixins: [editorMixin, loaderMixin],
  components: {
    VpressAppBar,
    VpressFilepond,
    VpressDatasetSelect,
    VpressDataTable,
    VpressSectionBar
  },
  data() {
    return {
      proxyScreen: false,
      tabs: 'search',
      activeDataset: this.$store.getters['workspace/activeDataset'],
      datasets: [],
      sections: [
        { ref: 'search', name: 'Tus bases de datos' },
        { ref: 'upload', name: 'Sube datos' },
        // { ref: 'paste', name: 'Pegar datos' },
      ]
    }
  },
  created() {
    this.datasets = this.$store.getters['workspace/datasetMeta']
    if (this.$route.query && this.$route.query.upload) {
      this.tabs = 'upload'
    } else if (this.$route.query && this.$route.query.selectDB) {
      this.proxyScreen = false
    } else if (this.datasetsRefs.length > 0) {
      this.proxyScreen = true
    }
    this.unsubscribe = this.$store.subscribe(
      mutation => {
        if(
          mutation.type === 'workspace/SET_ACTIVE_DATASET'
        ) {
          this.activeDataset = this.$store.getters['workspace/activeDataset']
        }
        if(
          mutation.type === 'workspace/ADD_DATASET_META' ||
          mutation.type === 'workspace/REMOVE_DATASET_META'
        ) {
          this.datasets = this.$store.getters['workspace/datasetMeta']
          if(this.datasetsRefs.length > 0) this.proxyScreen = true;
        }
      }
    )
  },
  beforeDestroy() {
    this.unsubscribe()
  },
  computed: {
    datasetsRefs() {
      return Object.keys(this.datasets)
    }
  },
  methods: {
    async selectDataset(dataset) {
      try {
        this.proxyScreen = true
        await this.editorInit(dataset)
      } catch(error) {
        console.error(error.message);
      }
    },
    async uploaded(dataset) {
      try {
        this.proxyScreen = true
        await this.editorInit(dataset)
      } catch(error) {
        console.error(error.message);
      }
    },
    async cleanComponentData() {
      await this.$store.dispatch('editor/REMOVE_VIZZES')
      await this.$store.dispatch('workspace/REMOVE_DATASET')
      if(Object.keys(this.datasets).length === 0) this.proxyScreen = false;
    },
    async loadFile(file) {
      try {
        const self = this;
        self.loading = true;
        const content = await readCSV(file);
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
    }
  }
}
</script>
<style scoped>
.dis-text-transform {
  text-transform: none;
}

.vpress-navigation-view {
  width: 100%;
  height: 100%;
  background-color:#F8F8F8;
}
.dis-text-transform {
  text-transform: none;
}
.paste-area {
  border: dashed #c3c3c3 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top-left-radius: 30px !important ;
  border-top-right-radius: 30px !important;
  border-bottom-right-radius: 30px !important;
  border-bottom-left-radius: 30px !important;
  overflow: hidden;
}

</style>
