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
      <p class="slot_placeholder my-2" v-if="variablesInSlot.length < maxStack" @drop.stop.self="drop">
        Números o categorías aquí.
      </p>
    </v-card>
    <vpress-data-filter v-if="openFilterDialog" :column="filterColumn" :type="filterType" :openFilterDialog.sync="openFilterDialog" />
  </v-card>
</template>
<script>
import VpressVariableCard from './vpress-variable-card';
import VpressDataFilter from './vpress-data-filter.vue';

export default {
  name: 'VpressCardSlot',
  components: {
    VpressVariableCard,
    VpressDataFilter
  },
  props: {
    slotId: String,
    icon: String,
    label: String,
    maxStack: Number,
    dataType: Array,
    filter: Boolean
  },
  data() {
    return {
      variablesInSlot: [],
      openFilterDialog: false,
      filterColumn: '',
      filterType: ''
    }
  },
  methods: {
    drop(event) {
      const { dataTransfer } = event;
      const columnDataToTransferInString = dataTransfer.getData('columnDataToTransferInString');
      const columnDataToTransferInObject = JSON.parse(columnDataToTransferInString);
      this.addVariableToSlot(columnDataToTransferInObject);
      if(this.filter) {
        this.filterData(
          columnDataToTransferInObject.variableName,
          columnDataToTransferInObject.variableNameDataType
        );
      }
    },
    dragEnter() {
    },
    dragLeave() {
    },
    addVariableToSlot(variableData) {
      if(this.variablesInSlot.length < this.maxStack)
      this.variablesInSlot.push(variableData);
    },
    filterData(column, type) {
      this.filterType = type;
      this.filterColumn = column;
      this.openFilterDialog = true;
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
