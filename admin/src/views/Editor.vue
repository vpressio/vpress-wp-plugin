<template>
    <div class="config__container" :style="cssProps">
      <div style="width:100%;">
        <v-row class="ma-0" no-gutters>
          <v-col
            class="pa-0"
            :cols="
              $vuetify.breakpoint.lgAndDown
                ? 2
                : 2
            "
          >
            <v-tabs
              dark
              class="config-tabs"
              v-model="activeTab"
              background-color="primary"
              color="white"
              grow
            >
              <v-tab>
                DATOS
              </v-tab>
              <v-tab :disabled="variables.length === 0">
                CONFIGURA
              </v-tab>
              <v-tab
                class="v-step-8"
                :disabled="variables.length === 0"
              >
                ESTILO
              </v-tab>
            </v-tabs>
          </v-col>
          <v-col
            class="py-0"
            :cols="
              this.$vuetify.breakpoint.lgAndDown
                ? 10
                : 10
            "
          >
            <div
              class="tributton-container"
              v-show="activeTab !== 0"
            >
              <v-btn
                class="left-button"
                outlined
                color="primary"
                @click="saveChart"
              >
                <v-icon left color="primary">
                  mdi-content-save
                </v-icon>
                Guardar
              </v-btn>
              <v-btn
                v-if="
                  $store.getters['editor/chart'].chart !== 'map'
                "
                class="middle-button" outlined color="primary"
                @click="downloadChartImg"
              >
                <v-icon left color="primary">
                  mdi-download
                </v-icon>
                Descargar
              </v-btn>
              <v-btn
                class="right-button"
                outlined
                color="primary"
                @click="clipboardCopy"
              >
                <v-icon left color="primary">
                  mdi-share-variant
                </v-icon>
                Compartir
              </v-btn>
            </div>
          </v-col>
          <v-col class="pa-0" :cols="numberOfColsIftabIsNotZero">
            <v-card class="pb-5">
              <v-tabs-items v-model="activeTab">
                <v-tab-item>
                  <VpressDataLoader
                    v-if="activeTab === 0"
                    :tabChange.sync="activeTab"
                  />
                </v-tab-item>
                <v-tab-item>
                  <VpressExpansionPanel
                    v-if="activeTab === 1"
                    panelTitle="ARRASTRA LA SELECCIÓN"
                  >
                    <v-col cols="12" class="pb-0 pt-1">
                      <v-img class="db-icon" src="../assets/images/db1.svg" />
                      <span class="db-titulo">{{ dataSetName }}</span>
                      <hr class="v-divider theme--light hr-divider" />
                    </v-col>
                    <VpressVariableContainer :variables="variables"/>
                  </VpressExpansionPanel>
                </v-tab-item>
                <v-tab-item>
                  <div v-if="activeTab === 2">
                    <VpressExpansionPanel panelTitle="TEMA">
                      <VpressInputControl inputName="Tema">
                        <v-switch
                          dense
                          inset
                          v-model="theme"
                          :color="themeSwitchColor"
                          class="config-switch"
                          :value-comparator="(e)=> console.log(e)"
                        />
                      </VpressInputControl>
                    </VpressExpansionPanel>
                    <VpressExpansionPanel panelTitle="COLOR DE GRÁFICAS">
                      <VpressColorSelection />
                    </VpressExpansionPanel>
                  </div>
                </v-tab-item>
              </v-tabs-items>
            </v-card>
          </v-col>
          <v-col lg="2" v-show="activeTab === 1" class="pa-0 pl-2">
            <VpressSlotGroup/>
          </v-col>
          <v-col
            class="py-0 px-2"
            v-show="numberOfColsIftabIsNotZero !== '12'"
            :md="activeTab === 1 ? 8 : 10"
          >
            <VpressChartGroup
              v-if="
                $store.getters['editor/workspace'] ||
                $store.getters['editor/workspace']().length > 0
              "
            />
          </v-col>
        </v-row>
      </div>
  </div>
</template>
<script>
import VpressDataLoader from '../components/vpress-data-loader.vue'
import VpressVariableContainer from '../components/vpress-variable-container.vue'
import VpressExpansionPanel from '../components/vpress-expansion-panel.vue'
import VpressChartGroup from '../components/vpress-chart-group.vue'
import VpressInputControl from '../components/vpress-config-input.vue'
import VpressColorSelection from '../components/vpress-config-color-selection.vue'
import VpressSlotGroup from '../components/vpress-slot-group.vue'
import { downloadChart, stringChart } from '../utils/downloadChart.js'

