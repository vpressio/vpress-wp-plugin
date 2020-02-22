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
        { x: 'Sí', y: 4, z: 'Casa', w: 0.4 },
        { x: 'Sí', y: 3, z: 'Taller', w: 0.7 },
        { x: 'No', y: 3, z: 'Casa', w: 0.5 },
        { x: 'No', y: 2, z: 'Taller', w: 0.22 },
        { x: 'No sabe', y: 2, z: 'Casa', w: 0.1 },
        { x: 'No sabe', y: 1, z: 'Taller', w: 0.9 }
      ]
    };
  },
  computed: {
    chartConfig() {
      const config = {
        chart: 'spineplot',
        xAxis: { title: 'Respuesta', type: 'ordinal', slug: 'x' },
        // xAxis: { title: 'Total de personas', type: 'linear', slug: 'y' },
        // xAxis: { title: 'Lugar', type: 'ordinal', slug: 'z' },
        // xAxis: { title: 'Score', type: 'linear', slug: 'w' },
        // yAxis: { title: 'Respuesta', type: 'ordinal', slug: 'x' },
        // yAxis: { title: 'Total de personas', type: 'linear', slug: 'y' },
        yAxis: { title: 'Lugar', type: 'ordinal', slug: 'z' },
        // groupBy: {},
        // groupBy: { title: 'Respuesta', type: 'ordinal', slug: 'x' },
        groupBy: { title: 'Lugar', type: 'ordinal', slug: 'z' },
        collapseBy: { title: 'Total de personas', type: 'linear', slug: 'y' },
        // collapseBy: { title: 'Score', type: 'linear', slug: 'w' },
        decimals: 1,
        preffix: '',
        suffix: '',
        stackedBars: false,
        orderBy: { order: 'desc', slug: 'y' },
        title: '¿Está usted de acuerdo?',
        colors: ['red', 'green', 'blue'],
        labels: false
      };
      return config;
    }
  },
  mounted() {}
};
</script>
