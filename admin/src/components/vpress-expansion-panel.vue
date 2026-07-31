<template>
  <v-expansion-panels
    multiple
    flat
    rounded="0"
    :model-value="[0]"
  >
    <v-expansion-panel class="config-panels">
      <v-expansion-panel-title class="panel-title-color1">
        {{ panelTitle }}
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <slot/>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>
<script>
export default {
  name: 'VpressExpansionPanel',
  props: ['panelTitle'],

};
</script>
<style scoped>
.panel-title-color1 {
  background-color: rgb(var(--v-theme-color1));
}

.config-panels > .v-expansion-panel-title {
  min-height: 0% !important;
  padding: 14px 24px;
  color:#FFFF !important;
  font-weight: 800;
  font-size:  0.65rem !important;
  border-top-left-radius: 0%;
  border-top-right-radius: 0%;
}

.config-panels > .v-expansion-panel-text :deep(.v-expansion-panel-text__wrapper) {
  padding: 0 !important;
}

.config-panels {
  margin: 0% !important;
}

.border-radius-none{
  border-radius: 0px !important;
}
</style>
