<template>
  <v-responsive>
    <v-container fluid>
      <v-row>
        <v-col 
          :cols="numberOfColsIftabIsNotZero"
          class="config"
        >
          <v-card 
            class="graph-tools"
            flat
            color="#222A32"
            width="40"
            dark
          >
            <v-card
              class="pa-2"
              height="40"
              color="#181D25"
              flat
            >
              <v-img src="../assets/images/logo.svg"></v-img>
            </v-card>
          </v-card>
          <v-card class="graph-sidebar"  color="transparent">
            <v-card flat class="padding-none border-radius-none widthAll">
              <v-tabs
                dark
                class="config-tabs"
                v-model="activeTab"
                background-color="primary"
                color="white"
              >
                <v-tab>
                  DATOS
                </v-tab>
                <v-tab>
                  CONFIGURACIÓN
                </v-tab>
                <v-tab>
                  ESTILO
                </v-tab>
              </v-tabs>
              <v-tabs-items v-model="activeTab">
                <v-tab-item class="pa-5">
                  <VpressDataLoader :tabChange.sync="activeTab"/>
                </v-tab-item>
                <v-tab-item>
                  <v-card class="border-radius-none" flat>
                    <VpressExpansionPanel panelTitle="ARRASTRA LA SELECCIÓN">
                      <VpressVariableCardStartContainer :variableCards="dataTypesCards"/>
                      <VpressVariableCardSlots/>
                    </VpressExpansionPanel>
                  </v-card>
                </v-tab-item>
                <v-tab-item>
                  <v-card class="border-radius-none" flat dark>
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
                  </v-card>
                </v-tab-item>
              </v-tabs-items>
            </v-card>
          </v-card>
        </v-col>
        <v-col cols="7">
          <v-card
            v-if="activeTab !== 0"
            class="padding-y-none graph-display"
            flat
            color="transparent"
          >
            <v-card class="flex-end" flat color="transparent">
              <v-btn class="save-button" outlined color="primary">
                Guardar
              </v-btn>
              <v-btn class="download-button" outlined color="primary">
                Descargar
              </v-btn>
            </v-card>
            <v-card class="graph">
              <VpressStateSubscriber />
            </v-card>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-responsive>
</template>
<script>
import VpressDataLoader from './vpress-data-loader.vue';
import VpressVariableCardStartContainer from './vpress-variable-card-start-container';
import VpressVariableCardSlots from './vpress-variable-card-slots.vue';
import VpressExpansionPanel from './vpress-expansionPanel.vue';
import VpressStateSubscriber from './vpress-state-subscriber.vue';
import VpressInputControl from './vpress-config-input.vue';
import VpressColorSelection from './vpress-config-color-selection.vue';

export default {
  name: 'VpressConfig',
  components: {
    VpressDataLoader,
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
      const numberOfCols = this.activeTab !== 0 ? '5' : '12';

      return numberOfCols;
    },
    isDarkThemeActivated() {
      this.$store.dispatch('chartConfig/UPDATE_CHART_THEME', this.darkTheme);
      return this.$store.state.chartConfig.theme === 'dark' ? 'black' : '';
    },
    dataTypesCards(){
      if (this.activeTab === 1)
        return this.$store.getters['data/dataType'];
      return [];
    }
  },
  methods: {
    tabChange(tabIndex) {
      this.activeTab = tabIndex;
    }
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

.padding-y-none {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.padding-none {
  padding: 0 !important;
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
.config {
  display: flex;
  flex-wrap:wrap;
}

.border-radius-none {
  border-radius: 0px !important;
}

.graph-sidebar {
  width: calc(100% - 40px);
}
.graph-display {
  width: inherit;
}

.graph {
  margin: 12px 0 0 0;
}

* >>> .config-tabs
> .v-tabs-bar {
  height: 40px;
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
  width: fit-content;
  min-width: 40px;
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
