<template>
  <div>
    <VpressChartSelectButtons :availableCharts="availableCharts" />
    <ChartComponent
      :data="dataChart"
      :chartConfig="chartConfig"
      @chart_loaded="onChartIsLoaded"
    ></ChartComponent>
  </div>
</template>
<script>
import * as _ from 'lodash';
import * as d3 from 'd3';
import ChartComponent from '../components/ChartComponent.vue';
import VpressChartSelectButtons from './vpress-chart-select-buttons.vue';

export default {
  name: 'vpress-state-subscriber',
  components: {
    ChartComponent,
    VpressChartSelectButtons
  },
  data() {
    return {
      dataChart: this.$store.state.data.data,
      chartConfig: this.$store.state.chartConfig,
      availableCharts: this.$store.getters['chartConfig/getAvailableCharts']
    };
  },
  created() {
    this.$store.subscribe((mutation, state) => {
      const chartConfig = _.cloneDeep(state.chartConfig);
      this.chartConfig = chartConfig;

      this.availableCharts = this.$store.getters['chartConfig/getAvailableCharts'];
    });
  },
  computed: {
    displayChartConfig() {
      return this.chartConfig;
    }
  },
  methods: {
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
        /** @todo update state */
        vm.chartConfig.title = value;
      });
      this.createInputToEditLabel(
        $element,
        '.generated-subtitle',
        '.input-edit-subtitle',
        value => {
          /** @todo update state */
          vm.chartConfig.subtitle = value;
        }
      );
      this.createInputToEditLabel($element, '.x.axis .axis-title', '.input-edit-x-axis', value => {
        /** @todo update state */
        vm.chartConfig.xAxis = Object.assign(vm.chartConfig.xAxis, { title: value });
      });
      this.createInputToEditLabel($element, '.y.axis .axis-title', '.input-edit-y-axis', value => {
        /** @todo update state */
        vm.chartConfig.yAxis = Object.assign(vm.chartConfig.yAxis, { title: value });
      });
      this.createInputToEditLabel(
        $element,
        '.legend-title tspan, .legend-title',
        '.input-edit-legend-title',
        value => {
          /** Update current config with new value */
          if (vm.chartConfig.groupBy.slug) {
            vm.chartConfig.groupBy = Object.assign(vm.chartConfig.groupBy, {
              title: value
            });
          } else if (vm.chartConfig.yAxis.type === 'ordinal') {
            vm.chartConfig.yAxis = Object.assign(vm.chartConfig.yAxis, {
              title: value
            });
          } else if (vm.chartConfig.xAxis.type === 'ordinal') {
            vm.chartConfig.xAxis = Object.assign(vm.chartConfig.xAxis, {
              title: value
            });
          }
          /** @todo update state */
        }
      );
    }
  }
};
</script>
