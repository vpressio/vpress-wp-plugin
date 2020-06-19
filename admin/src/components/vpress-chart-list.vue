<template>
  <v-container>
    <v-row justify="space-between">
      <v-col>
        <v-text-field
          name="search"
          label="Buscar"
          solo
          hide-details
          prepend-inner-icon="mdi-magnify"
        ></v-text-field>
      </v-col>
      <v-col class="text-right">
        <v-btn color="primary">
          Nueva gráfica
        </v-btn>
      </v-col>
    </v-row>
    <v-divider class="my-6"></v-divider>
    <v-data-iterator
      :items="items"
      :items-per-page.sync="itemsPerPage"
      hide-default-footer
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
  })
}
</script>
