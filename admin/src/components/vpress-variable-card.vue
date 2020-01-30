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
    <v-card-text>
      <slot/>
    </v-card-text>
  </v-card>
</template>
<script>
export default {
  name: 'VpressVariableCard',
  props: ['id', 'draggable'],
  data() {
    return {

    };
  },
  methods: {
    dragStart: (e) => {
      const { target, dataTransfer } = e;
      dataTransfer.setData('cardId', target.id);

      // setTimeout(() => {
      //   targetClone.style.display = 'none';
      // }, 0);
    },
    dragEnd: (e) => {
      const { target } = e;
      target.style.display = 'block';
    }
  },
};
</script>
<style>
.card-flex {
  display: flex;
}
</style>