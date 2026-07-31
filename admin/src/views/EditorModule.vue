<template>
  <div class="vpress-navigation-view">
    <VpressAppBar/>
    <!-- mt-0 neutralizes v3's four-sided -12px row margin so the columns'
         top padding shows — the v2 gap between nav bar and content. -->
    <v-row class="px-5 mt-0">
      <v-col
        cols="6"
        sm="6"
        md="6"
        lg="2"
      >
        <div class="elevation-2 editor-card">
          <VpressSectionBar/>
          <div v-if="$attrs.section === 'config'">
            <div v-show="false" class="px-2 py-2 dataset-card">
              <v-btn
                class="mx-2 px-1 py-3"
                min-width="20"
                v-for="(dataset, dataIdx) in datasets"
                :key="`dataset_${dataIdx}`"
                size="x-small"
                rounded="0"
                :color="
                  workspaceStore.activeDatasetMeta &&
                  workspaceStore.activeDatasetMeta.slug === dataset
                    ? 'secondary'
                    : '#817DB0'
                "
              >
                <v-tooltip
                  attach
                  location="end"
                >
                  <template v-slot:activator="{ props }">
                    <v-img
                      v-bind="props"
                      :src="db1PurpleIcon"
                      width="15"
                      height="12"
                    />
                  </template>
                  <span> {{ dataset.name }} </span>
                </v-tooltip>
              </v-btn>
            </div>
            <div class="px-3 py-2">
              <span class="db-titulo">
                {{ name(activeDataset) }}
              </span>
            </div>
            <VpressVariableContainer/>
          </div>
          <div v-if="$attrs.section === 'style'">
            <VpressExpansionPanel panelTitle="TEMA">
              <VpressInputControl inputName="Tema">
                <v-switch
                  density="compact"
                  inset
                  v-model="theme"
                  :color="themeSwitchColor"
                  class="config-switch"
                />
              </VpressInputControl>
            </VpressExpansionPanel>
            <VpressExpansionPanel panelTitle="COLOR DE GRÁFICAS">
              <VpressColorSelection />
            </VpressExpansionPanel>
          </div>
        </div>
      </v-col>
      <v-col
        cols="6"
        sm="6"
        md="6"
        lg="2"
        class="px-0"
      >
        <div class="elevation-2 editor-card">
          <v-toolbar class="text-center" color="primary" theme="dark" flat height="58">
            <v-spacer/>
            <div class="text-subtitle-2 font-weight-regular">
              Arrastra tu selección
            </div>
            <v-spacer/>
            <v-btn icon variant="text" size="small" color="secondary" @click="resetViz">
              <v-icon>mdi-restart</v-icon>
            </v-btn>
            <v-spacer/>
          </v-toolbar>
          <VpressSlotGroup/>
        </div>
      </v-col>
      <v-col cols="12" sm="12" md="12" lg="8">
        <div class="elevation-2 editor-viz-card">
          <div class="viz-card--content">
            <VpressVizToolbar/>
            <VpressVizButtons/>
            <VpressChartGroup/>
          </div>
        </div>
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
import VpressSectionBar from '../components/vpress-section-bar.vue'
import VpressVariableContainer from '../components/vpress-variable-container.vue'
import VpressSlotGroup from '../components/vpress-slot-group.vue'
import VpressVizButtons from '../components/vpress-viz-buttons.vue';
import VpressVizToolbar from '../components/vpress-viz-toolbar.vue';
import VpressChartGroup from '../components/vpress-chart-group.vue'
import VpressExpansionPanel from '../components/vpress-expansion-panel.vue'
import VpressInputControl from '../components/vpress-config-input.vue'
import VpressColorSelection from '../components/vpress-config-color-selection.vue'
import { loaderMixin } from '../mixins/index.js'
import { useNotificationsStore } from '../store/index.js'
import db1PurpleIcon from '../assets/images/db1-purple.svg'

export default {
  name: 'VpressEditorModule',
  mixins: [loaderMixin],
  components: {
    VpressAppBar,
    VpressSectionBar,
    VpressVariableContainer,
    VpressSlotGroup,
    VpressVizToolbar,
    VpressVizButtons,
    VpressChartGroup,
    VpressExpansionPanel,
    VpressInputControl,
    VpressColorSelection
  },
  data() {
    return {
      theme: false,
      db1PurpleIcon
    }
  },
  computed: {
    ...mapStores(useNotificationsStore),
    datasets() {
      return this.workspaceStore.datasetMeta
    },
    activeDataset() {
      return this.workspaceStore.activeDatasetMeta
    },
    themeSwitchColor() {
      return this.theme  ? 'black' : '';
    },
  },
  methods: {
    name(dataset){
      return dataset ? dataset.name : ''
    },
    async selectDataset(dataset) {
      this.updateActiveDataset( dataset)
    },
    resetViz() {
      this.editorStore.RESET_VIZ()
    }
  }
}

</script>
<style scoped>
.vpress-navigation-view {
  width: 100%;
  height: 100%;
  background-color:#F8F8F8;
}
.db-icon {
  width: 17px;
  margin: 4px 10px 4px 0;
  display: inline-flex;
  padding-bottom: 1px;
}

.db-titulo {
  color: #737373;
  font-size: 0.8rem;
  font-family: Roboto;
}

.editor-card {
  height: 100%;
  background-color: #FFF;
}

.editor-viz-card {
  background-color: #F8F8F8;
  height: 100%;
}

.dataset-card {
  display:flex;
  width:100%;
  background-color:#322E71;
  color:#FFF
}

.viz-card--content {
  background-color: #FFF;
}
</style>
