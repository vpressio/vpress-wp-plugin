export const fillValues = (incomingChart, defaultChart) =>{
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
    return defaultChart
  }
}
