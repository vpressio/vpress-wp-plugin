const VpressViz = function (
  chartValues,
  id = null,
  mapValues,
  dataset_id = null,
  data = [],
  description = "",
  permission = "Public",
  img_url = "",
) {
  this.id = id
  this.dataset_id = dataset_id
  this.data = data
  this.description = description
  this.permission =  permission
  this.img_url = img_url
  this.chartValues = fillValues(chartValues, defaultChart)
  this.mapValues = fillValues(mapValues, defaultMap)
}

VpressViz.prototype = {
  values() {
    return this.chartValues;
  },
  vizData() {
    return this.data;
  },
  setChartValues(newValues) {
    try {
      this.chartValues = fillValues(newValues, defaultChart);
    } catch (error) {
      console.error(error.message);
    }
  },
  setData(data) {
    try {
      if (!Array.isArray(data)) throw new Error('Error al actualizar datos de gráfica')
        this.data = data;
    } catch (error) {
      console.error(error.message);
    }
  }
}

const fillValues = (incomingChart, defaultChart) =>{
  try {
    if (defaultChart === Object(defaultChart) && !Array.isArray(defaultChart)) {
      const defaultKeys = Object.keys(defaultChart)
      return defaultKeys.reduce((acc, key) => {
        incomingChart
          ? acc[key] = fillValues(incomingChart[key], defaultChart[key])
          : acc[key] = defaultChart[key]
        return acc
      }, {})
    } else {
      return incomingChart && (typeof incomingChart === typeof defaultChart)
        ? incomingChart
        : defaultChart
    }
  } catch (error) {
    console.error(error.message);
    return defaultChart
  }
}

const defaultChart = {    
  chart: 'bars',
  xAxis: { title: '', type: '', slug: '', func: '' },
  yAxis: { title: '', type: '', slug: '', func: '' },
  groupBy: { title: '', type: '', slug: '' },
  collapseBy: { title: '', type: '', slug: '', func: '' },
  filters: [],
  orderBy: { order: 'asc', slug: '' },
  unitsName: '',
  decimals: 0,
  preffix: '',
  suffix: '',
  stackedBars: false,
  title: '',
  subtitle: '',
  opacity: 1,
  theme: '',
  labels: false,
  colors: ['#fcff9d', '#f6ca3b', '#f9901a', '#e85f2e', '#c63d46', '#9e2b5d', '#721968', '#4a0067', '#261045', '#00000e']
}

const defaultMap = {
  topojson: {
    url: '/topojsons/mx_edos.json',
    center: [ 19.6930200, -89.0503700 ],
    objects: ['states'],
    translate: undefined,
    zoom: 7,
    maxZoom: 10,
    minZoom: 5
  }
}

module.exports = {
  VpressViz
}