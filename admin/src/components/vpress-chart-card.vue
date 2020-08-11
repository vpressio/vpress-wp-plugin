<template>
  <v-card
    :loading="loading"
    class="mx-auto"
  >
    <v-img
      height="250"
      :src="requireImg(chartValues.chart)"
    ></v-img>
    <v-card-title>{{ chartValues.title }}</v-card-title>
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
            {{ permissions }}
          </strong>
          <span class="grey--text">
            <v-icon small>mdi-clock-outline</v-icon>
            {{ updated }}
          </span>
        </v-col>
        <v-col class="shrink">
          <v-btn color="primary" text @click="createChart">
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
    id: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required:true
    },
    dataset_id: {
      type: String,
      required: true
    },
    img_url: {
      type: String,
      required: true,
      default: 'https://cdn.vuetifyjs.com/images/cards/cooking.png'
    },
    description: {
      type: String,
      required: true
    },
    permissions: {
      type: String,
      required: true
    },
    tags: {
      type: Array,
      required: true
    },
    updated: {
      type: String,
      required: true
    }
  },
  data: () => ({
    loading: false,
    chartValues: {}
  }),
  created() {
    this.chartValues = JSON.parse(this.value)
  },
  methods: {
    async createChart () {                                      
      this.loading = true
      await this.$store.dispatch('chartConfig/SET_WP_CHART', this.id)
      this.$router.push({path: `/chart/${this.id}`})
    },
    requireImg(chartType) {
      try {
        return require(`../assets/images/${chartType}.png`);
      } catch (error) {
        console.error(error.message)
        return require('../assets/images/spineplot.png')
      }
    }
  }
}
</script>
