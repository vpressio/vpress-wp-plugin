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
      class="mt-2"
      v-if="slotId !== 'filter'"
    >
      <v-card
        class="card-container"
        v-for="(card, cardIndex) in storeVariables"
        :key="`card_${cardIndex}`"
        :min-height="80"
        outlined
        :raised="changeSlotStyle"
        light
      >
        <div
          class="slot_placeholder pa-2"
          :class="{ 'overCard': changeSlotStyle }"
          @drop.stop.self="drop($event, card.mutationType)"
          @dragenter="dragOver"
          @dragleave="dragOver"
          @dragover.prevent
        >
          <div
            class="slot_border"
            @drop.stop.self="drop($event, card.mutationType)"
          >
            <div class="instruction_label" :class="{ 'hideCard': changeSlotStyle && storeVariables.length > 0 }">
              Arrastra una nueva variable de tipo:
            </div>
            <span :class="{ 'hideCard': changeSlotStyle && storeVariables.length > 0 }">
              Números o categorías aquí.
            </span>
          </div>
        </div>
        <VpressVariableCard
          v-show="card.variable.slug !== ''"
          class="my-2 mx-3"
          :variable="card.variable"
          inSlot
          :mutationType="card.mutationType"
          :error="error"
          :errorMsg="errorMsg"
        />`
      </v-card>
    </div>
    <div
      class="mt-2"
      v-if="slotId === 'filter'"
    >
      <v-card
        class="card-container"
        :min-height="80"
        outlined
        :raised="changeSlotStyle"
        light
      >
        <div
          v-for="(card, cardIndex) in storeVariables"
          :key="`card_${cardIndex}`"
          @click="changeCurrentFilter($event, cardIndex)"
        >
          <VpressVariableCard
            class="mx-3 my-2"
            :variable="card.variable"
            :mutationType="card.mutationType"  
            inSlot
            :error="error"
            :errorMsg="errorMsg"
          />
        </div>
        <div
          class="slot_placeholder pa-2"
          :class="{ 'overCard': changeSlotStyle }"
          @drop.stop.self="drop"
          @dragenter="dragOver"
          @dragleave="dragOver"
          @dragover.prevent
        >
          <div
            class="slot_border"
            @drop.stop.self="drop($event, card.mutationType)"
          >
            <div class="instruction_label" :class="{ 'hideCard': changeSlotStyle || storeVariables.length > 0 }">
              Arrastra una nueva variable de tipo:
            </div>
            <span :class="{ 'hideCard': changeSlotStyle || storeVariables.length > 0 }">
              Números o categorías aquí.
            </span>
          </div>
        </div>
      </v-card>
    </div>
    <VpressSlotFilter
      v-if="openFilterDialog"
      :column="filterColumn"
      :type="filterType"
      :value="filterPayload"
      :openFilterDialog.sync="openFilterDialog"
    />
  </div>
</template>
<script>
import VpressVariableCard from './vpress-variable-card';
import VpressSlotFilter from './vpress-filter';
import { editorMixin } from '../mixins/index.js'

export default {
  name: 'VpressSlot',
  components: {
    VpressVariableCard,
    VpressSlotFilter
  },
  mixins: [editorMixin],
  props: {
    slotId: String,
    icon: String,
    slotIcon: String,
    label: String,
  },
  data() {
    return {
      openFilterDialog: false,
      filterColumn: '',
      filterType: '',
      filterPayload: {},
      error: false,
      errorMsg: '',
      changeSlotStyle: false
    };
  },
  computed: {
    storeVariables() {
      return this.$store.getters[`editor/${this.slotId}`]
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
        this.filterData(variable);
      } else {
        this.mergeVariable(variable, mutationType)
      }
    },
    async mergeVariable(variable, mutationType) {
      try {
        await this.merge_query(
          {
            slug: variable.slug,
            title: variable.title,
            type: variable.type
          },
          mutationType
        )
        this.error = false
      } catch (error) {
        this.error = true
        setTimeout(() => {
          this.error = false
        }, 7000);
        this.errorMsg = error.message
        throw new Error(error.message)
      }
    },
    dragOver() {
      this.changeSlotStyle = !this.changeSlotStyle
    },
    filterData({slug, type}) {
      this.filterType = type;
      this.filterColumn = slug;
      this.openFilterDialog = true;
    },
    changeCurrentFilter(event, index) {
      const filterCard = this.$store.getters['editor/chart'].filters[index]
      const payload = {
        type: filterCard.type
      }
      if (filterCard.type === 'linear') {
        payload.min = filterCard.value[0]
        payload.max = filterCard.value[1]
      } else {
        payload.categories = filterCard.value
      }
      this.filterPayload = payload
      this.filterData({ slug: filterCard.slug, type: filterCard.type })
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
.slot_border {
  border: dashed 1px #C7C7D3;
  height:100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.slot_placeholder_filter {
  color: #c3c3c3;
  text-align: center;
  line-height: 1;
  font-size: 0.8rem;
  height:50px;
}

.instruction_label {
  font-size: 0.8rem;
  color: #7872AB;
}

.selectedSlot {
  background-color: #f4f4f4;
}

.overCard {
  z-index:4
}

.hideCard {
  display: none;
}

.card-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

</style>
