<template>
  <div class="vpress-navigation-view">
    <VpressAppBar/>
    <v-row class="px-5">
      <v-col
        cols="3"
        class="pb-0"
      >
        <VpressSectionBar/>
        <v-card v-if="$attrs.section === 'config'" style="min-height: 600px;">
          <div class="px-5">
            <!-- <v-img class="db-icon" src="../assets/images/db1.svg" /> -->
            <span class="db-titulo">
              {{ activeDataset | name }}
            </span>
            <v-divider/>
          </div>
          <VpressVariableContainer/>
        </v-card>
        <v-card v-if="$attrs.section === 'style'" style="min-height: 600px;">
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
        </v-card>
      </v-col>
      <v-col
        cols="3"
        class="pb-0"
      >
        <v-toolbar class="text-center" color="primary" dark flat height="58">
          <v-spacer/>
          <div class="text-subtitle-2">
            Arrastra tu selección
          </div>
          <v-spacer/>
        </v-toolbar>
        <v-card style="min-height: 600px;">
          <VpressSlotGroup/>
        </v-card>
      </v-col>
      <v-col>
            <VpressChartSelectButtons/>
          <v-card>
            <VpressChartGroup/>
          </v-card>
      </v-col>
    </v-row>
  </div>
</template>
<script>
import VpressAppBar from '../components/vpress-app-bar.vue'
import VpressSectionBar from '../components/vpress-section-bar.vue'
import VpressVariableContainer from '../components/vpress-variable-container.vue'
import VpressSlotGroup from '../components/vpress-slot-group.vue'
import VpressChartSelectButtons from '../components/vpress-chart-select-buttons.vue';
import VpressChartGroup from '../components/vpress-chart-group.vue'
import VpressExpansionPanel from '../components/vpress-expansion-panel.vue'
import VpressInputControl from '../components/vpress-config-input.vue'
import VpressColorSelection from '../components/vpress-config-color-selection.vue'

export default {
  name: 'VpressEditorModule',
  components: {
    VpressAppBar,
    VpressSectionBar,
    VpressVariableContainer,
    VpressSlotGroup,
    VpressChartSelectButtons,
    VpressChartGroup,
    VpressExpansionPanel,
    VpressInputControl,
    VpressColorSelection

  },
  filters: {
    name(dataset){ 
      return dataset ? dataset.name : ''
    }
  },
  computed: {
    activeDataset() {
      const dataset = this.$store.getters['workspace/activeDataset']
      // eslint-disable-next-line vue/no-side-effects-in-computed-properties
      if (!dataset) this.activeTab = 0
      return dataset
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
</style>