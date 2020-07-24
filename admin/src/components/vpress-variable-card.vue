<template>
  <v-card
    v-show="variable.type !== '' && variable.title !== ''"
    :draggable="draggable"
    @dragstart="dragStart"
    tile
    :class="{ 'pr-5': inSlot }"
    :color="error ? 'error' : 'color2'"
    dark
    hover
  >
    <div v-if="inSlot" class="operationButtonContainer">
      <v-menu close-on-click offset-x right nudge-right="15">
        <template v-slot:activator="{ on }">
          <v-btn small icon dark class="operationButton" v-on="on">
            <v-icon dense>mdi-dots-vertical</v-icon>
          </v-btn>
        </template>
        <v-list
        v-if="
          variable.type === 'linear' &&
          variable.slug !== 'total_count' && 
          slotId !== 'filter'
        "
        >
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
        <v-list v-if="variable.type !== 'linear' || variable.slug === 'total_count'">
          <v-list-item class="px-5" @click="removeCard">
            <v-list-item-title class="func-menu">Eliminar</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>
    <div class="dataTypeTitle py-1 pl-3 pr-5" :class="{ 'pr-5':inSlot }">
      <p v-if="variable.slug !== 'total_count'" class="ma-0">{{ variable.title }}</p>
      <span
        v-if="variable.slug === 'total_count'"
        class="vpress-default-card"
      >
        • {{ variable.title }}
      </span>
      <p
        v-show="
          inSlot &&
          variable.type === 'linear' &&
          variable.slug !== 'total_count'
        "
        class="variableCardDataType mb-0"
      >{{ `(${selectedFunc.name})` }}</p>
    </div>
  </v-card>
</template>
<script>
export default {
  name: 'VpressVariableCard',
  props: {
    slotId: String,
    variable: Object,
    inSlot: Boolean,
    error: Boolean
  },
  data() {
    return {
      draggable: true,
      funcs: [
        { type: 'sum', name: 'Suma' },
        { type: 'mean', name: 'Promedio' },
        { type: 'min', name: 'Mínimo' },
        { type: 'max', name: 'Máximo' }
      ],
      selectedFunc: { type: 'mean', name: 'Promedio' }
    };
  },
  methods: {
    dragStart(e) {
      const { dataTransfer } = e;
      const payload = JSON.stringify(this.variable);
      dataTransfer.setData('variableJson', payload);
    },
    selectFunc(func) {
      this.variable.func = func.type
      this.selectedFunc = func
      this.$store.dispatch(`chartConfig/MERGE_CHART_VALUE`, {
        mutationType: this.slotId,
        value: this.variable
      });
    },
    removeCard() {
      const payload = this.slotId === 'filter'
      ? {
          title: this.variable.title,
          type: this.variable.type,
          slug: this.variable.slug,
          value: 'remove'
        } 
      : {
          title: '',
          type: '',
          slug: '',
          func: ''
        }
      this.$store.dispatch(`chartConfig/MERGE_CHART_VALUE`, {
        mutationType: this.slotId,
        value: payload
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
