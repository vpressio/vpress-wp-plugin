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
        v-for="(variable, variableIndex) in storeVariables"
        :id="variable.id"
        :key="`variable_${variableIndex}`"
        :variableData="variable"
        inSlot
        :slotId="slotId"
        :error="error"
      />
      <p
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
  },
  data() {
    return {
      variablesStack: [],
      stackMaxLength: 0,
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
    storeVariables() {
      return this.$store.getters[`chartConfig/${this.slotId}`];
    },
    iconSrc() {
      return require(`../assets/images/${this.slotIcon}.svg`);
    }
  },
  methods: {
    async drop(event) {
      this.changeSlotStyle = false;
      const { dataTransfer } = event;
      const transferedString = dataTransfer.getData('transferedString');
      const variable = JSON.parse(transferedString);
      if (this.slotId === 'filter') {
        this.filterData(variable.slug,variable.type);
      } else {
        this.mergeVariable(variable, this.slotId)
      }
    },
    async mergeVariable(variable, mutationType) {
      try {
        const result = await this.$store.dispatch(
          `chartConfig/MERGE_CHART_VALUE`,
          { 
            value: {
              slug: variable.slug,
              title: variable.title,
              type: variable.type
            },
            mutationType: mutationType
          }
        );
        this.error = false
        return result;
      } catch (error) {
        console.error(error)
        this.error = true
      }
    },
    addToStack(variable) {
      console.log(variable)
    //   const stack = [...this.variablesStack]
    //   if(stack.length < 2) {
    //     switch(stack.push(variable)){
    //       case 0:
    //         this.mergeVariable(variable, this.slotId)
    //         break;
    //       case 1:
    //         this.mergeVariable(variable, 'aggregation')
    //         break;
    //     }
    //   }
    //  this.variablesStack = stack
    },
    dragOver() {
      this.changeSlotStyle = !this.changeSlotStyle
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
