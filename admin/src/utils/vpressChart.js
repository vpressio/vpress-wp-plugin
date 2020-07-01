const VpressChart = function (incomingChart) {
  this.chartValues = fillValues(incomingChart, defaultChart)
  this.chartEnum = chartEnum[this.values().chart]
}

VpressChart.prototype = {
  values() {
  return this.chartValues;
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
      return incomingChart && typeof incomingChart === typeof defaultChart
        ? incomingChart
        : defaultChart
    }
  } catch (error) {
    console.error(error.message);
    return defaultChart
  }
}

const defaultChart = {    
  chart: 'map',
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

const chartEnum = Object.freeze({
  bars: {
    type: 'bars',
    slots: {
      xAxis:  'xAxis',
      yAxis: 'yAxis',
      filters: 'filters'
    },
    requiredValues: {
      xAxis: 'xAxis',
      yAxis: 'yAxis',
      collapseBy: 'collapseBy'
    }
  },
  heatmap:{
    type: 'heatmap',
    slots: {
      xAxis:  'xAxis',
      yAxis: 'yAxis',
      color: 'color',
      filters: 'filters'
    },
    requiredValues: {
      xAxis: 'xAxis',
      yAxis: 'yAxis',
      groupBy: 'groupBy',
    }
  },
  spineplot: {
    type: 'spineplot',
    slots: {
      xAxis:  'xAxis',
      yAxis: 'yAxis',
      color: 'color',
      filters: 'filters'
    },
    requiredValues: {
      xAxis: 'xAxis',
      yAxis: 'yAxis',
      collapseBy: 'collapseBy',
      groupBy: 'groupBy'
    }
  },
  scatter: {
    type: 'scatter',
    slots: {
      xAxis:  'xAxis',
      yAxis: 'yAxis',
      color: 'groupBy',
      size: 'size',
      filters: 'filters'
    },
    requiredValues: {
      xAxis: 'xAxis',
      yAxis: 'yAxis'
    }
  },
  timeline: {
    type: 'timeline',
    slots: {
      xAxis:  'xAxis',
      yAxis: 'yAxis',
      filters: 'filters'
    },
    requiredValues: {
      xAxis: 'xAxis',
      yAxis: 'yAxis',
      collapseBy: 'collapseBy'
    }
  }
  })
module.exports = {
  VpressChart
}