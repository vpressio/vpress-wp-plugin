<template>
  <v-card flat class="ma-1">
    <v-icon 
      color="secondary"
      dense
    >
      {{ icon }}
    </v-icon>
    <span>
      {{ label }}
    </span>
    <v-card
      :ref="slotId"
      :id="slotId"
      min-height="50"
      outlined
      @dragenter="dragEnter"
      @dragover.prevent
      @dragleave="dragLeave"
      @drop.stop.self="drop"
      light
      class="pa-2"
    >
      <VpressVariableCard
        :id="variable.id"
        class="mb-1"
        v-for="(variable, variableIndex) in variablesInSlot"
        :key="`variable_${variableIndex}`"
        :variableName="variable.variableName"
        :variableNameDataType="variable.variableNameDataType"
        showOperationButton
        :variablesInSlot.sync="variablesInSlot"
        :columnData="variable"
      />
      <v-label v-if="showPlaceholder" @drop.stop.self="drop">
        Puedes Arrastrar números o categorías aquí.
      </v-label>
    </v-card>
  </v-card>
</template>
<script>
import VpressVariableCard from './vpress-variable-card';

export default {
  name: 'VpressCardSlot',
  components: {
    VpressVariableCard
  },
  props: {
    slotId: String,
    icon: String ,
    label: String,
    dataType: Array
  },
  data() {
    return {
      variablesInSlot: [],
      showPlaceholder:true,
    }
  },
  methods: {
    drop(event) {
      const { dataTransfer } = event;
      const columnDataToTransferInString = dataTransfer.getData('columnDataToTransferInString');
      const columnDataToTransferInObject = JSON.parse(columnDataToTransferInString);
      this.variablesInSlot.push(columnDataToTransferInObject);
    },
    dragEnter() {

    },
    dragLeave() {

    }
  }
  
}
</script>