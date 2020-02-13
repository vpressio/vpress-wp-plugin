<template>
  <v-card flat class="px-2 py-3">
    <v-row>
      <v-col cols="2" style="border-right:solid 0.5px; padding-left:32px">
        TIPOS DE GRÁFICOS
      </v-col>
      <v-col>
        <v-btn
          v-for="(graph, graphIndex) in availableCharts"
          :key="graphIndex"
          text
          @click="setChartType(graph.chartType)"
          :disabled="graph.disabled"
        >
          <v-img
            :src="requireImg(graph.chartType)"
            :alt="graph.chartType"
            width="30"
            :class="graph.disabled ? 'grey darken-1' : ''"
          ></v-img>
        </v-btn>
      </v-col>
    </v-row>
  </v-card>
</template>
<script>
export default {
  name:"VpressChartSelectButtons",
  props:['availableCharts'],
  data(){
    return {
      graphs:[]
    }
  },
  methods:{
    setChartType(chartType){
      this.$store.dispatch('chartConfig/UPDATE_CHART_TYPE', chartType);
    },
    requireImg(chartType) {
      return require( `../assets/images/${chartType}.svg`);
    }
  }
}
</script>