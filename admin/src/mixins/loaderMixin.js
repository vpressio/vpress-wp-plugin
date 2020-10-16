export default {
  filters: {
    intFromat(number) {
      return new Intl.NumberFormat().format(number)
    },
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
        console.error(error)
      }
    },
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