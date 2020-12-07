<template>
  <div class="text-center">
    <v-dialog v-model="dialog" persistent width="500">
      <v-card>
        <v-card-title class="primary white--text">
          <span v-if="type == 'linear'">
            Selecciona un rango
          </span>
          <span v-else>
            Filtra por uno o más parametros
          </span>
        </v-card-title>
        <v-card-text class="py-4">
          <a class="underline" @click="selectAll">Seleccionar todo</a>
          -
          <a class="underline" @click="deselectAll">Limpiar selección</a>
        </v-card-text>
        <v-divider></v-divider>
        <div
          class="loader-container"
          v-if="loading"
        >
          <v-progress-circular
            :size="70"
            :width="7"
            color="primary"
            indeterminate
          />
        </div>
        <v-card-text else class="py-4">
          <template v-if="type === 'linear'">
            <v-range-slider
              class="mt-5"
              v-model="linearFilter"
              :min="min"
              :max="max"
              dense
              hide-details
              step= "1"
              thumb-size= "32"
            >
              <template v-slot:prepend>
                {{ linearFilter[0] }}
              </template>
              <template v-slot:append>
                {{ linearFilter[1] }}
              </template>
            </v-range-slider>
          </template>
          <template v-else>
            <v-checkbox
              v-model="ordinalFilter"
              v-for="item in categories"
              :key="item"
              :label="item"
              :value="item"
              hide-details
              class="mt-0"
            >
            </v-checkbox>
          </template>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="py-4">
          <v-spacer></v-spacer>
          <v-btn color="secondary" outlined @click="closeDialog">
            Cancelar
          </v-btn>
          <v-btn color="primary" @click="applyFilter">
            Aplicar
          </v-btn>
          <v-spacer/>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script>
import { editorMixin } from '../mixins/index.js'

export default {
  name: 'VpressFilter',
  mixins: [editorMixin],
  props: {
    column: {
      type: String,
      default: '',
      required: true
    },
    type: {
      type: String,
      default: '',
      required: true
    },
    value: {
      type: Object,
    },
    openFilterDialog: Boolean
  },
  data() {
    return {
      loading: true,
      dialog: true,
      linearFilter: [0,100],
      min: 100,
      max: 0,
      ordinalFilter: [],
      categories: [],
    };
  },
  created() {
    this.getFilterParams()
  },
  methods: {
    async getFilterParams() {
      try {
        if (this.value.type && this.value.type === 'linear') {
          this.linearFilter = [this.value.min, this.value.max]
        } else if (this.value.type && this.value.type !== 'linear') {
          this.ordinalFilter = this.value.categories
        }

        const filterParams = await this.filter_params(
          { column: this.column, type: this.type }
        )
        if(this.type !== 'linear'){
          this.categories = filterParams.map(category => category[this.column])
        } else { 
          this.min = +filterParams[0].min
          this.max = +filterParams[0].max
        }
        this.loading = false;
      } catch (error) {
        this.closeDialog()
        throw new Error(error.message)
      }
    },
    async applyFilter() {
      try {
        await this.merge_query(
          {
              title: this.column,
              slug: this.column,
              type: this.type,
              value: this.type === 'linear' ? this.linearFilter : this.ordinalFilter,
              
          },
          'filter'
        )
        this.closeDialog()
      } catch (error) {
        this.closeDialog()
        throw new Error(error.message)
      }
    },
    closeDialog() {
      this.$emit('update:openFilterDialog', false);
      this.dialog = false;
    },
    selectAll() {
      this.ordinalFilter = this.categories;
    },
    deselectAll() {
      this.ordinalFilter = [];
    }
  }
};
</script>

<style scoped>
a.underline {
  text-decoration: underline;
}

.loader-container {
  width:100%;
  display:flex;
  justify-content:center;
  padding-top:10px;
}

</style>
