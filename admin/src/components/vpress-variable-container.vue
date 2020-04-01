<template>
  <v-card
    :ref="variableCardsContainerId"
    :id="variableCardsContainerId"
    flat
    class="py-3 px-3"
  >
    <v-row>
      <v-img class="db-icon" src="../assets/images/db1.svg" />
        <span class="db-titulo">Nombre de la Base de Datos</span>
        <hr class="v-divider theme--light hr-divider" />
        <p class="ordinal-lineal">Ordinal</p>
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
        <p class="ordinal-lineal">Linear</p>
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
<style lang="scss" scoped>
.ordinal-lineal {
  font-size: 1rem;
  color: #382e82;
  font-weight: 500;
  margin: 0 0 0 16px;
}

.hr-divider {
  width: 91%;
  margin-left: 15px;
  margin-bottom: 10px;
}

.db-icon {
  width: 17px;
  margin: 4px 10px 13px 16px;
  display: inline-flex;
  padding-bottom: 1px;
}

.db-titulo {
  color: #737373;
  font-size: 1rem;
  font-family: Roboto;
}
</style>