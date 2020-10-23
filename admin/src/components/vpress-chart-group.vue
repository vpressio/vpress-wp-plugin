<template>
  <div
  >
    <!-- <div
      v-show="loadingViz"
      class="progress--layer"
    >
      <v-progress-circular
        :size="70"
        :width="7"
        color="primary"
        indeterminate
      />
    </div> -->
    <div style="min-height:600px;position:relative;">
      <VpressChartContainer
        :id="`empty_chart_0`"
        :chartConfig="viz.getValues ? viz.getValues() : {}"
        :data="viz.getData ? viz.getData() : []"
        @chart_loaded="onChartIsLoaded"
      />
    </div>
    <v-btn
      tile
      depressed
      @click="addViz"
    >
      <v-icon color="grey">mdi-plus-thick</v-icon>
    </v-btn>
    <v-btn
      v-for="(chart, chartIndex) in vizzes"
      :key="`chart_tab_${chartIndex}`"
      :color="openTab === chartIndex ? 'primary' : ''"
      :text="openTab === chartIndex"
      @click="setActiveViz(chartIndex)"
      tile
      depressed
    >
      Gráfica {{ chartIndex + 1 }}
      <v-btn
        class="ml-3 mr-2"
        x-small
        icon
        color="primary"
        @click.stop.prevent="removeViz(chartIndex)"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-btn>
  </div>
</template>
<script>
import * as d3 from 'd3';
import VpressChartContainer from '../components/vpress-chart-container.vue';
import loaderMixin from '../mixins/loaderMixin.js';
import editorMixin from '../mixins/editorMixin.js'

export default {
  name: 'VpressChartGroup',
  components: {
    VpressChartContainer
  },
  mixins: [loaderMixin, editorMixin],
  data() {
    return {
      openTab: 0,
    };
  },
  mounted() {
    this.setActiveViz(0)
  },
  methods: {
    async addViz() {
      try {
        console.log('add');

      } catch (error) {
        throw new console.error(error.message);
      }
    },
    async removeViz(idx) {
      try {
      console.log('remove', idx);

      } catch (error) {
        throw new Error(error.message)
      }
    },
    async setActiveViz(idx) {
      this.openTab = idx
      const payload = this.vizzes ? this.vizzes[this.openTab] : {}
      this.$store.dispatch('editor/SET_ACTIVE_VIZ', payload)
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
      this.createInputToEditLabel(
        $element,
        '.generated-title',
        '.input-edit-title',
        value => {
          this.merge_value(
            { mutationType:'title' , value: value}
          );
        }
      );
      this.createInputToEditLabel(
        $element,
        '.generated-subtitle',
        '.input-edit-subtitle',
        value => {
          this.merge_value(
            { mutationType:'subtitle' , value: value}
          );
        }
      );
      this.createInputToEditLabel(
        $element,
        '.x.axis .axis-title',
        '.input-edit-x-axis',
        value => {
          this.merge_value(
            { mutationType: 'labelAxis', value:{ axis:'xAxis', value: value} }
          );
        }
      );
      this.createInputToEditLabel(
        $element,
        '.y.axis .axis-title',
        '.input-edit-y-axis',
        value => {
          this.merge_value(
            { mutationType: 'labelAxis', value:{ axis:'yAxis', value: value} }
          );
        }
      );
      this.createInputToEditLabel(
        $element,
        '.legend-title tspan, .legend-title',
        '.input-edit-legend-title',
        value => {
          /** Update current config with new value */
          if (vm.chartConfig.groupBy.slug) {
            this.merge_value(
              { mutationType: 'labelAxis', value:{ axis:'groupBy', value: value} }
            );
          } else if (vm.chartConfig.yAxis.type === 'ordinal') {
            this.merge_value(
              { mutationType: 'labelAxis', value:{ axis:'yAxis', value: value} }
            );
          } else if (vm.chartConfig.xAxis.type === 'ordinal') {
            this.merge_value(
              { mutationType: 'labelAxis', value:{ axis:'xAxis', value: value} }
            );
          }
        }
      );
    }
  }
};
</script>
<style scoped>

.progress--layer {
  width:100%;
  height:600px;
  display:flex;
  justify-content:center;
  align-items:center
}

</style>
