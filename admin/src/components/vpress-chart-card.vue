<template>
  <div>
    <v-card
      v-if="!deletedCard"
      :loading="loading"
      class="mx-auto"
    >
      <v-img
        contain
        color="#222A32"
        class="link"
        :src="img_url"
        @click="createChart"
      ></v-img>
      <v-card-title class="link">
        <v-text-field
          solo
          flat
          dense
          hide-details
          label="Agregar título"
          v-model.trim="editedItem.chartValues.title"
          :loading="loading"
          @keyup.enter="save"
          @click="editedTitle = true"
          :readonly="!editedTitle"
        >
        </v-text-field>
      </v-card-title>
      <v-card-text>
        <v-textarea
          solo
          flat
          dense
          rows="2"
          no-resize
          single-line
          hide-details
          label="Agregar descripción"
          v-model.trim="editedItem.description"
          :loading="loading"
          @keydown.enter.prevent=""
          @keyup.enter="save"
          @click="editedDescription = true"
          :readonly="!editedDescription"
        >
        </v-textarea>
      </v-card-text>
      <v-divider class="mx-4"></v-divider>
      <v-card-text>
        <v-combobox
          solo
          flat
          chips
          multiple
          hide-details
          deletable-chips
          color="primary"
          label="Agregar etiquetas"
          v-model="editedItem.tags"
          :loading="loading"
          @keyup.enter="save"
          @click="editedTags = true"
        ></v-combobox>
      </v-card-text>
      <v-card-actions>
        <v-row class="px-4" align="center">
          <v-col>
            <span
              @click="editedItem.permissions === 'public' ? editedItem.permissions = 'private' : editedItem.permissions = 'public'; save()"
              class="link text-uppercase mr-2 font-weight-bold"
              :class="{ 'green--text': editedItem.permissions === 'public', 'red--text': editedItem.permissions !== 'public' }"
            >
              {{ editedItem.permissions }}
            </span>
            <span class="grey--text">
              <v-icon small>mdi-clock-outline</v-icon>
              {{ updated }}
            </span>
          </v-col>
          <v-col class="d-flex justify-end">
            <v-btn v-if="false" icon color="primary" @click="dialog = true">
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
        <v-divider/>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                <v-text-field v-model="editedItem.chartValues.title" label="Nombre"></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-textarea
                  rows="2"
                  no-resize
                  label="Descripción"
                  v-model="editedItem.description"
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
        <v-divider/>
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
import editorMixin from '../mixins/editorMixin.js'
import api from '../utils/axios'

export default {
  name: 'VpressChartCard',
  mixins: [loaderMixin, editorMixin],
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
    editedTitle: false,
    editedTags: false,
    editedDescription: false,
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
        const viz = await api.chart.get(this.id)
        const dataset = await api.dataset.get(this.dataset_id)
        await this.loadSavedViz(viz.data.data, dataset.data.data)
        this.$router.push({ path: `/`, query: { tab: 1 } })
        this.loading = false
      } catch (error) {
        console.log(error);
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
        this.loading = true
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
      this.editedTitle = false
      this.editedDescription = false
      this.editedTags = false
      this.loading = false
      this.close()
    },
    shareChart() {
      try {
        const chartId = this.id
        if (chartId) {
          const iframe = `[vpress id=${chartId}]`
          navigator.clipboard.writeText(iframe)
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
a:hover {
  text-decoration: underline;
}
::v-deep.v-text-field > .v-input__control > .v-input__slot {
  padding-left: 0 !important;
  padding-right: 0 !important;
}
::v-deep.v-text-field .v-input__append-inner {
  display: none !important;
}
::v-deep.v-textarea textarea {
  line-height: normal;
}
</style>
