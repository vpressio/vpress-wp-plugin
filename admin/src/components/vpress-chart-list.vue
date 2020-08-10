<template>
  <v-container>
    <v-form
      ref="form"
      @submit.prevent="getCharts"
      lazy-validation
    >
      <v-row justify="space-between">
        <v-col>
          <v-text-field
            name="search"
            label="Buscar por título, descripción o etiqueta"
            solo
            clearable
            v-model="q"
            hide-details
            prepend-inner-icon="mdi-magnify"
          ></v-text-field>
        </v-col>
        <v-col class="shrink">
          <v-btn
            large
            color="primary"
            class="mr-4"
            type="submit"
          >
            Buscar
          </v-btn>
        </v-col>
      </v-row>
    </v-form>
    <v-divider class="my-6"></v-divider>
    <v-data-iterator
      :items="items"
      :options.sync="options"
      :server-items-length="total"
      :loading="loading"
    >
      <template v-slot:default="props">
        <v-row>
          <v-col
            v-for="item in props.items"
            :key="item.id"
            cols="12"
            sm="4"
          >
            <vpress-chart-card
              :image_url="item.image_url"
              :title="item.title"
              :description="item.description"
              :tags="item.tags"
              :status="item.status"
              :updated="item.updated"
              :type="item.type"
            />
          </v-col>
        </v-row>
      </template>
    </v-data-iterator>
  </v-container>
</template>

<script>
import VpressChartCard from '@/components/vpress-chart-card.vue'

export default {
  name: 'VpressChartList',
  components: {
    VpressChartCard,
  },
  data: () => ({
    q: null,
    total: 0,
    options: {},
    loading: true,
    items: [
      {
        id: "1",
        image_url: 'https://cdn.vuetifyjs.com/images/cards/cooking.png',
        title: 'Gráfica COVID19',
        description: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s.',
        tags: ['Covid19', 'Por estado'],
        status: 'PÚBLICO',
        updated: 'Hoy 13:20'
      },
      {
        id: "2",
        image_url: 'https://cdn.vuetifyjs.com/images/cards/cooking.png',
        title: 'Gráfica COVID19',
        description: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s.',
        tags: ['Covid19', 'Por estado'],
        status: 'PÚBLICO',
        updated: 'Hoy 13:20'
      },
      {
        id: "3",
        image_url: 'https://cdn.vuetifyjs.com/images/cards/cooking.png',
        title: 'Gráfica COVID19',
        description: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s.',
        tags: ['Covid19', 'Por estado'],
        status: 'PÚBLICO',
        updated: 'Hoy 13:20'
      }
    ]
  }),
  watch: {
    options: {
      async handler () {
        await this.getCharts()
      },
      deep: true,
    },
  },
  methods: {
    async getCharts() {
      this.loading = true
      const { page, itemsPerPage } = this.options
      const obj = {
        page,
        itemsPerPage,
        q: this.q
      }
      const data = await this.$store.dispatch('data/GET_CHART_LIST', obj);
      data.data.forEach(element => {
        if (element.tags) {
          element.tags = element.tags.split(', ')
        }
        const value = JSON.parse(element.value)
        element.type = value.chart
      });
      this.items = data.data
      this.total = data.total
      this.loading = false
    }
  }
}
</script>
