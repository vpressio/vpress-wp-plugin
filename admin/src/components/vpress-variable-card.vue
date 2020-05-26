<template>
  <v-card
    v-show="variableData.type !== '' && variableData.title !== ''"
    :id="id"
    :ref="id"
    :draggable="draggable"
    @dragstart="dragStart"
    tile
    :class="{ 'pr-5': inSlot }"
    :color="error ? 'error' : 'color2'"
    dark
    hover
  >
    <div>
      <div v-if="inSlot" class="operationButtonContainer">
        <v-menu close-on-click offset-x right nudge-right="15">
          <template v-slot:activator="{ on }">
            <v-btn small icon dark class="operationButton" v-on="on">
              <v-icon dense>mdi-dots-horizontal</v-icon>
            </v-btn>
          </template>
          <v-list v-if="variableData.type === 'linear'">
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
                :dark="selectedFunc === func"
              >{{ func.name }}</v-list-item-title>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item class="px-5" @click="removeCard()">
              <v-list-item-title class="func-menu">Eliminar</v-list-item-title>
            </v-list-item>
          </v-list>
          <v-list v-if="variableData.type === 'ordinal' || variableData.type === 'date'">
            <v-list-item class="px-5" @click="removeCard">
              <v-list-item-title class="func-menu">Eliminar</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
      <div class="dataTypeTitle py-1 pl-3 pr-5" :class="{ 'pr-5':inSlot }">
        <p v-if="id !== 'cardId_total'" class="ma-0">{{ variableData.title }}</p>
        <span
          v-if="id === 'cardId_total'"
          class="vpress-default-card"
        >
          • {{ variableData.title }}
        </span>
        <p
          v-show="selectedFunc.name !== 'Sin mutar' && selectedFunc.name"
          class="variableCardDataType mb-0"
        >{{ `(${selectedFunc.name})` }}</p>
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
    variableData: Object,
    inSlot: Boolean,
    variablesInSlot: Array,
    error: Boolean
  },
  data() {
    return {
      columnDataToTransferInObject: {},
      draggable: true,
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
    selectedFunc() {
      if (this.inSlot) {
        const variable = this.$store.getters[`chartConfig/${this.slotId}`];
        const funcInStore = this.funcs.reduce(
          (acc, functionInArray) => {
            if (variable.func === functionInArray.type) {
              return (acc = functionInArray);
            }
            return acc;
          },
          { type: '', name: 'Sin mutar' }
        );
        return funcInStore;
      }
      return { type: '', name: 'Sin mutar' };
    }
  },
  methods: {
    dragStart(e) {
      const { dataTransfer } = e;
      this.columnDataToTransferInObject = {
        id: this.id,
        ...this.variableData,
        func: this.selectedFunc.type
      };
      const columnDataToTransferInString = JSON.stringify(
        this.columnDataToTransferInObject
      );
      dataTransfer.setData(
        'columnDataToTransferInString',
        columnDataToTransferInString
      );
    },
    selectFunc(func) {
      const variable = { ...this.$store.getters[`chartConfig/${this.slotId}`] };
      variable.func = func.type;
      this.$store.dispatch(`chartConfig/MERGE_CHART_VALUE`, {
        slot: variable,
        value: this.slotId
      });
    },
    removeCard() {
      this.$store.dispatch(`chartConfig/MERGE_CHART_VALUE`, {
        slot: this.slotId,
        value: {
          title: '',
          type: '',
          slug: '',
          func: ''
        }
      });
    }
  }
};
</script>
<style scoped>
.dataTypeTitle {
  font-weight: 700;
  font-size: 0.8rem;
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
  position: absolute;
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
  background-color: #7972ac;
  color: #fff;
}

.removeIcon {
  margin-bottom: auto;
}

.operationButton {
  background-color: transparent;
}

.vpress-default-card {
  font-style: italic;
}
</style>
