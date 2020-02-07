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

      this.slotId = target.id;

      const columnDataToTransferInString = dataTransfer.getData('columnDataToTransferInString');
      const columnDataToTransferInObject = JSON.parse(columnDataToTransferInString);

      this.cardId = columnDataToTransferInObject.id

      const card = document.getElementById(this.cardId);

      if (target.children.length < 1)

      target.appendChild(card)

      this.$store.dispatch(`chartConfig/${this.slotId}`, columnDataToTransferInObject);
    },
    dragOver(e) {
      if(this.$store.state.chartConfig);
    },
    remove(e) {
      const slot = document.getElementById('card_slot_start');
      const card = document.getElementById(this.cardId);
      if (card) slot.appendChild(card)
      this.$store.dispatch(`chartConfig/${this.slotId}`,null)
    },
  },
};
</script>
<style>
  .slotHeaderColumn{
    padding:5px;
  }
</style>
