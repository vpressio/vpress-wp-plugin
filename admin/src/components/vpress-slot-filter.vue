<template>
  <div class="text-center">
    <v-dialog v-model="dialog" width="500">
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
        <v-card-text class="py-4">
          <template v-if="type == 'linear'">
            <v-range-slider
              v-if="this.range"
              class="mt-5"
              v-model="linearFilter"
              dense
              hide-details
              :min="range[0]"
              :max="range[1]"
              step="0.1"
              thumb-label="always"
              thumb-size="32"
            >
            </v-range-slider>
          </template>
          <template v-else>
            <v-checkbox
              v-model="ordinalFilter"
              v-for="item in dataFiltered"
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
          <v-btn color="primary" @click="setFilter">
            Aplicar
          </v-btn>
          <v-spacer></v-spacer>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import _ from 'lodash';
import * as d3 from 'd3';

export default {
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
    openFilterDialog: Boolean
  },
  data() {
    return {
      dialog: true,
      linearFilter: this.range,
      ordinalFilter: []
    };
  },
  computed: {
    dataFiltered() {
      const uniq = _.uniqBy(this.$store.getters['data/data'], this.column);
      return _.map(uniq, this.column);
    },
    range() {
      if (this.type == 'linear') {
        return [d3.min(this.dataFiltered), d3.max(this.dataFiltered)];
      } else {
        return null;
      }
    },
    min() {
      if (this.type == 'linear') {
        return _.min(this.dataFiltered);
      } else {
        return null;
      }
    },
    max() {
      if (this.type == 'linear') {
        return _.max(this.dataFiltered);
      } else {
        return null;
      }
    }
  },
  methods: {
    closeDialog() {
      this.$emit('update:openFilterDialog', false);
      this.dialog = false;
    },
    selectAll() {
      this.ordinalFilter = this.dataFiltered;
    },
    deselectAll() {
      this.ordinalFilter = [];
    },
    setFilter() {
      const filter = { type: this.type, column: this.column };
      if (this.type == 'linear') {
        this.$store.dispatch(' Filter', { ...filter, value: this.linearFilter });
      } else {
        this.$store.dispatch('data/setFilter', { ...filter, value: this.ordinalFilter });
      }
      this.dialog = false;
      this.$emit('update:openFilterDialog', false)
    }
  }
};
</script>

<style scoped>
a.underline {
  text-decoration: underline;
}
</style>
