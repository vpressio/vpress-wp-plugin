<template>
  <v-card>
    <VpressChartSelectButtons :availableCharts="availableCharts" />
    <VpressChartContainer
      :data="chartData"
      :chartConfig="chartConfig"
      @chart_loaded="onChartIsLoaded"
    />
    <v-btn tile depressed>
      <v-icon color="grey">mdi-plus-thick</v-icon>
    </v-btn>
    <v-btn :color="true ? 'primary' : ''" :text="true" tile depressed>
      Gráfica 01
    </v-btn>
    <v-btn :color="false ? 'primary' : ''" :text="false" tile depressed>
      Gráfica 02
    </v-btn>
  </v-card>
</template>
<script>
import * as _ from 'lodash';
import * as d3 from 'd3';
import VpressChartContainer from '../components/vpress-chart-container.vue';
import VpressChartSelectButtons from './vpress-chart-select-buttons.vue';

export default {
  name: 'VpressChartGroup',
  components: {
    VpressChartContainer,
    VpressChartSelectButtons
  },
  data() {
    return {
      dataChart: this.$store.getters['data/dataFiltered'],
      chartConfig: this.$store.getters['chartConfig/chart'],
      availableCharts: this.$store.getters['chartConfig/getAvailableCharts'],
      loadingChart: false
    };
  },
  created() {
    this.$store.subscribe((mutation, state) => {
      const chartConfig = _.cloneDeep(state.chartConfig.chartValues);
      this.chartConfig = chartConfig;
      this.availableCharts = this.$store.getters['chartConfig/getAvailableCharts'];
     if ( 
       this.chartConfig.xAxis.slug !== '' &&
       this.chartConfig.yAxis.slug !== ''
    ) {
      this.dataChart = this.$store.getters['data/dataFiltered']
    } else {
      this.dataChart = [];
    }
      
    });
  },
  computed: {
    chartData() {
      return this.$store.getters['data/dataFiltered'];
    },
    showLoader() {
      return this.loadingChart
    }
  },
  methods: {
    change() {
      this.loadingChart = !this.loadingChart
    },
    /**
     * Appends an input to edit selected label
     */
    createInputToEditLabel(parentElement, classSelector, className, callback) {
      d3.select(parentElement)
        .selectAll(classSelector)
        .on('dblclick', function() {
          const label = this;
          const elementNotFound =
            d3
              .select(parentElement)
              .select(className)
              .nodes().length === 0;
          // Input has not been created yet
          if (elementNotFound) {
            const position = label.getBoundingClientRect();
            /** Create input to exit text in the same position as current element */
            d3.select(parentElement)
              .append('input')
              .attr('class', className)
              .attr('type', 'text')
              .attr('value', label.innerHTML)
              .style('position', 'fixed')
              .style('z-index', '99')
              .style('background-color', 'white')
              .style('border', 'solid 1px #bfbfbf')
              .style('border-radius', '0.2em')
              .style('top', `${position.top}px`)
              .style('left', `${position.left}px`)
              .on('blur', function() {
                const input = this;
                d3.select(label).text(input.value); // Update label text
                callback(input.value);
                d3.select(input).remove();
              });
          }
        });
    },
    /**
     * Called when chart has been rendered
     */
    onChartIsLoaded($element) {
      const vm = this;
      this.createInputToEditLabel($element, '.generated-title', '.input-edit-title', value => {
        this.$store.dispatch('chartConfig/UPDATE_CHART_TITLES', {valueToUpdate: 'subtitle', value: value});
      });
      this.createInputToEditLabel(
        $element,
        '.generated-subtitle',
        '.input-edit-subtitle',
        value => {
        this.$store.dispatch('chartConfig/UPDATE_CHART_TITLES', {valueToUpdate: 'title', value: value});
        }
      );
      this.createInputToEditLabel($element, '.x.axis .axis-title', '.input-edit-x-axis', value => {
        this.$store.dispatch('chartConfig/UPDATE_CHART_TITLES', {valueToUpdate: 'xAxis', value: value});
      });
      this.createInputToEditLabel($element, '.y.axis .axis-title', '.input-edit-y-axis', value => {
        this.$store.dispatch('chartConfig/UPDATE_CHART_TITLES', {valueToUpdate: 'yAxis', value: value});
      });
      this.createInputToEditLabel(
        $element,
        '.legend-title tspan, .legend-title',
        '.input-edit-legend-title',
        value => {
          /** Update current config with new value */
          if (vm.chartConfig.groupBy.slug) {
            this.$store.dispatch('chartConfig/UPDATE_CHART_TITLES', {valueToUpdate: 'groupBy', value: value});
          } else if (vm.chartConfig.yAxis.type === 'ordinal') {
            this.$store.dispatch('chartConfig/UPDATE_CHART_TITLES', {valueToUpdate: 'yAxis', value: value});
          } else if (vm.chartConfig.xAxis.type === 'ordinal') {
            this.$store.dispatch('chartConfig/UPDATE_CHART_TITLES', {valueToUpdate: 'xAxis', value: value});
          }
        }
      );
    }
  }
};
</script>
