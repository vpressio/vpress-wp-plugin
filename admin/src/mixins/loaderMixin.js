export default {
  filters: {
    intFromat(number) {
      return new Intl.NumberFormat().format(number)
    },
  },
  computed: {
    vizzes() {
      return this.$store.getters['editor/vizzes']()
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
        const vizzes =await this.$store
          .dispatch(
            'editor/LOAD_VIZZES',
            { vizValues }
        )
        this.$store.dispatch('editor/SET_ACTIVE_VIZ', { vizzes: vizzes, vizIdx: 0 })
        
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
        this.$store.dispatch('editor/SET_ACTIVE_VIZ',{ vizzes: this.vizzes, vizIdx: 0 })
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async loadSavedViz(viz, dataset) {
      const currentVizzes = this.vizzes
        ? this.vizzes
        : []
      const { includes, idx } = currentVizzes.reduce((acc, savedViz, index) => {
        if (savedViz.id === viz.id) {
          acc = {
            includes: true,
            idx: index
          }
        }
        return acc
      }, { includes: false, idx: null })
      if (!includes) {
        const values = JSON.parse(viz.value)
        const data = await this.createVizQuery(
          values
        )
        const payload = {
          values: values,
          data: data
        }
        await this.editorInit(dataset, [ viz ])
        if (this.vizzes && this.vizzes.length > 0) {
          payload.idx = this.vizzes.length - 1
        }
        await this.$store.dispatch(
          'editor/UPDATE_VIZ',
          payload
        )
      } else {
        const payload = {
          values: this.vizzes[idx].getValues(),
          data: [],
          idx: idx,
          dataset: dataset
        }
        if (
          payload.values.xAxis.slug !== '' &&
          payload.values.yAxis.slug !== ''
        ) {
          this.$store.dispatch('editor/UPDATE_LOADING_STATE', true)
          payload.data = await this.createVizQuery(
            this.vizzes[idx].getValues(),
            dataset

          )
          
          await this.$store.dispatch(
            'editor/UPDATE_VIZ',
            payload
          )
        }
      }
    }
  }
}