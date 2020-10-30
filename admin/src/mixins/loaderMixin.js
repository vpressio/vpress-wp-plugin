import { vizzesIncludes } from '../helpers/index.js'

export default {
  filters: {
    intFromat(number) {
      return new Intl.NumberFormat().format(number)
    },
  },
  computed: {
    vizzes() {
      return this.$store.getters['editor/vizzes']()
      ? this.$store.getters['editor/vizzes']().vizzes
      : this.$store.getters['editor/vizzes']()
    },
    viz() {
      return this.$store.getters['editor/viz']
    },
    loadingViz() {
      return this.$store.getters['editor/loadingState']
    }
  },
  methods: {
    async editorInit(dataset, vizValues) {
      try {
        const datasetMeta = await this.$store
          .dispatch(
            'workspace/ADD_DATASET',
            dataset,
        )
        await this.$store
          .dispatch(
            'workspace/UPDATE_ACTIVE_DATASET',
            datasetMeta.slug
          )
        await this.$store
          .dispatch(
            'editor/LOAD_VIZZES',
            { vizValues }
        )
        
        return { datasetMeta }
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async updateActiveDataset(dataset) {
      try {
        await this.$store.dispatch(
          'workspace/UPDATE_ACTIVE_DATASET',
          dataset
        )
        this.$store.dispatch('editor/SET_ACTIVE_VIZ', { idx: 0 })
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async loadSavedViz(viz, dataset) {
      const storedVizzes = this.$store.getters['editor/vizzes'](dataset.slug)
        ? this.$store.getters['editor/vizzes'](dataset.slug).vizzes
        : this.$store.getters['editor/vizzes'](dataset.slug)
      const parsedViz = JSON.parse(viz.value)
      if (storedVizzes) {
        const { includes, idx } = vizzesIncludes(viz.id, storedVizzes)
        const payload = {
          values: null,
          data: null,
          index: null
        }
        if (includes) {
          payload.values = storedVizzes[idx].getValues()
          payload.index = idx
        } else {
          payload.values = parsedViz
          payload.index = storedVizzes.length
          await this.editorInit(dataset, [ viz ])
        }
        payload.data = await this.createVizQuery(payload.values, dataset)
        const { values, data, index } = payload
        await this.$store.dispatch('editor/SET_ACTIVE_VIZ', { idx: index })
        await this.$store.dispatch('editor/UPDATE_VIZ', { values, data, dataset})
      } else {
        await this.editorInit(dataset, [ viz ])
        const data = await this.createVizQuery(parsedViz, dataset)
        await this.$store.dispatch('editor/UPDATE_VIZ', { data, dataset})
      }
    },
  }
}
