import { fillValues } from '../helpers/index.js'
import { ChartPreset, MapPreset } from '../presets/index.js'

const Viz = function (
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
  this.chartValues = fillValues(chartValues, ChartPreset)
  this.mapValues = fillValues(mapValues, MapPreset)
}

Viz.prototype = {
  getValues() {
    return this.chartValues;
  },
  getData() {
    return this.data;
  },
  setValues(newValues) {
    try {
      this.chartValues = fillValues(newValues, ChartPreset);
    } catch (error) {
      throw new Error(error.message)
    }
  },
  setData(data) {
    try {
      if (!Array.isArray(data)) throw new Error('Error al actualizar datos de gráfica')
        this.data = data;
    } catch (error) {
      throw new Error(error.message)
    }
  }
}


export default Viz