<template>
<div class="vpress-navigator">
  <div class="vpress-app-bar">
    <VpressAppBar/>
  </div>
  <v-card class="vpress-sidebar" tile flat color="#222A32">
    <v-card class="pa-2" tile height="50" color="#181D25" flat>
      <v-img src="../assets/images/logo.svg" />
      <div class="my-4">
        <v-btn
          class="py-3 my-2"
          v-for="dataset in datasets"
          :key="dataset"
          x-small
          block
          :color="
            $store.getters['workspace/activeDataset'].slug === dataset 
              ? 'secondary'
              : 'primary'
          "
          @click="selectDataset(dataset)"
        >
          <v-tooltip
            attach
            right
            offset-y
          >
            <template v-slot:activator="{ on, attrs }">
              <v-icon
                small
                v-bind="attrs"
                v-on="on"
              >
                mdi-database
              </v-icon>
            </template>
            <span> {{ dataset }} </span>
          </v-tooltip>
        </v-btn>
      </div>
    </v-card>
  </v-card>
  <div class='vpress-navigation-view'>
    <router-view :key="$route.path"/>
    <v-snackbar
      dark
      bottom
      right
      v-model="$store.state.notifications.show"
      :timeout="$store.state.notifications.timeout"
      :color="$store.state.notifications.color"
    >
      {{ $store.state.notifications.text }}
      <template v-slot:action="{ attrs }">
        <v-btn
          color="white"
          text
          v-bind="attrs"
          @click="snackbar = $store.dispatch('notifications/close')"
        >
          Cerrar
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</div>
</template>
<script>
import VpressAppBar from '../components/vpress-app-bar.vue';

export default {
  name: 'Vpress',
  components: {
    VpressAppBar
  },
  data() {
    return {
      datasets: {}
    }
  },
  created() {
    this.unsubscribe = this.$store.subscribe(
      mutation => {
        if(
          mutation.type === 'workspace/ADD_DATASET_META' ||
          mutation.type === 'workspace/REMOVE_DATASET_META'
        ) {
          this.datasets = Object.keys(this.$store.getters['workspace/datasetMeta'])
        }
      }
    )
  },
  beforeDestroy() {
    this.unsubscribe();
  },
  methods: {
    async selectDataset(dataset) {
      this.$store.dispatch('workspace/UPDATE_ACTIVE_DATASET', dataset)
    }
  }
}
</script>
<style lang="scss" scoped>
.vpress-navigator {
  display: grid;
  height:100%;
  grid-template-columns: 45px 1fr;
  grid-template-rows: 45px 1fr;
}

.vpress-app-bar {
  grid-area: 1/1/2/3;
}

.vpress-navigation-view {
  grid-area: 2/2;
}
.vpress-sidebar {
  grid-area: 2/1/2/2;
}
.beta-banner-container {
  position: absolute;
  z-index: 3;
  margin-left: calc(100% - 100px);
  display: flex;
  justify-content: flex-end;
}

.beta-banner {
  width: 100px
}

.v-input input {
  border: none;
}
.v-snack:not(.v-snack--absolute) {
  z-index: 99999 !important;
}
</style>
