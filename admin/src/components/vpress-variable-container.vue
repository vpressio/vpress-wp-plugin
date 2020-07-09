<template>
  <v-row class="px-5">
    
    <v-col cols="12" class="pt-0">
      <p
        v-show="ordinalVariables.length > 0"
        class="ordinal-lineal"
      >
        Ordinal
      </p>
      <div
        v-show="ordinalVariables.length > 0"
        class="card--container"
        :id="`${cardsContainerId}_ordinal`"
        :ref="`${cardsContainerId}_ordinal`"
      >
        <VpressVariableCard
          class="mb-2"
          v-for="(variable, variableIndex) in ordinalVariables"
          :key="`cardId_${variableIndex}`"
          :id="`cardId_${variable.slug}`"
          :variableData="variable"
        />
      </div>
    </v-col>
    <v-col cols="12" class="pt-0">
      <p class="ordinal-lineal">
        Lineal
      </p>
      <div class="card--container"
        :id="`${cardsContainerId}_auxiliar`"
        :ref="`${cardsContainerId}_auxiliar`"
      >
        <VpressVariableCard
          class="mb-2"
          :id="`cardId_total`"
          :variableData="{
            title: 'Conteo de observaciones',
            slug: 'total_count',
            type: 'linear'
          }"
        />
        <div
          v-show="linearVariables.length > 0"
          :id="`${cardsContainerId}_linear`"
          :ref="`${cardsContainerId}_linear`"
          >
          <VpressVariableCard
            class="mb-2"
            v-for="(variable, variableIndex) in linearVariables"
            :key="`cardId_${variableIndex}`"
            :id="`cardId_${variableIndex}`"
            :variableData="variable"
          />
        </div>
      </div>
    </v-col>
    <v-col cols="12" class="pt-0">
      <p
        v-show="dateVariables.length > 0"
        class="ordinal-lineal"
      >
        Fecha
      </p>
      <div
        v-show="dateVariables.length > 0"
        class="card--container"
        :id="`${cardsContainerId}_ordinal`"
        :ref="`${cardsContainerId}_ordinal`"
      >
        <VpressVariableCard
          class="mb-2"
          v-for="(variable, variableIndex) in dateVariables"
          :key="`cardId_${variableIndex}`"
          :id="`cardId_${variableIndex}`"
          :variableData="variable"
        />
      </div>
    </v-col>
    <v-divider />
  </v-row>
</template>
<script>
import VpressVariableCard from './vpress-variable-card.vue';

export default {
  name: 'VpressVariableContainer',
  components: {
    VpressVariableCard
  },
  props: ['variableData'],
  data() {
    return {
      cardsContainerId: 'cardStartContainer'
    }
  },
  computed: {
    linearVariables() {
      return this.variableData.filter(variable => variable.type === 'linear')
    },
    ordinalVariables() {
      return this.variableData.filter(variable => variable.type === 'ordinal')
    },
    dateVariables() {
      return this.variableData.filter(variable => variable.type === 'date')
    },
  }
}
</script>
<style lang="scss" scoped>
.ordinal-lineal {
  font-size: 1rem;
  font-weight: 500;
  margin: 0 0 0 16px;
}
.card--container{
  max-height:30vh;
  overflow-y:scroll;
}
</style>