<template>
  <!-- w-100: v3 expansion-panel titles no longer stretch slot content. -->
  <div :style="cssProps" class="w-100">
    <v-card flat :color="cardColor" :loading="loading">
      <v-row>
        <v-col :cols="12" :sm="12" :md="5" :lg="6" :xl="6">
          <div v-if="readonly" class="text-truncate dataset-name">
            <span v-if="emptyValue('name') && !editTitle" @click.stop="setDataset(dataset)">
              Sin título
            </span>
            <v-tooltip location="bottom">
              <template v-slot:activator="{ props }">
                <span
                  v-if="!emptyValue('name') && !editTitle"
                  @click.stop="setDataset(dataset)"
                  v-bind="props"
                >
                  {{ editedDataset.name }}
                </span>
              </template>
              <span>
                {{ editedDataset.name }}
              </span>
            </v-tooltip>
          </div>
          <div v-else class="text-truncate dataset-name">
            <span v-if="emptyValue('name') && !editTitle" @click.stop="setDataset(dataset)">
              Sin título
            </span>
            <v-tooltip location="start">
              <template v-slot:activator="{ props }">
                <span
                  v-if="!emptyValue('name') && !editTitle"
                  @click.stop="setDataset(dataset)"
                  v-bind="props"
                >
                  {{ editedDataset.name }}
                </span>
              </template>
              <span>
                {{ editedDataset.name }}
              </span>
            </v-tooltip>
            <v-text-field
              ref="title-input"
              v-show="editTitle"
              density="compact"
              variant="solo"
              flat
              v-model="editedDataset.name"
              @keydown.enter.exact.prevent
              @keyup.enter.exact="save"
              @blur="save"
              @click.stop
            />
          </div>
          <div v-if="readonly">
            <span v-if="emptyValue('description') && !editDescription">
              Sin descripción
            </span>
            <span v-if="!emptyValue('description') && !editDescription">
              {{ editedDataset.description }}
            </span>
          </div>
          <div v-else>
            <span
              v-if="emptyValue('description') && !editDescription"
              class="link add-text-toggle"
              @click.stop="toggleInput('editDescription', 'description-input')"
            >
              Agregar descripción...
            </span>
            <span
              v-if="!emptyValue('description') && !editDescription"
              class="edit dataset-description"
              @click.stop="toggleInput('editDescription', 'description-input')"
              @mouseover="showDescriptionIcon = true"
              @mouseleave="showDescriptionIcon = false"
            >
              {{ editedDataset.description }}
              <v-icon size="small" v-show="showDescriptionIcon">mdi-pencil</v-icon>
            </span>
            <v-textarea
              ref="description-input"
              v-show="editDescription"
              density="compact"
              height="75"
              variant="solo"
              flat
              maxlength="140"
              hide-details
              v-model="editedDataset.description"
              @keydown.enter.exact.prevent
              @keyup.enter.exact="save"
              @blur="save"
              @click.stop
            />
          </div>
          <div>
            <span
              v-if="!editTags"
              class="link add-text-toggle"
              @click.stop="toggleInput('editTags', 'tags-input')"
            >
              Agregar etiquetas...
            </span>
            <v-text-field
              ref="tags-input"
              v-show="editTags"
              density="compact"
              variant="solo"
              flat
              v-model="newTag"
              @keydown.enter.exact.prevent
              @keyup.enter.exact="
                addTag();
                save();
              "
              @blur="
                addTag();
                save();
              "
              @click.stop
            />
          </div>
          <div>
            <v-chip-group column>
              <v-chip
                closable
                v-for="(tag, i) in editedDataset.tag"
                :key="i"
                @click:close="
                  editedDataset.tag.splice(i, 1);
                  save();
                "
              >
                {{ tag }}
              </v-chip>
            </v-chip-group>
          </div>
          <div v-if="!readonly">
            <span class="link add-text-toggle" data-test="source-open" @click.stop="openSourceDialog">
              {{ sourcePreview ? 'Editar fuente...' : 'Agregar fuente...' }}
            </span>
            <div v-if="sourcePreview" class="dataset-label source-preview" data-test="source-preview">
              {{ sourcePreview }}
            </div>
          </div>
        </v-col>
        <v-col :cols="12" :sm="12" :md="7" :lg="6" :xl="6">
          <v-row align="center">
            <v-col cols="10" class="dataset-info">
              <span
                @click.stop="togglePermissions()"
                class="link permissions-label"
                :class="{
                  'text-green': editedDataset.permissions === 'public',
                  'text-red': editedDataset.permissions !== 'public'
                }"
              >
                {{ editedDataset.permissions }}
              </span>
              <v-spacer />
              <span class="dataset-label">
                {{ dataset.size }}
              </span>
              <v-spacer />
              <span class="dataset-label"> ~{{ intFormat(dataset.rows) }} filas </span>
              <v-spacer />
              <span class="dataset-label ">
                {{ dateFormat(dataset.updated) }}
              </span>
            </v-col>
            <v-col
              v-if="isLiveSource"
              cols="12"
              class="dataset-info pt-0"
              data-test="freshness"
            >
              <span
                class="dataset-label"
                :title="freshness.last_refresh_error || freshness.source_url"
              >
                {{ freshnessText }}
              </span>
              <v-icon
                v-if="freshness.last_refresh_error"
                size="small"
                color="error"
                class="ml-1"
                :title="freshness.last_refresh_error"
                data-test="refresh-error"
              >
                mdi-alert-circle-outline
              </v-icon>
              <v-btn
                v-if="!readonly"
                icon
                size="x-small"
                variant="text"
                color="primary"
                class="ml-1"
                title="Actualizar ahora"
                aria-label="Actualizar ahora"
                :loading="refreshing"
                :disabled="refreshing"
                data-test="refresh"
                @click.stop="refreshNow"
              >
                <v-icon>mdi-refresh</v-icon>
              </v-btn>
            </v-col>
            <v-col cols="2">
              <v-spacer />
              <v-btn v-if="!readonly" icon variant="text" color="primary" @click.stop="confirmDeletion">
                <v-icon>mdi-trash-can-outline</v-icon>
              </v-btn>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-card>
    <v-divider />
    <v-dialog v-model="dialogSource" max-width="600px" scrollable>
      <v-card data-test="source-dialog">
        <v-toolbar theme="dark" flat color="primary">
          <v-toolbar-title>Fuente</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon variant="text" @click="dialogSource = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-divider></v-divider>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="editedSource.source_name"
                  label="Nombre de la fuente"
                  placeholder="Secretaría de Hacienda"
                  density="compact"
                  variant="outlined"
                  maxlength="255"
                  hide-details="auto"
                  data-test="source-name"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="editedSource.source_url"
                  label="URL de la fuente"
                  placeholder="https://datos.gob.mx/..."
                  density="compact"
                  variant="outlined"
                  :readonly="isLiveSource"
                  :hint="
                    isLiveSource
                      ? 'Esta base se actualiza desde esta URL; cámbiala desde \'Desde URL\'.'
                      : 'Enlace público a los datos originales.'
                  "
                  persistent-hint
                  data-test="source-url"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-combobox
                  v-model="editedSource.license"
                  :items="licenseSuggestions"
                  label="Licencia"
                  density="compact"
                  variant="outlined"
                  hide-details="auto"
                  data-test="source-license"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editedSource.retrieved_at"
                  label="Fecha de los datos"
                  type="date"
                  placeholder="AAAA-MM-DD"
                  density="compact"
                  variant="outlined"
                  :error-messages="dateError"
                  hide-details="auto"
                  data-test="source-date"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="editedSource.source_notes"
                  label="Notas"
                  placeholder="Cifras preliminares, metodología, ajustes..."
                  rows="3"
                  density="compact"
                  variant="outlined"
                  hide-details="auto"
                  data-test="source-notes"
                />
              </v-col>
              <v-col cols="12">
                <div class="dataset-label" data-test="source-dialog-preview">
                  {{ sourceDialogPreview || 'Agrega un nombre o una URL para mostrar la fuente bajo la gráfica.' }}
                </div>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="text" @click="dialogSource = false">Cancelar</v-btn>
          <v-btn color="primary" :disabled="!!dateError" data-test="source-save" @click="saveSource">
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="dialogConfirmDeletion" max-width="500px" scrollable>
      <v-card>
        <v-toolbar theme="dark" flat color="primary">
          <v-toolbar-title>Confirmar eliminación</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon variant="text" @click="closeDialogConfirmDeletion">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-divider></v-divider>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                ¿Está seguro de eliminar la base de datos? Se eliminarán
                <strong>{{ totalDelete }}</strong>
                gráficas
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="text" @click="closeDialogConfirmDeletion">
            Cancelar
          </v-btn>
          <v-btn color="primary" @click="deleteItem">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script>
