<template>
  <div class="viz-toolbar" :style="cssProps">
    <div class="viz-list-header text-subtitle-2 font-weight-regular">
      <v-spacer/>
      <img 
        :src="require('../assets/images/graficos-recomendados.svg')"
        alt="viz"
        width="30px"
        height="30px"
      />
      <v-spacer/>
        Tipo de 
        <br/>
        gráficas
      <v-spacer/>
    </div>
    <v-spacer/>
      <div class="slide-container">
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
                :z-index="10000"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-btn
                    :class="graph.disabled ? 'lighten-1' : ''"
                    text
                    @click="setChartType(graph)"
                    class="mx-1"
                    v-bind="attrs"
                    v-on="on"
                  >
                    <img
                      :class="{ 'disabled-img': graph.disabled }"
                      :src="requireImg(graph.type)"
                      :alt="graph.type"
                      :width="graph.type === 'map' ? 35 : 30"
                      :height="graph.type === 'map' ? 24 : 30"
                    />
                  </v-btn>
                </template>
                <v-card>
                  <v-card-text>
                    <h6 class="text-subtitle-2 font-weight-bold">{{ graph.type }}</h6>
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
      </div>
      <v-spacer/>
      <div class="tri-actions-container">
        <v-divider class="tri-actions-divider" vertical/>
        <v-spacer/>
        <v-btn icon @click="saveChart">
          <img :src="require('../assets/images/Guardar.svg')" alt="" width="20" height="20"/>
        </v-btn>
        <v-spacer/>
        <v-btn icon @click="downloadChartImg">
          <img :src="require('../assets/images/Descargar.svg')" alt="" width="20" height="20"/>
        </v-btn>
        <v-spacer/>
        <v-btn icon @click="clipboardCopy">
          <img :src="require('../assets/images/Compartir.svg')" alt="" width="20" height="20"/>
        </v-btn>
        <v-spacer/>
      </div>
      <v-spacer/>
    </div>
</template>
<script>
import { downloadChart, stringChart } from '../utils/downloadChart.js'
import { editorMixin } from '../mixins/index.js'

export default {
  name: 'VpressVizToolbar',
  mixins: [editorMixin],
  computed: {
    cssProps() {
      return {
        '--primary': this.$vuetify.theme.themes.light.primary
      }
    },
    availableCharts() {
      return this.$store.getters['editor/getAvailableCharts']
    },
  },
  methods: {
    async setChartType(viz) {
      if(!viz.disabled) {
        this.merge_value(
          { mutationType:'chart' , value: viz.type}
        );
      }
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
  border-width: 1px;
}

.viz-list-header {
  width:20%;
  height: 58px;
  display:flex;
  justify-content:center;
  align-items:center;
  background-color: var(--primary);
  color:#FFF;
  /* background-color: #F2F2F2;
  color:#696969; */
  line-height: 1;
}
.viz-toolbar{
  display:flex;
  width:100%;
  height:58px;
}

.slide-container{
  height:58px;
  width:60%;
  display:flex;
  justify-content:center;
  align-items:center;
  border-bottom: solid 2px #F2F2F2;
}

.tri-actions-container{
  display:flex;
  height:58px;
  align-items:center;
  width:20%;
  border-bottom: solid 2px #F2F2F2;
  padding: 0.6% 0%;
}

.disabled-img {
  opacity: 0.5;
}

</style>