<template>
<v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-btn>
          Heatmap
        </v-btn>
        <v-btn>
          Bars
        </v-btn>
        <v-btn>
          Scatter
        </v-btn>
      </v-col>
      <v-col style="border:solid">
        <vpressChart/>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import VpressChart from '../components/vpress-chart.vue'
import Vpress from '../plugins/vpress/index'

export default {
  components: {
    VpressChart
  },
  created() {
    Vpress
  }
}
</script>