export default class VpressChart {
  constructor(chartValues) {
    this.chart = chartValues.chart || 'bars'
    this.xAxis = {
      title: chartValues.xAxis.title || '',
      type: chartValues.xAxis.type || '',
      slug: chartValues.xAxis.slug || '',
      func: chartValues.xAxis.func || ''
    }
    this.yAxis = {
      title: chartValues.yAxis.title || '',
      type: chartValues.yAxis.type || '',
      slug: chartValues.yAxis.slug || '',
      func: chartValues.yAxis.func || ''
    }
    this.groupBy = {
      title: chartValues.groupBy.title || '',
      type: chartValues.groupBy.type || 'ordinal',
      slug: chartValues.groupBy.slug || ''
    }
    this.collapseBy = {
      title: chartValues.collapseBy.title || '',
      type: chartValues.collapseBy.type || 'linear',
      slug: chartValues.collapseBy.slug || '',
      func: chartValues.collapseBy.func || ''
    }
    this.unitsName = chartValues.unitsName || '',
      this.orderBy = {
      order: chartValues.orderBy.order || 'desc',
      slug: chartValues.orderBy.slug || ''
      }
    this.decimals = chartValues.decimals || 1
    this.prefix = chartValues.prefix || ''
    this.sufix = chartValues.sufix || ''
    this.stackedBars = chartValues.stackedBars || false
    this.title =  chartValues.title || 'Título'
    this.subtitle = chartValues.subtitle ||'Subtítulo'
    this.colors = chartValues.colors || ['#e66101', '#fdb863', '#f7f7f7', '#b2abd2', '#5e3c99']
    this.opacity = chartValues.opacity || 1
    this.theme = chartValues.theme || 'light'
    this.labels = chartValues.labels || false
  }
  
}