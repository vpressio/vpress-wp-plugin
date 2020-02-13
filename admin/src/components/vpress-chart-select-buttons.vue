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
        >
          <v-img
            :src="requireImg(graph.chartType)"
            :alt="graphs.chartType"
            width="30"
            :gradient="graph.disabled ? '90deg, rgba(210,223,220,0) 33%, rgba(170,169,186,0.45281862745098034) 50%' : ''"
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