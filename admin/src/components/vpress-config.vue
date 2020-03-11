<template>
  <v-responsive>
    <div style="display:flex">
    <div>
      <v-card 
        class="border-radius-none"
        flat
        color="#222A32"
        width="50"
        style="height:100%"
        dark
      >
        <v-card
          class="pa-1 border-radius-none"
          color="#181D25"
          flat
        >
          <v-img
            style="height:40px;width:40px"
            src="../assets/images/logo.svg"
          />
        </v-card>
      </v-card>
    </div>
    <div>
      <v-row class="ma-0">
        <v-col 
          :cols="4"
          class="pa-0"
          style="display:flex"
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
            <v-tab :disabled="dataTypesCards.length === 0">
              CONFIGURACIÓN
            </v-tab>
            <v-tab :disabled="dataTypesCards.length === 0">
              ESTILO
            </v-tab>
          </v-tabs>
        </v-col>
        <v-col cols="8" style="border:solid" class="pa-0">
          <v-card class="flex-end" flat color="transparent">
              <v-btn class="save-button" outlined color="primary">
                Guardar
              </v-btn>
              <v-btn class="download-button" outlined color="primary">
                Descargar
              </v-btn>
            </v-card>
        </v-col>
      </v-row>
      <v-row class="ma-0">
        <v-col cols="4" class="pa-0">
            <v-card flat class="pa-0 border-radius-none">
              <v-tabs-items v-model="activeTab">
                <v-tab-item>
                  <!-- <VpressDataLoader :tabChange.sync="activeTab"/> -->
                </v-tab-item>
                <v-tab-item>
                  <VpressExpansionPanel panelTitle="ARRASTRA LA SELECCIÓN">
                    <v-row class="ma-0">
                      <v-col cols="6">
                        <VpressVariableCardStartContainer
                        :variableCards="dataTypesCards"
                        />
                      </v-col>
                      <v-col cols="6">
                        <VpressVariableCardSlots/>
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
                      <VpressColorSelection/>
                    </VpressExpansionPanel>
                </v-tab-item>
              </v-tabs-items>
            </v-card>
        </v-col>
        <v-col cols="8" v-if="activeTab !== 0">
          <v-card flat class="graph">
            <VpressStateSubscriber />
          </v-card>
        </v-col>
      </v-row>
    </div>
    </div>
  </v-responsive>
</template>
<script>
// import VpressDataLoader from './vpress-data-loader.vue';
import VpressVariableCardStartContainer from './vpress-variable-card-start-container';
import VpressVariableCardSlots from './vpress-variable-card-slots.vue';
import VpressExpansionPanel from './vpress-expansionPanel.vue';
import VpressStateSubscriber from './vpress-state-subscriber.vue';
import VpressInputControl from './vpress-config-input.vue';
import VpressColorSelection from './vpress-config-color-selection.vue';

export default {
  name: 'VpressConfig',
  components: {
    // VpressDataLoader,
    VpressVariableCardStartContainer,
    VpressVariableCardSlots,
    VpressExpansionPanel,
    VpressStateSubscriber,
    VpressInputControl,
    VpressColorSelection
  },
  data() {
    return {
      activeTab: 0,
      darkTheme: false
    };
  },
  computed: {
    numberOfColsIftabIsNotZero() {
      return '5'
      // const numberOfCols = this.activeTab !== 0 ? '5' : '12';

      // return numberOfCols;
    },
    isDarkThemeActivated() {
      this.$store.dispatch('chartConfig/UPDATE_CHART_THEME', this.darkTheme);
      return this.$store.state.chartConfig.theme === 'dark' ? 'black' : '';
    },
    dataTypesCards(){
      // eslint-disable-next-line
        return this.$store.getters['data/dataType'];
    },

  },
  methods: {
  }

};
</script>
<style  scoped>
.widthFitContent {
  width: fit-content;
}

.widthAll {
  width: 100%;
}

.flex-end {
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

.graph-tools {
  border-radius: 0px !important;
}

.border-radius-none {
  border-radius: 0px !important;
}

.graph-display {
  width: inherit;
}

.graph {
  margin: 12px 0 0 0;
}

* >>> .config-tabs
> .v-tabs-bar {
  height: 50px;
}
* >>> .config-tabs
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
  background-color: #7972AC;
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

* >>> .config-tabs
> .v-slide-group
> .v-slide-group__wrapper
> .v-slide-group__content
> .v-tab {
  font-size: 0.8rem;
  min-width: 50px;
}

* >>> .config-text-field
> .v-input__control
> .v-input__slot {
  min-height: 30px;
  margin: 0;
}

* >>> .config-text-field
> .v-input__control
> .v-text-field__details {
  display: none;
}

* >>> .config-switch
> .v-input__control
> .v-messages {
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
  * >>> .config-tabs
  > .v-slide-group
  > .v-slide-group__wrapper
  > .v-slide-group__content
  > .v-tab {
  font-size: 0.68rem;
}
}

</style>
