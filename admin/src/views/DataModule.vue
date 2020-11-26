<template>
  <div class="vpress-navigation-view">
    <VpressAppBar/>
    <v-row class="px-5">
      <v-col
        cols="12"
        sm="12"
        md="4"
        lg="3"
        xl="3"
        class="pb-0"
      >
        <v-toolbar
          height="58"
          color="#37307E"
          dark
          flat
        > 
          <v-btn text>
            <v-icon>mdi-database</v-icon>
          </v-btn>
          <v-btn text>
            <v-icon>mdi-database-settings</v-icon>
          </v-btn>
          <v-btn text>
            <v-icon>mdi-brush</v-icon>
          </v-btn>
        </v-toolbar>
      </v-col>
      <v-col
        cols="12"
        sm="4"
        md="8"
        lg="9"
        xl="9"
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
            href="#search"
            class="dis-text-transform font-weight-regular"
            :class="{ 'text-caption': $vuetify.breakpoint.smAndDown }"
            >
            Tus bases de datos
          </v-tab>

          <v-tab
            href="#upload"
            class="dis-text-transform font-weight-regular"
            :class="{ 'text-caption': $vuetify.breakpoint.smAndDown }"
            >
            Subir datos
          </v-tab>
          <v-tab
            href="#paste"
            class="dis-text-transform font-weight-regular"
            :class="{ 'text-caption': $vuetify.breakpoint.smAndDown }"
            >
            Pegar datos
          </v-tab>
          <v-tab
            href="#webhooks"
            class="dis-text-transform font-weight-regular"
            :class="{ 'text-caption': $vuetify.breakpoint.smAndDown }"
            >
            API
          </v-tab>
        </v-tabs>
      </v-col>
      <v-col cols="12" sm="8" md="12" lg="12" xl="12" class="pt-0">
        <v-card
          v-if="activeDataset"
        >
          <v-row>
            <v-col cols="12" sm="8" md="9" lg="9" style="display:flex;">
              <v-slide-group
                show-arrows
              >
                <div class="pl-5">
                  <v-icon class="mr-5">
                  mdi-database
                </v-icon>
                  <v-slide-item
                    v-for="(dataset, idx) in datasets"
                    :key="idx"
                    center-active
                    v-slot:default="{}"
                  >
                      <v-btn
                        outlined                                              
                        color="primary"
                        class="py-5"
                      >
                      <div >
                        <div class="text-left dis-text-transform">
                          {{ dataset.name }}
                        </div>
                        <div class="font-weight-light text-caption text-left">
                        {{ dataset.rows | intFormat }} | {{ dataset.size }}
                        </div>
                      </div>
                      </v-btn>
                  </v-slide-item>
                </div>
              </v-slide-group>
              <v-btn x-small class="mx-5" fab color="primary">
                <v-icon>
                  mdi-plus
                </v-icon>
              </v-btn>
            </v-col>
            <v-col cols="12" sm="4" md="3" lg="3" style="display:flex;">
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
              <v-btn
                class="text-caption elevation-0 dis-text-transform ml-1 px-5"
                height="43"
                color="primary"
                rounded
              >
                Siguiente
                <v-icon small class="ml-3 icon-arrow">
                  mdi-arrow-right
                </v-icon>
              </v-btn>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <VpressDataTable :dataset="activeDataset" />
            </v-col>
          </v-row>
        </v-card>
        <v-card
          v-if="!activeDataset"
        >
          <v-tabs-items v-model="tabs">
            <v-tab-item
              :value="'search'"
            >
              <VpressDatasetSelect  @dataset="selectDataset"/>
            </v-tab-item>
            <v-tab-item
              :value="'upload'"
            > 
              <VpressFilepond/>
            </v-tab-item>
            <v-tab-item
              :value="'paste'"
            > 
              <v-textarea
                class="pl-4 pt-4"
                id="excel_data"
                name="excel_data"
                outlined
                placeholder="Pega tus datos desde Excel"
              />
            </v-tab-item>
            <v-tab-item :value="'webhooks'">
              API, webhooks, kobo 
            </v-tab-item>
          </v-tabs-items>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>
<script>
import VpressAppBar from '../components/vpress-app-bar.vue'
import VpressFilepond from '../components/vpress-filepond.vue'
import VpressDatasetSelect from '../components/vpress-dataset-select.vue'
import VpressDataTable from '../components/vpress-data-table.vue'
import { editorMixin, loaderMixin } from '../mixins/index.js'
import api from '../utils/axios.js'

export default {
  name: 'VpressDataModule',
  mixins: [editorMixin, loaderMixin],
  components: {
    VpressAppBar,
    VpressFilepond,
    VpressDatasetSelect,
    VpressDataTable
  },
  data() {
    return {
      tabs: 'search',
      activeDataset: this.$store.getters['workspace/activeDataset'],
      datasets: []
    }
  },
  created() {
    this.datasets = this.$store.getters['workspace/datasetMeta']
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
          console.log(this.datasets);
        }
      }
    )
  },
  beforeDestroy() {
    this.getWPDatasets()
    this.unsubscribe()
  },
  methods: {
    async selectDataset(dataset) {
      try {
        await this.editorInit(dataset)
      } catch(error) {
        console.error(error.message);
      }
    },
    async getWPDatasets() {
      try {
        const response = await api
          .dataset
          .list({ page: 1, itemsPerPage: 4 });
        if(response.data) this.datasets = response.data.data
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async cleanComponentData() {
      await this.$store.dispatch('editor/REMOVE_VIZZES')
      await this.$store.dispatch('workspace/REMOVE_DATASET')
    },
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


</style>