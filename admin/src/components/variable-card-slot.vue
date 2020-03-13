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
        @drop.stop.self="drop"
      />
      <p class="slot_placeholder my-2" v-if="variablesInSlot.length < 2" @drop.stop.self="drop">
        Números o categorías aquí.
      </p>
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
    }
  },
  methods: {
    drop(event) {
      const { dataTransfer } = event;
      const columnDataToTransferInString = dataTransfer.getData('columnDataToTransferInString');
      const columnDataToTransferInObject = JSON.parse(columnDataToTransferInString);
      this.addVariableToSlot(columnDataToTransferInObject)
    },
    dragEnter() {
    },
    dragLeave() {
    },
    addVariableToSlot(variableData) {
      if(this.variablesInSlot.length < 2)
      this.variablesInSlot.push(variableData);
    }
  }
}
</script>
<style lang="scss" scoped>
.slot_placeholder {
  color: #c3c3c3;
  text-align: center;
  line-height: 1.2;
  font-size: 0.8rem;
}
</style>