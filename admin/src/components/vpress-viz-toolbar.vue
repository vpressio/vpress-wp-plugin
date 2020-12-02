<template>
    <v-row>
      <v-col
        class="buttons-header py-0 pr-0"
        v-show="!$vuetify.breakpoint.smAndDown"
        cols="3"
      >
        <v-toolbar flat height="58" color="primary" dark>
          Gráficos
          <br/>
          recomendados
        </v-toolbar>
      </v-col>
      <v-col
        class="py-0 pl-0"
        style="display:flex;"
        cols="9"
      >
        <v-toolbar flat height="58" color="#F8F8F8">
          <v-row>
            <v-col cols="2">
              <div class="viz-list-header">
                Tipo de 
                <br/>
                gráficas
              </div>
            </v-col>
            <v-col cols="7" style="background-color: #FFF">
              <v-slide-group show-arrows >
                <v-slide-item
                  v-for="(graph, graphIndex) in availableCharts"
                  :key="graphIndex"
                >
                  <v-menu
                      open-on-hover
                      :close-on-content-click="false"
                      max-width="205"
                      offset-y
                      attach
                    >
                      <template v-slot:activator="{ on, attrs }">
                        <v-btn
                          :disabled="graph.disabled"
                          :class="graph.disabled ? 'grey lighten-1' : ''"
                          text
                          @click="setChartType(graph.type)"
                          class="mx-1"
                          v-bind="attrs"
                          v-on="on"
                        >
                          <v-img
                            :src="requireImg(graph.type)"
                            :alt="graph.type"
                            :width="graph.type === 'map' ? 35 : 30"
                            :height="graph.type === 'map' ? 24 : 30"
                          />
                        </v-btn>
                      </template>
                      <v-card>
                        <v-card-text>
                          <h6 class="text-subtitle-1 font-weight-bold">{{ graph.type }}</h6>
                          <div v-for=" (rule, ruleIdx) in graph.chartRules" :key="ruleIdx">
                            {{rule.msg}}
                            <div v-for="(chip, chipIdx) in rule.vars" :key="chipIdx">
                              {{ chip.msg }}
                              <v-chip
                                class="ma-2"
                              >
                                {{ chip.type }}
                              </v-chip>
                            </div>
                          </div>
                        </v-card-text>
                      </v-card>
                    </v-menu> 
                </v-slide-item>
              </v-slide-group>
            </v-col>
            <v-col cols="2" style="background-color: #FFF;display:flex;height:100%;align-items:center;width:20%">
              <v-divider class="tri-actions-divider" vertical/>
              <v-btn icon @click="saveChart">
                <img src="../assets/images/Guardar.svg" alt="" width="20" height="20">
              </v-btn>
              <v-spacer/>
              <v-btn icon @click="downloadChartImg">
                <img src="../assets/images/Descargar.svg" alt="" width="20" height="20">
              </v-btn>
              <v-spacer/>
              <v-btn icon @click="clipboardCopy">
                <img src="../assets/images/Compartir.svg" alt="" width="20" height="20">
              </v-btn>
              <v-spacer/>
            </v-col>
          </v-row>
        </v-toolbar>
      </v-col>
    </v-row>
</template>
<script>
import { downloadChart, stringChart } from '../utils/downloadChart.js'

export default {
  name: 'VpressVizToolbar',
  computed: {
    availableCharts() {
      return this.$store.getters['editor/getAvailableCharts']
    },
  },
  methods: {
    async setChartType(chartType) {
      this.merge_value(
        { mutationType:'chart' , value: chartType}
      );
    },
    requireImg(chartType) {
      try {
        return require(`../assets/images/${chartType}.svg`);
      } catch (error) {
        return require('../assets/images/spineplot.svg')
      }
    },
    async saveChart() {
      try {
        await this.$store.dispatch('editor/SAVE_CHART');
        stringChart(
          `#empty_chart_0`,
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
      downloadChart(`#empty_chart_0`)
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
}
</script>
<style scoped>
.tri-actions-divider {
  border-color: #5D5799;
}

.viz-list-header {
  width:100%;
  height:100%;
  display:flex;
  justify-content:center;
  align-items:center;
  background-color: #F2F2F2;
  color:#696969;
  line-height: 1;
}

</style>