import { clone } from 'lodash';
import { mapStores } from 'pinia';
import api from '../utils/axios.js';
import { loaderMixin } from '../mixins/index.js';
import { useNotificationsStore } from '../store/index.js';
import {
  LICENSE_SUGGESTIONS,
  intervalLabel,
  isProvenanceDate,
  provenanceLine,
  relativeTime,
  restErrorMessage
} from '../utils/dataSources.js';

function freshnessOf(dataset) {
  return {
    source_type: dataset.source_type || 'upload',
    source_url: dataset.source_url || '',
    refresh_interval: dataset.refresh_interval || 'none',
    last_refreshed_at: dataset.last_refreshed_at || null,
    last_refresh_error: dataset.last_refresh_error || null
  };
}

/** The provenance fields as the edit dialog holds them (never null). */
function provenanceOf(dataset) {
  return {
    source_name: dataset.source_name || '',
    source_url: dataset.source_url || '',
    license: dataset.license || '',
    retrieved_at: dataset.retrieved_at || '',
    source_notes: dataset.source_notes || ''
  };
}

export default {
  name: 'VpressDatasetCard',
  mixins: [loaderMixin],
  props: {
    dataset: {
      type: Object,
      required: true
    },
    cardColor: {
      type: String,
      default: '#F8F8F8'
    },
    readonly: {
      type: Boolean,
      default: false
    }
  },
  emits: ['on-dataset-delete', 'on-dataset-refresh'],
  data() {
    return {
      loading: false,
      refreshing: false,
      freshness: freshnessOf(this.dataset),
      showDescriptionIcon: false,
      editDescription: false,
      editTitle: false,
      editTags: false,
      dialogConfirmDeletion: false,
      dialogSource: false,
      provenance: provenanceOf(this.dataset),
      editedSource: provenanceOf(this.dataset),
      licenseSuggestions: LICENSE_SUGGESTIONS,
      totalDelete: 0,
      newTag: '',
      editedDataset: {
        permissions: clone(this.dataset.permissions),
        name: clone(this.dataset.name),
        description: clone(this.dataset.description),
        tag: clone(this.dataset.tag)
      }
    };
  },
  created() {
    this.editedDataset = {
      permissions: clone(this.dataset.permissions),
      name: clone(this.dataset.name),
      description: clone(this.dataset.description),
      tag: clone(this.dataset.tag)
    };
  },
  computed: {
    ...mapStores(useNotificationsStore),
    emptyValue() {
      return field => {
        return this.editedDataset[field] === null || this.editedDataset[field].trim().length === 0;
      };
    },
    cssProps() {
      return {
        '--background': this.cardColor
      };
    },
    isLiveSource() {
      return this.freshness.source_type !== 'upload';
    },
    dateError() {
      return isProvenanceDate(this.editedSource.retrieved_at) ? '' : 'Usa el formato AAAA-MM-DD.';
    },
    sourcePreview() {
      return provenanceLine({ ...this.provenance, ...this.freshness });
    },
    sourceDialogPreview() {
      return provenanceLine({ ...this.editedSource, source_type: this.freshness.source_type, last_refreshed_at: this.freshness.last_refreshed_at });
    },
    freshnessText() {
      const text = `Actualizado ${relativeTime(this.freshness.last_refreshed_at)}`;
      return this.freshness.refresh_interval !== 'none'
        ? `${text} · ${intervalLabel(this.freshness.refresh_interval)}`
        : text;
    }
  },
  watch: {
    dataset(value) {
      this.freshness = freshnessOf(value);
      this.provenance = provenanceOf(value);
    }
  },
  methods: {
    intFormat(number) {
      return new Intl.NumberFormat().format(number);
    },
    dateFormat(update) {
      const date = new Date(update);
      return date.toLocaleString().replace(', ', ' | ');
    },
    addTag() {
      if (this.newTag.trim().length > 0) {
        this.editedDataset.tag.push(this.newTag);
        this.newTag = '';
      }
    },
    async setDataset(dataset) {
      try {
        await this.editorInit(dataset);
        this.$router.push('/data');
      } catch (error) {
        this.errorMessage = error.message;
      }
    },
    togglePermissions() {
      this.editedDataset.permissions === 'public'
        ? (this.editedDataset.permissions = 'private')
        : (this.editedDataset.permissions = 'public');
      this.save();
    },
    async toggleInput(field, element) {
      this[field] = true;
      await this.$nextTick();
      // Focus on the deepest node (input) of the vuetify element
      this.$refs[element].focus();
    },
    async save() {
      try {
        this.editTitle = false;
        this.editDescription = false;
        this.editTags = false;
        this.showDescriptionIcon = false;
        this.loading = true;
        const body = {
          id: parseInt(this.dataset.id),
          name: this.editedDataset.name,
          description: this.editedDataset.description,
          tag: this.editedDataset.tag.join(', '),
          permissions: this.editedDataset.permissions,
          source_name: this.provenance.source_name,
          license: this.provenance.license,
          retrieved_at: this.provenance.retrieved_at,
          source_notes: this.provenance.source_notes
        };
        // A live source's URL is the refresh URL, owned by "Desde URL"; the
        // server ignores it here, and we do not even send it.
        if (!this.isLiveSource) {
          body.source_url = this.provenance.source_url;
        }
        const response = await api.dataset.update(body);
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        this.notificationsStore.open({
          color: 'success',
          text: 'Base de datos actualizada con éxito'
        });
        this.loading = false;
      } catch (error) {
        this.loading = false;
        throw new Error(error.message);
      }
    },
    openSourceDialog() {
      this.editedSource = { ...this.provenance };
      this.dialogSource = true;
    },
    async saveSource() {
      if (this.dateError) return;
      this.provenance = { ...this.editedSource };
      this.dialogSource = false;
      await this.save();
    },
    async refreshNow() {
      if (this.refreshing) return;
      this.refreshing = true;
      try {
        const response = await api.dataset.refresh(parseInt(this.dataset.id));
        const updated = response.data.data;
        this.freshness = freshnessOf(updated);
        this.notificationsStore.open({
          color: 'success',
          text: 'Datos actualizados'
        });
        this.$emit('on-dataset-refresh', updated);
      } catch (error) {
        const text = restErrorMessage(error, 'No se pudieron actualizar los datos');
        this.freshness = { ...this.freshness, last_refresh_error: text };
        this.notificationsStore.open({ color: 'error', text });
      } finally {
        this.refreshing = false;
      }
    },
    closeDialogConfirmDeletion() {
      this.dialogConfirmDeletion = false;
    },
    async confirmDeletion() {
      const { data } = await api.dataset.charts(parseInt(this.dataset.id));
      this.totalDelete = data.total;
      this.dialogConfirmDeletion = true;
    },
    async deleteItem() {
      const response = await api.dataset.delete({ data: { id: parseInt(this.dataset.id) } });
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      this.notificationsStore.open({
        color: 'success',
        text: 'Base de datos eliminada con éxito'
      });
      this.totalDelete = 0;
      this.itemToDelete = null;
      this.dialogConfirmDeletion = false;
      this.$emit('on-dataset-delete');
    },
    stop(event) {
      console.log('event');
      console.log(event);
      event.stopPropagation();
    }
  }
};
</script>
<style scoped>
.edit {
  cursor: text;
}
.link {
  cursor: pointer;
}
.add-text-toggle {
  color: #21a7f3;
  font-weight: 400;
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

.dataset-name {
  font-size: 1.2rem;
  font-weight: 500;
}
.dataset-name:hover {
  cursor: pointer;
  text-decoration: underline;
}

.dataset-description {
  font-size: 0.9rem;
  color: #a19f9f;
  height: 90px;
  line-height: 0;
}

.dataset-label {
  font-size: 0.8rem;
  color: #a19f9f;
}
.source-preview {
  margin-top: 2px;
}
.permissions-label {
  font-size: 0.8rem;
  text-transform: uppercase;
}

* :deep(.tags-input > .v-input__control > .v-input__slot) {
  background-color: var(--background) !important;
}

* :deep(.tags-input > .v-input__control > .v-input__slot > .v-select__slot label) {
  right: 0px !important;
  left: auto !important;
}

*
  :deep(.tags-input
  > .v-input__control
  > .v-input__slot
  > .v-select__slot
  > .v-select__selections
  > input) {
  background-color: var(--background) !important;
}

* :deep(.tags-input > .v-input__control > .v-input__slot > .v-select__slot > .v-select__selections) {
  flex-direction: row-reverse;
}

.dataset-info {
  display: flex;
}
</style>
