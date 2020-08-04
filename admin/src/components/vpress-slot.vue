<template>
  <div class="ma-1">
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
    <div
      v-if="slotId !== 'filter'"
    >
      <v-card
        v-for="(card, cardIndex) in storeVariables"
        :key="`card_${cardIndex}`"
        :min-height="50"
        outlined
        :raised="changeSlotStyle"
        light
      >
        <div
          class="slot_placeholder pt-2"
          :class="{ 'overCard': changeSlotStyle }"
          @drop.stop.self="drop($event, card.mutationType)"
          @dragenter="dragOver"
          @dragleave="dragOver"
          @dragover.prevent
        >
          Números o categorías aquí.
        </div>
        <VpressVariableCard
        v-show="card.variable.slug !== ''"
        class="my-2 mx-3"
        :variable="card.variable"
        inSlot
        :mutationType="card.mutationType"  
        :error="error"
      />
    
      </v-card>
    </div>
    <div
      v-if="slotId === 'filter'"
    >
      <v-card
        :min-height="50"
        outlined
        :raised="changeSlotStyle"
        light
      >
        <VpressVariableCard
          v-for="(card, cardIndex) in storeVariables"
          :key="`card_${cardIndex}`"
          class="mx-3 my-2"
          :variable="card.variable"
          inSlot
          :slotId="card.mutationType"  
          :error="error"
        />
        <div
            class="slot_placeholder_filter pt-2"
            :class="{ 'overCard': changeSlotStyle }"
            @drop.stop.self="drop"
            @dragenter="dragOver"
            @dragleave="dragOver"
            @dragover.prevent
          >
            Números o categorías aquí.
        </div>
      </v-card>
    </div>
    
    <VpressSlotFilter
      v-if="openFilterDialog"
      :column="filterColumn"
      :type="filterType"
      :openFilterDialog.sync="openFilterDialog"
    />
  </div>
</template>
<script>
import VpressVariableCard from './vpress-variable-card';
import VpressSlotFilter from './vpress-filter';

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
    async drop(event, mutationType) {
      this.changeSlotStyle = false;
      const { dataTransfer } = event;
      const variableJson = dataTransfer.getData('variableJson');
      const variable = JSON.parse(variableJson);
      if (this.slotId === 'filter') {
        this.filterData(variable.slug,variable.type);
      } else {
        this.mergeVariable(variable, mutationType)
      }
    },
    async mergeVariable(variable, mutationType) {
      try {
        const result = await this.$store.dispatch(
          `chartConfig/DATA_QUERY`,
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
        this.error = true
        throw new Error(error.message)
      }
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
  height:100%;
  width: 100%;
  position:absolute;
}

.slot_placeholder_filter {
  color: #c3c3c3;
  text-align: center;
  line-height: 1.2;
  font-size: 0.8rem;
  height:50px;
}

.selectedSlot {
  background-color: #f4f4f4;
}

.overCard {
  z-index:4
}

</style>
