<template>
  <v-card
    :id="id"
    :ref="id"
    :draggable="draggable"
    @dragstart="dragStart"
    @dragover.stop
    class="border-radius-none card-flex"
    color="#9292A9"
    dark
    hover
  >
     <slot />
  </v-card>
</template>
<script>
export default {
  name: 'VpressVariableCard',
  props: {
    id: String,
    columnData: Object,
    parentId: String ,
    parentRefs: Object,
    inSlot: Boolean
  },
  data() {
    return {
      variableCardParent: null,
      variableCard:null,
      variableCardClone: null,
      draggable:true
    };
  },
  methods: {
    dragStart(e) {
      const { target, dataTransfer } = e;
      const columnDataToTransferInObject = { ...this.columnData, id: this.id };
      const columnDataToTransferInString = JSON.stringify(columnDataToTransferInObject);

      dataTransfer.setData('columnDataToTransferInString', columnDataToTransferInString);
    }
  }
};
</script>
<style scoped>
  .card-flex {
    height:100%;
  }
</style>
