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
            label="Buscar por título, descripción o etiquetas"
            solo
            clearable
            v-model="q"
            hide-details
            prepend-inner-icon="mdi-magnify"
          ></v-text-field>
        </v-col>
        <v-col class="shrink pl-0">
          <v-btn
            large
            color="primary"
            type="submit"
          >
            Buscar
          </v-btn>
        </v-col>
      </v-row>
    </v-form>
    <v-divider class="my-6"></v-divider>
    <v-row v-show="loading" justify="center" align-content="center" style="height:300px;">
      <v-progress-circular
        :size="70"
        :width="7"
        color="primary"
        indeterminate
      />
    </v-row>
    <v-data-iterator
      v-show="!loading"
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
              :id="item.id"
              :dataset_id="item.dataset_id"
              :description="item.description"
              :permissions="item.permissions"
              :img_url="item.img_url"
              :updated="item.updated"
              :value="item.value"
              :tags="item.tags"
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
    items: []
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
        element.tags = element.tags
          ? element.tags.split(', ')
          : element.tags = []
      });
      this.items = data.data
      this.total = data.total
      this.loading = false
    }
  }
}
</script>
