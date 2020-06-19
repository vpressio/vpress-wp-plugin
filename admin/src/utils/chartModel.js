export default class vpressChart {
  constructor(chartValues) {
    if (chartValues) {
      this.chartValues = {
        chart: this.setDefault(chartValues.chart ,'bars'),
        xAxis: {
          title: this.setDefault(chartValues.xAxis.title, ''),
          type: this.setDefault(chartValues.xAxis.type, ''),
          slug: this.setDefault(chartValues.xAxis.slug, ''),
          func: this.setDefault(chartValues.xAxis.func, '')
        },
        yAxis: {
          title: this.setDefault(chartValues.yAxis.title, ''),
          type: this.setDefault(chartValues.yAxis.type, ''),
          slug: this.setDefault(chartValues.yAxis.slug, ''),
          func: this.setDefault(chartValues.yAxis.func, '')
        },
        groupBy: {
          title: this.setDefault(chartValues.groupBy.title, ''),
          type: this.setDefault(chartValues.groupBy.type, 'ordinal'),
          slug: this.setDefault(chartValues.groupBy.slug, '')
        },
        collapseBy: {
          title: this.setDefault(chartValues.collapseBy.title, ''),
          type: this.setDefault(chartValues.collapseBy.type, ''),
          slug: this.setDefault(chartValues.collapseBy.slug, ''),
          func: this.setDefault(chartValues.collapseBy.func, '')
        },
        filters: this.setDefault(chartValues.filters, []),
        orderBy: {
          order: this.setDefault(chartValues.orderBy.order, 'asc'),
          slug: this.setDefault(chartValues.orderBy.slug, '')
        },
        unitsName: this.setDefault(chartValues.unitsName, ''),
        decimals: this.setDefault(chartValues.decimals, 0),
        preffix: this.setDefault(chartValues.preffix, ''),
        suffix: this.setDefault(chartValues.suffix, ''),
        stackedBars: this.setDefault(chartValues.stackedBars, false),
        title: this.setDefault(chartValues.title, ''),
        subtitle: this.setDefault(chartValues.subtitle, ''),
        opacity: this.setDefault(chartValues.opacity, 1),
        theme: this.setDefault(chartValues.theme, ''),
        labels: this.setDefault(chartValues.labels, false),
        colors: this.setDefault(
          chartValues.colors, 
          ['#fcff9d', '#f6ca3b', '#f9901a', '#e85f2e', '#c63d46', '#9e2b5d', '#721968', '#4a0067', '#261045', '#00000e']
        )
      };
    } else {
      this.chartValues = {
        chart: 'bars',
        xAxis: { title: '', type: '', slug: '' },
        yAxis: { title: '', type: '', slug: '' },
        groupBy: { title: '', type: 'ordinal', slug: '' },
        collapseBy: { title: '', type: 'linear', slug: '' },
        unitsName: '',
        orderBy: { order: 'asc', slug: '' },
        decimals: 0,
        preffix: '',
        suffix: '',
        stackedBars: false,
        title: '',
        subtitle: '',
        colors: ['#fcff9d', '#f6ca3b', '#f9901a', '#e85f2e', '#c63d46', '#9e2b5d', '#721968', '#4a0067', '#261045', '#00000e'],
        opacity: 1,
        theme: '',
        labels: false
      }
    }
  }

  values() {
    return this.chartValues;
  }

  defaultValue(value, defaultValue) {
    return value
      ? value
      : defaultValue
  }
}