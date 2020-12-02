<template>
  <v-row class="ma-0 v-step-9">
    <v-col class="pa-0" v-for="schemeType in colorSchemes" :key="schemeType.colorSchemeType">
      <div flat class="ma-3 schema-label-size">
        {{ schemeType.colorSchemeType }}
        <div class="schemes-container">
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
      </div>
    </v-col>
  </v-row>
</template>
<script>
import { editorMixin } from '../mixins/index.js'

export default {
  name: 'VpressColorSelection',
  mixins: [editorMixin],
  data() {
    return {
      schemeCardSize: '20px',
      colorSchemes: [
          {
            colorSchemeType: 'SECUENCIAL',
            schemes: [
              ['#40348c', '#842f8e', '#ba2982', '#e2346d', '#fc5353', '#ff7b33', '#ffa600'],
              ['#7a0177', '#c51b8a', '#f768a1', '#fbb4b9', '#feebe2'],
              ['#253494', '#2c7fb8', '#41b6c4', '#a1dab4', '#ffffcc'],
              ['#54278f', '#756bb1', '#9e9ac8', '#cbc9e2', '#f2f0f7'],
              ['#fcff9d', '#f6ca3b', '#f9901a', '#e85f2e', '#c63d46', '#9e2b5d', '#721968', '#4a0067', '#261045', '#00000e']
            ]
          },
          {
            colorSchemeType: 'DIVERGENTE',
            schemes: [
              ['#e66101', '#fdb863', '#f7f7f7', '#b2abd2', '#5e3c99'],
              ['#d7191c', '#fdae61', '#ffffbf', '#abd9e9', '#2c7bb6']
            ]
          },
          {
            colorSchemeType: 'CUALITATIVO',
            schemes: [
              ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f'],
              ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628']
            ]
          }
        ]
    };
  },
  methods: {
    selectColorScheme(scheme) {
      this.merge_value({ mutationType: 'colors', value: scheme })
    }
  }
};
</script>
<style scoped>

.schema-label-size {
  font-size: 0.8rem;
}

.schemes-container {
  display:flex;
}
</style>