<template>
  <v-card
    :ref="variableCardsContainerId"
    :id="variableCardsContainerId"
    flat
    class="py-3 px-3 variableCard-container"
  >
    <VpressVariableCard
      class="mb-3"
      :id="`cardId_total`"
      :parentId="variableCardsContainerId"
      :parentRefs="$refs"
      :columnData="{
        variableName: 'total_count',
        variableNameDataType: 'linear'
      }"
      variableName="Conteo de observaciones"
      variableNameDataType="linear"
    />
    <VpressVariableCard
      class="mb-3"
      v-for="(card, cardIndex) in variableCards"
      :key="`cardId_${cardIndex}`"
      :id="`cardId_${cardIndex}`"
      :parentId="variableCardsContainerId"
      :parentRefs="$refs"
      :columnData="card"
      :variableName="card.variableName"
      :variableNameDataType="card.variableNameDataType"
    />
    <v-divider />
  </v-card>
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
      variableCardsContainerId: 'cardStartContainer',
    }
  }
}
</script>
<style scoped>
.variableCard-container {
  /* max-height: 340px; */
  overflow-y: scroll;
}

</style>