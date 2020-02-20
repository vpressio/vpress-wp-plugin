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
        class="mb-3"
        :id="`cardId_total`"
        :parentId="variableCardsContainerId"
        :parentRefs="$refs"
        :columnData="{
          variableName: 'total_count',
          variableNameDataType: 'linear'
        }"
      >
        <div class="removeButtonContainer pr-1">
          <v-btn x-small icon>
            <v-icon
              dense
              style="margin-bottom:auto"
              @click.stop="removeCard"
            >
              mdi-window-close
            </v-icon>
          </v-btn>
        </div>
        <div class="dataTypeContainer">
          <span class="variableCardDataType pr-1">
            linear
          </span>
        </div>
        <div class="dataTypeTitle pa-3">
          Conteo de observaciones
        </div>
      </VpressVariableCard>
      <VpressVariableCard
        class="mb-3"
        v-for="(card, cardIndex) in variableCards"
        :key="`cardId_${cardIndex}`"
        :id="`cardId_${cardIndex}`"
        :parentId="variableCardsContainerId"
        :parentRefs="$refs"
        :columnData="card"
      >
        <div class="removeButtonContainer pr-1">
          <v-btn x-small icon>
            <v-icon
              dense
              style="margin-bottom:auto"
              @click.stop="removeCard"
            >
              mdi-window-close
            </v-icon>
          </v-btn>
        </div>
        <div class="dataTypeContainer">
          <span class="variableCardDataType pr-1">
            {{ card.variableNameDataType }}
          </span>
        </div>
        <div class="dataTypeTitle pa-3">
          {{ card.variableName }}
        </div>
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
  max-height: 340px;
  overflow-y: scroll;
}

.variableCardDataType {
  font-size: 12px;
  font-weight: 500;
  color: #cfcfcf;
}
.dataTypeTitle {
  font-weight: 500;
  font-size: 0.9rem;
}

.dataTypeTitle {
  text-overflow: ellipsis;
  overflow: hidden; 
  width: 100%;
  white-space: nowrap;
  height: 100%;
}

.dataTypeContainer {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
}

.removeButtonContainer {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: flex-end;
  z-index: -1;
}

</style>