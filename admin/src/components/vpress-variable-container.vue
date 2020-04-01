<template>
  <v-card
    :ref="variableCardsContainerId"
    :id="variableCardsContainerId"
    flat
    class="py-3 px-3"
  >
    <v-row>
      <v-col cols="12" style="height:30vh;overflow-y:scroll;">
        <VpressVariableCard
          class="mb-3"
          v-for="(card, cardIndex) in linearVariables"
          :key="`cardId_${cardIndex}`"
          :id="`cardId_${cardIndex}`"
          :columnData="card"
          :variableName="card.variableName"
          :variableNameDataType="card.variableNameDataType"
        />
      </v-col>
      <v-col cols="12" style="height:30vh;overflow-y:scroll;">
        <VpressVariableCard
          class="mb-3"
          :id="`cardId_total`"
          :columnData="{
            variableName: 'total_count',
            variableNameDataType: 'linear'
          }"
          variableName="Conteo de observaciones"
          variableNameDataType="linear"
        />
        <VpressVariableCard
          class="mb-3"
          v-for="(card, cardIndex) in oirdinalVariables"
          :key="`cardId_${cardIndex}`"
          :id="`cardId_${cardIndex}`"
          :columnData="card"
          :variableName="card.variableName"
          :variableNameDataType="card.variableNameDataType"
        />
      </v-col>
      <v-divider />
    </v-row>
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
  },
  computed: {
    linearVariables() {
      return this.variableCards.filter(card => card.variableNameDataType === 'linear')
    },
    oirdinalVariables() {
      return this.variableCards.filter(card => card.variableNameDataType === 'ordinal')
    }
  }
}
</script>