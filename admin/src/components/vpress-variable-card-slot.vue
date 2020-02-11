<template>
  <v-card class="ma-1">
    <v-row no-gutters>
      <v-col class="slotHeaderColumn">
        <v-label>
          {{ slotLabel }}
        </v-label>
      </v-col>
      <v-col cols=1 class="slotHeaderColumn" v-if="cardId">
        <v-btn @click="remove" small icon>
          X
        </v-btn>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-card
          :ref="id"
          :id="id"
          min-height="50"
          outlined
          @drop.prevent="drop"
          @dragover.prevent="dragOver"
          light
        >
          <slot/>
        </v-card>
      </v-col>
    </v-row>
</v-card>
</template>
<script>
export default {
  name: 'VpressVariableCardSlot',
  props: ['id', 'slotLabel'],
  data() {
    return {
      cardId: null,
      slotId: null,
    };
  },
  methods: {
    drop(e) {
      const {
        dataTransfer,
        target,
      } = e;
      if (target.children.length < 1)

      this.slotId = target.id;
      const columnDataToTransferInString = dataTransfer.getData('columnDataToTransferInString');
      const columnDataToTransferInObject = JSON.parse(columnDataToTransferInString);
      const card = document.getElementById(columnDataToTransferInObject.id);
      card.setAttribute('id', `${columnDataToTransferInObject.id}_${this.slotId}`);
      this.cardId = card.id;
      target.appendChild(card)
      card.style.display = 'block'
      this.$store.dispatch(`chartConfig/${this.slotId}`, columnDataToTransferInObject);
    },
    dragOver(e) {
      if(this.$store.state.chartConfig);
    },
    remove(e) {
      const slot = document.getElementById(this.slotId);
      const card = document.getElementById(this.cardId);
      if (card) 
      slot.removeChild(card)
      this.$store.dispatch(`chartConfig/${this.slotId}`,null);
    },
  },
};
</script>
<style>
  .slotHeaderColumn{
    padding:5px;
  }
</style>
