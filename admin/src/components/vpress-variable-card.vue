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
  props: ['id', 'columnData', 'parentId', 'parent'],
  data() {
    return {
      variableCardParent: null,
      variableCard:null,
      variableCardClone: null,
      draggable:false
    };
  },
  created(){
    this.setHtmlElements();
  },
  methods: {
    dragStart(e) {
      const { target, dataTransfer } = e;

      const columnDataToTransferInObject = { ...this.columnData, id: this.variableCardClone.id };
      const columnDataToTransferInString = JSON.stringify(columnDataToTransferInObject);

      dataTransfer.setData('columnDataToTransferInString', columnDataToTransferInString);
    },
    dragEnd(e) {
      const { target } = e;
      target.style.display = 'block';
    },
    async setHtmlElements() {
      // console.log(this.parent)
      // this.variableCard = await document.getElementById(this.id);

      // const variableCardClone = this.variableCard.cloneNode(this.id);

      // variableCardClone.setAttribute('id', `${this.id}_clone`);
      // variableCardClone.setAttribute('draggable', false);
      // variableCardClone.style.display = 'none';

      // this.variableCardClone = variableCardClone;

      // const variableCardParent = await document.getElementById(this.parentId);

      // variableCardParent.appendChild(this.variableCardClone);

      // this.variableCardParent = variableCardParent;
      // this.draggable = true;
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
