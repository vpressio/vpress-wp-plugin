<template>
    <div class="config__container" :style="cssProps">
      <div style="width:100%;" class="pb-5">
        <v-row class="ma-0" no-gutters>
          <v-col class="pa-0" :cols="$vuetify.breakpoint.lgAndDown ? 2 : 2">
            <v-tabs
              dark
              class="config-tabs"
              v-model="activeTab"
              background-color="primary"
              color="white"
              grow
            >
              <v-tab>DATOS</v-tab>
              <v-tab :disabled="variables.length === 0">CONFIGURA</v-tab>
              <v-tab class="v-step-8" :disabled="variables.length === 0">ESTILO</v-tab>
            </v-tabs>
          </v-col>
          <v-col class="py-0" :cols="this.$vuetify.breakpoint.lgAndDown ? 10 : 10">
            <div class="tributton-container" v-show="activeTab !== 0">
              <v-btn class="left-button" outlined color="primary" @click="saveChart"> 
                 <v-icon left color="primary">mdi-content-save</v-icon>
                Guardar
              </v-btn>
              <v-btn v-if="$store.getters['chartConfig/chart'].chart !== 'map'" class="middle-button" outlined color="primary" @click="downloadChartImg" >
                <v-icon left color="primary">mdi-download</v-icon>
                Descargar
              </v-btn>
              <v-btn class="right-button" outlined color="primary" @click="clipboardCopy">
                <v-icon left color="primary">mdi-share-variant</v-icon>
                Compartir
              </v-btn>
            </div>
          </v-col>
          <v-col class="pa-0" :cols="numberOfColsIftabIsNotZero">
            <v-card class="pb-5">
              <v-tabs-items v-model="activeTab">
                <v-tab-item>
                  <VpressDataLoader :tabChange.sync="activeTab" :tourFile="tourFile"/>
                </v-tab-item>
                <v-tab-item>
                  <VpressExpansionPanel panelTitle="ARRASTRA LA SELECCIÓN">
                    <v-col cols="12" class="pb-0 pt-1">
                      <v-img class="db-icon" src="../assets/images/db1.svg" />
                      <span class="db-titulo">{{ dataSetName }}</span>
                      <hr class="v-divider theme--light hr-divider" />
                    </v-col>
                    <VpressVariableContainer :variables="variables"/>
                  </VpressExpansionPanel>
                </v-tab-item>
                <v-tab-item>
                  <VpressExpansionPanel panelTitle="TEMA">
                    <VpressInputControl inputName="Tema">
                      <v-switch
                        dense
                        inset
                        v-model="darkTheme"
                        :color="isDarkThemeActivated"
                        class="config-switch"
                      />
                    </VpressInputControl>
                  </VpressExpansionPanel>
                  <VpressExpansionPanel panelTitle="COLOR DE GRÁFICAS">
                    <VpressColorSelection />
                  </VpressExpansionPanel>
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
            <VpressChartGroup v-if="variables.length !== 0"/>
          </v-col>
        </v-row>
      </div>
    <v-tour name="vpress-tour" :steps="tourSteps" :options="tourOptions" :callbacks="tourCallbacks"/>
  </div>
</template>
<script>
import VpressDataLoader from './vpress-data-loader.vue';
import VpressVariableContainer from './vpress-variable-container.vue';
import VpressExpansionPanel from './vpress-expansion-panel.vue';
import VpressChartGroup from './vpress-chart-group.vue';
import VpressInputControl from './vpress-config-input.vue';
import VpressColorSelection from './vpress-config-color-selection.vue';
import VpressSlotGroup from './vpress-slot-group.vue';

