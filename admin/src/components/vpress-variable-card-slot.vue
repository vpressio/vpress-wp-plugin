<template>
  <v-card style="width: 80%;margin:2px auto">
    <v-card-title>
      x-axis
    </v-card-title>
    <v-btn @click="remove" small icon>
      X
    </v-btn>
    <v-card
      :ref="id"
      :id="id"
      min-height="68"
      outlined
      @drop.prevent="drop"
      @dragover.prevent="dragOver"
      light
    >
      <slot/>
    </v-card>
</v-card>
</template>
<script>
export default {
  name: 'VpressVariableCardSlot',
  props: ['id'],
  data() {
    return {
      cardId: null,
      slotId:null
    };
  },
  methods: {
    drop(e) {
      const {
        dataTransfer,
        target,
      } = e;
      this.cardId = dataTransfer.getData('cardId');
      this.slotId = target.id
      const card = document.getElementById(this.cardId);
      if (target.children.length < 1) 
      target.appendChild(card)
      this.$store.dispatch(`chartConfig/${this.slotId}`,"prueba")
      
      ;
    },
    dragOver(e) {
      if(this.$store.state.chartConfig);
    },
    remove(e) {
      const container = document.getElementById('card_slot_start');
      const card = document.getElementById(this.cardId);
      if (card) container.appendChild(card)
      this.$store.dispatch(`chartConfig/${this.slotId}`,null)
    },
  },
};
</script>
<style>

</style>
