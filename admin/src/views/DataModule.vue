<template>
  <div class="vpress-navigation-view">
    <VpressAppBar/>
    <!-- mt-0 neutralizes v3's four-sided -12px row margin so the columns'
         top padding shows — the v2 gap between nav bar and content. -->
    <v-row class="px-5 mt-0">
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
        v-show="($vuetify.display.smAndDown && !activeDataset) || !$vuetify.display.smAndDown"
        cols="12"
        :sm="activeDataset ? 12 : 4"
        md="8"
        lg="10"
        xl="10"
        class="pb-0"
      >
        <v-tabs
          v-model="tabs"
          :theme="$vuetify.display.mdAndUp ? 'dark' : 'light'"
          :height="$vuetify.display.mdAndUp ? 58 : undefined"
          :bg-color="$vuetify.display.mdAndUp ? 'primary' : undefined"
          :direction="$vuetify.display.smAndDown ? 'vertical' : 'horizontal'"
          :grow="$vuetify.display.smAndDown"
          :slider-color="$vuetify.display.smAndDown ? 'primary' : undefined"
        >
          <v-tab
            v-for="(section, secIdx) in sections"
            :key="`section-${secIdx}`"
            :value="section.ref"
            class="dis-text-transform font-weight-regular"
            :class="{ 'text-caption': $vuetify.display.smAndDown }"
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
          <v-row class="mt-0 px-2" align="center">
            <v-col cols="12" sm="12" md="8" lg="9" style="display:flex;">

              <v-slide-group
                show-arrows
                center-active
              >
                <div class="pl-5" style="display:flex;">
                  <v-slide-group-item
                    v-for="(dataset, idx) in datasets"
                    :key="idx"
                    v-slot:default="{}"
                  >
                    <div>
                      <v-icon class="mr-5">
                        mdi-database
                      </v-icon>
                      <v-btn
                        variant="outlined"
                        color="primary"
                        class="py-5 mr-4"
                        @click="selectDataset(dataset)"
                      >
                        <div >
                          <div class="text-left dis-text-transform">
                            {{ dataset.name }}
                          </div>
                          <div class="font-weight-light text-caption text-left">
                          {{ intFormat(~ dataset.rows) }} | {{ dataset.size }}
                          </div>
                        </div>
                      </v-btn>
                    </div>
                  </v-slide-group-item>
                </div>
                <v-btn size="small" class="mr-4 align-self-center" icon color="primary" @click="proxyScreen = false">
                  <v-icon>
                    mdi-plus
                  </v-icon>
                </v-btn>
              </v-slide-group>
            </v-col>
            <v-col class="px-5" cols="12" sm="12" md="4" lg="3" style="display:flex;">
              <v-spacer v-show="!$vuetify.display.smAndDown"/>
              <v-btn
                class="text-caption elevation-0 dis-text-transform ml-1 px-5"
                height="43"
                color="error1"
                rounded
                variant="outlined"
                @click="cleanComponentData"
              >
                Remover
              </v-btn>
              <v-spacer v-show="$vuetify.display.smAndDown"/>
              <v-btn
                class="text-caption elevation-0 dis-text-transform ml-1 px-5"
                height="43"
                color="primary"
                rounded
                to="/editor/config"
              >
                Siguiente
                <v-icon size="small" class="ml-3 icon-arrow">
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
          <v-tabs-window v-model="tabs">
            <v-tabs-window-item
              :value="'search'"
            >
              <VpressDatasetSelect @dataset="selectDataset"/>
            </v-tabs-window-item>
            <v-tabs-window-item
              :value="'upload'"
            >
            <div class="pa-10" style="height:100%;">
              <VpressFilepond @uploaded="uploaded"/>
            </div>
            </v-tabs-window-item>
            <v-tabs-window-item
              :value="'paste'"
            >
              <div class="pa-10" style="height:100%;">
                <div class="paste-area mb-4">
                  <v-textarea
                    id="excel_data"
                    name="excel_data"
                    height="400px"
                    variant="solo"
                    flat
                    hide-details
                    placeholder="Pegue aquí sus datos desde otras aplicaciones."
                  />
                </div>
                <span class="text-subtitle-1 font-weight-medium">
                  Copie y pegue sus datos de otras aplicaciones o sitios web. Puede utilizar datos tabulares formato CSV
                </span>
              </div>
            </v-tabs-window-item>
          </v-tabs-window>
        </v-card>
      </v-col>
    </v-row>
    <v-snackbar
      location="bottom right"
      v-model="notificationsStore.show"
      :timeout="notificationsStore.timeout"
      :color="notificationsStore.color"
    >
      {{ notificationsStore.text }}
      <template v-slot:actions>
        <v-btn
          color="white"
          variant="text"
          @click="notificationsStore.close()"
        >
          Cerrar
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>
<script>
import { mapStores } from 'pinia'
import VpressAppBar from '../components/vpress-app-bar.vue'
import VpressFilepond from '../components/vpress-filepond.vue'
import VpressDatasetSelect from '../components/vpress-dataset-select.vue'
import VpressDataTable from '../components/vpress-data-table.vue'
import VpressSectionBar from '../components/vpress-section-bar.vue'
import { editorMixin, loaderMixin } from '../mixins/index.js'
import { useNotificationsStore } from '../store/index.js'
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
      sections: [
        { ref: 'search', name: 'Tus bases de datos' },
        { ref: 'upload', name: 'Sube datos' },
        // { ref: 'paste', name: 'Pegar datos' },
      ]
    }
  },
  created() {
    if (this.$route.query && this.$route.query.upload) {
      this.tabs = 'upload'
    } else if (this.$route.query && this.$route.query.selectDB) {
      this.proxyScreen = false
    } else if (this.datasetsRefs.length > 0) {
      this.proxyScreen = true
    }
  },
  computed: {
    ...mapStores(useNotificationsStore),
    activeDataset() {
      return this.workspaceStore.activeDatasetMeta
    },
    datasets() {
      return this.workspaceStore.datasetMeta
    },
    datasetsRefs() {
      return Object.keys(this.datasets)
    }
  },
  watch: {
    // Replaces the Vuex mutation subscription on ADD/REMOVE_DATASET_META.
    datasetsRefs(refs) {
      if (refs.length > 0) this.proxyScreen = true
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
      this.editorStore.REMOVE_VIZZES()
      this.workspaceStore.REMOVE_DATASET()
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
