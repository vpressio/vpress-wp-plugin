<template>
  <v-card
    :id="id"
    :ref="id"
    :draggable="draggable"
    @dragstart="dragStart"
    @dragend.prevent="dragEnd"
    @dragover.stop
    @drop.stop.self="drop"
    class="border-radius-none card-flex pr-5 pb-2"
    :class="{ 'pr-5': showOperationButton }"
    color="#9292A9"
    dark
    hover
  >
    <div class="dataTypeContainer">
      <span class="variableCardDataType pl-3 py-1">
        {{ variableNameDataType }}
      </span>
       <span
          v-if="variableMutation !== 'Sin mutar' && variableMutation"
          class="variableCardDataType pl-1 py-1"
        >
          {{ `(${variableMutation})` }}
        </span>
    </div>
    <div>
      <div
        v-if="showOperationButton"
        class="operationButtonContainer pr-2"
      >
        <v-menu
          close-on-click
          offset-x
          right
          nudge-right="15"
        >
          <template v-slot:activator="{ on }">
            <v-btn
              small
              icon
              dark
              class="operationButton"
              v-on="on"
            >
              <v-icon
                dense
              >
                mdi-dots-vertical
              </v-icon>
            </v-btn>
          </template>
            <v-list>
              <v-list-item
                class="px-5"
                v-for="(func, funcIndex) in funcs"
                :key="`func_${funcIndex}`"
                @click="selectFunc(func)"
                :class="{ 'selected-func': selectedFunc === func }"
              >
                <v-list-item-title
                  class="func-menu"
                  :class="{ 'selected-func': selectedFunc === func }"
                  :dark="selectedFunc === func.type"
                >
                  {{ func.name }}
                </v-list-item-title>
              </v-list-item>
            </v-list>
        </v-menu>
      </div>
      <div class="dataTypeTitle py-2 pl-3" :class="{ 'pr-5':showOperationButton }">
        {{ variableName }}
      </div>
    </div>
  </v-card>
</template>
<script>
export default {
  name: 'VpressVariableCard',
  props: {
    id: String,
    slotId: String,
    columnData: Object,
    inSlot: Boolean,
    variableName: String,
    variableNameDataType: String,
    showOperationButton: Boolean,
    variablesInSlot: Array
  },
  data() {
    return {
      columnDataToTransferInObject: {},
      draggable: true,
      selectedFunc: { type: '', name: 'Sin mutar' },
      funcs: [
        { type: 'sum', name: 'Suma' },
        { type: 'mean', name: 'Promedio' },
        { type: 'min', name: 'Mínimo' },
        { type: 'max', name: 'Máximo' },
        { type: '', name: 'Sin mutar' }
      ]
    };
  },
  computed: {
    variableMutation() {
      return this.selectedFunc.name;
    }
  },
  created() {
    if(this.inSlot) {
      this.$store.dispatch(`chartConfig/${this.slotId}`, this.columnData);
    }
  },
  methods: {
    dragStart(e) {
      const { dataTransfer } = e;
      this.columnDataToTransferInObject = { id: this.id, ...this.columnData, func: this.selectedFunc.type };
      const columnDataToTransferInString = JSON.stringify(this.columnDataToTransferInObject);
      dataTransfer.setData('columnDataToTransferInString', columnDataToTransferInString);
    },
    dragEnd() {
      const { target } = event;
      if(target.parentNode.id !== 'cardStartContainer') {
        const arrayWithoutThisCard = this.variablesInSlot.filter(data => data.id !== this.id)
         this.$emit('update:variablesInSlot', arrayWithoutThisCard);
         this.$store.dispatch('data/setFilter', {});
      } 
      // else {
      //   this.$emit('update:variablesInSlot', [{...this.columnDataToTransferInObject}]);
      // }
    },
    selectFunc(selectedFuncType) {
      this.selectedFunc = selectedFuncType;
      
    },
    drop(event) {
      console.log(event.target.id)
    }
  },
};
</script>
<style scoped>
.card-flex {
  height:100%;
}

.dataTypeTitle {
  font-weight: 500;
  font-size: 0.9rem;
  text-overflow: ellipsis;
  overflow: hidden; 
  width: 100%;
  white-space: nowrap;
  height: 100%;
}

.dataTypeContainer {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
}

.removeButtonContainer {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: flex-end;
  z-index: -1;
}

.variableCardDataType {
  font-size: 12px;
  font-weight: 500;
  color: #cfcfcf;
}

.operationButtonContainer {
  position:absolute;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  z-index: 2;
}

.func-menu {
  color: #8c8282;
  margin: 0 15px 0 15px;
}

.selected-func {
  background-color:#7972AC;
  color:#FFF;
}

.removeIcon {
  margin-bottom: auto;
}

.operationButton {
  background-color: transparent;
}

</style>
