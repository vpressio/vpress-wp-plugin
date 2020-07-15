<template>
  <v-row class="px-5">
    
    <v-col cols="12" class="pt-0">
      <p
        v-show="ordinalVariables.length > 0"
        class="variable-class-label"
      >
        Ordinal
      </p>
      <div
        v-show="ordinalVariables.length > 0"
        class="card--container"
      >
        <VpressVariableCard
          class="mb-2"
          v-for="(variable, variableIndex) in ordinalVariables"
          :key="`ordinal_variable_${variableIndex}`"
          :variable="variable"
        />
      </div>
    </v-col>
    <v-col cols="12" class="pt-0">
      <p class="variable-class-label">
        Lineal
      </p>
      <div class="card--container">
        <VpressVariableCard
          class="mb-2"
          :variable="{
            title: 'Conteo de observaciones',
            slug: 'total_count',
            type: 'linear'
          }"
        />
        <div
          v-show="linearVariables.length > 0"
          >
          <VpressVariableCard
            class="mb-2"
            v-for="(variable, variableIndex) in linearVariables"
            :key="`linear_variable_${variableIndex}`"
            :variable="variable"
          />
        </div>
      </div>
    </v-col>
    <v-col cols="12" class="pt-0">
      <p
        v-show="dateVariables.length > 0"
        class="variable-class-label"
      >
        Fecha
      </p>
      <div
        v-show="dateVariables.length > 0"
        class="card--container"
      >
        <VpressVariableCard
          class="mb-2"
          v-for="(variable, variableIndex) in dateVariables"
          :key="`date_variable_${variableIndex}`"
          :variable="variable"
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
  props: {
    variables: {
      type: Array,
      required: true,
    }
  },
  computed: {
    linearVariables() {
      return this.variables.filter(variable => variable.type === 'linear')
    },
    ordinalVariables() {
      return this.variables.filter(variable => variable.type === 'ordinal')
    },
    dateVariables() {
      return this.variables.filter(variable => variable.type === 'date')
    },
  }
}
</script>
<style lang="scss" scoped>
.variable-class-label {
  font-size: 1rem;
  font-weight: 500;
  margin: 0 0 0 16px;
}
.card--container{
  max-height:30vh;
  overflow-y:scroll;
}
</style>