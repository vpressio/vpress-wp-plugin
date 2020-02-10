<template>
  <v-responsive>
    <v-container>
      <v-row>
        <v-col>
          <h1>
            <strong>
              Modulo de carga de datos
            </strong>
            versión demo
          </h1>
        </v-col>
      </v-row>
      <v-row>
        <v-col :cols="tabIsNotZero" class="config">
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
              class="padding-none border-radius-none widthAll"
            >
              <v-tabs
                dark
                class="config-tabs"
                v-model="activeTab"
                background-color= "primary"
                color="white"
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
                      <v-card ref="card_slot_start" id="card_slot_start" flat class="pb-3">
                        <VpressVariableCard
                          v-for="(card, cardIndex) in dataTypes"
                          :key="`cardId_${cardIndex}`"
                          :id="`cardId_${cardIndex}`"
                          draggable="true"
                          :columnData="card"
                        >
                          {{ card.variableName }}
                        <span class="variableCardDataType"> {{ card.variableNameDataType }} </span>
                        </VpressVariableCard>
                        <!-- <VpressVariableCard id="cardId_100" draggable="true" :columnData="{variableNameDataType:'string',variableName: 'Hola' }">
                          Hola
                        </VpressVariableCard> -->
                        <v-divider/>
                      </v-card>
                      <v-row>
                        <v-col cols=6>
                          <VpressVariableCardSlot id="UPDATE_X_AXIS" ref="UPDATE_X_AXIS" slotLabel="Eje X"/>
                        </v-col>
                        <v-col cols=6>
                          <VpressVariableCardSlot id="UPDATE_Y_AXIS" ref="UPDATE_Y_AXIS" slotLabel="Eje Y"/>
                        </v-col>
                        <v-col cols=6>
                          <VpressVariableCardSlot id="UPDATE_GROUP_BY" ref="UPDATE_GROUP_BY" slotLabel="Agrupar"/>
                        </v-col>
                      </v-row>
                    </VpressExpansionPanel>
                  </v-card>
                </v-tab-item>
                <v-tab-item>
                  <v-card class="border-radius-none" flat dark color="#7972AC">
                    <VpressExpansionPanel panelTitle="FORMATO DE GRÁFICA">
                      <VpressInputControl inputName="Tipo de gráfica">
                        <v-select placeholder="Selecciona una gráfica"  :items="['barras', 'scatter', 'heatmap']" class="config-text-field" outlined/>
                      </VpressInputControl>
                      <VpressInputControl inputName="Título">
                        <v-text-field placeholder="Título" class="config-text-field" outlined/>
                      </VpressInputControl>
                      <VpressInputControl inputName="Color">
                        <v-text-field placeholder="Color" class="config-text-field" outlined/>
                      </VpressInputControl>
                      <VpressInputControl inputName="Prefijo">
                        <v-text-field placeholder="Prefijo" class="config-text-field" outlined/>
                      </VpressInputControl>
                    </VpressExpansionPanel>
                  </v-card>
                </v-tab-item>
              </v-tabs-items>
            </v-card>
          </v-card>
        </v-col>
        <v-col>
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
              <VpressStateSubscriber/>
            </v-card>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-responsive>
</template>
<script>
import LoadData from './LoadData.vue';
import VpressVariableCard from './vpress-variable-card.vue';
import VpressVariableCardSlot from './vpress-variable-card-slot.vue';
import VpressExpansionPanel from './vpress-expansionPanel.vue';
import VpressStateSubscriber from './vpress-state-subscriber.vue';
import VpressInputControl from './vpress-config-input.vue';

export default {
  name: 'VpressConfig',
  components: {
    LoadData,
    VpressVariableCard,
    VpressVariableCardSlot,
    VpressExpansionPanel,
    VpressStateSubscriber,
    VpressInputControl,
  },
  data() {
    return {
      activeTab: 0,
      dataTypes: [],
    };
  },
  computed: {
    tabIsNotZero() {
      
      return this.activeTab !== 0
        ? '4'
        : '12';
    },
  },
  methods: {
    tabChange(tabIndex) {
      this.activeTab = tabIndex;
      if (this.dataTypes.length === 0 && this.activeTab !== 0) {
        this.dataTypes = this.$store.getters[
          'data/dataType'
        ];
      }
    },
  },
};
</script>
<style scoped>
.widthFitContent{
  width: fit-content
}

.widthAll {
  width: 100%
}

.variableCardDataType{
  font-size:12px;
  font-weight: 500;
  color:#CFCFCF;
}

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

/* .graph-options{
  width: 100%;
} */

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

*>>>.config-tabs
  > .v-tabs-bar {
    height:40px;
}
*>>>.config-tabs
  > .v-slide-group
    > .v-slide-group__wrapper
      > .v-slide-group__content {
          margin-top: 5px;
}

*>>>.config-tabs
  > .v-slide-group
    > .v-slide-group__wrapper
      > .v-slide-group__content
        > .v-tab--active {
            background-color: #7972AC;
}

*>>>.config-tabs
  > .v-slide-group
    > .v-slide-group__wrapper
      > .v-slide-group__content 
        > .v-tabs-slider-wrapper
          > .v-tabs-slider {
            display: none;
}

*>>>.config-tabs
  > .v-slide-group
    > .v-slide-group__wrapper
      > .v-slide-group__content
        > .v-tab{
          font-size:0.8rem;
          min-width:87px;
        }

*>>>.config-text-field
  > .v-input__control
    > .v-input__slot {
      min-height: 30px;
      margin:0;
    }

*>>>.config-text-field
  > .v-input__control
    > .v-text-field__details {
      display: none;
    }
</style>
