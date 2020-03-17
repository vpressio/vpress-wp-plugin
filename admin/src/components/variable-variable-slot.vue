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
      :class="{'pt-5': addMargin}"
      min-height="50"
      outlined
      @dragenter="dragEnter"
      @dragleave="dragLeave"
      @drop.stop.self="drop"
      @dragover.prevent
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
        :showOperationButton="showOperationButton"
        :variablesInSlot.sync="variablesInSlot"
        :columnData="variable"
        @dragenter="dragEnter"
        @dragleave="dragLeave"
        @drop.stop.self="drop"
        :inSlot="true"
        :slotId="slotId"
      />
      <p class="slot_placeholder my-2" v-if="variablesInSlot.length < maxStack" @drop.stop.self="drop">
        Números o categorías aquí.
      </p>
    </v-card>
    <vpress-data-filter v-if="openFilterDialog" column="planeta" type="ordinal" :openFilterDialog.sync="openFilterDialog"/>
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
      showOperationButton: true,
      addMargin: false
    }
  },
  methods: {
    drop(event) {
      const { dataTransfer } = event;
      const columnDataToTransferInString = dataTransfer.getData('columnDataToTransferInString');
      const columnDataToTransferInObject = JSON.parse(columnDataToTransferInString);
      this.addVariableToSlot(columnDataToTransferInObject);
      this.addMargin = false;
      if(this.filter) {
        this.filterData();
      }
    },
    dragEnter(event) {
      const { target }  = event
      if (
        target.firstChild !== null &&
        target.firstChild.nodeName === "DIV" &&
        target.firstChild.id.includes('cardId_')
      ) this.addMargin = true;
    },
      dragLeave(event) {
      const { target }  = event
      if (
        target.firstChild !== null &&
        target.firstChild.nodeName === "DIV" &&
        target.firstChild.id.includes('cardId_')
      ) this.addMargin = false;
    },
    addVariableToSlot(columnData) {
      if(this.variablesInSlot.length < this.maxStack){
        const variableArray = [...this.variablesInSlot];
        const dataInSlot = variableArray.reduce(
            (data, variable, variableIndex) => {
              if (variable.id === columnData.id) {
                data.includesId = true;
                data.indexIncludedId = variableIndex;
              }
              return data
            },
            {includesId: false, indexIncludedId: -1}
          );
        
        if (dataInSlot.includesId){
          variableArray.splice(dataInSlot.indexIncludedId, 1);
          variableArray.unshift(columnData);
        } else {
          variableArray.push(columnData);
        }

        this.variablesInSlot = variableArray;
      }
    },
    filterData() {
      this.showOperationButton = false;
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