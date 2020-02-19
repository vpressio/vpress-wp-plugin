<template>
  <div>
    <v-card-text>
      ARRASTRA LA SELECCIÓN
    </v-card-text>
    <v-card
      :ref="variableCardsContainerId"
      :id="variableCardsContainerId"
      flat
      class="pb-3 px-3 variableCard-container"
    >
      <VpressVariableCard
        :id="`cardId_total`"
        :parentId="variableCardsContainerId"
        :parentRefs="$refs"
        :columnData="{
          variableName: 'total_count',
          variableNameDataType: 'linear'
        }"
      >
        Conteo de observaciones
        <span class="variableCardDataType">
          linear
        </span>
      </VpressVariableCard>
      <VpressVariableCard
        v-for="(card, cardIndex) in variableCards"
        :key="`cardId_${cardIndex}`"
        :id="`cardId_${cardIndex}`"
        :parentId="variableCardsContainerId"
        :parentRefs="$refs"
        :columnData="card"
      >
        {{ card.variableName }}
        <span class="variableCardDataType">
          {{ card.variableNameDataType }}
        </span>
      </VpressVariableCard>
      <v-divider />
    </v-card>
  </div>
</template>
<script>
import VpressVariableCard from './vpress-variable-card.vue';

export default {
  name: 'VpressVariableCardStartContainer',
  components: {
    VpressVariableCard
  },
  props: ['variableCards'],
  data() {
    return {
      variableCardsContainerId:'cardStartContainer',
    }
  }
}
</script>
<style scoped>
.variableCard-container {
  max-height: 300px;
  overflow-y: scroll;
}

.variableCardDataType {
  font-size: 12px;
  font-weight: 500;
  color: #cfcfcf;
}
</style>