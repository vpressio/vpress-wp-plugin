<template>
  <div :style="cssProps">
    <v-card
      flat
      :color="cardColor"
      :loading="loading"
    >
      <v-row>
        <v-col :cols="12" :sm="12" :md="5" :lg="6" :xl="6">
          <div class="text-truncate dataset-name">
            <span
              v-if="editedDataset.name.trim().length === 0 && !editTitle"
              class="link add-text-toggle"
              @click.stop="toggleInput('editTitle', 'title-input')"
            >
              Agregar Título
            </span>
            <span
              v-if="editedDataset.name.trim().length !== 0 && !editTitle"
              class="edit"
              @click.stop="toggleInput('editTitle', 'title-input')"
            >
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
          <div>
            <span
              v-if="editedDataset.description.trim().length === 0 && !editDescription"
              class="link add-text-toggle"
              @click.stop="toggleInput('editDescription', 'description-input')"
            >
              Agregar descripción
            </span>
            <span
              v-if="editedDataset.description.trim().length !== 0 && !editDescription"
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
        </v-col>
        <v-col :cols="12" :sm="12" :md="7" :lg="6" :xl="6">
          <v-row align="center">
            <v-col cols="10" style="display:flex;">
              <span
                @click.stop="editedDataset.permissions === 'public' ? editedDataset.permissions = 'private' : editedDataset.permissions = 'public'; save()"
                class="link permissions-label"
                :class="{ 'green--text': editedDataset.permissions === 'public', 'red--text': editedDataset.permissions !== 'public' }"
              >
                {{ editedDataset.permissions }}
              </span>
              <v-spacer/>
              <span class="dataset-label">
                {{ size }}
              </span>
              <v-spacer/>
              <span class="dataset-label">
                ~{{ rows | intFormat }} filas
              </span>
              <v-spacer/>
              <span class="dataset-label ">
                {{ updated | dateFormat }}
              </span>
            </v-col>
            <v-col cols="2">
              <v-spacer/>
              <v-btn icon color="primary" @click.stop="confirmDeletion">
                <v-icon>mdi-trash-can-outline</v-icon>
              </v-btn>
            </v-col>
          </v-row>
          <v-combobox
            class="tags-input"
            ref="tags-input"
            background-color="cardColor"
            solo
            flat
            chips
            multiple
            hide-details
            deletable-chips
            color="primary"
            label="Agregar etiquetas"
            v-model="editedDataset.tag"
            :loading="loading"
            @keyup.enter="save"
            @blur="save"
            @click.stop
          />
        </v-col>
      </v-row>
    </v-card>
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
                ¿Está seguro de eliminar la base de datos? Se eliminarán <strong>{{ totalDelete }}</strong> gráficas
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="closeDialogConfirmDeletion">Cancelar</v-btn>
          <v-btn color="primary" @click="deleteItem">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script>
import * as _ from 'lodash'
import api from '../utils/axios.js'

export default {
  name: 'VpressDatasetCard',
  props: {
    id: {
      type: String,
      required: true
    },
    permissions: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    tag: {
      type: Array,
      required: true
    },
    source: {
      type: String,
    },
    size: {
      type: String,
      required: true
    },
    rows: {
      type: String,
      required: true
    },
    updated: {
      type: String,
      required: true
    },
    cardColor: {
      type: String,
      default: '#F8F8F8'
    }
  },
  data() {
    return {
      loading: false,
      editDescription: false,
      editTitle: false,
      editedTags: false,
      dialogConfirmDeletion: false,
      totalDelete: 0,
      editedDataset: {
        permissions: _.clone(this.permissions),
        name: _.clone(this.name),
        description: _.clone(this.description),
        tag: _.clone(this.tag),
      }
    }
  },
  created() {
    this.editedDataset = {
      permissions: _.clone(this.permissions),
      name: _.clone(this.name),
      description: _.clone(this.description),
      tag: _.clone(this.tag),
    }
  },
  computed: {
    cssProps() {
      return {
        '--background': this.cardColor
      }
    }
  },
  filters: {
    intFormat(number) {
      return new Intl.NumberFormat().format(number)
    },
    dateFormat(update) {
      const date = new Date(update)
      return date.toDateString()
    }
  },
  methods: {
    async toggleInput(field, element) {
      this[field] = true
      await this.$nextTick();
      // Focus on the deepest node (input) of the vuetify element
      this.$refs[element].focus()
    },
    async save () {
      try {
        this.editTitle = false
        this.editDescription = false
        this.loading = true
        const body = {
          id: parseInt(this.id),
          name: this.editedDataset.name,
          description: this.editedDataset.description,
          tag: this.editedDataset.tag.join(', '),
          permissions: this.editedDataset.permissions
        }
        const response = await api.dataset.update(body);
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        this.editedTags = false
        this.$store.dispatch('notifications/open', {
          color: 'success',
          text: 'Base de datos actualizada con éxito'
        })
        this.loading = false
      } catch (error) {
        this.loading = false
        throw new Error(error.message)
      }
    },
    closeDialogConfirmDeletion() {
      this.dialogConfirmDeletion = false
    },
    async confirmDeletion() {
      const { data } = await api.dataset.charts(parseInt(this.id));
      this.totalDelete = data.total
      this.dialogConfirmDeletion = true
    },
    async deleteItem () {
      const response = await api.dataset.delete({ data: { id: parseInt(this.id) }});
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      this.$store.dispatch('notifications/open', {
        color: 'success',
        text: 'Base de datos eliminada con éxito'
      })
      this.totalDelete = 0
      this.itemToDelete = null
      this.dialogConfirmDeletion = false
      this.$emit('on-dataset-delete')
    }
  }
}
</script>
<style scoped>
.edit {
  cursor: text
}
.link {
  cursor: pointer
}
.add-text-toggle{
  color: #21A7F3;
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

* >>> .tags-input
> .v-input__control
> .v-input__slot
> .v-select__slot
> .v-select__selections
> input
{
  background-color:var(--background) !important;
}

</style>