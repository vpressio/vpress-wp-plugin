<template>
  <div class="vpress-navigator">
    <div class="vpress-app-bar">
      <VpressAppBar/>
    </div>
    <div class='vpress-navigation-view'>
      <router-view :key="$route.path"/>
      <v-snackbar
        location="bottom right"
        v-model="notificationsStore.show"
        :timeout="notificationsStore.timeout"
        :color="notificationsStore.color"
      >
        {{ notificationsStore.text }}
        <template v-slot:actions>
          <v-btn
            color="white"
            variant="text"
            @click="notificationsStore.close()"
          >
            Cerrar
          </v-btn>
        </template>
      </v-snackbar>
    </div>
  </div>
</template>
<script>
import { mapStores } from 'pinia';
import VpressAppBar from '../components/vpress-app-bar.vue';
import { editorMixin, loaderMixin } from '../mixins/index.js'
import { useNotificationsStore, useWorkspaceStore } from '../store/index.js'

export default {
  name: 'Vpress',
  components: {
    VpressAppBar
  },
  mixins: [editorMixin, loaderMixin],
  computed: {
    ...mapStores(useNotificationsStore, useWorkspaceStore),
    datasets() {
      return Object.keys(this.workspaceStore.datasetMeta)
    }
  },
  methods: {
    async selectDataset(dataset) {
      this.updateActiveDataset( dataset)
    },
    async addDataset() {
      await this.updateActiveDataset(null)
    },
    async mergeValue(slot, dataToMerge) {
      try {
        await this.merge_query(dataToMerge, slot)
      } catch (error) {
        throw new Error(error)
      }
    }
  }
}
</script>
<style lang="scss" scoped>
.vpress-navigator {
  width:100%;
  height:100%;
}

.vpress-app-bar {
  height: 48px;
  width: 100%
}

.vpress-navigation-view {
  width: 100%;
  height:calc(100% - 48px);
  background-color:#F8F8F8;
}

.v-input input {
  border: none;
}

.v-snack:not(.v-snack--absolute) {
  z-index: 99999 !important;
}
</style>
