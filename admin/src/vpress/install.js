import {
  queryByChart,
  mergeChartVal,
  invertAxis,
  extractDataType,
  filterOrdinalParamsQuery,
  filterLinearParamsQuery,
  queryBody,
} from './helpers/index.js'

const install = (Vue) => {
  if (install.installed) return;
  install.installed = true;
  Vue.prototype.$vpress = {
    queryByChart,
    mergeChartVal,
    invertAxis,
    extractDataType,
    filterOrdinalParamsQuery,
    filterLinearParamsQuery,
    queryBody
  }
}

export default install
