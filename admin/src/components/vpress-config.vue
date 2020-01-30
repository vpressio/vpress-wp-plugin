<template>
  <v-responsive>
    <h1>
      <strong>
        Modulo de carga de datos
      </strong>
      versión demo
    </h1>
    <v-container class="config" fluid>
      <v-card
        class="graph-tools"
        flat color="#222A32"
        width="50"
        dark
      >
        <v-card
          class="pa-2"
          height="48"
          color="#181D25"
          flat
        >
          <v-img src="../assets/images/logo.svg"></v-img>
        </v-card>
      </v-card>
      <v-card class="graph-sidebar" flat color="transparent">
        <v-card class="padding-none graph-options border-radius-none">
          <v-tabs
            class="config-tabs"
            v-model="tab"
            background-color="#382E82"
            color="white"
            dark
            @change="tabChange"
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
          <v-tabs-items v-model="tab">
            <v-tab-item>
              <v-card class="border-radius-none" outlined>
                <v-card-title>
                  <load-data/>
                </v-card-title>
              </v-card>
            </v-tab-item>
            <v-tab-item>
              <v-card class="border-radius-none" flat>
                <VpressExpansionPanel panelTitle="ARRASTRA LA SELECCIÓN">
                  <v-card-text>
                    ARRASTRA LA SELECCIÓN
                  </v-card-text>
                  <VpressVariableCard>
                    Propósito del viaje
                  </VpressVariableCard>
                  <v-divider/>
                  <v-row>
                    <v-col>
                      <VpressDimensionCard id="dimension_1">
                        <VpressVariableCard id="card-1" draggable="true">
                          Propósito del viaje
                        </VpressVariableCard>
                      </VpressDimensionCard>
                    </v-col>
                  </v-row>
                </VpressExpansionPanel>
              </v-card>
            </v-tab-item>
            <v-tab-item>
              <v-card class="border-radius-none" flat dark color="#7972AC">
                <VpressExpansionPanel panelTitle="Tìtulo">
                  <v-row>
                    <v-col>
                      Título
                    </v-col>
                    <v-col>
                      <v-switch >
                      </v-switch>
                    </v-col>
                  </v-row>
                  <v-row>
                    <v-col>
                      Título
                    </v-col>
                    <v-col>
                      <v-switch >
                      </v-switch>
                    </v-col>
                  </v-row>
                  <v-row>
                    <v-col>
                      Título
                    </v-col>
                    <v-col>
                      <v-switch >
                      </v-switch>
                    </v-col>
                  </v-row>
                </VpressExpansionPanel>
              </v-card>
            </v-tab-item>
          </v-tabs-items>
        </v-card>
        <v-card
          v-if="activeTab !== 0"
          class="padding-y-none graph-display"
          flat
          color="transparent"
        >
          <v-card class="flex-end" flat color="transparent">
            <v-btn class="save-button" outlined>
              Guardar
            </v-btn>
            <v-btn class="download-button" outlined>
              Descargar
            </v-btn>
          </v-card>
          <v-card class="graph">
            Gráficas
          </v-card>
        </v-card>
      </v-card>
    </v-container>
  </v-responsive>
</template>
<script>
import LoadData from './LoadData.vue';
import VpressVariableCard from './vpress-variable-card.vue';
import VpressDimensionCard from './vpress-dimension-card.vue';
import VpressExpansionPanel from './vpress-expansionPanel.vue';

export default {
  name: 'VpressConfig',
  components: {
    LoadData,
    VpressVariableCard,
    VpressDimensionCard,
    VpressExpansionPanel,
  },
  data() {
    return {
      tab: null,
      activeTab: 0,
    };
  },
  methods: {
    tabChange(tabIndex) {
      this.activeTab = tabIndex;
      console.log(this.$store.state);
    },
  },
};
</script>
<style>
.padding-y-none{
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.padding-none{
  padding:0 !important;
}

.flex-end{
  display: flex !important;
  justify-content: flex-end;
}

.save-button{
  margin-top:10px;
  border-radius: 0px !important;
  border-bottom-left-radius: 13px !important;
  border-top-left-radius: 13px !important;
}

.download-button{
  margin-top:10px;
  border-radius: 0px !important;
  border-bottom-right-radius: 13px !important;
  border-top-right-radius: 13px !important;
}

.graph-tools{
  border-radius:0px !important;
}
.config{
  display: flex;
}

.border-radius-none{
  border-radius: 0px !important;
}

.graph-options{
  width: fit-content;
}

.graph-sidebar{
  display: flex !important;
  width: inherit;
}
.graph-display{
  width: inherit
}

.graph {
  margin: 12px 0 0 12px;
}

.config-tabs
  > .v-slide-group
    > .v-slide-group__wrapper
      > .v-slide-group__content {
  /* border: red solid 0.5px !important; */
  margin-top: 5px;
}

.config-tabs
  > .v-slide-group
    > .v-slide-group__wrapper
      > .v-slide-group__content
        > .v-tab--active {
  background-color: #7972AC
}

.config-tabs
  > .v-slide-group
    > .v-slide-group__wrapper
      > .v-slide-group__content
        > .v-tabs-slider-wrapper
          > .v-tabs-slider {
  display: none
}
</style>
