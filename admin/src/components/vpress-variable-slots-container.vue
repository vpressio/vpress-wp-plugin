<template>
  <v-card flat class="py-5 px-3">
    <v-row class="ma-0">
      <v-col  
        cols="12"
        v-for="(slot, slotIndex) in slots"
        :key="`slot_${slotIndex}`"
        class="pa-0"
      >
        <VpressVariableCardSlot
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
import VpressVariableCardSlot from './vpress-variable-slot';

export default {
  name: 'VpressVariableSlotsContainer',
  components: {
    VpressVariableCardSlot
  },
  props: ['id', 'slotLabel'],
  data() {
    return {
      slots: [
        {
          slotId:"xAxis",
          icon:"mdi-view-sequential",
          label:"Columnas",
          maxStack: 2,
          filter: false
        },
        {
          slotId:"yAxis",
          icon:"mdi-view-parallel",
          label:"Filas",
          maxStack: 2,
          filter: false
        },
        {
          slotId:"aggregation",
          icon:" mdi-palette-outline",
          label:"Colores",
          maxStack: 1,
          filter: false
        },
        {
          slotId:"filter",
          icon:"mdi-tune",
          label: "Filtrar",
          maxStack: 3,
          filter: true
        }
      ]
    };
  }
};
</script>
