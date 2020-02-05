<template>
  <v-card style="width: 80%;margin:2px auto">
    <v-card-title>
      x-axis
    </v-card-title>
    <v-btn @click="remove" small icon>
      X
    </v-btn>
    <v-card
      :id="id"
      min-height="68"
      outlined
      @dragover.prevent
      @drop.prevent="drop"
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
    };
  },
  methods: {
    drop(e) {
      const {
        dataTransfer,
        target,
      } = e;
      this.cardId = dataTransfer.getData('cardId');
      const card = document.getElementById(this.cardId);
      if (target.children.length < 1) target.appendChild(card);
      this.$store.commit('SET_X_AXIS', 'perro');
      console.log(this.$store.state);
    },
    remove(e) {
      const container = document.getElementById('card_slot_start');
      const card = document.getElementById(this.cardId);
      if (card) container.appendChild(card);
    },
  },
};
</script>
<style>

</style>
