<template>
  <div>
    <v-card
      :loading="loading"
      class="mx-auto pb-4"
    >
      <div class="mx-5 pt-4">
        <v-img
          class="link mb-3"
          @click="createChart"
          color="#222A32"
          :src="requireImg(img_url)"
        />
      </div>
      <v-divider/>
      <div class="mx-5">
        <div class="link text-truncate viz-card-title">
          <span
            v-if="editedItem.chartValues.title.trim().length === 0 && !editTitle"
            class="link"
            @click="createChart"
          >
            Sin título
          </span>
          <v-tooltip location="start">
            <template v-slot:activator="{ props }">
              <span
                v-if="editedItem.chartValues.title.trim().length !== 0 && !editTitle"
                class="edit"
                @click="createChart"
                v-bind="props"
              >
                {{ editedItem.chartValues.title }}
              </span>
            </template>
            <span>{{ editedItem.chartValues.title }}</span>
          </v-tooltip>
          <v-text-field
            ref="title-input"
            v-show="editTitle"
            density="compact"
            variant="solo"
            flat
            v-model="editedItem.chartValues.title"
            @keydown.enter.exact.prevent
            @keyup.enter.exact="save"
            @blur="save"
          />
        </div>
        <div class="link text-truncate viz-card-subtitle">
          <span
            v-if="editedItem.chartValues.subtitle.trim().length === 0 && !editSubtitle"
            class="link add-text-toggle"
            @click="toggleInput('editSubtitle', 'subtitle-input')"
          >
            Agregar subtítulo...
          </span>
          <span
            v-if="editedItem.chartValues.subtitle.trim().length !== 0 && !editSubtitle"
            class="edit"
            @click="toggleInput('editSubtitle', 'subtitle-input')"
            @mouseover="showIcon = true"
            @mouseleave="showIcon = false"
          >
            {{ editedItem.chartValues.subtitle }}
            <v-icon size="small" v-show="showIcon">mdi-pencil</v-icon>
          </span>
          <v-text-field
            ref="subtitle-input"
            v-show="editSubtitle"
            density="compact"
            variant="solo"
            flat
            v-model="editedItem.chartValues.subtitle"
            @keydown.enter.exact.prevent
            @keyup.enter.exact="save"
            @blur="save"
          />
        </div>
        <div class="viz-card-textarea">
          <span
            v-if="editedItem.description.trim().length === 0 && !editDescription"
            class="link add-text-toggle"
            @click="toggleInput('editDescription', 'description-input')"
          >
            Agregar descripción...
          </span>
          <span
            v-if="editedItem.description.trim().length !== 0 && !editDescription"
            class="link"
            @click="toggleInput('editDescription', 'description-input')"
            @mouseover="showDescriptionIcon = true"
            @mouseleave="showDescriptionIcon = false"
          >
            {{ editedItem.description }}
            <v-icon size="small" v-show="showDescriptionIcon">mdi-pencil</v-icon>
          </span>
          <v-textarea
            ref="description-input"
            counter="5"
            v-show="editDescription"
            density="compact"
            height="90"
            variant="solo"
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
          variant="solo"
          flat
          chips
          multiple
          hide-details
          closable-chips
          color="primary"
          label="Agregar etiquetas"
          v-model="editedItem.tags"
          :loading="loading"
          @keyup.enter="save"
          @blur="save"
          @click.stop="editedTags = true"
        >
          <template v-slot:chip="{ props, item }">
            <v-chip
              v-bind="props"
              color="primary"
            >
              <span class="pr-2 font-weight-light">
                {{ item.value }}
              </span>
            </v-chip>
          </template>
        </v-combobox>
        <v-card-actions>
          <v-row align="center">
            <span
              @click="editedItem.permissions === 'public' ? editedItem.permissions = 'private' : editedItem.permissions = 'public'; save()"
              class="link text-uppercase mr-2 font-weight-bold"
              :class="{ 'text-green': editedItem.permissions.toLowerCase() === 'public', 'text-red': editedItem.permissions.toLowerCase() !== 'public' }"
            >
              {{ editedItem.permissions }}
            </span>
            <v-spacer/>
            <span class="text-grey">
              <v-icon size="small">mdi-clock-outline</v-icon>
              {{ dateFormat(updated) }}
            </span>
            <v-spacer/>
            <v-btn icon variant="text" size="x-small" color="primary" @click="shareChart">
              <v-icon>mdi-share-variant-outline</v-icon>
            </v-btn>
            <v-spacer/>
            <v-btn
              icon
              variant="text"
              size="x-small"
              color="primary"
              title="Copiar bloque"
              aria-label="Copiar bloque"
              @click="copyBlock"
            >
              <v-icon>mdi-code-braces</v-icon>
            </v-btn>
            <v-spacer/>
            <v-btn icon variant="text" size="x-small" color="primary" @click="dialogConfirmDeletion = true">
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
        <v-toolbar theme="dark" flat color="primary">
          <v-toolbar-title>Confirmar eliminación</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon variant="text" @click="dialogConfirmDeletion = false">
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
            variant="text"
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
import { mapStores } from 'pinia'
import { loaderMixin, editorMixin } from '../mixins/index.js'
import { useNotificationsStore } from '../store/index.js'
import { imageUrl } from '../utils/assetUrl.js'
import { chartBlockMarkup } from '../utils/blockMarkup.js'
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
  emits: ['onDeleted'],
  data: () => ({
    loading: false,
    showIcon: false,
    showDescriptionIcon: false,
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
  computed: {
    ...mapStores(useNotificationsStore)
  },
  methods: {
    dateFormat(update) {
      const date = new Date(update)
        .toLocaleString()
        .replace( ', ', ' | ' )
      return date
    },
    requireImg(url) {
      try {
        const vizType = JSON.parse(this.value).chart
        return url && url.length > 0
          ? url
          : imageUrl(`${vizType}.png`);
      } catch (error) {
        return imageUrl('spineplot.png')
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
        this.notificationsStore.open({
          color: 'success',
          text: 'Gráfica actualizada con éxito'
        })
      } catch (error) {
        throw new Error(error.message)
      }
      this.loading = false
    },
    // "Copy block": the serialized vpress/chart block, to paste into the block editor.
    async copyBlock() {
      const markup = chartBlockMarkup(this.id)
      if (!markup) {
        this.notificationsStore.open({
          color: 'warning',
          text: 'Primero debes de guardar la gráfica'
        })
        return
      }
      try {
        const clipboard = window.navigator && window.navigator.clipboard
        if (clipboard && window.isSecureContext) {
          await clipboard.writeText(markup)
        } else if (!this.copyWithTextarea(markup)) {
          throw new Error('copy command failed')
        }
        this.notificationsStore.open({
          color: 'success',
          text: 'Bloque copiado al portapapeles'
        })
      } catch (error) {
        this.notificationsStore.open({
          color: 'error',
          text: 'No se pudo copiar el bloque'
        })
      }
    },
    // Clipboard fallback for non-secure admin origins (plain http).
    copyWithTextarea(text) {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      const selected =
        document.getSelection().rangeCount > 0
          ? document.getSelection().getRangeAt(0)
          : false;
      el.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(el);
      if (selected) {
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(selected);
      }
      return copied;
    },
    shareChart() {
      try {
        const chartId = this.id
        if (chartId) {
          this.copyWithTextarea(`[vpress id=${chartId}]`);
          this.notificationsStore.open({
            color: 'success',
            text: 'Gráfica guardada al portapapeles'
          })
        } else {
          this.notificationsStore.open({
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
:deep(.v-text-field > .v-input__control > .v-input__slot) {
  padding-left: 0 !important;
  padding-right: 0 !important;
}
:deep(.v-text-field .v-input__append-inner) {
  display: none !important;
}
:deep(.v-textarea textarea) {
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
