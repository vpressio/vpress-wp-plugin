<template>
    <v-row>
      
      <v-col
        class="buttons-header py-0 pr-0"
        v-show="!$vuetify.breakpoint.smAndDown"
        xl="3"
        lg="3"
        md="3"
      >
        <v-toolbar flat height="58" color="primary" dark>
          Gráficos
          <br/>
          recomendados
        </v-toolbar>
      </v-col>
      <!--  <v-col
        xl="6"
        lg="6"
        md="6"
      >
       <v-menu
          v-for="(graph, graphIndex) in availableCharts"
          :key="graphIndex"
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
      </v-col>  -->
      <v-col
        class="py-0 pl-0"
        style="display:flex;"
        xl="9"
        lg="9"
        md="9"
      >
        <div class="px-3" style="width:15%;height:100%;display:flex; justify-content:center;align-items:center;background-color: #F2F2F2; color:#696969;line-height: 1;">
          Tipo de 
          <br/>
          gráficas
        </div>
        <v-toolbar flat height="58">
          <div>

          </div>
          <v-spacer/>
          <div style="display:flex;height:100%;align-items:center;">
            <v-divider class="tri-actions-divider" vertical/>
            <v-spacer/>
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
          </div>
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
</style>