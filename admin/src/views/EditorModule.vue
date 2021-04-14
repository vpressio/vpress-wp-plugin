<template>
  <div class="vpress-navigation-view">
    <VpressAppBar/>
    <v-row class="px-5">
      <v-col
        cols="6"
        sm="6"
        md="6"
        lg="2"
      >
        <div class="elevation-2 editor-card">
          <VpressSectionBar/>
          <div v-if="$attrs.section === 'config'">
            <div class="px-2 py-2 dataset-card">
              <v-btn
                dark
                class="mx-2 px-1 py-3"
                min-width="20"
                v-for="(dataset, dataIdx) in datasets"
                :key="`dataset_${dataIdx}`"
                x-small
                tile
                :color="
                  $store.getters['workspace/activeDataset'] &&
                  $store.getters['workspace/activeDataset'].slug === dataset
                    ? 'secondary'
                    : '#817DB0'
                "
              >
                <v-tooltip
                attach
                right
                offset-x
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-img
                    v-bind="attrs"
                    v-on="on"
                    :src="require('../assets/images/db1-purple.svg')"
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
                {{ activeDataset | name }}
              </span>
            </div>
            <VpressVariableContainer/>
          </div>
          <div v-if="$attrs.section === 'style'">
            <VpressExpansionPanel panelTitle="TEMA">
              <VpressInputControl inputName="Tema">
                <v-switch
                  dense
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
          <v-toolbar class="text-center" color="primary" dark flat height="58">
            <v-spacer/>
            <div class="text-subtitle-2 font-weight-regular">
              Arrastra tu selección
            </div>
            <v-spacer/>
            <v-btn icon small color="secondary" @click="resetViz">
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
      theme: false
    }
  },
  filters: {
    name(dataset){
      return dataset ? dataset.name : ''
    }
  },
  computed: {
    datasets() {
      return this.$store.getters['workspace/datasetMeta']
    },
    activeDataset() {
      const dataset = this.$store.getters['workspace/activeDataset']
      return dataset
    },
    themeSwitchColor() {
      return this.theme  ? 'black' : '';
    },
  },
  methods: {
    async selectDataset(dataset) {
      this.updateActiveDataset( dataset)
    },
    resetViz() {
      this.$store.dispatch('editor/RESET_VIZ')
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
