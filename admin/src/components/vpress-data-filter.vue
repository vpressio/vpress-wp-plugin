<template>
  <div class="text-center">
    <v-dialog
      v-model="dialog"
      width="500"
    >
      <template v-slot:activator="{ on }">
        <v-btn color="primary" dark v-on="on">Filtrar</v-btn>
      </template>
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
          <a class="underline">Seleccionar todo</a>
          -
          <a class="underline">Limpiar selección</a>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-text class="py-4">
          <template v-if="type == 'linear'">
            <v-range-slider
              class="mt-5"
              v-model="range"
              dense
              hide-details
              :min="min"
              :max="max"
              thumb-label="always"
              thumb-size="32"
            >
            </v-range-slider>
          </template>
          <template v-else>
            <v-checkbox
              v-model="selected"
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
          <v-btn
            color="secondary"
            outlined
            @click="dialog = false"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            @click="dialog = false"
          >
            Aplicar
          </v-btn>
          <v-spacer></v-spacer>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import _ from 'lodash'

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
    }
  },
  data () {
    return {
      dialog: false,
      range: [-9999, 9999],
      selected: []
    }
  },
  computed: {
    dataFiltered() {
      const uniq = _.uniqBy(this.$store.state.data.data, this.column);
      return _.map(uniq, this.column);
    },
    min() {
      if (this.type == 'linear') {
        return _.min(this.dataFiltered);
      } else {
        return 0
      }
    },
    max() {
      if (this.type == 'linear') {
        return _.max(this.dataFiltered);
      } else {
        return 0
      }
    }
  }
}
</script>

<style scoped>
a.underline {
  text-decoration: underline;
}
</style>
