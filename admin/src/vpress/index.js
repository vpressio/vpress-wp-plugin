const charts = require('./charts')

module.exports = {
  query: (node, chart, { requestData }) => {
    try {
      const chartEvent = charts[chart.chart]
      return (queryType, payload) => chartEvent[queryType](node, chart, payload, requestData)
      
    } catch (error) {
      throw new Error(error.message)
    }
  },

  merge: (node, chart, chartValue) => {
    const chartEvent = charts[chart.chart]
    return chartEvent.merge(node, chart, chartValue)
  }


}