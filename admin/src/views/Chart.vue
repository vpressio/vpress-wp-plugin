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
      ],
      chartConfig: {
        chart: 'bars',
        xAxis: { title: 'Respuesta', type: 'ordinal', slug: 'x' },
        yAxis: { title: 'Total de personas', type: 'linear', slug: 'y' },
        groupBy: { title: 'Lugar', type: 'ordinal', slug: 'z' },
        collapseBy: { title: 'Total de personas', type: 'linear', slug: 'y' },
        unitsName: 'personas',
        decimals: 1,
        preffix: '',
        suffix: '',
        stackedBars: false,
        orderBy: { order: 'desc', slug: 'y' },
        title: '¿Está usted de acuerdo?',
        colors: ['red', 'green', 'blue'],
        labels: false
      }
    };
  },
  mounted() {}
};
</script>
