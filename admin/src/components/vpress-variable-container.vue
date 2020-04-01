<template>
  <v-row class="px-5">
    <v-col cols="12" class="pb-0 pt-1">
      <v-img class="db-icon" src="../assets/images/db1.svg" />
      <span class="db-titulo">Nombre de la Base de Datos</span>
      <hr class="v-divider theme--light hr-divider" />
    </v-col>
    <v-col cols="12" class="pt-0">
      <p
        v-show="oirdinalVariables.length > 0"
        class="ordinal-lineal"
      >
        Ordinal
      </p>
      <div
        v-show="oirdinalVariables.length > 0"
        class="card--container"
        :id="`${variableCardsContainerId}_ordinal`"
        :ref="`${variableCardsContainerId}_ordinal`"
      >
        <VpressVariableCard
          class="mb-3"
          v-for="(card, cardIndex) in oirdinalVariables"
          :key="`cardId_${cardIndex}`"
          :id="`cardId_${cardIndex}`"
          :columnData="card"
          :variableName="card.variableName"
          :variableNameDataType="card.variableNameDataType"
        />
      </div>
    </v-col>
    <v-col cols="12" class="pt-0">
      <p
        v-show="oirdinalVariables.length > 0"
        class="ordinal-lineal">Linear
      </p>
      <div class="card--container"
        :id="`${variableCardsContainerId}_auxiliar`"
        :ref="`${variableCardsContainerId}_auxiliar`"
      >
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
        <div
          v-show="linearVariables.length > 0"
          :id="`${variableCardsContainerId}_linear`"
          :ref="`${variableCardsContainerId}_linear`"
          >
          <VpressVariableCard
            class="mb-3"
            v-for="(card, cardIndex) in linearVariables"
            :key="`cardId_${cardIndex}`"
            :id="`cardId_${cardIndex}`"
            :columnData="card"
            :variableName="card.variableName"
            :variableNameDataType="card.variableNameDataType"
          />
        </div>
      </div>
    </v-col>
    <v-divider />
  </v-row>
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

.card--container{
  max-height:30vh;
  overflow-y:scroll;
}
</style>