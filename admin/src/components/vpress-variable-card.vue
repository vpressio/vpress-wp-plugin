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
    dark
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
  mounted(){
      this.setHtmlElements();
  },
  methods: {
    dragStart(e) {
      const { target, dataTransfer } = e;
      const columnDataToTransferInObject = { ...this.columnData, id: this.variableCardClone.id, parentId: this.variableCardParent.id };
      const columnDataToTransferInString = JSON.stringify(columnDataToTransferInObject);

      dataTransfer.setData('columnDataToTransferInString', columnDataToTransferInString);
    },
    dragEnd(e) {
      const { target } = e;
    },
    setHtmlElements() {
      this.variableCard = this.$refs[this.id].$el;

      const variableCardClone = this.variableCard.cloneNode(true);

      variableCardClone.setAttribute('id', `${this.id}_clone`);
      variableCardClone.setAttribute('draggable', false);
      variableCardClone.style.display = 'none';

      this.variableCardClone = variableCardClone;

      const variableCardParent = this.parentRefs.cardStartContainer.$el;

      variableCardParent.appendChild(this.variableCardClone);

      this.variableCardParent = variableCardParent;
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
