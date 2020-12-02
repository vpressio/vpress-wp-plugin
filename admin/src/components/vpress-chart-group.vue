<template>
  <div :style="cssProps" ref="chart-group">
    <div class="chart-container" >
      <div
        class="progress--layer"
        v-show="loadingViz"
      >
        <v-progress-circular
          :size="70"
          :width="7"
          color="primary"
          indeterminate
        />
      </div>
      <VpressChartContainer
        :id="`empty_chart_0`"
        :chartConfig="viz.getValues ? viz.getValues() : {}"
        :data="viz.getData ? viz.getData() : []"
        :height="this.vizHeight"
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
      v-for="(chart, chartIndex) in tabs"
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
        <v-icon>
          mdi-close
        </v-icon>
      </v-btn>
    </v-btn>
  </div>
</template>
<script>
import * as d3 from 'd3';
import VpressChartContainer from '../components/vpress-chart-container.vue';
import { loaderMixin, editorMixin } from '../mixins/index.js'

export default {
  name: 'VpressChartGroup',
  components: {
    VpressChartContainer
  },
  mixins: [loaderMixin, editorMixin],
  props: {
    cardHeight: {
      type: Number
    }
  },
  data() {
    return {
      openTab: this.$store.getters['editor/vizzes']()
        ? this.$store.getters['editor/vizzes']().open
        : this.$store.getters['editor/vizzes'](),
      tabs: [],
      vizHeight: Math.floor(window.innerHeight / 3 * 2)
    };
  },
  mounted() {
    window.addEventListener('resize', this.resizeVizHeight)
    this.tabs = this.$store.getters['editor/vizzes']()
      ? this.$store.getters['editor/vizzes']().vizzes
      : this.$store.getters['editor/vizzes']()
    this.unsubscribe = this.$store.subscribe(
      mutation => {
        if(
          mutation.type === 'workspace/SET_ACTIVE_DATASET'
        ) {
          this.tabs = this.$store.getters['editor/vizzes']().vizzes
        }
      }
    )
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.resizeVizHeight)
    this.unsubscribe();
  },
  computed: {
    cssProps() {
      return {
        '--cardHeight': `${this.vizHeight}px`
      }
    }
  },
  methods: {
    resizeVizHeight() {
      this.vizHeight = Math.floor(window.innerHeight / 3 * 2)
    },
    async addViz() {
      try {
        this.openTab = await this.$store.dispatch('editor/ADD_VIZ', {})
        await this.$store.dispatch(
          'editor/SET_ACTIVE_VIZ',
          { idx: this.vizzes.length - 1}
        )
        this.tabs = this.vizzes
      } catch (error) {
        throw new Error(error.message);
      }
    },
    async removeViz(idx) {
      try {
        this.openTab = 0
        await this.$store.dispatch(
          'editor/SET_ACTIVE_VIZ',
          { idx: 0 }
        )
        await this.$store.dispatch('editor/REMOVE_VIZ', { idx })
        this.tabs = this.vizzes
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async setActiveViz(idx) {
      this.openTab = idx
      await this.$store.dispatch(
        'editor/SET_ACTIVE_VIZ',
        { idx: idx }
      )
      const payload = {
        values: this.$store.getters['editor/chart'],
        data: [],
        idx: idx
      }
      payload.data = await this.createVizQuery(
        payload.values
      )
      await this.$store.dispatch(
        'editor/UPDATE_VIZ',
        payload
      )
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
      this.$store.dispatch('editor/UPDATE_LOADING_STATE', false)
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

.chart-container {
  min-height: var(--cardHeight);
  position: relative;
}

.progress--layer {
  position: absolute;
  width:100%;
  height:100%;
  background-color: white;
  display: flex;
  justify-content: center;
  align-items:center
}

</style>
