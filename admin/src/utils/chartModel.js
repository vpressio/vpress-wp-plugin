export default class vpressChart {
  constructor(dataset_id, chartValues) {
    this.dataSet_id = dataset_id
    if (chartValues) {
      this.chartValues = chartValues
    } else {
      this.chartValues = {
        chart: 'bars',
        xAxis: { title: '', type: '', slug: '' },
        yAxis: { title: '', type: '', slug: '' },
        groupBy: { title: '', type: 'ordinal', slug: '' },
        collapseBy: { title: '', type: 'linear', slug: '' },
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
}