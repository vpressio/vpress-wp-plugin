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
            @drop.prevent="drop"
            @dragover.prevent="dragOver"
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
            @drop.prevent="drop"
            @dragover.prevent="dragOver"
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
            @drop.prevent="drop"
            @dragover.prevent="dragOver"
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
      cardId: null,
      slotId: null,
    
    };
  },
  methods: {
    drop(e) {
      const { dataTransfer, target } = e;

      const cardSlotId = target.id;
      const columnDataToTransferInString = dataTransfer.getData('columnDataToTransferInString');
      const columnDataToTransferInObject = JSON.parse(columnDataToTransferInString);
      
        console.log(target.id)
      if(this.cardId){
        const startParent = document.getElementById(columnDataToTransferInObject.parentId)
        startParent.append(this.$refs[cardSlotId].$el.firstChild);
      }
     
      const VariableCardToAppend = document.getElementById(columnDataToTransferInObject.id);
      // console.log(document.getElementById(columnDataToTransferInObject.id))
      if(`${columnDataToTransferInObject.id}_${target.id}` !== `${columnDataToTransferInObject.id}_${target.id}`){
        VariableCardToAppend.setAttribute('id', `${columnDataToTransferInObject.id}_${target.id}`);
      }

      console.log(VariableCardToAppend.id)
      // if (target.children.length > 1) {
      //   console.log(target.children.length)
      //   console.log(this.$refs[this.cardId].$el)
        
      // };

      target.appendChild(VariableCardToAppend);

      VariableCardToAppend.style.display = 'block';

      // this.$store.dispatch(`chartConfig/${cardSlotId}`, columnDataToTransferInObject);
      this.cardId = VariableCardToAppend.id;
      // debugger






      // this.slotId = this.slotId.length === 0 ? target.id : this.slotId;

      // if (target.children.length < 1) {
      //   const columnDataToTransferInString = dataTransfer.getData('columnDataToTransferInString');
      //   const columnDataToTransferInObject = JSON.parse(columnDataToTransferInString);
      // const card = document.getElementById(columnDataToTransferInObject.id);

      //   card.setAttribute('id', `${columnDataToTransferInObject.id}_${this.slotId}`);
      //   this.cardId = card.id;
      //   target.appendChild(card);
      //   card.style.display = 'block';
      //   this.$store.dispatch(`chartConfig/${this.slotId}`, columnDataToTransferInObject);
      //   debugger
      // } else {
      //   const slot = document.getElementById(this.slotId);
      //   const oldCard = document.getElementById(this.cardId);
      //   const newColumnDataToTransferInString = dataTransfer.getData(
      //     'columnDataToTransferInString'
      //   );
      //   const newColumnDataToTransferInObject = JSON.parse(newColumnDataToTransferInString);
      //   const newCard = document.getElementById(newColumnDataToTransferInObject.id);

      //   slot.removeChild(oldCard);
      //   newCard.setAttribute('id', `${newColumnDataToTransferInObject.id}_${this.slotId}`);
      //   this.cardId = newCard.id;
      //   slot.appendChild(newCard);
      //   newCard.style.display = 'block';
      //   this.$store.dispatch(`chartConfig/${this.slotId}`, newColumnDataToTransferInObject);
      //   debugger
      // }
    },
    dragOver() {
      if (this.$store.state.chartConfig);
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
