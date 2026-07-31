import { mapStores } from 'pinia'
import { vizzesIncludes } from '../helpers/index.js'
import { useEditorStore, useWorkspaceStore } from '../store/index.js'

export default {
  computed: {
    ...mapStores(useEditorStore, useWorkspaceStore),
    vizzes() {
      return this.editorStore.getVizzes()
      ? this.editorStore.getVizzes().vizzes
      : this.editorStore.getVizzes()
    },
    viz() {
      return this.editorStore.viz
    },
    loadingViz() {
      return this.editorStore.loadingState
    }
  },
  methods: {
    intFormat(number) {
      return new Intl.NumberFormat().format(number)
    },
    async editorInit(dataset, vizValues) {
      try {
        const datasetMeta = await this.workspaceStore.ADD_DATASET(dataset)
        this.workspaceStore.UPDATE_ACTIVE_DATASET(datasetMeta.slug)
        this.editorStore.LOAD_VIZZES({ vizValues })
        return { datasetMeta }
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async updateActiveDataset(dataset) {
      try {
        this.workspaceStore.UPDATE_ACTIVE_DATASET(dataset)
        this.editorStore.SET_ACTIVE_VIZ({ idx: 0 })
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async loadSavedViz(viz, dataset) { // TODO: Reconsider functionality
      const storedVizzes = this.editorStore.getVizzes(dataset.slug)
        ? this.editorStore.getVizzes(dataset.slug).vizzes
        : this.editorStore.getVizzes(dataset.slug)
      const parsedViz = JSON.parse(viz.value)
      if (storedVizzes) {
        const { includes, idx } = vizzesIncludes(viz.id, storedVizzes)
        const payload = {
          values: null,
          data: null,
          index: null
        }
        if (includes) {
          // TODO: "Save before leave" to uncomment next line
          // payload.values = storedVizzes[idx].getValues()
          payload.values = parsedViz
          payload.index = idx
        } else {
          payload.values = parsedViz
          payload.index = storedVizzes.length
          await this.editorInit(dataset, [ viz ])
        }
        payload.data = await this.createVizQuery(payload.values, dataset)
        const { values, data, index } = payload
        this.editorStore.SET_ACTIVE_VIZ({ idx: index })
        this.editorStore.UPDATE_VIZ({ values, data, dataset })
      } else {
        await this.editorInit(dataset, [viz])
        const data = await this.createVizQuery(parsedViz, dataset)
        this.editorStore.UPDATE_VIZ({ data, dataset })
      }
    },
  }
}
