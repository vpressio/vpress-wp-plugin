<template>
  <VpressDataTable :dataset="$store.getters['workspace/activeDataset']"/>
</template>
<script>
import VpressDataTable from './vpress-data-table.vue';

export default {
  name: 'VpressDataset',
  components: {
    VpressDataTable
  },
}
</script>