import downloadChart from '../utils/downloadChart.js';

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
      darkTheme: false,
      openDialog: false,
      sideBarWidth: 45,
      dataSetFromUrl: {},
      tourOptions: {
        useKeyboardNavigation: true,
        labels: {
          buttonSkip: 'Omitir tutorial',
          buttonPrevious: 'Anterior',
          buttonNext: 'Siguiente',
          buttonStop: 'Terminar'
        }      
      },
      tourFile: {
        error: 'Hubo un problema con el tutorial.'
      },
      tourCallbacks: {
        onNextStep: this.tourNext
      },
      tourSteps: [
          {
            target: '.v-step-0',
            content: `Descubre lo que puedes hacer con Vpress`,
            params: {
              placement: 'bottom'
            }
          },
          {
            target: '.v-step-1',
            content: 'Prueba con datos que hemos preparado para ti',
            params: {
              placement: 'top'
            }
          },
          {
            target: '.v-step-2',
            content: 'Da click en siguiente para comenzar tu análisis',
            params: {
              placement: 'bottom'
            }
          },
          {
            target: '.v-step-3',
            content: 'Hagamos una gráfica juntos',
            params: {
              placement: 'top'
            }
          },
          {
            target: '.v-step-4',
            content: 'Arrastra la observación "anillos" a la selección de Filas',
            params: {
              placement: 'bottom'
            }
          },
          {
            target: '.v-step-5',
            content: 'Arrastra la observación "Conteo de observaciones" a la selección de Columnas',
            params: {
              placement: 'bottom'
            }
          },
          {
            target: '.v-step-6',
            content: 'Hagamos algo más, arrastra la observación de "planeta" a la sección de Color',
            params: {
              placement: 'bottom'
            }
          },
          {
            target: '.v-step-7',
            content: 'Nos separó la gráfica por "planeta" y nos agrega la opción de poder Apilar la gráfica',
            params: {
              placement: 'bottom'
            }
          },
          {
            target: '.v-step-8',
            content: 'Dale estilo a tu gráfica cambiando colores',
            params: {
              placement: 'bottom'
            }
          },
          {
            target: '.v-step-9',
            content: 'Selecciona entre un color plano o una gama de color más amplia. ¡ Disfruta de Vpress !',
            params: {
              placement: 'right'
            }
          }
        ]
    };
  },
  mounted() {
    if(!this.$route.params.chartid) {
      // this.$tours['vpress-tour'].start();
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
    isDarkThemeActivated() {
      // this.$store.dispatch('chartConfig/MERGE_CHART_VALUE',{ mutationType: 'theme', value: this.darkTheme ? 'dark': 'light' });
      return this.$store.getters['chartConfig/theme'] === 'dark' ? 'black' : '';
    },
    variables() {
      return this.$store.getters['data/dataType'];
    },
    dataSetName() {
      if (this.activeTab === 1) {
        return this.$store.getters['data/dataSetName'].replace(/\.[^/.]+$/, "")
      }
      return 'Dataset'
    }
  },
  methods: {
    async saveChart() {
      try {
        await this.$store.dispatch('chartConfig/SAVE_CHART')
      } catch (error) {
        console.error(error.message);
      }
    },
    downloadChartImg() {
      downloadChart(`#empty_chart_${this.$store.getters['chartConfig/activeVizIdx']}`)
    },
    clipboardCopy() {
      try {
        const chartId = this.$store.getters['chartConfig/viz'].id
        if (chartId) {
          const iframe = `<iframe srcdoc="${process.env.VUE_IFRAME_URL}/#/shared/${chartId}" width="500" style="border: none;"></iframe>`
          navigator.clipboard.writeText(iframe);
        } else {
          throw new Error('Gráfica no guardada.')
        }
      } catch (error) {
        console.error(error.message);
      }
    },
    mergeValue(slot, dataToMerge) {
      this.$store.dispatch(
        `chartConfig/DATA_QUERY`,
        { value: dataToMerge, mutationType: slot}
      )
    },
    tourNext(currentStep) {
      const tourFileName = 'Monitoreo de despensas.csv';
      const tourFileDir = 'stc';
      switch(currentStep) {
        case 0:
          this.$store.dispatch(
            'data/GET_DATASET_BY_NAME',
            { dataSetDir:tourFileDir, file: tourFileName }
          )
            .then(file => this.tourFile = {
              file: file,
              fileName: tourFileName,
              fileDir: tourFileDir
              }
            )
            .catch(err => this.tourFile = { error: err })
          break
        case 2:
          this.activeTab = 1
          break
        case 3:
          this.mergeValue(
            'xAxis',
            {
              slug: "anillos",
              title: "anillos",
              type: "ordinal"
            }
          );
          break
        case 4:
          this.mergeValue(
            'yAxis',
            {
              slug: "total_count",
              title: "Conteo de observaciones",
              type: "linear"
            }
          );
          break
        case 5:
          this.mergeValue(
            'aggregation',
            {
              slug: "planeta",
              title: "planeta",
              type: "ordinal"
            }
          );
          break
        case 6:
          this.$store.dispatch(
            'chartConfig/MERGE_CHART_VALUE',
            { mutationType:'stackedBars', value: true }
          );
          break
        case 7:
          this.activeTab = 2
          break
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
