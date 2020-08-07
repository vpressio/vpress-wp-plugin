<template>
  <v-card
    :loading="loading"
    class="mx-auto"
  >
    <v-img
      height="250"
      :src="image_default"
    ></v-img>
    <v-card-title>{{ title }}</v-card-title>
    <v-card-text>
      <div>
        {{ description }}
      </div>
    </v-card-text>
    <v-divider class="mx-4"></v-divider>
    <v-card-text>
      <v-chip-group
        active-class="deep-purple accent-4 white--text"
        column
      >
        <v-chip
          v-for="item in tags"
          :key="item"
          close
          color="primary"
        >
          {{ item }}
        </v-chip>
      </v-chip-group>
    </v-card-text>
    <v-card-actions>
      <v-row class="pa-4" align="center">
        <v-col>
          <strong class="success--text mr-2">
            {{ status }}
          </strong>
          <span class="grey--text">
            <v-icon small>mdi-clock-outline</v-icon>
            {{ updated }}
          </span>
        </v-col>
        <v-col class="shrink">
          <v-btn color="primary" text>
            <v-icon small left>mdi-pencil</v-icon>
            Editar
          </v-btn>
        </v-col>
      </v-row>
    </v-card-actions>
  </v-card>
</template>

<script>
export default {
  name: 'VpressChartCard',
  props: {
    image_url: {
      type: String,
      required: true,
      default: 'https://cdn.vuetifyjs.com/images/cards/cooking.png'
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    tags: {
      type: Array,
      required: true
    },
    status: {
      type: String,
      required: true
    },
    updated: {
      type: String,
      required: true
    },
  },
  data: () => ({
    loading: false
  }),
  computed: {
    image_default() {
      if (this.type === 'bars') {
        return require('../assets/images/grafica-barras.png')
      } else if (this.type === 'heatmap') {
        return require('../assets/images/grafica-heatmap.png')
      } else if (this.type === 'spineplot') {
        return require('../assets/images/grafica-spineplot.png')
      } else if (this.type === 'scatter') {
        return require('../assets/images/grafica-scatter.png')
      } else if (this.type === 'timeline') {
        return require('../assets/images/grafica-linea.png')
      } else {
        return 'https://cdn.vuetifyjs.com/images/cards/cooking.png'
      }
    }
  }
}
</script>
