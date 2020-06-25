<template>
  <v-card class="py-3">
    <div
      v-for="(slot, slotIndex) in slotsToRender"
      :key="`slot_${slotIndex}`"
    >
      <VpressSlot
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
      />
    </div>
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
          label:"Filas"
        },
        {
          slotId:"yAxis",
          icon:"mdi-view-parallel",
          slotIcon: "eje-y",
          label:"Columnas"
        },
        {
          slotId:"aggregation",
          icon:" mdi-palette-outline",
          slotIcon: "color",
          label:"Color"
        },
        {
          slotId:"filter",
          icon:"mdi-tune",
          slotIcon: "",
          label: "Filtros"
        }
      ]
    };
  },
  computed: {
    slotsToRender() {
      const test = this.slots.filter(slot => {
        const activeChartValues = this.$store.getters['chartConfig/chart']
        if(
          activeChartValues.chart === 'bars' ||
          activeChartValues.chart === 'timeline'
        ) {
          return slot.slotId !== 'aggregation'
        } else {
          return slot
        }
      })
      return test
    }
  }
};
</script>
