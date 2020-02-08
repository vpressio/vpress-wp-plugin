<template>
  <v-card
    :id="id"
    :draggable="draggable"
    @dragstart="dragStart"
    @dragend="dragEnd"
    @dragover.stop
    class="border-radius-none my-2 mx-4 card-flex"
    color="#9292A9"
    max-height="50"
    dark
    shaped
    hover
    style="text-overflow: ellipsis;overflow: hidden; "
  >
    <v-card-text class="card-text">
      <slot/>
    </v-card-text>
  </v-card>
</template>
<script>
export default {
  name: 'VpressVariableCard',
  props: ['id','draggable','columnData'],
  methods: {
    dragStart(e){
      const { target, dataTransfer } = e;
      const columnDataToTransfer = {...this.columnData, id:target.id};
      const columnDataToTransferInString = JSON.stringify(columnDataToTransfer);

      dataTransfer.setData('columnDataToTransferInString',columnDataToTransferInString);
    },
    dragEnd: (e) => {
      const { target } = e;
      
      target.style.display = 'block';
    }
  },
};
</script>
<style scoped>
.card-flex {
  display: flex;
}

.card-text{
  color: white !important;
  font-weight:900;
  font-size:1rem;
}
</style>