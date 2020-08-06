const EventEmitter = require('events');

class barsEvent extends EventEmitter{
  constructor() {
    super()
    this.on('data', this.draw)
    this.on('config', this.chart)
  }
  draw(perro) {
    console.log(perro)
  }
  
}

module.exports = {
  xAxis: async (node, chart, payload, requestData) => {
    const barChart = new barsEvent()
    const data = await requestData()
    barChart.emit('data', data)
    return this
  },
  groupBy: () => {

  },
  
}

  
  