export default {
  name: 'Vpress',
  components: {
    VpressDataLoader,
    VpressVariableContainer,
    VpressExpansionPanel,
    VpressChartGroup,
    VpressInputControl,
    VpressColorSelection,
    VpressSlotGroup
  },
  data() {
    return {
      activeTab: 0,
      theme: false,
      dataSetFromUrl: {}
    };
  },
  watch:{
    theme(newTheme){
      const chartTheme = newTheme ? 'dark': 'light'
      this.$store.dispatch(
        'editor/MERGE_CHART_VALUE'
        ,{ mutationType: 'theme', value: chartTheme }
      );
    }
  },
  computed: {
    cssProps() {
      return {
        '--secondary': this.$vuetify.theme.themes.light.secondary
      }
    },
    numberOfColsIftabIsNotZero() {
      const colsOnlg = this.$vuetify.breakpoint.lgAndDown ? 2 : 2;
      const numberOfCols = this.activeTab !== 0 ? colsOnlg : '12';

      return numberOfCols;
    },
    themeSwitchColor() {
      return this.theme  ? 'black' : '';
    },
    variables() {
      return this.$store.getters['workspace/dataType'];
    },
    dataSetName() {
      if (this.activeTab === 1) {
        return this.$store
          .getters['workspace/dataSetName']
          .replace(/\.[^/.]+$/, "")
      }
      return 'Dataset'
    }
  },
  methods: {
    async saveChart() {
      try {
        await this.$store.dispatch('editor/SAVE_CHART');
        stringChart(
          `#empty_chart_${this.$store.getters['editor/activeVizIdx']}`,
          this.$store.getters['editor/workspace']()[this.$store.getters['editor/activeVizIdx']]
            .id,
          this.$store.getters['editor/viz'].id
        )
        this.$store.dispatch('notifications/open', {
          color: 'success',
          text: 'Gráfica guardada con éxito'
        })
      } catch (error) {
        this.$store.dispatch('notifications/open', {
          color: 'error',
          text: 'Error al guardar gráfica'
        })
        throw new Error(error.message)
      }
    },
    downloadChartImg() {
      downloadChart(`#empty_chart_${this.$store.getters['editor/activeVizIdx']}`)
    },
    clipboardCopy() {
      try {
        const chartId = this.$store.getters['editor/viz'].id
        if (chartId) {
          const iframe = `[vpress id=${chartId}]`
          navigator.clipboard.writeText(iframe);
          this.$store.dispatch('notifications/open', {
            color: 'success',
            text: 'Gráfica guardada al portapapeles'
          })
        } else {
          this.$store.dispatch('notifications/open', {
            color: 'warning',
            text: 'Primero debes de guardar la gráfica'
          })
          throw new Error('Gráfica no guardada.')
        }
      } catch (error) {
        throw new Error(error.message);
      }
    }
  }
};
</script>
<style  scoped>
.config__container {
  display:flex;
}

.fill-height {
  height: 100%;
}

.tributton-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 0 5%
}

.left-button {
  border-radius: 0px !important;
  border-bottom-left-radius: 13px !important;
  border-top-left-radius: 13px !important;
}

.middle-button {
  border-radius: 0px !important;
}

.right-button {
  border-radius: 0px !important;
  border-bottom-right-radius: 13px !important;
  border-top-right-radius: 13px !important;
}

* >>> .config-tabs > .v-tabs-bar {
  height: 50px;
}
*
  >>> .config-tabs
  > .v-slide-group
  > .v-slide-group__wrapper
  > .v-slide-group__content {
  margin-top: 5px;
}

*
  >>> .config-tabs
  > .v-slide-group
  > .v-slide-group__wrapper
  > .v-slide-group__content
  > .v-tab--active {
  background-color: var(--secondary);
}

*
  >>> .config-tabs
  > .v-slide-group
  > .v-slide-group__wrapper
  > .v-slide-group__content
  > .v-tabs-slider-wrapper
  > .v-tabs-slider {
  display: none;
}

*
  >>> .config-tabs
  > .v-slide-group
  > .v-slide-group__wrapper
  > .v-slide-group__content
  > .v-tab {
  min-width: 0px;
  font-size: 0.7rem;
  padding: 3px 0;
}

* >>> .config-text-field > .v-input__control > .v-input__slot {
  min-height: 30px;
  margin: 0;
}

* >>> .config-text-field > .v-input__control > .v-text-field__details {
  display: none;
}

* >>> .config-switch > .v-input__control > .v-messages {
  display: none;
}

* >>> .config-switch {
  margin-top: 0;
}
.hr-divider {
  width: 91%;
  margin-left: 15px;
  margin-bottom: 10px;
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

.limit-scroll {
  overflow-y: scroll;
  max-height: 85vh;
}

@media only screen and (max-width: 960px) {
  * >>> .config-tabs
  > .v-slide-group
  > .v-slide-group__wrapper
  > .v-slide-group__content
  > .v-tab {
    font-size: 0.68rem;
  }
}
</style>
