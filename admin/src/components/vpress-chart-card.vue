<template>
  <div>
    <v-card
      v-if="!deletedCard"
      :loading="loading"
      class="mx-auto"
    >
      {{ img_url }}
      <v-img
        width="95%"
        contain
        color="#222A32"
        :src="`/wp-content/uploads/vpress/images/${id}.png`"
      ></v-img>
      <v-card-title @click="createChart" class="link">
        {{ chartValues.title }}
      </v-card-title>
      <v-card-text>
        <div>
          {{ editedItem.description }}
        </div>
      </v-card-text>
      <v-divider class="mx-4"></v-divider>
      <v-card-text>
        <v-chip-group
          active-class="deep-purple accent-4 white--text"
          column
        >
          <v-chip
            v-for="item in editedItem.tags"
            :key="item"
            color="primary"
          >
            {{ item }}
          </v-chip>
        </v-chip-group>
      </v-card-text>
      <v-card-actions>
        <v-row class="px-4" align="center">
          <v-col>
            <span
              class="text-uppercase mr-2 font-weight-bold"
              :class="{ 'green--text': permissions === 'public', 'red--text': permissions !== 'public' }">
              {{ editedItem.permissions }}
            </span>
            <span class="grey--text">
              <v-icon small>mdi-clock-outline</v-icon>
              {{ updated }}
            </span>
          </v-col>
          <v-col class="d-flex justify-end">
            <v-btn icon color="primary" @click="dialog = true">
              <v-icon small>mdi-pencil</v-icon>
            </v-btn>
            <v-btn icon color="primary" @click="shareChart">
              <v-icon small>mdi-share-variant</v-icon>
            </v-btn>
            <v-btn icon color="error1" @click="deleteChart">
              <v-icon small>mdi-delete</v-icon>
            </v-btn>
          </v-col>
        </v-row>
      </v-card-actions>
    </v-card>
    <v-dialog v-model="dialog" max-width="500px" scrollable eager>
      <v-card>
        <v-toolbar dark flat color="primary">
          <v-toolbar-title>Editar</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon dark @click="close">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-divider></v-divider>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                <v-text-field v-model="editedItem.chartValues.title" label="Nombre"></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="editedItem.description"
                  rows="2"
                  auto-grow
                  label="Descripción"
                ></v-textarea>
              </v-col>
              <v-col cols="12">
                <v-combobox
                  v-model="editedItem.tags"
                  label="Etiquetas"
                  multiple
                  chips
                  deletable-chips
                ></v-combobox>
              </v-col>
              <v-col cols="12">
                <v-select
                  v-model="editedItem.permissions"
                  :items="[
                    { value: 'public', text: 'Público' },
                    { value: 'private', text: 'Privado' },
                  ]"
                  label="Permisos"
                ></v-select>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="close">Cancelar</v-btn>
          <v-btn color="primary" @click="save">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script>
import * as _ from 'lodash'
import loaderMixin from '../mixins/loaderMixin.js'
import api from '../utils/axios'

export default {
  name: 'VpressChartCard',
  mixins: [loaderMixin],
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
    dialog: false,
    loading: false,
    chartValues: {},
    deletedCard: false,
    editedItem: {
      chartValues: {
        title: '',
      },
      description: '',
      tags: '',
      permissions: ''
    }
  }),
  created() {
    this.chartValues = JSON.parse(this.value)
    this.editedItem = {
      chartValues: _.clone(this.chartValues),
      description: _.clone(this.description),
      tags: _.clone(this.tags),
      permissions: _.clone(this.permissions)
    }
  },
  methods: {
    async createChart () {
      try {
        this.loading = true
        const chart = await api.chart.get(this.id)
        const dataset = await api.dataset.get(this.dataset_id)
        this.editorInit( dataset.data.data, [ chart.data.data ])
        this.$router.push({ path: `/` })
      } catch (error) {
        this.loading = false
      }
    },
    async deleteChart() {
      try {
        this.loading = true
        const response = await api.chart.delete({ data: { id: parseInt(this.id) }});
        this.deletedCard = true
        this.loading = false
        return response
      } catch (error) {
        this.loading = false
        throw new Error(error.message)
      }
    },
    async save () {
      try {
        const response = await api.chart.update({
          id: parseInt(this.id),
          value: JSON.stringify(this.editedItem.chartValues),
          description: this.editedItem.description,
          tags: this.editedItem.tags.join(', '),
          permissions: this.editedItem.permissions
        });
        this.chartValues = this.editedItem.chartValues;
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        this.$store.dispatch('notifications/open', {
          color: 'success',
          text: 'Gráfica actualizada con éxito'
        })
      } catch (error) {
        throw new Error(error.message)
      }
      this.close()
    },
    shareChart() {
      try {
        const chartId = this.id
        if (chartId) {
          const iframe = `[vpress id=${chartId}]`
          navigator.clipboard.writeText(iframe);
          this.$store.dispatch('notifications/open', {
            color: 'success',
            text: 'Gráfica guardada al portapapeles'
          })
        } else {
          this.$store.dispatch('notifications/open', {
            color: 'warning',
            text: 'Primero debes de guardar la gráfica'
          })
          throw new Error('Gráfica no guardada.')
        }
      } catch (error) {
        throw new Error(error.message);
      }
    },
    close () {
      this.dialog = false
    },
  }
}
</script>

<style lang="scss" scoped>
.link {
  cursor: pointer
}
</style>
