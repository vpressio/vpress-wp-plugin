<template>
  <v-card
  >
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
          v-if="chartType !== 'bars' && chartType !== 'timeline'"
          class="mb-2"
          slotId="aggregation"
          icon="mdi-palette-outline"
          slotIcon="color"
          label="Color"
        />
      <VpressSlot
          class="mb-2"
          slotId="filter"
          icon="mdi-tune"
          slotIcon=""
          label="Filtros"
        />
  </v-card>
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
      return this.$store.getters['chartConfig/chartType']
    }
  }
};
</script>
