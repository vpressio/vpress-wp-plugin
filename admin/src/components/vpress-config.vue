<template>
  <v-responsive style="min-height:100vh;width:100%;">
    <VpressAppBar/>
    <div class="config__container">
      <v-card
        class="border-radius-none"
        flat
        color="#222A32"
        :width="`${sideBarWidth}`"
        dark
      >
        <v-card
          class="pa-1 border-radius-none"
          color="#181D25"
          flat
        >
          <v-img
            class="vpress-icon"
            src="../assets/images/logo.svg"
          />
        </v-card>
      </v-card>
      <div style="width:100%">
        <v-row class="ma-0">
          <v-col
            class="pa-0"
            :cols="$vuetify.breakpoint.lgAndDown ? 3 : 2"
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
                CONFIGURA
              </v-tab>
              <v-tab :disabled="dataTypesCards.length === 0">
                ESTILO
              </v-tab>
            </v-tabs>
          </v-col>
          <v-col
            class="pa-0"
            :cols="this.$vuetify.breakpoint.lgAndDown ? 9 : 10"
          >
            <div class="tributton-container" v-show="activeTab !== 0">
              <v-btn
                class="left-button"
                outlined
                color="primary"
              >
                Guardar
              </v-btn>
              <v-btn
                class="middle-button"
                outlined
                color="primary"
              >
                Compartir
              </v-btn>
              <v-btn
                class="right-button"
                outlined
                color="primary"
              >
                Descargar
              </v-btn>
            </div>
          </v-col>
          <v-col
            class="pa-0"
            :cols="numberOfColsIftabIsNotZero"
          >
            <v-card flat>
            <v-tabs-items v-model="activeTab">
              <v-tab-item>
                <VpressDataLoader
                  :tabChange.sync="activeTab"
                />
              </v-tab-item>
              <v-tab-item>
                <VpressExpansionPanel panelTitle="ARRASTRA LA SELECCIÓN">
                  <v-row class="ma-0">
                    <v-col>
                      <VpressVariableCardStartContainer
                      :variableCards="dataTypesCards"
                      />
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
          <v-col
            v-if="numberOfColsIftabIsNotZero !== '12'"
            cols="2"
            class="py-0 px-3"
          >
            <v-card class="fill-height">
              <VpressVariableSlotsContainer/>
            </v-card>
          </v-col>
          <v-col
            v-if="numberOfColsIftabIsNotZero !== '12'"
            class="py-0 pl-0 pr-3"
            :cols="this.$vuetify.breakpoint.lgAndDown ? 7 : 8"
          >
            <v-card>
              <VpressStateSubscriber />
            </v-card>
          </v-col>
        </v-row>
      </div>
    </div>
  </v-responsive>
</template>
<script>
import VpressAppBar from './vpress-app-bar.vue';
import VpressDataLoader from './vpress-data-loader.vue';
import VpressVariableCardStartContainer from './vpress-variable-card-start-container';
import VpressVariableSlotsContainer from './vpress-variable-slots-container.vue';
import VpressExpansionPanel from './vpress-expansionPanel.vue';
import VpressStateSubscriber from './vpress-state-subscriber.vue';
import VpressInputControl from './vpress-config-input.vue';
import VpressColorSelection from './vpress-config-color-selection.vue';


export default {
  name: 'VpressConfig',
  components: {
    VpressAppBar,
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
      sideBarWidth:45
    };
  },
  computed: {
    numberOfColsIftabIsNotZero() {
      const colsOnlg = this.$vuetify.breakpoint.lgAndDown ? 3 : 2
      const numberOfCols = this.activeTab !== 0 ? colsOnlg : '12';

      return numberOfCols;
    },
    isDarkThemeActivated() {
      this.$store.dispatch('chartConfig/UPDATE_CHART_THEME', this.darkTheme);
      return this.$store.state.chartConfig.theme === 'dark' ? 'black' : '';
    },
    dataTypesCards(){
        return this.$store.getters['data/dataType'];
    },

  },
  methods: {
  }

};
</script>
<style  scoped>

.vpress-icon {
  width:40px;
  height: 40px;
}

.config__container {
  display:flex;
  min-height:calc(100vh - 40px);
  width:100%;
}

.fill-height {
  height:100%
}

.tributton-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
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

.border-radius-none {
  border-radius: 0px !important;
}

* >>> .config-tabs
> .v-tabs-bar {
  height: 46px;
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
  min-width:0px;
  font-size: 0.8rem;
  padding:0;
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
