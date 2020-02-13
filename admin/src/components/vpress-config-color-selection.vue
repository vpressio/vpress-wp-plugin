<template>
  <v-row>
    <v-col 
      v-for="schemeType in colorSchemes"
      :key="schemeType.colorSchemeType"
    >
      <v-card flat class="ma-3">
        {{ schemeType.colorSchemeType }}
        <div style="display:flex">
          <v-card 
            v-for="(scheme, schemeIndex) in schemeType.schemes"
            :key="`scheme_${schemeIndex}`"
            width="25"
            hover
            class="ma-2"
            @click="selectColorScheme(scheme)"
          >
            <div
              v-for="(color, colorIndex) in scheme"
              :key="`color_${colorIndex}`"
              :style="`background-color:${color}`"
              style="width:25px;height:25px;"
            >
            </div>
          </v-card>
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>
<script>
export default {
  name:"VpressColorSelection",
  data(){
    return {
      colorSchemes:[]
    }
  },
  created(){
    this.colorSchemes = this.$store.state.chartConfig.availableColors;
  },
  methods:{
    selectColorScheme(scheme) {
      this.$store.dispatch('chartConfig/UPDATE_CHART_COLORS', scheme);
    }
  }
}
</script>