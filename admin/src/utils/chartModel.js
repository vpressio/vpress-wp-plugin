export default class vpressChart {
  constructor(chartValues) {
    if (chartValues) {
      this.chartValues = chartValues
    } else {
      this.chartValues = {
        chart: 'bars',
        xAxis: { title: 'Estado', type: 'ordinal', slug: 'Estado' },
        yAxis: { title: 'total_count', type: 'linear', slug: 'total_count' },
        groupBy: { title: '', type: 'ordinal', slug: '' },
        collapseBy: { title: 'total_count', type: 'linear', slug: 'total_count' },
        unitsName: '',
        orderBy: '',
        decimals: 0,
        preffix: '',
        suffix: '',
        stackedBars: false,
        title: '',
        subtitle: '',
        colors: ['blue'],
        opacity: 1,
        theme: '',
        labels: false
      }
    }
  }

  getChartValues() {
    return this.chartValues;
  }
}