<template>
  <v-card class="ma-1">
        <v-label>
          {{ slotLabel }}
        </v-label>
        <v-btn @click="remove" small icon>
          X
        </v-btn>
        <v-card
          :ref="id"
          :id="id"
          min-height="50"
          outlined
          @drop.prevent="drop"
          @dragover.prevent="dragOver"
          light
        >
          <slot />
        </v-card>
  </v-card>
</template>
<script>
export default {
  name: 'VpressVariableCardSlot',
  props: ['id', 'slotLabel'],
  data() {
    return {
      cardId: '',
      slotId: ''
    };
  },
  methods: {
    drop(e) {
      const { dataTransfer, target } = e;

      this.slotId = this.slotId.length === 0 ? target.id : this.slotId;

      if (target.children.length < 1) {
        const columnDataToTransferInString = dataTransfer.getData('columnDataToTransferInString');
        const columnDataToTransferInObject = JSON.parse(columnDataToTransferInString);
        const card = document.getElementById(columnDataToTransferInObject.id);

        card.setAttribute('id', `${columnDataToTransferInObject.id}_${this.slotId}`);
        this.cardId = card.id;
        target.appendChild(card);
        card.style.display = 'block';
        this.$store.dispatch(`chartConfig/${this.slotId}`, columnDataToTransferInObject);
      } else {
        const slot = document.getElementById(this.slotId);
        const oldCard = document.getElementById(this.cardId);
        const newColumnDataToTransferInString = dataTransfer.getData(
          'columnDataToTransferInString'
        );
        const newColumnDataToTransferInObject = JSON.parse(newColumnDataToTransferInString);
        const newCard = document.getElementById(newColumnDataToTransferInObject.id);

        slot.removeChild(oldCard);
        newCard.setAttribute('id', `${newColumnDataToTransferInObject.id}_${this.slotId}`);
        this.cardId = newCard.id;
        slot.appendChild(newCard);
        newCard.style.display = 'block';
        this.$store.dispatch(`chartConfig/${this.slotId}`, newColumnDataToTransferInObject);
      }
    },
    dragOver(event) {
      if (this.$store.state.chartConfig);
    },
    remove(_event) {
      const slot = document.getElementById(this.slotId);
      const card = document.getElementById(this.cardId);
      if (card) slot.removeChild(card);
      this.$store.dispatch(`chartConfig/${this.slotId}`, null);
    }
  }
};
</script>
<style scoped>
.slotHeaderColumn {
  padding: 5px;
}
</style>
