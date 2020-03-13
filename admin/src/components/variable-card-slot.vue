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
      min-height="75"
      outlined
      @dragenter="dragEnter"
      @dragover.prevent
      @dragleave="dragLeave"
      @drop.stop.self="drop"
      light
      class="pa-2"
    >
      <VpressVariableCard
        v-for="(variable, variableIndex) in variablesInSlot"
        :key="`variable_${variableIndex}`"
        :variableName="variable.variableName"
      />
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
      variablesInSlot: []
    }
  },
  methods: {
    drop(event) {
      const { dataTransfer } = event;
      const columnDataToTransferInString = dataTransfer.getData('columnDataToTransferInString');
      const columnDataToTransferInObject = JSON.parse(columnDataToTransferInString);
      this.variablesInSlot.push(columnDataToTransferInObject);
      console.log(this.variablesInSlot)
    },
    dragEnter() {

    },
    dragLeave() {

    }
  }
  
}
</script>