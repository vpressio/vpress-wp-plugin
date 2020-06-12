export default class vpressChart {
  constructor(chartValues) {
    if (chartValues) {
      this.chartValues = chartValues;
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
}