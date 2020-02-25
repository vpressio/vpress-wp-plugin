<template>
  <v-card
    :id="id"
    :ref="id"
    :draggable="draggable"
    @dragstart="dragStart"
    @dragend.prevent="dragEnd"
    @dragover.stop
    class="border-radius-none card-flex pr-5 pb-2"
    :class="{ 'pr-5': showOperationButton }"
    color="#9292A9"
    dark
    hover
  >
    <div class="removeButtonContainer pr-1">
      <v-btn x-small icon>
        <v-icon
          dense
          style="margin-bottom:auto"
          @click.stop="removeCard"
        >
          mdi-window-close
        </v-icon>
      </v-btn>
    </div>
    <div class="dataTypeContainer">
      <span class="variableCardDataType pl-3 py-1">
        {{ variableNameDataType }}
      </span>
       <span
          v-if="variableMutation !== 'Sin mutar' && variableMutation"
          class="variableCardDataType pl-3 py-1"
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
              style="background-color: #382E82"
              v-on="on"
            >
              <v-icon
                dense
              >
                mdi-dots-horizontal
              </v-icon>
            </v-btn>
          </template>
            <v-list>
              <v-list-item
                class="px-5"
                v-for="(func, funcIndex) in funcs"
                :key="`func_${funcIndex}`"
                @click="selectFunc(func)"
                :class="{ 'selected-func': selectedFunc === func.type }"
              >
                <v-list-item-title
                  class="func-menu"
                  :class="{ 'selected-func': selectedFunc === func.type }"
                  :dark="selectedFunc === func.type"
                >
                  {{ func.name }}
                </v-list-item-title>
              </v-list-item>
            </v-list>
        </v-menu>
      </div>
      <div class="dataTypeTitle py-3 pl-3" :class="{ 'pr-5':showOperationButton }">
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
    columnData: Object,
    parentId: String ,
    parentRefs: Object,
    inSlot: Boolean,
    variableName: String,
    variableNameDataType: String
  },
  data() {
    return {
      variableCardParent: null,
      variableCard:null,
      variableCardClone: null,
      draggable: true,
      showOperationButton: null,
      selectedFunc: '',
      funcs: [
        { type: 'sum', name: 'Suma' },
        { type: 'mean', name: 'Promedio' },
        { type: 'min', name: 'Mínimo' },
        { type: 'max', name: 'Máximo' },
        { type: '', name: 'Sin mutar' }
      ]
    };
  },
  created() {
    this.showOperationButton = this.columnData.variableNameDataType === 'linear';
  },
  computed: {
    variableMutation() {
      return this.selectedFunc.name;
    }
  },
  methods: {
    dragStart(e) {
      const { dataTransfer } = e;
      const columnDataToTransferInObject = { id: this.id, ...this.columnData, func: this.selectedFunc.type };
      const columnDataToTransferInString = JSON.stringify(columnDataToTransferInObject);
      this.showOperationButton = false;
      dataTransfer.setData('columnDataToTransferInString', columnDataToTransferInString);
    },
    dragEnd() {
      this.showOperationButton = this.columnData.variableNameDataType === 'linear';
    },
    selectFunc(selectedFuncType) {
      this.selectedFunc = selectedFuncType;
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

</style>
