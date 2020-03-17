<template>
  <v-card flat class="py-5 px-3">
    <v-row class="ma-0">
      <v-col  
        cols="12"
        v-for="(slot, slotIndex) in slots"
        :key="`slot_${slotIndex}`"
        class="pa-0"
      >
        <VpressVariableSlot
          :slotId="slot.slotId"
          :icon="slot.icon"
          :label="slot.label"
          :maxStack="slot.maxStack"
          :dataType="['linear','ordinal']"
          :filter="slot.filter"
        />
      </v-col>
    </v-row>
  </v-card>
</template>
<script>
import VpressVariableSlot from './variable-variable-slot';

export default {
  name: 'VpressVariableSlotsContainer',
  components: {
    VpressVariableSlot
  },
  props: ['id', 'slotLabel'],
  data() {
    return {
      slots: [
        {
          slotId:"UPDATE_X_AXIS",
          icon:"mdi-view-sequential",
          label:"Columnas",
          maxStack: 5,
          filter: false
        },
        {
          slotId:"UPDATE_Y_AXIS",
          icon:"mdi-view-parallel",
          label:"Filas",
          maxStack: 1,
          filter: false
        },
        {
          slotId:"UPDATE_GROUP_BY",
          icon:"mdi-palette-outline",
          label:"Colores",
          maxStack: 1,
          filter: false
        },
        {
          slotId:"UPDATE_FILTER",
          icon:"mdi-tune",
          label: "Filtrar",
          maxStack: 1,
          filter: true
        }
      ]
    };
  }
};
</script>
