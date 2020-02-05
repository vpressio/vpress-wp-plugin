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
      <v-card
        class="graph-sidebar"
        flat
        color="transparent"
      >
        <v-card
          class="padding-none graph-options border-radius-none"
        >
          <v-tabs
            class="config-tabs"
            v-model="activeTab"
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
          <v-tabs-items v-model="activeTab">
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
                  <v-card id="card_slot_start">
                    <VpressVariableCard id="prueba" draggable="true">
                      QUIBUO
                    </VpressVariableCard>
                    <VpressVariableCard 
                      v-for="(card, cardIndex) in dataTypes"
                      :key="`cardId_${cardIndex}`"
                      :id="`cardId_${cardIndex}`"
                      draggable="true"
                    >
                      {{ card.variableName }}
                    </VpressVariableCard>
                  </v-card>
                  <v-divider/>
                  <v-row>
                    <v-col cols=6>
                      <VpressVariableCardSlot id="dimension_1"/>
                    </v-col>
                    <v-col cols=6>
                      <VpressVariableCardSlot id="dimension_2"/>
                    </v-col>
                    <v-col cols=6>
                      <VpressVariableCardSlot id="dimension_2"/>
                    </v-col>
                    <v-col cols=6>
                      <VpressVariableCardSlot id="dimension_2"/>
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
import VpressVariableCardSlot from './vpress-variable-card-slot.vue';
import VpressExpansionPanel from './vpress-expansionPanel.vue';

export default {
  name: 'VpressConfig',
  components: {
    LoadData,
    VpressVariableCard,
    VpressVariableCardSlot,
    VpressExpansionPanel,
  },
  data() {
    return {
      tab: null,
      activeTab: 0,
      dataTypes: [],
    };
  },
  methods: {
    tabChange(tabIndex) {
      this.activeTab = tabIndex;
      console.log(this.dataTypes);
      if (this.dataTypes) {
        this.dataTypes = this.$store.getters[
          'data/dataType"'
        ];
      }
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
  width: 100%;
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
  > .v-tabs-bar {
    height:40px;
}
.config-tabs
  > .v-slide-group
    > .v-slide-group__wrapper
      > .v-slide-group__content {
          margin-top: 5px;
}

.config-tabs
  > .v-slide-group
    > .v-slide-group__wrapper
      > .v-slide-group__content
        > .v-tab--active {
            background-color: #7972AC;
}

.config-tabs
  > .v-slide-group
    > .v-slide-group__wrapper
      > .v-slide-group__content
        > .v-tabs-slider-wrapper
          > .v-tabs-slider {
              display: none;
}

.config-tabs
  > .v-slide-group
    > .v-slide-group__wrapper
      > .v-slide-group__content
        > .v-tab{
          font-size:0.8rem;
          min-width:87px;
        }
</style>
