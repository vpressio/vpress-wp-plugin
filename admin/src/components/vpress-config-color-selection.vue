<template>
  <v-row class="ma-0 v-step-9">
    <v-col class="pa-0" v-for="schemeType in colorSchemes" :key="schemeType.colorSchemeType">
      <v-card flat class="ma-3">
        {{ schemeType.colorSchemeType }}
        <div style="display:flex">
          <v-card
            v-for="(scheme, schemeIndex) in schemeType.schemes"
            :key="`scheme_${schemeIndex}`"
            :width="schemeCardSize"
            hover
            flat
            class="ma-2"
            @click="selectColorScheme(scheme)"
          >
            <div
              v-for="(color, colorIndex) in scheme"
              :key="`color_${colorIndex}`"
            >
              <div
                v-if="colorIndex < 5"
                :style="{ backgroundColor: color, width: schemeCardSize, height: schemeCardSize }"
              >
              </div>
            </div>
          </v-card>
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>
<script>
export default {
  name: 'VpressColorSelection',
  data() {
    return {
      colorSchemes: [],
      schemeCardSize: '20px'
    };
  },
  created() {
    this.colorSchemes = this.$store.getters['chartConfig/availableColors'];
  },
  methods: {
    selectColorScheme(scheme) {
      this.$store.dispatch('chartConfig/UPDATE_CHART_COLORS', scheme);
    }
  }
};
</script>
