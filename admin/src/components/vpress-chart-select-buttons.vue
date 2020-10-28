<template>
  <v-card flat class="px-2 py-3">
    <v-row>
      <v-col
        class="buttons-header"
        v-show="!$vuetify.breakpoint.smAndDown"
        xl="2"
        lg="3"
        md="3"
      >
        TIPOS DE
        <br/>
        GRÁFICOS
      </v-col>
      <v-col>
        <v-menu
          v-for="(graph, graphIndex) in availableCharts"
          :key="graphIndex"
          open-on-hover
          :close-on-content-click="false"
          max-width="205"
          offset-y
          attach
        >
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              :disabled="graph.disabled"
              :class="graph.disabled ? 'grey lighten-1' : ''"
              text
              @click="setChartType(graph.type)"
              class="mx-1"
              v-bind="attrs"
              v-on="on"
            >
              <v-img
                :src="requireImg(graph.type)"
                :alt="graph.type"
                :width="graph.type === 'map' ? 35 : 30"
                :height="graph.type === 'map' ? 24 : 30"
              />
            </v-btn>
          </template>
          <v-card>
            <v-card-text>
              <h6 class="text-subtitle-1 font-weight-bold">{{ graph.type }}</h6>
              <div v-for=" (rule, ruleIdx) in graph.chartRules" :key="ruleIdx">
                {{rule.msg}}
                <div v-for="(chip, chipIdx) in rule.vars" :key="chipIdx">
                  {{ chip.msg }}
                  <v-chip
                    class="ma-2"
                  >
                    {{ chip.type }}
                  </v-chip>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-menu>
      </v-col>
    </v-row>
    <v-row v-show="$store.getters['editor/chart'].chart !== 'map'">
      <v-col class="ml-5 v-step-7">
        <v-btn
          class="mr-2"
          @click="toggleLabels"
          small
          dark
          color="color2"
        >
          <v-icon>
            mdi-tag-outline
          </v-icon>
        </v-btn>
        <v-btn
          v-show="chartIsBarsGrouped
          "
          class="mr-2"
          @click="toggleBarsType"
          small
          dark
          color="color2"
        >
          <v-icon>
            {{ stackedBars ? 'mdi-chart-bar' : 'mdi-chart-bar-stacked'}}
          </v-icon>
        </v-btn>
        <v-btn
          class="mr-2"
          @click="toggleOrder"
          small
          dark
          color="color2"
        >
          <v-img
            :src="requireImg('totales')"
            :alt="'Ordenar'"
            width="10"
          />
        </v-btn>
        <v-btn
          class="mr-2"
          @click="orderByAlphabetical"
          small
          dark
          color="color2"
        >
          <v-img
            :src="requireImg('alfabeto')"
            :alt="'Invertir ejes'"
            width="10"
          />
        </v-btn>
        <v-btn
          class="mr-2"
          @click="orderByNumerical"
          small
          dark
          color="color2"
        >
          <v-img
            :src="requireImg('numerico')"
            :alt="'Invertir ejes'"
            width="10"
          />
        </v-btn>
        <v-btn
          class="mr-2"
          @click="invertAxis"
          small
          dark
          color="color2"
        >
          <v-img
            :src="requireImg('invertir')"
            :alt="'Invertir ejes'"
            width="10"
          />
        </v-btn>
      </v-col>
    </v-row>
  </v-card>
</template>
<script>
import { editorMixin } from '../mixins/index.js'

export default {
  name: 'VpressChartSelectButtons',
  props: ['availableCharts'],
  mixins: [editorMixin],
  data() {
    return {
      labels: false,
      stackedBars: false,
      order: this.$store.getters['editor/order'],
    };
  },
  created() {
    this.labels = this.$store.getters['editor/labels'];
    this.stackedBars = this.$store.getters['editor/stackedBars'];
  },
  computed: {
    chartIsBarsGrouped() {
      return (
        this.$store.getters['editor/chart'].chart === 'bars' &&
        this.$store.getters['editor/groupBy.slug'].length !== 0
      );
    }
  },
  methods: {
    async setChartType(chartType) {
      this.merge_value(
        { mutationType:'chart' , value: chartType}
      );
    },
    requireImg(chartType) {
      try {
        return require(`../assets/images/${chartType}.svg`);
      } catch (error) {
        return require('../assets/images/spineplot.svg')
      }
    },
    toggleLabels() {
      this.labels = !this.labels;
      this.merge_value(
        { mutationType: 'labels' ,value: this.labels }
      );
    },
    toggleBarsType() {
      this.stackedBars = !this.stackedBars;
      this.merge_value(
        { mutationType: 'stackedBars' ,value: this.stackedBars
      });
    },
    toggleOrder() {
      const order = [ 'asc', 'desc' ];
      const selectedOrderIndex = order.indexOf(this.order);
      if ( (selectedOrderIndex + 1) < order.length) {
        this.order = order[selectedOrderIndex + 1]
      } else {
        this.order = order[0]
      }
      this.merge_value(
        { mutationType: 'orderBy' ,value: this.order}
      );
    },
    orderByAlphabetical() {
      const chartValues = this.$store.getters['editor/chart'];
      if (chartValues.xAxis.slug !== chartValues.yAxis.slug) {
        if (chartValues.xAxis.type === 'ordinal' ) {
          this.merge_value(
            { mutationType: 'orderBy' ,value: chartValues.xAxis.slug }
          );
        }
        if (chartValues.yAxis.type === 'ordinal' ) {
          this.merge_value(
            { mutationType: 'orderBy' ,value: chartValues.yAxis.slug }
          );
        }

      } else if (chartValues.xAxis.type === 'ordinal') {
        this.merge_value(
          { mutationType: 'orderBy' ,value: chartValues.xAxis.slug }
        );
      } else {
        this.merge_value(
          { mutationType: 'orderBy' ,value: '' }
        );
      }
    },
    orderByNumerical() {
      const chartValues = this.$store.getters['editor/chart'];
      if (chartValues.xAxis.slug !== chartValues.yAxis.slug) {
        if (chartValues.xAxis.type === 'linear' ) {
          this.merge_value(
            { mutationType: 'orderBy' ,value: chartValues.xAxis.slug }
          );
        }
        if (chartValues.yAxis.type === 'linear' ) {
          this.merge_value(
            { mutationType: 'orderBy' ,value: chartValues.yAxis.slug }
          );
        }
      } else if (chartValues.xAxis.type === 'linear') {
        this.merge_value(
          { mutationType: 'orderBy' ,value: chartValues.xAxis.slug }
        );
      } else {
        this.merge_value(
          { mutationType: 'orderBy' ,value: 'total_count' }
        );
      }
    },
    invertAxis() {
      this.merge_value(
        { mutationType: 'invertAxis' }
      );
    }

  }
};
</script>
<style scoped>
.text-subtitle-1 {
  margin: 0;
}
.buttons-header {
  display: flex;
  justify-content: center;
  align-self: center;
  border-right: solid 0.5px;
  font-weight: 600;
  line-height: initial;
}

.disabled-graph-image {
  filter: opacity(30%);
}
</style>
