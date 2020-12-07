<template>
  <div class="px-2">
    <VpressSlot
      class="mb-2"
      slotId="xAxis"
      icon="mdi-view-sequential"
      slotIcon="eje-x"
      label="Eje x"
    />
    <VpressSlot
      class="mb-2"
      slotId="yAxis"
      icon="mdi-view-parallel"
      slotIcon="eje-y"
      label="Eje y"
    />
    <VpressSlot
      v-if="chartType === 'heatmap'"
      class="mb-2"
      slotId="collapseBy"
      icon="mdi-palette-outline"
      slotIcon="color"
      label="Color"
    />
    <VpressSlot
      v-if="chartType === 'scatter'"
      class="mb-2"
      slotId="groupBy"
      icon="mdi-palette-outline"
      slotIcon="color"
      label="Color"
    />
    <VpressSlot
      v-if="chartType === 'scatter'"
      class="mb-2"
      slotId="collapseBy"
      icon="mdi-palette-outline"
      slotIcon="color"
      label="Tamaño"
    />
    <VpressSlot
      class="mb-2"
      slotId="filter"
      icon="mdi-tune"
      slotIcon=""
      label="Filtros"
    />
  </div>
</template>
<script>
import VpressSlot from './vpress-slot';

export default {
  name: 'VpressSlotGroup',
  components: {
    VpressSlot
  },
  computed: {
    chartType () {
      return this.$store.getters['editor/chartType']
    }
  }
};
</script>