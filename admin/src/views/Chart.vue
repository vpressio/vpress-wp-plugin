<template lang="pug">
div(class="chart")
  h1 Hey, I use ChartComponent
  .container
    ChartComponent(
      :data="dataChart",
      :chartConfig="chartConfig"
    )
</template>

<script>
// @ is an alias to /src
import ChartComponent from '../components/ChartComponent.vue';

export default {
  name: 'chart',
  components: {
    ChartComponent
  },
  data() {
    return {
      dataChart: [
        { x: 'Sí', y: 4, z: 'Casa' },
        { x: 'Sí', y: 3, z: 'Taller' },
        { x: 'No', y: 3, z: 'Casa' },
        { x: 'No', y: 2, z: 'Taller' },
        { x: 'No sabe', y: 2, z: 'Casa' },
        { x: 'No sabe', y: 1, z: 'Taller' }
      ]
    };
  },
  computed: {
    chartConfig() {
      const config = {
        xAxis: { title: 'Respuesta', type: 'ordinal', slug: 'x' },
        // xAxis: { title: 'Total de personas', type: 'linear', slug: 'y' },
        // xAxis: { title: 'Lugar', type: 'ordinal', slug: 'z' },
        yAxis: { title: 'Lugar', type: 'ordinal', slug: 'z' },
        // yAxis: { title: 'Respuesta', type: 'ordinal', slug: 'x' },
        // yAxis: { title: 'Total de personas', type: 'linear', slug: 'y' },
        // groupBy: {},
        groupBy: { title: 'Lugar', type: 'ordinal', slug: 'z' },
        // groupBy: { title: 'Respuesta', type: 'ordinal', slug: 'x' },
        collapseBy: { title: 'Total de personas', type: 'linear', slug: 'y' },
        decimals: 1,
        preffix: '',
        suffix: '',
        stackedBars: false,
        orderBy: { order: 'desc', slug: 'y' },
        title: '¿Está usted de acuerdo?',
        colors: ['red', 'green', 'blue'],
        labels: false
      };
      if (config.xAxis.type === 'ordinal' && config.yAxis.type === 'ordinal') {
        config.chart = 'heatmap';
      } else if (config.xAxis.type === 'linear' && config.yAxis.type === 'linear') {
        // config.chart = 'scatter';
      } else if (config.xAxis.type === 'date') {
        config.chart = 'timeline';
      } else if (config.xAxis.type !== config.yAxis.type) {
        config.chart = 'bars';
      }
      return config;
    }
  },
  mounted() {}
};
</script>
