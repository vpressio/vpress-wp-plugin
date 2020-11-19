<template>
  <!-- <v-data-table
        v-show="!loading"
        :headers="headers"
        :items="items"
        :options.sync="options"
        :server-items-length="total"
        :loading="loading"
        :expanded.sync="expanded"
        show-expand
        single-expand
        hide-default-header
      >
        <template v-slot:[`item.name`]="{ item }" >
          <div>
            <v-text-field
              solo
              flat
              dense
              hide-details
              :loading="loading"
              label="Agregar título"
              v-model.trim="item.name"
              background-color="transparent"
              @keyup.enter="editItem(item); save()"
            >
            </v-text-field>
            <v-textarea
              solo
              flat
              dense
              rows="2"
              no-resize
              single-line
              hide-details
              :loading="loading"
              label="Agregar descripción"
              v-model.trim="item.description"
              background-color="transparent"
              @keydown.enter.prevent=""
              @keyup.enter="editItem(item); save()"
            >
            </v-textarea>
          </div>
        </template>
        <template v-slot:[`item.permissions`]="{ item }">
          <p
            @click="editItem(item); editedItem.permissions === 'public' ? editedItem.permissions = 'private' : editedItem.permissions = 'public'; save()"
            class="link text-uppercase font-weight-bold"
            :class="{ 'green--text': item.permissions === 'public', 'red--text': item.permissions !== 'public' }"
          >
            {{ item.permissions }}
          </p>
        </template>
        <template v-slot:[`item.size`]="{ item }">
          {{ item.size }}
        </template>
        <template v-slot:[`item.rows`]="{ item }">
          ~{{ item.rows | intFromat }} filas
        </template>
        <template v-slot:[`item.tag`]="{ item }">
          <v-chip color="primary" small class="mr-1" v-for="t in item.tag" :key="t">
            {{ t }}
          </v-chip>
        </template>
        <template v-slot:[`item.actions`]="{ item }">
          <v-btn icon color="error" @click="confirmDeletion(item)">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </template>
        <template v-slot:no-data>
          <v-btn color="primary" @click="getDatasets">Reiniciar</v-btn>
        </template>
        <template v-slot:expanded-item="{ headers, item }">
          <td :colspan="headers.length">
            <v-container>
              <v-row>
                <v-col cols="4" sm="2">
                  <div class="subtitle-2 mb-2">
                    Base de datos
                  </div>
                  <v-btn
                    small
                    rounded
                    class="mt-12"
                    color="primary"
                    @click="setDataset(item)"
                  >
                    Ver datos
                  </v-btn>
                </v-col>
                <v-col cols="8" sm="10">
                  <div class="subtitle-2 mb-2">
                    Gráficas hechas con la base de datos
                  </div>
                  
                </v-col>
              </v-row>
            </v-container>
          </td>
        </template>
      </v-data-table> -->
  <v-expansion-panels flat>
    <v-expansion-panel
      ref="dataset-panel"
      class="dataset-panel"
      v-for="item in items"
      :key="item.id"
      hover
      @change="handleChange(item.id)"
    >
      <v-expansion-panel-header
        class="pa-0 subtitle-1"
        color="#F8F8F8"
      >
        {{ item.name }}
      </v-expansion-panel-header>
      <v-expansion-panel-content
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
          <v-col xs="12" sm="3" md="3" class="dataset-vizzes">
            <div class="database-data-section" >
              <div class="subtitle-2">
                Base de datos
              </div>
              <div class="database-data-btn">
                <v-btn
                  small
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
          <v-col xs="12" sm="9" md="9">
            <div class="subtitle-2 mb-2">
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
            >
              <v-slide-item
                v-for="viz in datasetVizzes"
                :key="viz.id"
                center-active
                v-slot:default="{}"
              >
                <v-card
                  class="database-viz database-content-min-height"
                  flat
                  color="#F8F8F8"
                >
                  <v-img
                    width="200px"
                    contain
                    color="#222A32"
                    :src="viz.img_url"
                  />
                    <v-btn
                      small
                      rounded
                      color="primary"
                      @click="loadViz(viz.id, viz.dataset_id)"
                    >
                      Entrar
                    </v-btn>
                </v-card>
              </v-slide-item>
            </v-slide-group>
          </v-col>
        </v-row>
      </v-expansion-panel-content>
      <v-divider/>
    </v-expansion-panel>
  </v-expansion-panels>
</template>
<script>
import { loaderMixin, editorMixin } from '../mixins/index.js'
import api from '../utils/axios.js'

export default {
  name: 'VpressDatasetPanel',
  mixins: [loaderMixin, editorMixin],
  props: {
    items: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      loading: false,
      datasetVizzes: this.items
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
        console.error(error);
      }
    },
    async loadViz(id, dataset_id) {
      const viz = await api.chart.get(id)
      const dataset = await api.dataset.get(dataset_id)
      await this.loadSavedViz(viz.data.data, dataset.data.data)
      this.$router.push({ path: `/editor`, query: { tab: 1 } })
    },
    async setDataset (dataset) {
      try {
        await this.editorInit(dataset)
        this.$router.push('/')
      } catch(error) {
        this.errorMessage = error.message;
      }
    }
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

*>>> .dataset-panel
> .v-expansion-panel-content
> .v-expansion-panel-content__wrap{
  padding: 0;
}
</style>

