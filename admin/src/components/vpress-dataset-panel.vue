<template>
  <v-expansion-panels variant="accordion" flat>
    <v-expansion-panel
      ref="dataset-panel"
      class="dataset-panel"
      v-for="item in items"
      :key="item.id"
      @group:selected="(selected) => selected.value && handleChange(item.id)"
    >
      <v-expansion-panel-title
        class="pa-0 text-subtitle-1"
        color="#F8F8F8"
      >
        <VpressDatasetCard
          :dataset="item"
          @on-dataset-delete="$emit('on-dataset-delete')"
          @on-dataset-refresh="$emit('on-dataset-refresh', $event)"
        />
      </v-expansion-panel-title>
      <v-expansion-panel-text
        class="pa-0"
        color="#F8F8F8"
      >
        <v-row
          class="py-5 database-content-min-height"
          v-show="loading"
          justify="center"
          align-content="center"
        >
          <v-progress-circular
            :size="70"
            :width="7"
            color="primary"
            indeterminate
          />
        </v-row>
        <v-row
          v-show="!loading"
        >
          <v-col cols="12" sm="3" md="3" class="dataset-vizzes">
            <div class="database-data-section" >
              <div class="text-subtitle-2">
                Base de datos
              </div>
              <div class="database-data-btn">
                <v-btn
                  size="small"
                  rounded
                  color="primary"
                  @click="setDataset(item)"
                >
                  Ver datos
                </v-btn>
              </div>
            </div>
            <v-spacer/>
            <v-divider
              vertical
            />
          </v-col>
          <v-col cols="12" sm="9" md="9">
            <div class="text-subtitle-2 mb-2">
                Gráficas hechas con la base de datos
            </div>
            <div
              v-show="datasetVizzes.length === 0"
              class="database-viz-section database-content-min-height"
            >
              <span class="initial-msg">
                Aquí se mostrarán las visualizaciones en las que hayas trabajado recientemente con esta base de datos.
              </span>
            </div>
            <v-slide-group
              v-show="datasetVizzes.length > 0"
              show-arrows
              center-active
            >
              <v-slide-group-item
                v-for="viz in datasetVizzes"
                :key="viz.id"
                v-slot:default="{}"
              >
                <v-card
                  class="database-viz database-content-min-height"
                  flat
                  color="#F8F8F8"
                >
                  <v-img
                    width="200px"
                    color="#222A32"
                    :src="viz.img_url"
                  />
                    <v-btn
                      size="small"
                      rounded
                      color="primary"
                      @click="loadViz(viz.id, viz.dataset_id)"
                    >
                      Entrar
                    </v-btn>
                </v-card>
              </v-slide-group-item>
            </v-slide-group>
          </v-col>
        </v-row>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>
<script>
import VpressDatasetCard from './vpress-dataset-card.vue'
import { loaderMixin, editorMixin } from '../mixins/index.js'
import api from '../utils/axios.js'

export default {
  name: 'VpressDatasetPanel',
  mixins: [loaderMixin, editorMixin],
  components: {
    VpressDatasetCard
  },
  props: {
    items: {
      type: Array,
      default: () => []
    }
  },
  emits: ['on-dataset-delete', 'on-dataset-refresh'],
  data() {
    return {
      loading: false,
      datasetVizzes: this.items,
    }
  },
  methods: {
    async handleChange(id) {
      try {
        this.loading = true
        this.datasetVizzes = []
        if(this.items.length > 0) {
          const { data } = await api.dataset.charts(id);
          this.datasetVizzes = data.data
        }
        this.loading = false
      } catch (error) {
        this.loading = false
        this.errorMessage = error.message;
      }
    },
    async loadViz(id, dataset_id) {
      try {
        this.loading
        const viz = await api.chart.get(id)
        const dataset = await api.dataset.get(dataset_id)
        await this.loadSavedViz(viz.data.data, dataset.data.data)
        this.$router.push({ path: `/editor/config`})
      } catch (error) {
        console.error(error);
      }
    },
    async setDataset (dataset) {
      try {
        await this.editorInit(dataset)
        this.$router.push('/data')
      } catch(error) {
        this.errorMessage = error.message;
      }
    },
  }
}
</script>
<style scoped>
.initial-msg {
  display: flex;
  justify-content: center;
  font-size: 1rem;
  text-align: center;
  color: #a19f9f;
}

.dataset-vizzes {
  display:flex;
  flex-direction:row
}

.database-data-section {
  width:100%
}

.database-data-btn {
  height:calc(100% - 22px);
  display:flex;
  justify-content: center;
  align-items:center
}

.database-content-min-height {
  min-height: 161px;
}

.database-viz-section {
  display:flex;
  align-items: center;
}

.database-viz {
  display:flex;
  align-items: center;
  flex-direction: column;
}

* :deep(.dataset-panel
> .v-expansion-panel-text
> .v-expansion-panel-text__wrapper){
  padding: 0;
}
</style>
