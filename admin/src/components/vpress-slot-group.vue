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
  name: 'VpressSlotGroup',
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
      const activeChartValues = this.$store.getters['chartConfig/chart']
      return this.slots.reduce(
        (acc, slot) => {
            switch (slot.slotId) {
              case 'xAxis':
                if(activeChartValues.chart === 'map') {
                  slot.label = 'Geometría'
                } else {
                  slot.label = 'Filas'
                }
                acc.push(slot)
                break
              case 'yAxis':
                if(activeChartValues.chart === 'map') {
                  slot.label = 'Numérico'
                } else {
                  slot.label = 'Columnas'
                }
                acc.push(slot)
                break
              case 'aggregation':
                if(
                  activeChartValues.chart === 'bars' ||
                  activeChartValues.chart === 'timeline'
                ) {
                  slot.label = 'Grupo'
                } else {
                  slot.label = 'Color'
                }
                if(activeChartValues.chart === 'map') break;
                acc.push(slot)
                break;
              case 'filter':
                if (this.$store.getters['data/origin'] !== 'api') break
                  acc.push(slot)
                break
              default:
                acc.push(slot)
                break;
            }
          return acc
        },
        []
      )
    }
  }
};
</script>
