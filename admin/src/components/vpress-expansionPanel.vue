<template>
  <v-expansion-panels
    multiple
    flat
    tile
    hover
    dark
    :value="[0]"
  >
    <v-expansion-panel class="config-panels">
      <v-expansion-panel-header style="background-color:#7972AC">
        {{ panelTitle }}
      </v-expansion-panel-header>
      <v-expansion-panel-content>
        <v-card class="border-radius-none" flat light>
          <slot/>
        </v-card>
      </v-expansion-panel-content>
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
.config-panels > .v-expansion-panel-header {
  min-height: 0% !important;
  padding: 14px 24px;
  color:#FFFF !important;
  font-weight: 500;
  font-size:  0.8rem !important;
  border-top-left-radius: 0%;
  border-top-right-radius: 0%;
}

.config-panels > .v-expansion-panel-content > .v-expansion-panel-content__wrap {
  padding: 0;
}

.config-panels {
  margin: 0% !important;
}

.border-radius-none{
  border-radius: 0px !important;
}
</style>
