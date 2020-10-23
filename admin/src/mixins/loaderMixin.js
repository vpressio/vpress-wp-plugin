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
        this.$store.dispatch('editor/SET_ACTIVE_VIZ', vizzes[0])
        
        return { datasetMeta }
      } catch (error) {
        console.error(error)
      }
    },
    async updateActiveDataset(dataset) {
      try {
        await this.$store.dispatch(
              'workspace/UPDATE_ACTIVE_DATASET',
              dataset
        )
        this.$store.dispatch('editor/SET_ACTIVE_VIZ', this.vizzes ? this.vizzes[0] : undefined)
      } catch (error) {
        console.error(error);
      }
    }
  }
}
// function loadDataset() {

// }
// function deleteDataset() {

// }
// function addChart() {

// }
// function removeChart() {

// }
// function deleteChart() {

// }
// function saveChart() {

// }
// function saveDatasetCharts() {

// }
// function shareChart() {

// }