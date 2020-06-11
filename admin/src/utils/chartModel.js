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
        colors: ['#e66101', '#fdb863', '#f7f7f7', '#b2abd2', '#5e3c99'],
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