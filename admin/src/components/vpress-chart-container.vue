<template lang="pug">
  .chart-container.center-align(:class="`${chartConfig ? chartConfig.theme : 'light'}-themed`")
    .layout-row.left-align.label-font.bold.layout-align-start-end(style="height:10%")
      .col-12.py-0
        h2.generated-title.mb-0 {{ chartTitle('title', 'Título') }}
      .col-12.py-0
        h3.generated-subtitle.mb-0 {{ chartTitle('subtitle', 'Subtítulo') }}
    .empty-chart( :id="this.id")
      .vertical-align
        p.tiny.label-font(v-if="!iframe") Arrastra algún valor a filas, columnas o color
        div(
          v-show="iframe"
          class="progress--layer"
        )
          v-progress-circular(
            :size="70"
            :width="7"
            color="primary"
            indeterminate
          )
</template>  
<script>
import * as d3 from 'd3';
import * as _ from 'lodash';
import 'topojson';
import * as dbox from '@dboxjs/core';

export default {
  name: 'VpressChartContainer',
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
        slug: String
      },
      yAxis: {
        title: String,
        type: String,
        slug: String
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
      windowWidth: window.innerWidth,
      locale: d3.timeFormatLocale({
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
  beforeDestroy() {
    console.log('ayuda')
    if(this.chart && this.chart.destroy){
      this.chart.destroy()
    }
    this.removeChart()
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
      console.log('hola');
      if (
        !_.includes(
          ['bars', 'heatmap', 'spineplot', 'scatter', 'timeline', 'map'],
          this.chartConfig.chart
        )
      ) {
        throw new Error(
          'Gráficas aceptadas: `bars`, `heatmap`, `spineplot`, `scatter`, `timeline`, `map`'
        );
      }
      if (
        this.data &&
        this.data.length > 0 &&
        this.chartConfig.xAxis.slug !== '' &&
        this.chartConfig.yAxis.slug !== ''
      ) {
        this.configChart();
      }
    }
  },
  methods: {
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
      this.width =  d3
            .select(this.$el)
            .node().offsetWidth ;
      this.height = d3
          .select(this.$el)
          .node().offsetHeight * 0.85

      const marginRatio = (value, limit) => {
        let margin = value
        for (let i = 0; i < limit; i++) {
          margin = margin / 1.61803398875
        }
        return margin
      }

      vm.margin = {
          top: 10,
          right: marginRatio(this.width, 5),
          bottom: marginRatio(this.height, 5),
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

      this.sortedData = _.cloneDeep(this.data).sort((a, b) => {
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

      this.xAxisValues = _.uniq(
        this.sortedData.map(
          function(d) {
            return d[this.chartConfig.xAxis.slug];
          }.bind(this)
        )
      ).sort();

      this.yAxisValues = _.uniq(
        this.sortedData.map(
          function(d) {
            return d[this.chartConfig.yAxis.slug];
          }.bind(this)
        )
      ).sort();

      this.groupByOptions =
        this.chartConfig.groupBy.slug !== ''
          ? _.uniq(
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
      const maxFirstWord = d3.max(this.xAxisValues, o => (o ? o.length * 8 : 0));
      const bandWidth = ((this.width - 250) / this.xAxisValues.length) * 0.8;

      if (
        bandWidth < maxFirstWord ||
        (this.chartConfig.chart === 'spineplot' &&
          +d3.min(
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
      const min = Number(d3.min(this.data, o => o[axis.slug]));
      if (min < 0) {
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
      // const tabletWidth = this.iframe ? 200 : 800;
      this.filteredData = this.filterData(this.sortedData);
      this.dataToDraw = this.parseApiData(this.filteredData)
      this.groupByOptions =
        this.chartConfig.groupBy.slug !== ''
          ? _.uniq(
              this.filteredData.map(
                function(d) {
                  return d[this.chartConfig.groupBy.slug];
                }.bind(this)
              )
            )
          : [];

      const config = {
        regression:
          this.chartConfig.xAxis.type === 'linear' &&
          this.chartConfig.yAxis.type === 'linear' &&
          this.chartConfig.chart === 'scatter',
        formatPreffix: this.chartConfig.preffix || '',
        formatSuffix: this.chartConfig.suffix || '',
        decimals: this.chartConfig.decimals,
        // legendEnabled: this.windowWidth >= tabletWidth || this.iframe ? true : false,
        legendEnabled: false,
        size: {
          width: this.width,
          height: this.height,
          margin: this.margin,
          legendTranslate: this.width >= 800 ? 40 : 40// Only for heatmap legend
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
            // ticks: {
            //   gridDashed: false,
            //   enabled: false,
            //   grid: 'straightLine'
            // }
        },
        tooltip: {
          classed: `tip-${vm._uid}`
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
                if (isNaN(parseInt(d3.select(this).text(), 10))) {
                  d3.select(this).remove();
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
              d3.selectAll('.dbox-label').style('fill', 'white')
            }
            /** Rotate x axis ticks texts */
            chart._svg.selectAll('.x.axis .tick text').each(function() {
              if (
                d3.select(this).attr('transform') &&
                d3
                  .select(this)
                  .attr('transform')
                  .search('rotate') !== -1
              ) {
                d3.select(this).style('font-size', '11');
              }
            });
            vm.$emit('chart_loaded', vm.$el);
          }
        }
      };
      this.chart = dbox
        .chart(config)
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
              fontSize: 5,
              fontWeight: 600,
              textColor: '#666',
              textAnchor: 'middle',
              // text align
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
        d3.selectAll('.x.axis .tick text').attr('dy', 20);
        d3.selectAll('.y.axis .tick text').attr('dx', -10);

        // Remove monthly ticks if variable is year-defined
        if (this.selectedQuestion && this.selectedQuestion['minorFrequency'] === 'anual') {
          d3.selectAll('.x.axis .tick text').each(() => {
            if (Number.isNaN(+this['innerHTML'])) {
              d3.select(this['parentNode']).remove();
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
      const bars = this.chart.layer(dbox.bars);

      if (this.groupByOptions[0] && this.chartConfig.groupBy.slug !== "") {
        if (this.chartConfig.stackedBars) {
          bars.stackBy(this.groupByOptions);
        } else {
          bars.groupBy(this.groupByOptions);
        }
        if (this.chartConfig.yAxis.type === 'linear') {
          bars.x(this.chartConfig.xAxis.slug).fill(this.chartConfig.xAxis.slug);
        } else {
          bars.y(this.chartConfig.yAxis.slug).fill(this.chartConfig.yAxis.slug);
        }
      } else {
        if (this.chartConfig.yAxis.type === 'linear') {
          bars.fill(this.chartConfig.xAxis.slug);
        } else {
          bars.fill(this.chartConfig.yAxis.slug);
        }
        bars.x(this.chartConfig.xAxis.slug).y(this.chartConfig.yAxis.slug);
      }
      bars.sortBy().colors(this.chartConfig.colors.slice(0, this.legendOptions.length).reverse());
    },
    drawHeatmap() {
      const heatmap = this.chart.layer(dbox.heatmap);
      heatmap
        .x(this.chartConfig.xAxis.slug)
        .y(this.chartConfig.yAxis.slug)
        .fill(this.chartConfig.collapseBy.slug)
        .colorLegend(this.legendDisplay.title)
        .borderRadius(2)
        .sortBy({ x: 'asc', y: 'desc' })
        .colors(this.chartConfig.colors.slice(0, 5));
    },
    drawSpineplot() {
      const spineplot = this.chart.layer(dbox.spineplot);
      if (this.groupByOptions.length > 0) {
        spineplot
          .stackBy(this.groupByOptions)
          .fill('key')
          .value(this.chartConfig.collapseBy.slug);
      } else {
        if (this.chartConfig.xAxis.type === 'linear') {
          spineplot.fill(this.chartConfig.yAxis.slug).value(this.chartConfig.xAxis.slug);
        } else if (this.chartConfig.xAxis.type !== 'linear') {
          spineplot.fill(this.chartConfig.xAxis.slug).value(this.chartConfig.yAxis.slug);
        }
      }
      spineplot
        .category(this.ordinalAxis.slug)
        .colors(this.chartConfig.colors.slice(0, this.legendOptions.length).reverse());
    },
    drawTreemap() {
      const vm = this
      const treemap = this.chart.layer(dbox.treemap);
      treemap
        .nestBy(vm.chartConfig.xAxis.slug)
        .colors(this.chartConfig.colors.slice(0, this.legendOptions.length).reverse())

    },
    drawScatter() {
      const vm = this;
      const collapseBy = this.chartConfig.collapseBy.slug;
      const scatter = this.chart.layer(dbox.scatter);

      scatter
        .x(this.chartConfig.xAxis.slug)
        .y(this.chartConfig.yAxis.slug)
        .figure()
        .colors(this.chartConfig.colors.slice(0, this.legendOptions.length).reverse());

      if (
        !vm.linearAxis &&
        ![this.chartConfig.yAxis, this.chartConfig.xAxis].map(o => o.slug).includes(collapseBy)
      ) {
        scatter.magnitude(collapseBy).magnitudeRange([10, 40]);
      }
      if (this.groupByOptions[0] && this.chartConfig.groupBy.slug) {
        scatter.fill(this.chartConfig.groupBy.slug);
      } else if (this.chartConfig.yAxis.type === 'ordinal') {
        scatter.fill(this.chartConfig.yAxis.slug);
      } else {
        scatter.fill(this.chartConfig.xAxis.slug);
      }
    },
    drawTimeline() {
      const vm = this
      const timeline = vm.chart
        .layer(dbox.timeline)
        .curve(d3.curveLinear)
        .parseDate(vm.dateFormat)
        .tip(function(d) {
          let html = '';
          html += d.name + '<br>';
          let format = vm.dateFormat;
          html += vm.locale.format(format)(d.x) + '<br>';
          if (d.y !== undefined) {
            if (typeof timeline.utils.format(d.y) === 'string') {
              /** @deprecated uses dbox version 0.0.8 */
              html +=
                '<span>' + (Number.isNaN(+d.y) ? d.y : timeline.utils.format(d.y)) + '</span></br>';
            } else {
              /** cool, uses dbox version 0.0.9 */
              html +=
                '<span>' +
                (Number.isNaN(+d.y) ? d.y : timeline.utils.format()(d.y)) +
                '</span></br>';
            }
          }
          return html;
        });

      if (this.groupByOptions.length > 0) {
        timeline.series(this.groupByOptions);
      } else {
        // SET LINEAR AXIS
        timeline.series([this.chartConfig.yAxis.slug]);
      }
      timeline
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

      d3.select(`#${this.id}`).text('');
      d3.select(`#${this.id}`)
        .selectAll('*')
        .remove();
      d3.select(`#${this.id}`)
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
              return d3.format('s')(number);
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
              d3.selectAll('.dbox-label').style('display', 'none');
              d3.selectAll('.dbox-label-coefficient').style('display', 'none');
            }
             vm.$emit('chart_loaded', vm.$el);
          }
        },
        responsive: {
          enabled: false
        }
      };

      const data = this.dataToDraw;
      this.chart = dbox.chart(lconfig).data({ raw: data });
      this.chart
        .layer(dbox.leaflet)
        .id(this.chartConfig.xAxis.slug)
        .fill(this.chartConfig.yAxis.slug)
        .opacity(0.9)
        .colors(this.chartConfig.colors.slice(0, 5))
        .colorLegend(this.legendDisplay.title);

      if (this.innerWidth >= mobileWidth) {
        // Responsive mobile
        const legend = d3
          .select(`#${this.id}`)
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
              d3.select(parentNode)
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
      if (!_.includes([ 'scatter','heatmap', 'map'], vm.chartConfig.chart)) {
        const parsedData = d3
          .nest()
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
      if (!_.includes(['scatter'], vm.chartConfig.chart)) {
        let collapsedData = d3
          .nest()
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
                  obj[vm.chartConfig.collapseBy.slug] = d3.min(
                    leaves,
                    d => d[vm.chartConfig.collapseBy.slug]
                  );
                  break;
                case 'max':
                  obj[vm.chartConfig.collapseBy.slug] = d3.max(
                    leaves,
                    d => d[vm.chartConfig.collapseBy.slug]
                  );
                  break;
                case 'mean':
                  obj[vm.chartConfig.collapseBy.slug] = d3.mean(
                    leaves,
                    d => d[vm.chartConfig.collapseBy.slug]
                  );
                  break;
                default:
                  obj[vm.chartConfig.collapseBy.slug] = d3.sum(
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
          collapsedData = d3
            .nest()
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
                  obj[vm.chartConfig.collapseBy.slug] = d3.min(
                    leaves,
                    d => d[vm.chartConfig.collapseBy.slug]
                  );
                  break;
                case 'max':
                  obj[vm.chartConfig.collapseBy.slug] = d3.max(
                    leaves,
                    d => d[vm.chartConfig.collapseBy.slug]
                  );
                  break;
                case 'mean':
                  obj[vm.chartConfig.collapseBy.slug] = d3.mean(
                    leaves,
                    d => d[vm.chartConfig.collapseBy.slug]
                  );
                  break;
                default:
                  obj[vm.chartConfig.collapseBy.slug] = d3.sum(
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
      d3.select(this.$el)
        .select(`#${this.id}`)
        .selectAll('*')
        .remove();
      d3.selectAll(`.d3-tip.tip-${this._uid}`).remove();
      d3.selectAll('.title-tip').remove();
    }
  },
  created() {
    if (
      this.data &&
      this.data.length > 0 &&
      this.chartConfig.xAxis.slug !== '' &&
      this.chartConfig.yAxis.slug !== ''
    ) {
      this.configChart();
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
  font-size: 0.9em;
  font-weight: bold;
  text-transform: uppercase;
  text-align: center;
  display: initial;
}
.generated-subtitle,
.edit-subtitle {
  font-size: 1em;
  font-weight: bold;
  text-transform: uppercase;
  text-align: center;
  display: initial;
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
  width: 100%;
  height: 100%;
  margin: 0 auto;
}
</style>
<style>
.empty-chart > svg {
  width: 100%;
  min-height: 100%;
}

.d3-tip {
  background: rgba(255, 255, 255, 0.8);
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

.d3-tip {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  color: #666;
  font-weight: bold;
}

.leaflet-container {
  z-index: 0;
}
</style>
