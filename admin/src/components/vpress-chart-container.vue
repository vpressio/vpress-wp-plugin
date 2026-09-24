<template>
  <div
    class="chart-container center-align"
    :class="`${chartConfig ? chartConfig.theme : 'light'}-themed`"
  >
    <div class="layout-row left-align label-font bold layout-align-start-end titles-container">
      <div class="col-12 py-0">
        <h2 class="generated-title mb-2 mt-2">{{ chartTitle('title', iframe ? '' : 'Título') }}</h2>
      </div>
      <div class="col-12 py-0">
        <h3 class="generated-subtitle mb-2 mt-2">{{ chartTitle('subtitle', iframe ? '' : 'Subtítulo') }}</h3>
      </div>
    </div>
    <div class="empty-chart" :id="id">
      <div class="vertical-align">
        <p class="tiny label-font" v-if="!iframe">Arrastra algún valor a filas, columnas o color</p>
        <div
          v-show="iframe"
          class="progress--layer"
        >
          <div
            class="vpress-spinner"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { includes, cloneDeep, uniq } from 'lodash';
import 'topojson';
import { isLeafletReady, loadLeaflet } from '../utils/lazyLeaflet.js';
import {
  timeFormatLocale,
  select,
  max,
  min,
  mean,
  sum,
  selectAll,
  curveLinear,
  format,
  nest
} from 'd3';
import {
  chart,
  leaflet,
  timeline,
  treemap,
  heatmap,
  spineplot,
  scatter,
  bars
} from '@dboxjs/core';

let uidCounter = 0;

