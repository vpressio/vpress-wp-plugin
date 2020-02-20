<template>
  <v-card flat class="py-5 px-3">
    <v-row class="ma-0">
      <v-col cols="6" class="pa-0">
        <v-card flat class="ma-1">
            <v-icon 
              color="secondary"
              dense
            >
              mdi-view-sequential
            </v-icon>
            <span class="slot-label">
              Filas
            </span>
          <v-card
            ref="UPDATE_X_AXIS"
            id="UPDATE_X_AXIS"
            height="75"
            outlined
            @dragenter="dragEnter"
            @dragover.prevent
            @dragleave="dragLeave"
            @drop.stop.self="drop"
            light
            class="pa-2"
          >
            <slot/>
          </v-card>
        </v-card>
      </v-col>
      <v-col cols="6" class="pa-0">
        <v-card flat class="ma-1">
            <v-icon 
              color="secondary"
              dense
            >
              mdi-view-parallel
            </v-icon>
            <span class="slot-label">
              Columnas
            </span>
          <v-card
            ref="UPDATE_Y_AXIS"
            id="UPDATE_Y_AXIS"
            height="75"
            outlined
            @dragenter="dragEnter"
            @dragover.prevent
            @dragleave="dragLeave"
            @drop.stop.self="drop"
            light
            class="pa-2"
          >
            <slot/>
          </v-card>
        </v-card>
      </v-col>
    </v-row>
    <v-row class="ma-0">
      <v-col cols="6" class="pa-0">
        <v-card flat class="ma-1">
          <v-icon 
              color="secondary"
              dense
            >
              mdi-palette-outline
            </v-icon>
            <span class="slot-label">
              Colores
            </span>
          <v-card
            ref="UPDATE_GROUP_BY"
            id="UPDATE_GROUP_BY"
            height="75"
            outlined
            @dragenter="dragEnter"
            @dragover.prevent
            @dragleave="dragLeave"
            @drop.stop.self="drop"
            light
            class="pa-2"
          >
            <slot/>
          </v-card>
        </v-card>
      </v-col>
    </v-row>
  </v-card>
</template>
<script>
export default {
  name: 'VpressVariableCardSlots',
  props: ['id', 'slotLabel'],
  data() {
    return {
      cardSlots: {
        UPDATE_X_AXIS_CARD: null,
        UPDATE_Y_AXIS_CARD: null,
        UPDATE_GROUP_BY_CARD: null,
      }
    };
  },
  methods: {
    drop(event) {
      
      const { dataTransfer, target } = event;
      const columnDataToTransferInString = dataTransfer.getData('columnDataToTransferInString');
      const columnDataToTransferInObject = JSON.parse(columnDataToTransferInString);
      const originalCard = document.getElementById(columnDataToTransferInObject.id);
      const cardToAppendInSlot = originalCard.cloneNode(true);
      const cardSlotId = target.id;
      const originalCardId = columnDataToTransferInObject.id;
      const newCardId = `${originalCardId}_${cardSlotId}`;

      this.$store.dispatch(`chartConfig/${cardSlotId }`, columnDataToTransferInObject);
      if(this.cardSlots[`${target.id}_CARD`]) {
        target.removeChild(this.cardSlots[`${cardSlotId }_CARD`])
      }
      cardToAppendInSlot.setAttribute('id', newCardId);
      cardToAppendInSlot.draggable = false;
      cardToAppendInSlot.children[0].style.zIndex = 1;
      cardToAppendInSlot.children[0].children[0].onclick = this.removeCard( event, cardToAppendInSlot, cardSlotId);
      cardToAppendInSlot.style.display = 'block';
      target.appendChild(cardToAppendInSlot);
      this.cardSlots[`${cardSlotId}_CARD`] = cardToAppendInSlot;
    },
    dragEnter(event) {
      const { target } = event;

      if(this.cardSlots[`${target.id}_CARD`]) {
        this.cardSlots[`${target.id}_CARD`].style.display = 'none';
      }
    },
    dragLeave(event) {
      const { target } = event;
      if(
        this.cardSlots[`${target.id}_CARD`] &&
        this.cardSlots[`${target.id}_CARD`].style.display === 'none'
      ) {
        this.cardSlots[`${target.id}_CARD`].style.display = 'block';
      }
    },
    removeCard(_event, nodeToRemove, cardSlotId) {
      return () => {
        this.$store.dispatch(`chartConfig/${cardSlotId }`, null);
        this.cardSlots[`${cardSlotId}_CARD`] = null;
        nodeToRemove.remove();
      }
    }
  }
};
</script>
