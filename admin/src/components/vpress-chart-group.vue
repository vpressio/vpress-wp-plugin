  <template>
    <v-row :style="cssProps" ref="chart-group">
      <v-col class="chart-container" cols="12">
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
          @chart_loaded="onChartIsLoaded"
        />
      </v-col>
      <v-col class="py-0 pr-0" cols="1">
        <v-btn
          rounded="0"
          variant="flat"
          @click="addViz"
        >
          <v-icon color="grey">mdi-plus-thick</v-icon>
        </v-btn>
      </v-col>
      <v-col cols="11" class="tab-btn-container py-0 pl-0">
        <div class="tabs-bar">
          <v-slide-group show-arrows>
            <v-slide-group-item
              v-for="(chart, chartIndex) in tabs"
              :key="`chart_tab_${chartIndex}`"
            >
              <div style="display: flex;">
                <v-btn
                  class="elevation-1 mx-1"
                  :color="openTab === chartIndex ? '#FFF' : ''"
                  @click="setActiveViz(chartIndex)"
                  rounded="0"
                >
                  Gráfica {{ chartIndex + 1 }}
                  <v-btn
                    class="ml-3 mr-2"
                    size="x-small"
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
            </v-slide-group-item>
          </v-slide-group>
        </div>
      </v-col>
    </v-row>
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
      openTab: null,
      tabs: [],
      vizHeight: 0
    };
  },
  created() {
    this.openTab = this.editorStore.getVizzes()
      ? this.editorStore.getVizzes().open
      : this.editorStore.getVizzes()
  },
  mounted() {
    window.addEventListener('resize', this.resizeVizHeight)
    this.resizeVizHeight()
    this.tabs = this.editorStore.getVizzes()
      ? this.editorStore.getVizzes().vizzes
      : this.editorStore.getVizzes()
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.resizeVizHeight)
  },
  watch: {
    // Replaces the Vuex mutation subscription on workspace/SET_ACTIVE_DATASET.
    'workspaceStore.activeDataset'() {
      const vizzes = this.editorStore.getVizzes()
      this.tabs = vizzes ? vizzes.vizzes : vizzes
    }
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
      this.vizHeight = Math.floor(window.innerHeight * .7)
    },
    async addViz() {
      try {
        this.openTab = await this.editorStore.ADD_VIZ({})
        this.editorStore.SET_ACTIVE_VIZ({ idx: this.vizzes.length - 1})
        this.tabs = this.vizzes
      } catch (error) {
        throw new Error(error.message);
      }
    },
    async removeViz(idx) {
      try {
        this.openTab = 0
        this.editorStore.SET_ACTIVE_VIZ({ idx: 0 })
        await this.editorStore.REMOVE_VIZ({ idx })
        this.tabs = this.vizzes
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async setActiveViz(idx) {
      this.openTab = idx
      this.editorStore.SET_ACTIVE_VIZ({ idx: idx })
      const payload = {
        values: this.editorStore.chart,
        data: [],
        idx: idx
      }
      payload.data = await this.createVizQuery(
        payload.values
      )
      this.editorStore.UPDATE_VIZ(payload)
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
      this.editorStore.UPDATE_LOADING_STATE(false)
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
  height: var(--cardHeight);
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
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

.tabs-bar {
  display: flex;
  background-color: #F8F8F8;
}

</style>
