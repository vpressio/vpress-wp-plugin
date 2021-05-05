<template>
  <div>
    <v-card
      :loading="loading"
      class="mx-auto pb-4"
    >
      <div class="mx-5 pt-4">
        <v-img
          class="link mb-3"
          contain
          @click="createChart"
          color="#222A32"
          :src="requireImg(img_url)"
        />
      </div>
      <v-divider/>
      <div class="mx-5">
        <div class="link text-truncate viz-card-title">
          <a
            v-if="editedItem.chartValues.title.trim().length === 0 && !editTitle"
            class="link add-text-toggle"
            @click="toggleInput('editTitle', 'title-input')"
          >
            Agregar título
          </a>
          <a
            v-if="editedItem.chartValues.title.trim().length !== 0 && !editTitle"
            class="edit"
            @click="toggleInput('editTitle', 'title-input')"
          >
            {{ editedItem.chartValues.title }}
          </a>
          <v-text-field
            ref="title-input"
            v-show="editTitle"
            dense
            solo
            flat
            v-model="editedItem.chartValues.title"
            @keydown.enter.exact.prevent
            @keyup.enter.exact="save"
            @blur="save"
          />
        </div>
        <div class="link text-truncate viz-card-subtitle">
          <a
            v-if="editedItem.chartValues.subtitle.trim().length === 0 && !editSubtitle"
            class="link add-text-toggle"
            @click="toggleInput('editSubtitle', 'subtitle-input')"
          >
            Agregar subtítulo
          </a>
          <a
            v-if="editedItem.chartValues.subtitle.trim().length !== 0 && !editSubtitle"
            class="edit"
            @click="toggleInput('editSubtitle', 'subtitle-input')"
          >
            {{ editedItem.chartValues.subtitle }}
          </a>
          <v-text-field
            ref="subtitle-input"
            v-show="editSubtitle"
            dense
            solo
            flat
            v-model="editedItem.chartValues.subtitle"
            @keydown.enter.exact.prevent
            @keyup.enter.exact="save"
            @blur="save"
          />
        </div>
        <div class="viz-card-textarea">
          <a
            v-if="editedItem.description.trim().length === 0 && !editDescription"
            class="link add-text-toggle"
            @click="toggleInput('editDescription', 'description-input')"
          >
            Agregar descripción
          </a>
          <a
            v-if="editedItem.description.trim().length !== 0 && !editDescription"
            class="edit"
            @click="toggleInput('editDescription', 'description-input')"
          >
            {{ editedItem.description }}
          </a>
          <v-textarea
            ref="description-input"
            counter="5"
            :allow-overflow="false"
            v-show="editDescription"
            item-color="primary"
            dense
            height="90"
            solo
            flat
            maxlength="140"
            hide-details
            v-model="editedItem.description"
            @keydown.enter.exact.prevent
            @keyup.enter.exact="save"
            @keydown.space.stop
            @keyup.space.stop
            @blur="save"
          />
        </div>
        <v-divider class="my-1"/>
        <v-combobox
          class="tag-box"
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
          @blur="save"
          @click.stop="editedTags = true"
        >
          <template v-slot:selection="{ attrs, item, parent }">
            <v-chip
              v-bind="attrs"
              color="primary"
            >
              <span class="pr-2 font-weight-light">
                {{ item }}
              </span>
              <v-icon
                small
                @click="parent.selectItem(item)"
              >
                mdi-close
              </v-icon>
            </v-chip>
          </template>
        </v-combobox>
        <v-card-actions>
          <v-row align="center">
            <span
              @click="editedItem.permissions === 'public' ? editedItem.permissions = 'private' : editedItem.permissions = 'public'; save()"
              class="link text-uppercase mr-2 font-weight-bold"
              :class="{ 'green--text': editedItem.permissions.toLowerCase() === 'public', 'red--text': editedItem.permissions.toLowerCase() !== 'public' }"
            >
              {{ editedItem.permissions }}
            </span>
            <v-spacer/>
            <span class="grey--text">
              <v-icon small>mdi-clock-outline</v-icon>
              {{ updated | dateFormat }}
            </span>
            <v-spacer/>
            <v-btn icon x-small color="primary" @click="shareChart">
              <v-icon>mdi-share-variant-outline</v-icon>
            </v-btn>
            <v-spacer/>
            <v-btn icon x-small color="primary" @click="dialogConfirmDeletion = true">
              <v-icon>mdi-trash-can-outline</v-icon>
            </v-btn>
            <v-spacer/>
          </v-row>
        </v-card-actions>
      </div>
    </v-card>
    <v-dialog
      v-model="dialogConfirmDeletion"
      max-width="500px"
      scrollable
    >
      <v-card>
        <v-toolbar dark flat color="primary">
          <v-toolbar-title>Confirmar eliminación</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon dark @click="dialogConfirmDeletion = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-divider></v-divider>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                ¿Está seguro de eliminar la gráfica?
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            text
            @click="dialogConfirmDeletion = false"
          >
            Cancelar
          </v-btn>
          <v-btn color="primary" @click="deleteChart" :loading="loading">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script>
