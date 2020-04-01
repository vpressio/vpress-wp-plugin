<template>
  <v-card flat class="ma-1" @drop.stop.self="drop">
    <v-icon
      v-if="slotIcon.length === 0"
      color="secondary"
      dense
    >
      {{ icon }}
    </v-icon>
    <img
      v-if="slotIcon.length !== 0"
      :src="iconSrc"
      width="15"
      height="15"
    ><img>
    <span>
      {{ label }}
    </span>
    <v-card
      min-height="50"
      outlined
      @dragover.prevent
      @drop.stop.self="drop"
      light
      class="pa-2"
    >
      <VpressVariableCard
        :id="variable.id"
        class="mb-1"
        v-for="(variable, variableIndex) in variablesToRender"
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
      <p
        v-if="variablesInSlot.length <= maxStack"
        class="slot_placeholder my-2"
        @drop.stop.self="drop"
      >
        Números o categorías aquí.
      </p>
    </v-card>
    <VpressSlotFilter
      v-if="openFilterDialog"
      :column="filterColumn"
      :type="filterType"
      :openFilterDialog.sync="openFilterDialog"
    />
  </v-card>
</template>
<script>
import VpressVariableCard from './vpress-variable-card';
import VpressSlotFilter from './vpress-slot-filter.vue';

export default {
  name: 'VpressCardSlot',
  components: {
    VpressVariableCard,
    VpressSlotFilter
  },
  props: {
    slotId: String,
    icon: String,
    slotIcon: String,
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
      addMargin: false,
      filterColumn: '',
      filterType: ''
    };
  },
  computed: {
    variablesToRender() {
      return this.variablesInSlot;
    },
    iconSrc() {
      return require(`../assets/images/${this.slotIcon}.svg`);
    }
  },
  methods: {
    drop(event) {
      const { dataTransfer } = event;
      const columnDataToTransferInString = dataTransfer.getData(
        'columnDataToTransferInString'
      );
      const columnDataToTransferInObject = JSON.parse(
        columnDataToTransferInString
      );
      this.addVariableToSlot(columnDataToTransferInObject);
      if (this.filter) {
        this.filterData(
          columnDataToTransferInObject.variableName,
          columnDataToTransferInObject.variableNameDataType
        );
      }
    },
    dragEnter() {
      // const { target }  = event
      // if (
      //   target.firstChild !== null &&
      //   target.firstChild.nodeName === "DIV" &&
      //   target.firstChild.id.includes('cardId_')
      // ) this.addMargin = false;
    },
    dragLeave() {
      // const { target }  = event
      // if (
      //   target.firstChild !== null &&
      //   target.firstChild.nodeName === "DIV" &&
      //   target.firstChild.id.includes('cardId_')
      // ) this.addMargin = true;
    },
    addVariableToSlot(columnData) {
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
          if(this.variablesInSlot.length <= this.maxStack){
            variableArray.splice(0, 1, columnData);
            console.log(variableArray)
          }
      }
      this.variablesInSlot = variableArray;
    },
    filterData(column, type) {
      this.showOperationButton = false;
      this.filterType = type;
      this.filterColumn = column;
      this.openFilterDialog = true;
    }
  }
};
</script>
<style lang="scss" scoped>
.slot_placeholder {
  color: #c3c3c3;
  text-align: center;
  line-height: 1.2;
  font-size: 0.8rem;
}
</style>
