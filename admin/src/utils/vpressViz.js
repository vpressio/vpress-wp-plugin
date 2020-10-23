const VpressViz = function (
  chartValues,
  id = null,
  mapValues,
  dataset_id = null,
  data = [],
  description = "",
  permission = "Public",
  img_url = ""
) {
  this.id = id,
  this.dataset_id = dataset_id
  this.data = data
  this.description = description
  this.permission =  permission
  this.img_url = img_url
  this.chartValues = fillValues(chartValues, defaultChart)
  this.mapValues = fillValues(mapValues, defaultMap)
}

VpressViz.prototype = {
  getValues() {
    return this.chartValues;
  },
  getData() {
    return this.data;
  },
  setValues(newValues) {
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
  colors: ['#40348c', '#842f8e', '#ba2982', '#e2346d', '#fc5353', '#ff7b33', '#ffa600']
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

export default VpressViz