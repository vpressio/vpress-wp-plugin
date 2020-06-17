<template>
  <v-card class="py-3">
    <VpressSlot
      v-for="(slot, slotIndex) in slots"
      :key="`slot_${slotIndex}`"
      class="mb-2"
      :class="{
        'v-step-4': slot.slotId === 'xAxis',
        'v-step-5': slot.slotId === 'yAxis',
        'v-step-6': slot.slotId === 'aggregation'
      }"
      :slotId="slot.slotId"
      :icon="slot.icon"
      :slotIcon="slot.slotIcon"
      :label="slot.label"
      :maxStack="slot.maxStack"
      :dataType="['linear','ordinal']"
      :filter="slot.filter"
    />
  </v-card>
</template>
<script>
import VpressSlot from './vpress-slot';

export default {
  name: 'VpressVariableSlotsContainer',
  components: {
    VpressSlot
  },
  data() {
    return {
      slots: [
        {
          slotId:"xAxis",
          icon:"mdi-view-sequential",
          slotIcon: "eje-x",
          label:"Filas",
          maxStack: 3,
          filter: false
        },
        {
          slotId:"yAxis",
          icon:"mdi-view-parallel",
          slotIcon: "eje-y",
          label:"Columnas",
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
        // {
        //   slotId:"filter",
        //   icon:"mdi-tune",
        //   slotIcon: "",
        //   label: "collapseBy",
        //   maxStack: 3,
        //   filter: true
        // }
      ]
    };
  }
};
</script>
