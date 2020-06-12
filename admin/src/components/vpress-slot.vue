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
      class="pa-2"
      :class="{'selectedSlot' : changeSlotStyle}"
      min-height="50"
      outlined
      :raised="changeSlotStyle"
      @dragover.prevent
      @dragenter="dragOver"
      @dragleave="dragOver"
      @drop.stop.self="drop"
      light
    >
      <VpressVariableCard
        class="mb-1"
        v-for="(variable, variableIndex) in variablesToRender"
        :id="variable.id"
        :key="`variable_${variableIndex}`"
        :variablesInSlot.sync="variablesInSlot"
        :variableData="variable"
        @drop.stop.self="drop"
        inSlot
        :slotId="slotId"
        :error="error"
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
  name: 'VpressSlot',
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
      addMargin: false,
      filterColumn: '',
      filterType: '',
      error: false,
      changeSlotStyle: false
    };
  },
  computed: {
    variablesToRender() {
      return [this.$store.getters[`chartConfig/${this.slotId}`]];
    },
    iconSrc() {
      return require(`../assets/images/${this.slotIcon}.svg`);
    }
  },
  methods: {
    async drop(event) {
      this.changeSlotStyle = false;
      const { dataTransfer } = event;
      const transferedString = dataTransfer.getData(
        'transferedString'
      );
      const variable = JSON.parse(
        transferedString
      );
      if (this.filter) {
        this.filterData(variable.slug,variable.type);
      }
      try {
        const result = await this.$store.dispatch(
          `chartConfig/MERGE_CHART_VALUE`,
          { value: {
              slug: variable.slug,
              title: variable.title,
              type: variable.type
            },
            mutationType: this.slotId
          }
        )
        this.addVariableToSlot(result);
        this.error = false
      } catch (error) {
        console.log(error)
        this.error = true
      }
    },
    dragOver() {
      this.changeSlotStyle = !this.changeSlotStyle
    },
    addVariableToSlot(variableData) {
        const variableArray = [...this.variablesInSlot];
        const dataInSlot = variableArray.reduce(
            (data, variable, variableIndex) => {
              if (variable.id === variableData.id) {
                data.includesId = true;
                data.indexIncludedId = variableIndex;
              }
              return data
            },
            { includesId: false, indexIncludedId: -1 }
          );
        if (dataInSlot.includesId){
          variableArray.splice(dataInSlot.indexIncludedId, 1, variableData);
        } else if (this.variablesInSlot.length <= this.maxStack) {
          variableArray.splice(0, 1, variableData); 
        }
      this.variablesInSlot = variableArray;
    },
    filterData(column, type) {
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

.selectedSlot {
  background-color: #f4f4f4;
}

</style>
