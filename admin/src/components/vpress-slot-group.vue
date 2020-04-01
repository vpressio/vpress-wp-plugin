<template>
  <v-card flat class="py-5 px-3">
    <v-row class="ma-0">
      <v-col  
        cols="12"
        v-for="(slot, slotIndex) in slots"
        :key="`slot_${slotIndex}`"
        class="pa-0"
      >
        <VpressSlot
          :slotId="slot.slotId"
          :icon="slot.icon"
          :slotIcon="slot.slotIcon"
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
import VpressSlot from './vpress-slot';

export default {
  name: 'VpressVariableSlotsContainer',
  components: {
    VpressSlot
  },
  props: ['id', 'slotLabel'],
  data() {
    return {
      slots: [
        {
          slotId:"xAxis",
          icon:"mdi-view-sequential",
          slotIcon: "eje-x",
          label:"Columnas",
          maxStack: 1,
          filter: false
        },
        {
          slotId:"yAxis",
          icon:"mdi-view-parallel",
          slotIcon: "eje-y",
          label:"Filas",
          maxStack: 1,
          filter: false
        },
        {
          slotId:"aggregation",
          icon:" mdi-palette-outline",
          slotIcon: "color",
          label:"Color",
          maxStack: 1,
          filter: false
        },
        {
          slotId:"filter",
          icon:"mdi-tune",
          slotIcon: "",
          label: "Filtros",
          maxStack: 3,
          filter: true
        }
      ]
    };
  }
};
</script>