import { clone } from 'lodash'
import { loaderMixin, editorMixin } from '../mixins/index.js'
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
    loading: false,
    chartValues: {},
    editTitle: false,
    editSubtitle: false,
    editedTags: false,
    editDescription: false,
    editedItem: {
      chartValues: {
        title: '',
        subtitle: '',
      },
      description: '',
      tags: '',
      permissions: ''
    },
    dialogConfirmDeletion: false
  }),
  created() {
    this.chartValues = JSON.parse(this.value)
    this.editedItem = {
      chartValues: clone(this.chartValues),
      description: clone(this.description),
      tags: clone(this.tags),
      permissions: clone(this.permissions)
    }
  },
  filters: {
    dateFormat(update) {
      const date = new Date(update)
        .toLocaleString()
        .replace( ', ', ' | ' )
      return date
    }
  },
  methods: {
    requireImg(url) {
      try {
        const vizType = JSON.parse(this.value).chart
        return url && url.length > 0
          ? url
          : require(`../assets/images/${vizType}.png`);
      } catch (error) {
        return require('../assets/images/spineplot.png')
      }
    },
     async toggleInput(field, element) {
      this[field] = true
      await this.$nextTick();
      //Focus on the deepest node (input) of the vuetify element
      this.$refs[element].focus()
    },
    async createChart () {
      try {
        this.loading = true
        const viz = await api.chart.get(this.id)
        const dataset = await api.dataset.get(this.dataset_id)
        await this.loadSavedViz(viz.data.data, dataset.data.data)
        this.$router.push({ path: `/editor/config`, query: { tab: 1 } })
        this.loading = false
      } catch (error) {
        this.loading = false
        throw new Error(error.message);
      }
    },
    async deleteChart() {
      try {
        this.loading = true
        const response = await api.chart.delete({ data: { id: parseInt(this.id) }});
        this.$emit('onDeleted')
        this.loading = false
        this.dialogConfirmDeletion = false
        return response
      } catch (error) {
        this.loading = false
        this.dialogConfirmDeletion = false
        throw new Error(error.message)
      }
    },
    async save () {
      try {
        this.editTitle = false
        this.editSubtitle = false
        this.editDescription = false
        this.editedTags = false
        this.loading = true
        const body = {
          id: parseInt(this.id),
          value: JSON.stringify(this.editedItem.chartValues),
          description: this.editedItem.description.trim(),
          tags: this.editedItem.tags.join(', '),
          permissions: this.editedItem.permissions
        }
        const response = await api.chart.update(body);
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
      this.loading = false
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
  }
}
</script>
<style lang="scss" scoped>
a {
  color: rgba(0, 0, 0, 0.87) !important;
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

.viz-card-textarea {
  margin-top: 6px;
  height: 90px;
  font-size: 1rem;
  line-height: 1.2;
}

.viz-card-subtitle {
  font-family: "Roboto", sans-serif;
  font-size: 1.2rem;
  font-weight: 500;
  margin-top: 2%;
  height: 35px;
}

.viz-card-title {
  font-family: "Roboto", sans-serif;
  font-size: 1.4rem;
  font-weight: 500;
  margin-top: 2%;
  height: 35px;
}

.add-text-toggle{
  color: #21A7F3;
  font-weight: 400;
}

</style>
