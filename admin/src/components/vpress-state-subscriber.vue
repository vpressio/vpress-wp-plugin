<template>
  <div>
    {{ displayChartConfig }}
  </div>
</template>
<script>
export default {
  name:'vpress-state-subscriber',
  data(){
    return {
      chartConfig: this.$store.state.chartConfig
    }
  },
  created(){
    this.$store.subscribe((mutation, state) => {
      this.chartConfig = state.chartConfig
    })
  },
  computed:{
    displayChartConfig(){
      return this.chartConfig
    }
  }
}
</script>