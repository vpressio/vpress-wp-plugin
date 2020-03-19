<template>
  <v-responsive class="config-container">
    <v-row class="ma-0">
      <v-card class="border-radius-none sideToolbar" flat color="#222A32" width="45" dark>
        <v-card class="pa-1 border-radius-none" color="#181D25" flat>
          <v-img class="vpress-icon" :src="svgLogo" />
        </v-card>
      </v-card>
      <div class="config-wrapper">
        <v-row class="ma-0">
          <v-col class="pa-0" cols="2">
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
              <v-tab :disabled="dataTypesCards.length === 0">
                CONFIGURA
              </v-tab>
              <v-tab :disabled="dataTypesCards.length === 0">
                ESTILO
              </v-tab>
            </v-tabs>
          </v-col>
          <v-col class="py-0 px-5 flex-end__container" cols="10">
            <v-btn class="save-button" outlined color="primary">
              Guardar
            </v-btn>
            <v-btn class="share-button " outlined color="primary">
              Compartir
            </v-btn>
            <v-btn class="download-button" outlined color="primary">
              Descargar
            </v-btn>
          </v-col>
          <v-col class="pa-0 config-down-section" :cols="numberOfColsIftabIsNotZero">
            <v-card class="fill-height">
              <v-tabs-items v-model="activeTab">
                <v-tab-item>
                  <VpressDataLoader :tabChange.sync="activeTab" />
                </v-tab-item>
                <v-tab-item>
                  <VpressExpansionPanel panelTitle="ARRASTRA LA SELECCIÓN">
                    <v-row class="ma-0">
                      <v-col class="variablecards__overflow">
                        <VpressVariableCardStartContainer :variableCards="dataTypesCards" />
                      </v-col>
                    </v-row>
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
          <v-col cols="2" class="py-0 px-3">
            <v-card class="fill-height">
              <VpressVariableSlotsContainer />
            </v-card>
          </v-col>
          <v-col v-if="numberOfColsIftabIsNotZero === '2'" class="py-0 pl-0 pr-3" cols="8">
            <v-card>
              <VpressStateSubscriber />
            </v-card>
          </v-col>
        </v-row>
      </div>
    </v-row>
  </v-responsive>
</template>
<script>
import VpressDataLoader from './vpress-data-loader.vue';
import VpressVariableCardStartContainer from './vpress-variable-card-start-container';
import VpressVariableSlotsContainer from './vpress-variable-slots-container.vue';
import VpressExpansionPanel from './vpress-expansionPanel.vue';
import VpressStateSubscriber from './vpress-state-subscriber.vue';
import VpressInputControl from './vpress-config-input.vue';
import VpressColorSelection from './vpress-config-color-selection.vue';
import svgLogo from '../assets/images/logo.svg';

export default {
  name: 'VpressConfig',
  components: {
    VpressDataLoader,
    VpressVariableCardStartContainer,
    VpressVariableSlotsContainer,
    VpressExpansionPanel,
    VpressStateSubscriber,
    VpressInputControl,
    VpressColorSelection
  },
  data() {
    return {
      activeTab: 0,
      darkTheme: false,
      openDialog: false,
      svgLogo: svgLogo
    };
  },
  computed: {
    numberOfColsIftabIsNotZero() {
      // return '5'
      const numberOfCols = this.activeTab !== 0 ? '2' : '12';

      return numberOfCols;
    },
    isDarkThemeActivated() {
      this.$store.dispatch('chartConfig/UPDATE_CHART_THEME', this.darkTheme);
      return this.$store.getters['chartConfig/theme'] === 'dark' ? 'black' : '';
    },
    dataTypesCards() {
      // eslint-disable-next-line
      return this.$store.getters['data/dataType'];
    }
  },
  methods: {}
};
</script>
<style scoped>
.config-container {
  flex-wrap: wrap;
}

.sideToolbar {
  height: 100vh;
}

.vpress-icon {
  height: 35px;
  width: 45px;
}

.config-wrapper {
  width: calc(100% - 45px);
  height: 100vh;
}

.config-down-section {
  height: calc(100vh - 45px);
}
.fill-height {
  height: 100%;
}

.variableCards__overflow {
  height: calc(100vh - 90px);
  overflow-y: scroll;
}

.flex-end__container {
  display: flex !important;
  justify-content: flex-end;
}

.save-button {
  margin-top: 10px;
  border-radius: 0px !important;
  border-bottom-left-radius: 13px !important;
  border-top-left-radius: 13px !important;
}

.download-button {
  margin-top: 10px;
  border-radius: 0px !important;
  border-bottom-right-radius: 13px !important;
  border-top-right-radius: 13px !important;
}

.share-button {
  border-radius: 0px !important;
  margin-top: 10px;
}

.border-radius-none {
  border-radius: 0px !important;
}

* >>> .config-tabs > .v-tabs-bar {
  height: 46px;
}
* >>> .config-tabs > .v-slide-group > .v-slide-group__wrapper > .v-slide-group__content {
  margin-top: 5px;
}

*
  >>> .config-tabs
  > .v-slide-group
  > .v-slide-group__wrapper
  > .v-slide-group__content
  > .v-tab--active {
  background-color: #7972ac;
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

* >>> .config-tabs > .v-slide-group > .v-slide-group__wrapper > .v-slide-group__content > .v-tab {
  min-width: 40px;
  font-size: 0.8rem;
  padding: 0;
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

.limit-scroll {
  max-height: 60vh;
  overflow-y: scroll;
  overflow-x: hidden;
}

@media only screen and (max-width: 960px) {
  * >>> .config-tabs > .v-slide-group > .v-slide-group__wrapper > .v-slide-group__content > .v-tab {
    font-size: 0.68rem;
  }
}
</style>