export default {
  name: 'VpressChartContainer',
  emits: ['chart_loaded', 'chart_error'],
  props: {
    id: String,
    data: Array,
    dateFormat: {
      type: String,
      default: '%Y-%m-%d'
    },
    chartConfig: {
      chart: String,
      xAxis: {
        title: String,
        type: String,
        slug: String,
        showLabel: Boolean,
      },
      yAxis: {
        title: String,
        type: String,
        slug: String,
        showLabel: Boolean,
      },
      groupBy: {
        title: String,
        type: String,
        slug: String
      },
      collapseBy: {
        title: String,
        type: String,
        slug: String
      },
      unitsName: String,
      orderBy: String,
      decimals: Number,
      preffix: String,
      suffix: String,
      stackedBars: Boolean,
      title: String,
      subtitle: String,
      colors: Array,
      opacity: Number,
      theme: String,
      labels: Boolean
    },
    iframe: Boolean,
  },
  data() {
    return {
      uid: ++uidCounter,
      windowWidth: window.innerWidth,
      locale: timeFormatLocale({
        dateTime: '%A, %e %B %Y г. %X',
        date: '%d.%m.%Y',
        time: '%H:%M:%S',
        periods: ['AM', 'PM'],
        days: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
        shortDays: ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'],
        months: [
          'Enero',
          'Febrero',
          'Marzo',
          'Abril',
          'Mayo',
          'Junio',
          'Julio',
          'Agosto',
          'Septiembre',
          'Octubre',
          'Noviembre',
          'Diciembre'
        ],
        shortMonths: [
          'Ene',
          'Feb',
          'Mar',
          'Abr',
          'May',
          'Jun',
          'Jul',
          'Ago',
          'Sep',
          'Oct',
          'Nov',
          'Dic'
        ]
      })
    };
  },
  beforeUnmount() {
    this.removeChart()
  },
  mounted() {
    this.vizInitValidator()
  },
  computed: {
    chartTitle() {
      return (chartValue, defaultValue) => this.chartConfig[chartValue] !== ''
        ? this.chartConfig[chartValue]
        : defaultValue;
    },
    legendDisplay() {
      const vm = this;
      let legendDisplay;
      if (
        vm.chartConfig.groupBy &&
        vm.chartConfig.groupBy.slug &&
        vm.chartConfig.groupBy.slug !== vm.chartConfig.xAxis.slug
      ) {
        legendDisplay = vm.chartConfig.groupBy;
      } else if (
        vm.chartConfig.yAxis &&
        vm.chartConfig.yAxis.slug &&
        vm.chartConfig.yAxis.type === 'ordinal'
      ) {
        legendDisplay = vm.chartConfig.yAxis;
      } else {
        legendDisplay = vm.chartConfig.xAxis;
      }
      // Cambiaba el nombre de la tarjeta al hacer on load
      // if (vm.chartConfig.chart === 'heatmap') {
      //   legendDisplay.title = vm.chartConfig.collapseBy.title;
      // }
      return legendDisplay;
    },
    ordinalAxis() {
      const vm = this;
      if (
        vm.chartConfig.yAxis &&
        vm.chartConfig.yAxis.slug &&
        vm.chartConfig.yAxis.type === 'ordinal' &&
        vm.chartConfig.yAxis.slug !== vm.chartConfig.groupBy.slug
      ) {
        return vm.chartConfig.yAxis;
      } else {
        return vm.chartConfig.xAxis;
      }
    },
    linearAxis() {

      const vm = this;
      if (
        vm.chartConfig.xAxis &&
        vm.chartConfig.xAxis.slug &&
        vm.chartConfig.xAxis.type === 'linear'
      ) {
        return vm.chartConfig.xAxis;
      } else if (
        vm.chartConfig.yAxis &&
        vm.chartConfig.yAxis.slug &&
        vm.chartConfig.yAxis.type === 'linear'
      ) {
        return vm.chartConfig.yAxis;
      } else {
        return vm.chartConfig.collapseBy;
      }
    }
  },
  watch: {
    chartConfig() {
      if (
        !includes(
          ['bars', 'heatmap', 'spineplot', 'scatter', 'timeline', 'map'],
          this.chartConfig.chart
        )
      ) {
        throw new Error(
          'Gráficas aceptadas: `bars`, `heatmap`, `spineplot`, `scatter`, `timeline`, `map`'
        );
      }
      this.vizInitValidator()
    }
  },
  methods: {
    vizInitValidator() {
      // Maps need leaflet, which is loaded on demand: draw once it arrives.
      if (this.chartConfig && this.chartConfig.chart === 'map' && !isLeafletReady()) {
        loadLeaflet()
          .then(() => this.vizInitValidator())
          .catch((error) => {
            console.error('[vpress] leaflet failed to load', error);
            this.$emit('chart_error', error);
          });
        return;
      }
      if (
        this.data &&
        this.data.length > 0 &&
        this.chartConfig.xAxis.slug !== '' &&
        this.chartConfig.yAxis.slug !== ''
      ) {
        this.configChart();
      } else {
        this.removeChart()
      }
    },
    /**
     * Draw an interactive chart using dboxjs
     */
    configChart() {
      // márgenes textos títulos integración
      const vm = this;
      const editorMargin = { top: 10, right: 69, bottom: 48, left: 69 }
      const iframeMargin = { top: 11, right: 10, bottom: 80, left: 200 }
      vm.margin = vm.iframe
        ? iframeMargin
        : editorMargin
      // const tabletWidth = this.iframe ? 200 : 800; // Size in pixels
      /**
       * Draw dbox charts according with selected options
       * (axes, groupby, collapseby, project) and selected chart
       */
      /** Configure chart size */
      this.width =  select(this.$el)
            .node().offsetWidth ;
      this.height = select(this.$el)
          .node().offsetHeight * 0.85
      this.height = this.height > 0
        ? this.height
        : 500
      const marginRatio = (value, limit) => {
        let margin = value
        for (let i = 0; i < limit; i++) {
          margin = margin / 1.61803398875
        }
        return margin
      }

      vm.margin = {
          top: 10,
          right: marginRatio(this.width, 4),
          bottom: marginRatio(this.height, 4),
          left:marginRatio(this.width, 5)
      }


      // if (this.$vuetify.breakpoint.xs) {

      // } else if (this.$vuetify.breakpoint.xs) {

      // } if (this.$vuetify.breakpoint.xs) {

      // } else if (this.$vuetify.breakpoint.xs) {

      // } if (this.$vuetify.breakpoint.xs) {

      // } else if (this.$vuetify.breakpoint.xs) {

      // }


      // console.log(this.windowWidth, 'windowWidth')
      // console.log(
      //   d3
      //     .select(this.$el)
      //     .node().offsetHeight,
      //    'offset height'
      // )
      /** Configure margins */
      // if (this.chartConfig.chart === 'bars' || this.chartConfig.chart === 'timeline') {
      //   this.margin.top = 30;
      //   if (this.windowWidth <= tabletWidth) {
      //     this.margin.left = 40;
      //     this.margin.right = 15;
      //   }
      // } else if (this.chartConfig.chart === 'scatter') {
      //   this.margin.top = 30;
      //   if (this.windowWidth <= tabletWidth) {
      //     this.margin.left = 80;
      //     this.margin.right = 15;
      //   }
      // } else if (this.chartConfig.chart === 'heatmap' && this.windowWidth <= tabletWidth) {
      //   this.margin.top = 20;
      //   this.margin.right = 100;
      // } else if (this.chartConfig.chart === 'spineplot' && this.windowWidth <= tabletWidth) {
      //   this.margin.left = 15;
      //   this.margin.right = 15;
      // }
      this.removeChart()

      this.sortedData = cloneDeep(this.data).sort((a, b) => {
        if (vm.chartConfig.orderBy && vm.chartConfig.orderBy.order === 'asc') {
          if (a[vm.chartConfig.orderBy.slug] < b[vm.chartConfig.orderBy.slug]) {
            return -1;
          } else {
            return 1;
          }
        } else {
          if (a[vm.chartConfig.orderBy.slug] < b[vm.chartConfig.orderBy.slug]) {
            return 1;
          } else {
            return -1;
          }
        }
      });

      this.xAxisValues = uniq(
        this.sortedData.map(
          function(d) {
            return d[this.chartConfig.xAxis.slug];
          }.bind(this)
        )
      ).sort();

      this.yAxisValues = uniq(
        this.sortedData.map(
          function(d) {
            return d[this.chartConfig.yAxis.slug];
          }.bind(this)
        )
      ).sort();

      this.groupByOptions =
        this.chartConfig.groupBy.slug !== ''
          ? uniq(
              this.sortedData.map(
                function(d) {
                  return d[this.chartConfig.groupBy.slug];
                }.bind(this)
              )
            )
          : [];

      this.legendOptions = (this.groupByOptions.length > 0
        ? this.groupByOptions
        : this.chartConfig.yAxis.type === 'ordinal'
        ? this.yAxisValues
        : this.xAxisValues
      ).map(obj => {
        return {
          id: obj,
          name: obj,
          active: true
        };
      });
      //eslint-disable-next-line
      const maxFirstWord = max(this.xAxisValues, o => (o ? o.length * 8 : 0));
      const bandWidth = ((this.width - 250) / this.xAxisValues.length) * 0.8;

      if (
        bandWidth < maxFirstWord ||
        (this.chartConfig.chart === 'spineplot' &&
          +min(
            this.data,
            function(d) {
              return d[this.chartConfig.collapseBy.slug];
            }.bind(this)
          ) < 10)
      ) {
        // Too many labels, gonna be vertical
      }
        // this.margin.bottom = 150;
      this.drawChart();
    },
    /**
     * Validate if min value should be zero or less than zero
     * (for linear axis scale)
     */
    currentMinZero(axis) {
      const minimum = Number(min(this.data, o => o[axis.slug]));
      if (minimum < 0) {
        return false;
      } else {
        return (
          (this.chartConfig.chart === 'scatter' && axis.type === 'linear') ||
          (this.chartConfig.chart === 'bars' && axis.type === 'linear') ||
          (this.chartConfig.chart === 'timeline' && axis.type === 'linear')
        );
      }
    },
    drawChart() {
      const vm = this;
      const tabletWidth = this.iframe ? 200 : 800;
      this.filteredData = this.filterData(this.sortedData);
      this.dataToDraw = this.parseApiData(this.filteredData)
      /* this.groupByOptions =
        this.chartConfig.groupBy.slug !== ''
          ? uniq(
              this.filteredData.map(
                function(d) {
                  return d[this.chartConfig.groupBy.slug];
                }.bind(this)
              )
            )
          : []; */
      const config = {
        regression:
          this.chartConfig.xAxis.type === 'linear' &&
          this.chartConfig.yAxis.type === 'linear' &&
          this.chartConfig.chart === 'scatter',
        formatPreffix: this.chartConfig.preffix || '',
        formatSuffix: this.chartConfig.suffix || '',
        decimals: this.chartConfig.decimals,
        legendEnabled: this.windowWidth >= tabletWidth || this.iframe ? true : false,
        //legendEnabled: false,
        size: {
          width: this.width,
          height: this.height,
          margin: this.margin,
          // legendTranslate: this.width >= 800 ? 40 : 40// Only for heatmap legend
          legendTranslate: this.width >= 800 ? 60 : 40// Only for heatmap legend
        },
        xAxis: {
          enabled:
            this.chartConfig.chart !== 'heatmap' && this.chartConfig.chart !== 'spineplot'
              ? true
              : false,
          scale:
            this.chartConfig.chart === 'timeline'
              ? 'time'
              : this.chartConfig.xAxis.type === 'linear'
              ? 'linear'
              : 'band',
          minZero: this.currentMinZero(this.chartConfig.xAxis),
          formatPreffix: this.chartConfig.preffix || '',
          formatSuffix: this.chartConfig.suffix || '',
          text: this.chartConfig.xAxis.title,
          showLabel: this.chartConfig.xAxis.showLabel,
          // ticks: {
          //     enabled: false,
          //     strokeWidth: 5,
          //     grid: 'straightLine',
          //     ticks:
          //       this.chartConfig.chart === 'timeline' &&
          //       this.selectedQuestion &&
          //       this.selectedQuestion['minorFrequency'] !== 'anual'
          //         ? d3.extent(this.xAxisValues.map(o => +o))[1] > 100000
          //           ? 5
          //           : 8
          //         : 5,
          //     format:
          //       this.chartConfig.chart === 'timeline' && this.chartConfig.yAxis.type === 'date'
          //         ? this.formatDatesForTimeline()
          //         : undefined
          //   }
        },
        yAxis: {
          enabled:
            this.chartConfig.chart !== 'heatmap' && this.chartConfig.chart !== 'spineplot'
              ? true
              : false,
          scale: this.chartConfig.yAxis.type === 'linear' ? 'linear' : 'band',
          minZero: this.currentMinZero(this.chartConfig.yAxis),
          labels: {
            fontSize: 5
          },
          formatPreffix: this.chartConfig.preffix || '',
          formatSuffix: this.chartConfig.suffix || '',
          text: this.chartConfig.yAxis.title,
          showLabel: this.chartConfig.yAxis.showLabel,
            // ticks: {
            //   gridDashed: false,
            //   enabled: false,
            //   grid: 'straightLine'
            // }
        },
        tooltip: {
          classed: `tip-${vm.uid}`
        },
        events: {
          onClickLegend: function(d, i) {
            if (d.name === 'Todos' && d.active === true) {
              vm.legendOptions.forEach((o, index) => {
                if (index !== 1) {
                  o.active = false;
                } else {
                  o.active = true;
                }
              });

              vm.legendChanged(vm.legendOptions);
            } else if (d.name === 'Todos' && d.active === false) {
              vm.legendOptions.forEach(o => {
                o.active = true;
              });

              vm.legendChanged(vm.legendOptions);
            } else if (vm.legendOptions.filter(o => o.active).length > 1 || !d.active) {
              vm.legendOptions[i].active = !vm.legendOptions[i].active;
              vm.legendChanged(vm.legendOptions);
            }
          },
          load: function(chart) {
            /** Remove labels that are not a number */
            if (vm.chartConfig.chart === 'timeline') {
              chart._svg.selectAll('.x.axis .tick text').each(() => {
                if (isNaN(parseInt(select(this).text(), 10))) {
                  select(this).remove();
                }
              });
            }
            /** Rotate labels for "Año" in bars */
            if (chart._config.x === 'Año' && vm.chartConfig.chart === 'bars') {
              chart._svg
                .selectAll('.x.axis .tick text')
                .attr('transform', 'translate(-14, 18)rotate(-90)');
            }
            /** Hide labels if are not set as visible */
            if (!vm.chartConfig.labels) {
              chart._svg.selectAll('.dbox-label').style('display', 'none');
            }

            if(vm.chartConfig.chart === 'heatmap') {
              selectAll('.dbox-label').style('fill', 'white')
            }
            /** Rotate x axis ticks texts */
            chart._svg.selectAll('.x.axis .tick text').each(function() {
              if (
                select(this).attr('transform') &&
                select(this)
                  .attr('transform')
                  .search('rotate') !== -1
              ) {
                select(this).style('font-size', '11');
              }
            });
            vm.$emit('chart_loaded', vm.$el);
          }
        }
      };
      this.chart = chart(config)
        .bindTo(`#${this.id}`)
        .data({
          raw: this.dataToDraw // Modified data by chartConfig.chart (parse dates or fill NAs)
        });

      // If timeline and no groupby, reset legend options
      if (this.chartConfig.chart === 'timeline' && this.groupByOptions.length === 0) {
        vm.legendOptions = [{ name: 'Total', active: true }];
      }

      if (this.chartConfig.chart !== 'heatmap') {
        this.chart.legend(vm.legendOptions);
        this.chart.legendTitle(vm.legendDisplay.title);
        this.chart.legendType('checkbox');
      }

      switch (this.chartConfig.chart) {
        case 'bars':
          this.drawBars();
          break;
        case 'heatmap':
          this.drawHeatmap();
          break;
        case 'spineplot':
          this.drawSpineplot();
          break;
        case 'scatter':
          this.drawScatter();
          break;
        case 'timeline':
          this.drawTimeline();
          break;
        case 'map':
          this.drawMap();
          break;
        case 'treemap':
          this.drawTreemap();
          break;
        default:
          this.drawBars();
          break;
      }

      this.chart
        .addStyle(
          {
          yAxis: {
            enabled: true,
            axis: {
              strokeWidth: 3,
              strokeColor: '#5F6C6C',
              strokeOpacity: 0,
              paddingTick: 0,
            },
            ticks: {
              strokeWidth: 1,
              strokeColor: '#929D9E',
              grid: 'straight',
              opacity: 0.6,
              rotate: 30
            },
            labels: {
              fontSize: 12,
              fontWeight: 600,
              textColor: '#666',
              textAnchor: 'end',
            },
            title: {
              fontSize: 17,
              fontWeight: 600,
              textColor: '#666',
              textAnchor: 'middle',
              // rotation
              // text align or position
            },
          },
          xAxis: {
            enabled: true,
            axis: {
              strokeWidth: 3,
              strokeColor: '#5F6C6C',
              strokeOpacity: 1, //???
              paddingTick: 5,
            },
            ticks: {
              strokeWidth: 1,
              strokeColor: '#5F6C6C',
              // ticksize
            },
            labels: {
              fontSize: 15,
              fontWeight: 400,
              textColor: '#666',
              textAnchor: 'middle',
            },
            title: {
              fontSize: 10,
              fontWeight: 600,
              textColor: '#666',
              textAnchor: 'middle',
              // text align
            },
          },
          legend:{
              text: {
              textColor: '#000',
              fontSize: '12px',
              fontWeight: 600,
            },
          },
          chart: {
            backgroundColor: ''
          }
        },
        )
        .draw()

      // Update position for axes only for timeline
      if (this.chartConfig.chart === 'timeline') {
        // Timeline
        selectAll('.x.axis .tick text').attr('dy', 20);
        selectAll('.y.axis .tick text').attr('dx', -10);

        // Remove monthly ticks if variable is year-defined
        if (this.selectedQuestion && this.selectedQuestion['minorFrequency'] === 'anual') {
          selectAll('.x.axis .tick text').each(() => {
            if (Number.isNaN(+this['innerHTML'])) {
              select(this['parentNode']).remove();
              return;
            }
          });
        }
      }
    },
    /**
     * Configure a barchart using dboxjs
     */
    drawBars() {
      const b = this.chart.layer(bars);

      if (this.groupByOptions.length && this.chartConfig.groupBy.slug !== "") {
        if (this.chartConfig.stackedBars) {
          b.stackBy(this.groupByOptions);
        } else {
          b.groupBy(this.groupByOptions);
        }
        if (this.chartConfig.yAxis.type === 'linear') {
          b.x(this.chartConfig.xAxis.slug).fill(this.chartConfig.xAxis.slug);
        } else {
          b.y(this.chartConfig.yAxis.slug).fill(this.chartConfig.yAxis.slug);
        }
      } else {
        if (this.chartConfig.yAxis.type === 'linear') {
          b.fill(this.chartConfig.xAxis.slug);
        } else {
          b.fill(this.chartConfig.yAxis.slug);
        }
        b.x(this.chartConfig.xAxis.slug).y(this.chartConfig.yAxis.slug);
      }
      b.sortBy().colors(this.chartConfig.colors.slice(0, this.legendOptions.length).reverse());
    },
    drawHeatmap() {
      const hm = this.chart.layer(heatmap);
      hm
        .x(this.chartConfig.xAxis.slug)
        .y(this.chartConfig.yAxis.slug)
        .fill(this.chartConfig.collapseBy.slug)
        .colorLegend(this.legendDisplay.title)
        .borderRadius(2)
        .sortBy({ x: 'asc', y: 'desc' })
        .colors(this.chartConfig.colors.slice(0, 5));
    },
    drawSpineplot() {
      const sp = this.chart.layer(spineplot);
      if (this.groupByOptions.length > 0) {
        sp
          .stackBy(this.groupByOptions)
          .fill('key')
          .value(this.chartConfig.collapseBy.slug);
      } else {
        if (this.chartConfig.xAxis.type === 'linear') {
          sp.fill(this.chartConfig.yAxis.slug).value(this.chartConfig.xAxis.slug);
        } else if (this.chartConfig.xAxis.type !== 'linear') {
          sp.fill(this.chartConfig.xAxis.slug).value(this.chartConfig.yAxis.slug);
        }
      }
      sp
        .category(this.ordinalAxis.slug)
        .colors(this.chartConfig.colors.slice(0, this.legendOptions.length).reverse());
    },
    drawTreemap() {
      const vm = this
      const tm = this.chart.layer(treemap);
      tm
        .nestBy(vm.chartConfig.xAxis.slug)
        .colors(this.chartConfig.colors.slice(0, this.legendOptions.length).reverse())

    },
    drawScatter() {
      const vm = this;
      const collapseBy = this.chartConfig.collapseBy.slug;
      const sctr = this.chart.layer(scatter);

      sctr
        .x(this.chartConfig.xAxis.slug)
        .y(this.chartConfig.yAxis.slug)
        .figure()
        .colors(this.chartConfig.colors.slice(0, this.legendOptions.length).reverse());

      if (
        !vm.linearAxis &&
        ![this.chartConfig.yAxis, this.chartConfig.xAxis].map(o => o.slug).includes(collapseBy)
      ) {
        sctr.magnitude(collapseBy).magnitudeRange([10, 40]);
      }
      if (this.groupByOptions[0] && this.chartConfig.groupBy.slug) {
        sctr.fill(this.chartConfig.groupBy.slug);
      } else if (this.chartConfig.yAxis.type === 'ordinal') {
        sctr.fill(this.chartConfig.yAxis.slug);
      } else {
        sctr.fill(this.chartConfig.xAxis.slug);
      }
    },
    drawTimeline() {
      const vm = this
      const tl = vm.chart
        .layer(timeline)
        .curve(curveLinear)
        .parseDate(vm.dateFormat)
        .tip(function(d) {
          let html = '';
          html += d.name + '<br>';
          let format = vm.dateFormat;
          html += vm.locale.format(format)(d.x) + '<br>';
          if (d.y !== undefined) {
            if (typeof tl.utils.format(d.y) === 'string') {
              /** @deprecated uses dbox version 0.0.8 */
              html +=
                '<span>' + (Number.isNaN(+d.y) ? d.y : tl.utils.format(d.y)) + '</span></br>';
            } else {
              /** cool, uses dbox version 0.0.9 */
              html +=
                '<span>' +
                (Number.isNaN(+d.y) ? d.y : tl.utils.format()(d.y)) +
                '</span></br>';
            }
          }
          return html;
        });

      if (this.groupByOptions.length > 0) {
        tl.series(this.groupByOptions);
      } else {
        // SET LINEAR AXIS
        tl.series([this.chartConfig.yAxis.slug]);
      }
      tl
        .x(this.chartConfig.xAxis.slug)
        .colors(this.chartConfig.colors.slice(0, this.legendOptions.length).reverse());
    },
    drawMap() {
      const vm = this;
      const mobileWidth = 600; // Size in pixels
      // const tabletWidth = 800; // Size in pixels
      /**
       * Set options to build a leaflet map
       */
      // const width = window['$'](`#${this.id}`).width();
      // const height = window['$'](`#${this.id}`).height();

      select(`#${this.id}`).text('');
      select(`#${this.id}`)
        .selectAll('*')
        .remove();
      select(`#${this.id}`)
        .append('div')
        .attr('id', 'leaflet-wrapper')
        .style('width', this.innerWidth >= mobileWidth ? this.width - 200 + 'px' : this.width + 'px')
        .style('height', this.height + 'px');

      const lconfig = {
        formatPreffix: this.chartConfig.preffix || '',
        formatSuffix: this.chartConfig.suffix || '',
        decimals: this.chartConfig.decimals,
        size: {
          width: this.width,
          height: this.height,
          margin: this.margin
        },
        bindTo: 'leaflet-wrapper',
        xAxis: {
          enabled: false
        },
        yAxis: {
          enabled: false
        },
        map: {
          /** @todo Replace topojson info (configure) */
          topojson: {
            url: '/topojsons/mx_edos.json',
            center: [ 19.6930200, -89.0503700 ],
            objects: ['states'],
            translate: undefined,
            zoom: 7,
            maxZoom: 10,
            minZoom: 5,
            parser: function(d) {
              return d.properties.state_code;
            },
            id: function(d) {
              return 'estado-' + d.id;
            }
          },
          formatLegend: function(number) {
            if (number >= 100000) {
              return format('s')(number);
            } else {
              if (typeof vm.chart.helper.utils.format(number) === 'string') {
                /** @deprecated uses dbox version 0.0.8, only to keep compatibility if dbox version wasn't changed yet*/
                return vm.chart.helper.utils.format(number);
              } else {
                /** cool, uses dbox version 0.0.9 */
                return vm.chart.helper.utils.format()(number);
              }
            }
          }
        },
        events: {
          load: function() {
            if (!vm.visibleLabels) {
              selectAll('.dbox-label').style('display', 'none');
              selectAll('.dbox-label-coefficient').style('display', 'none');
            }
             vm.$emit('chart_loaded', vm.$el);
          }
        },
        responsive: {
          enabled: false
        }
      };

      const data = this.dataToDraw;
      this.chart = chart(lconfig).data({ raw: data });
      this.chart
        .layer(leaflet)
        .id(this.chartConfig.xAxis.slug)
        .fill(this.chartConfig.yAxis.slug)
        .opacity(0.9)
        .colors(this.chartConfig.colors.slice(0, 5))
        .colorLegend(this.legendDisplay.title);

      if (this.innerWidth >= mobileWidth) {
        // Responsive mobile
        const legend = select(`#${this.id}`)
          .style('display', 'flex')
          .style('flex-direction', 'row')
          .style('flex-wrap', 'nowrap')
          .append('div')
          .style('padding-left', '30px')
          .style('top', 8 + 'px')
          .style('right', 10 + 'px')
          .style('height', this.height + 'px')
          .style('text-align', 'left');

        const items = legend
          .selectAll('.legend-items')
          .data(this.legendOptions)
          .enter()
          .append('div');

        items
          .append('input')
          .attr('type', 'checkbox')
          .attr('checked', d => (d.active ? true : null))
          .attr('value', d => d.id);
        items
          .append('label')
          .style('color', '#333')
          .style('font-size', '12px')
          .on('click', function(d) {
            // d.active = !d.active;
            if (vm.legendOptions.filter(o => o.active).length > 1 || !d.active) {
              vm.legendOptions[vm.legendOptions.indexOf(d)].active = !vm.legendOptions[
                vm.legendOptions.indexOf(d)
              ].active;
              const parentNode = this['parentNode'];
              const checked = vm.legendOptions[vm.legendOptions.indexOf(d)].active ? true : null;
              select(parentNode)
                .select('input')
                .attr('checked', checked);
              vm.legendChanged(vm.legendOptions);
            }
          })
          .text(d => d.id);
      }
    },
    legendChanged(legendOptions) {
      this.legendOptions = legendOptions;
      this.drawChart();
    },
    filterData(data) {
      const vm = this;
      return data.filter(d => {
        return vm.legendOptions
          .filter(o => o.active)
          .map(o => o.name)
          .includes(d[vm.legendDisplay.slug]);
      });
    },
    parseApiData(data) {
      const vm = this;
      if (!includes([ 'scatter','heatmap', 'map'], vm.chartConfig.chart)) {
        const parsedData = nest()
          .key(d => d[vm.ordinalAxis.slug])
          .rollup(leaves => {
            let obj = {};
            obj[vm.ordinalAxis.slug] = leaves[0][vm.ordinalAxis.slug];
            obj[vm.chartConfig.collapseBy.slug] = +leaves[0][vm.chartConfig.collapseBy.slug];
            if (vm.chartConfig.collapseBy.slug === 'total_count') {
              vm.chartConfig.collapseBy = { title: vm.chartConfig.collapseBy.title , type: 'linear', slug: 'total_count' };
            }
            if (vm.chartConfig.groupBy.slug !== '') {
              leaves.forEach(leaf => {
                const prop = leaf[vm.chartConfig.groupBy.slug];
                const value = leaf[vm.chartConfig.collapseBy.slug];
                obj[prop] = +value;
              });
            }
            return obj;
          })
          .entries(data)
          .map(obj => obj.value)
          .sort((a, b) => {
            if (vm.chartConfig.orderBy !== '' && vm.chartConfig.orderBy.order === 'asc') {
              if (a[vm.chartConfig.orderBy.slug] < b[vm.chartConfig.orderBy.slug]) {
                return -1;
              } else {
                return 1;
              }
            } else {
              //desc
              if (a[vm.chartConfig.orderBy.slug] < b[vm.chartConfig.orderBy.slug]) {
                return 1;
              } else {
                return -1;
              }
            }
          });
        return parsedData;
      } else {
        return data;
      }
    },
    parseData(data) {
      const vm = this;
      if (!includes(['scatter'], vm.chartConfig.chart)) {
        let collapsedData = nest()
          .key(d => `${d[vm.ordinalAxis.slug]}_${d[vm.chartConfig.groupBy.slug]}`)
          .rollup(leaves => {
            let obj = {};
            /**
             * parse data like:
             * { x: 'yes', y: 'men', total: 3 }
             * { x: 'yes', y: 'women', total: 7 }
             */
            obj[vm.ordinalAxis.slug] = leaves[0][vm.ordinalAxis.slug];
            obj[vm.chartConfig.groupBy.slug] = leaves[0][vm.chartConfig.groupBy.slug];
            if (vm.chartConfig.collapseBy.slug === 'total_count') {
              obj['total_count'] = leaves.length;
              vm.chartConfig.collapseBy = { title: vm.chartConfig.collapseBy.title, type: 'linear', slug: 'total_count' };
            } else {
              switch (vm.chartConfig.collapseBy.func) {
                case 'min':
                  obj[vm.chartConfig.collapseBy.slug] = min(
                    leaves,
                    d => d[vm.chartConfig.collapseBy.slug]
                  );
                  break;
                case 'max':
                  obj[vm.chartConfig.collapseBy.slug] = max(
                    leaves,
                    d => d[vm.chartConfig.collapseBy.slug]
                  );
                  break;
                case 'mean':
                  obj[vm.chartConfig.collapseBy.slug] = mean(
                    leaves,
                    d => d[vm.chartConfig.collapseBy.slug]
                  );
                  break;
                default:
                  obj[vm.chartConfig.collapseBy.slug] = sum(
                    leaves,
                    d => d[vm.chartConfig.collapseBy.slug]
                  );
                  break;
              }
            }
            return obj;
          })
          .entries(data)
          .map(obj => obj.value)
          .sort((a, b) => {
            if (vm.chartConfig.orderBy !== '' && vm.chartConfig.orderBy.order === 'asc') {
              if (a[vm.chartConfig.orderBy.slug] < b[vm.chartConfig.orderBy.slug]) {
                return -1;
              } else {
                return 1;
              }
            } else {
              //desc
              if (a[vm.chartConfig.orderBy.slug] < b[vm.chartConfig.orderBy.slug]) {
                return 1;
              } else {
                return -1;
              }
            }
          });
        if (vm.chartConfig.chart !== 'heatmap' && vm.chartConfig.groupBy.slug !== '') {
          collapsedData = nest()
            .key(d => d[vm.ordinalAxis.slug])
            .rollup(leaves => {
              let obj = {};
              /**
               * parse data like:
               * { x: 'yes', y: 'men', total: 3 }
               * { x: 'yes', y: 'women', total: 7 }
               */
              obj[vm.ordinalAxis.slug] = leaves[0][vm.ordinalAxis.slug];
              switch (vm.chartConfig.collapseBy.func) {
                case 'min':
                  obj[vm.chartConfig.collapseBy.slug] = min(
                    leaves,
                    d => d[vm.chartConfig.collapseBy.slug]
                  );
                  break;
                case 'max':
                  obj[vm.chartConfig.collapseBy.slug] = max(
                    leaves,
                    d => d[vm.chartConfig.collapseBy.slug]
                  );
                  break;
                case 'mean':
                  obj[vm.chartConfig.collapseBy.slug] = mean(
                    leaves,
                    d => d[vm.chartConfig.collapseBy.slug]
                  );
                  break;
                default:
                  obj[vm.chartConfig.collapseBy.slug] = sum(
                    leaves,
                    d => d[vm.chartConfig.collapseBy.slug]
                  );
                  break;
              }
              if (vm.chartConfig.chart !== 'heatmap') {
                /**
                 * parse data like:
                 * { x: 'yes', men: 3, women: 7 }
                 */
                leaves.forEach(leaf => {
                  // Group by properties
                  const prop = leaf[vm.chartConfig.groupBy.slug];
                  const value = leaf[vm.chartConfig.collapseBy.slug];
                  obj[prop] = value;
                });
              }
              return obj;
            })
            .values(collapsedData);
        }
        return collapsedData;
      } else {
        return data;
      }
    },
    removeChart() {
      select(this.$el)
        .select(`#${this.id}`)
        .selectAll('*')
        .remove();
      selectAll(`.d3-tip.tip-${this.uid}`).remove();
      selectAll('.title-tip').remove();
      if(this.chart && this.chart.destroy){
        this.chart.destroy()
      }
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.progress--layer {
  height: 420px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center
}

.chart-container.light-themed {
  color: #666;
}
.chart-container.dark-themed *:not(input) {
  color: #fff;
}
.chart-container.dark-themed {
  background: #222;
}

.edit-title,
.edit-subtitle {
  width: 100%;
}

.generated-title,
.edit-title {
  display: flex;
  justify-content: flex-start;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  font-size: 1.5em;
  font-weight: 500;
  text-align: left;
  padding-left: 2%
}
.generated-subtitle,
.edit-subtitle {
  display: flex;
  justify-content: flex-start;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  font-size: 1em;
  font-weight: 500;
  text-align: left;
  padding-left: 2%
}


.vertical-align {
  display: -webkit-box;
  display: -ms-flexbox;
  display: grid;
  -ms-flex-align: center;
  align-items: center;
}

.center-align {
  text-align: center;
}

.chart-container {
  position: absolute;
  top:0;
  left:0;
  width: 100%;
  height: 100%;
  margin: 0 auto;
}
</style>
<style>
/* Loading spinner (plain CSS: shared by the admin editor and the public embed). */
.vpress-spinner {
  width: 56px;
  height: 56px;
  border: 6px solid rgba(127, 127, 127, 0.25);
  /* Vuetify primary in the editor; its default blue in the public embed. */
  border-top-color: rgb(var(--v-theme-primary, 25, 118, 210));
  border-radius: 50%;
  animation: vpress-spin 0.9s linear infinite;
}
@keyframes vpress-spin {
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .vpress-spinner { animation-duration: 2.4s; }
}

.empty-chart {
  width: 100%;
  height: calc(100% - 54px );
}

.empty-chart > svg {
  width: 100%;
  min-height: 100%;
}

.d3-tip {
  line-height: 1.2;
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  font-weight: bold;
  padding: 12px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  border-radius: 2px;
}
/* Creates a small triangle extender for the tooltip */
.d3-tip:after {
  box-sizing: border-box;
  display: inline;
  font-size: 10px;
  width: 100%;
  line-height: 0;
  color: rgba(0, 0, 0, 0.8);
  content: "\25BC";
  position: absolute;
  text-align: center;
  top: -5px;
  bottom: 5px;
}
/* Style northward tooltips differently */
.d3-tip.n:after {
  margin: 3px 0 0 0;
  top: 100%;
  left: 0;
}

.chart-container.dark-themed svg text {
  fill: #eee;
}

.square {
  height: 50px;
  width: 50px;
  margin: 0.2em;
  background-color: #57779c;
}



.leaflet-container {
  z-index: 0;
}
.title-container {
  height:10%
}

</style>
