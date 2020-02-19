<template>
  <v-card class="py-5 px-3">
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
            min-height="50"
            outlined
            @dragenter="dragEnter"
            @dragover.prevent="dragOver"
            @dragleave="dragLeave"
            @drop.stop.self="drop"
            light
            class="pt-2 px-2 pb-1"
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
            min-height="50"
            outlined
            @dragenter="dragEnter"
            @dragover.prevent="dragOver"
            @dragleave="dragLeave"
            @drop.stop.self="drop"
            light
            class="pt-2 px-2 pb-1"
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
              mdi-view-sequential
            </v-icon>
            <span class="slot-label">
              Colores
            </span>
          <v-card
            ref="UPDATE_GROUP_BY"
            id="UPDATE_GROUP_BY"
            min-height="50"
            outlined
            @dragenter="dragEnter"
            @dragover.prevent="dragOver"
            @dragleave="dragLeave"
            @drop.stop.self="drop"
            light
            class="pt-2 px-2 pb-1"
          >
            <slot/>
          </v-card>
        </v-card>
      </v-col>
    </v-row>
  </v-card>
</template>
<script>
import VpressVariableCard from './vpress-variable-card.vue';

export default {
  name: 'VpressVariableCardSlots',
  components: {
    VpressVariableCard
  },
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
      const startParent = document.getElementById(columnDataToTransferInObject.parentId);
      const cardToAppendInSlot = document.getElementById(columnDataToTransferInObject.id);
      const cardCloneWithOldId = cardToAppendInSlot.cloneNode(true);
      const cardSlotId = target.id;
      const cardToAppendInSlotId = columnDataToTransferInObject.id;
      const newCardId = `${cardToAppendInSlotId}_${cardSlotId}`;

      this.$store.dispatch(`chartConfig/${target.id}`, columnDataToTransferInObject);
      if(this.cardSlots[`${target.id}_CARD`]){
        target.removeChild(this.cardSlots[`${target.id}_CARD`])
      };

      startParent.appendChild(cardCloneWithOldId);

      if( newCardId !== newCardId ) {
        cardToAppendInSlot.setAttribute('id', newCardId);
      };

      target.appendChild(cardToAppendInSlot);
      cardToAppendInSlot.style.display = 'block';
      this.cardSlots[`${target.id}_CARD`] = cardToAppendInSlot;
    },
    dragOver() {
    },
    dragEnter(event) {
      const { target } = event;

      if(this.cardSlots[`${target.id}_CARD`]) {
        currentCardInSlot.style.display = 'none';
      }
    },
    dragLeave(event) {
      const { target } = event;

      if(this.cardSlots[`${target.id}_CARD`] && currentCardInSlot.style.display === 'none') {
        currentCardInSlot.style.display = 'block';
      }
    }
  }
};
</script>
<style scoped>
.slotHeaderColumn {
  padding: 5px;
}

.slot-label {
  color:#382E82;
  font-weight: 500;
}

.card-flex {
  display: flex;
}

.card-text {
  color: white !important;
  font-weight: 900;
  font-size: 1rem;
}
</style>
