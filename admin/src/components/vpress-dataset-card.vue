<template>
  <div :style="cssProps">
    <v-card flat :color="cardColor" :loading="loading">
      <v-row>
        <v-col :cols="12" :sm="12" :md="5" :lg="6" :xl="6">
          <div v-if="readonly" class="text-truncate dataset-name">
            <span v-if="emptyValue('name') && !editTitle" @click.stop="setDataset(dataset)">
              Sin título
            </span>
            <span v-if="!emptyValue('name') && !editTitle" @click.stop="setDataset(dataset)">
              {{ editedDataset.name }}
            </span>
          </div>
          <div v-else class="text-truncate dataset-name">
            <span v-if="emptyValue('name') && !editTitle" @click.stop="setDataset(dataset)">
              Sin título
            </span>
            <span v-if="!emptyValue('name') && !editTitle" @click.stop="setDataset(dataset)">
              {{ editedDataset.name }}
            </span>
            <v-text-field
              ref="title-input"
              v-show="editTitle"
              dense
              solo
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
            >
              {{ editedDataset.description }}
            </span>
            <v-textarea
              ref="description-input"
              v-show="editDescription"
              dense
              height="75"
              solo
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
              dense
              solo
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
                close
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
        </v-col>
        <v-col :cols="12" :sm="12" :md="7" :lg="6" :xl="6">
          <v-row align="center">
            <v-col cols="10" class="dataset-info">
              <span
                @click.stop="togglePermissions()"
                class="link permissions-label"
                :class="{
                  'green--text': editedDataset.permissions === 'public',
                  'red--text': editedDataset.permissions !== 'public'
                }"
              >
                {{ editedDataset.permissions }}
              </span>
              <v-spacer />
              <span class="dataset-label">
                {{ dataset.size }}
              </span>
              <v-spacer />
              <span class="dataset-label"> ~{{ dataset.rows | intFormat }} filas </span>
              <v-spacer />
              <span class="dataset-label ">
                {{ dataset.updated | dateFormat }}
              </span>
            </v-col>
            <v-col cols="2">
              <v-spacer />
              <v-btn v-if="!readonly" icon color="primary" @click.stop="confirmDeletion">
                <v-icon>mdi-trash-can-outline</v-icon>
              </v-btn>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-card>
    <v-divider />
    <v-dialog v-model="dialogConfirmDeletion" max-width="500px" scrollable>
      <v-card>
        <v-toolbar dark flat color="primary">
          <v-toolbar-title>Confirmar eliminación</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon dark @click="closeDialogConfirmDeletion">
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
          <v-btn color="primary" text @click="closeDialogConfirmDeletion">
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
import api from '../utils/axios.js';
import { loaderMixin } from '../mixins/index.js';

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
  data() {
    return {
      loading: false,
      editDescription: false,
      editTitle: false,
      editTags: false,
      dialogConfirmDeletion: false,
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
    emptyValue() {
      return field => {
        return this.editedDataset[field] === null || this.editedDataset[field].trim().length === 0;
      };
    },
    cssProps() {
      return {
        '--background': this.cardColor
      };
    }
  },
  filters: {
    intFormat(number) {
      return new Intl.NumberFormat().format(number);
    },
    dateFormat(update) {
      const date = new Date(update);
      return date.toLocaleString().replace(', ', ' | ');
    }
  },
  methods: {
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
        this.loading = true;
        const body = {
          id: parseInt(this.dataset.id),
          name: this.editedDataset.name,
          description: this.editedDataset.description,
          tag: this.editedDataset.tag.join(', '),
          permissions: this.editedDataset.permissions
        };
        const response = await api.dataset.update(body);
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        this.$store.dispatch('notifications/open', {
          color: 'success',
          text: 'Base de datos actualizada con éxito'
        });
        this.loading = false;
      } catch (error) {
        this.loading = false;
        throw new Error(error.message);
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
      this.$store.dispatch('notifications/open', {
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
.permissions-label {
  font-size: 0.8rem;
  text-transform: uppercase;
}

* >>> .tags-input > .v-input__control > .v-input__slot {
  background-color: var(--background) !important;
}

* >>> .tags-input > .v-input__control > .v-input__slot > .v-select__slot label {
  right: 0px !important;
  left: auto !important;
}

*
  >>> .tags-input
  > .v-input__control
  > .v-input__slot
  > .v-select__slot
  > .v-select__selections
  > input {
  background-color: var(--background) !important;
}

* >>> .tags-input > .v-input__control > .v-input__slot > .v-select__slot > .v-select__selections {
  flex-direction: row-reverse;
}

.dataset-info {
  display: flex;
}
</style>
