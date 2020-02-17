<template>
  <v-card
    :id="id"
    :ref="id"
    :draggable="draggable"
    @dragstart="dragStart"
    @dragend="dragEnd"
    @dragover.stop
    class="border-radius-none card-flex mb-3"
    color="#9292A9"
    max-height="50"
    dark
    shaped
    hover
    style="text-overflow: ellipsis;overflow: hidden; "
  >
    <v-card-text class="card-text">
      <slot />
    </v-card-text>
  </v-card>
</template>
<script>
export default {
  name: 'VpressVariableCard',
  props: ['id', 'draggable', 'columnData'],
  data() {
    return {
      variableCardParent: ''
    };
  },
  methods: {
    dragStart(e) {
      const { target, dataTransfer } = e;

      const variableCardParentId = e.target.parentElement.id;
      this.variableCardParent = document.getElementById(variableCardParentId);
      const variableCardClone = target.cloneNode(target.id);
      variableCardClone.setAttribute('id', `${target.id}_clone`);
      variableCardClone.setAttribute('draggable', false);
      variableCardClone.style.display = 'none';
      this.variableCardParent.appendChild(variableCardClone);
      const columnDataToTransferInObject = { ...this.columnData, id: variableCardClone.id };
      const columnDataToTransferInString = JSON.stringify(columnDataToTransferInObject);
      dataTransfer.setData('columnDataToTransferInString', columnDataToTransferInString);
    },
    dragEnd(e) {
      const { target } = e;
      target.style.display = 'block';
    }
  }
};
</script>
<style scoped>
.card-flex {
  display: flex;
}

.card-text {
  color: white !important;
  font-weight: 900;
  font-size: 1rem;
}
</style>
