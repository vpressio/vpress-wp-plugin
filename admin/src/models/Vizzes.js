import { Viz } from './index'
const Vizzes = function (vizValues = [], dataset) {
  this.activeViz =  null
  this.load(vizValues)
  this.open = 0
  this.dataset = dataset
}

Vizzes.prototype = {
  load(vizValues) {
    if (vizValues.length > 0) {
      this.vizzes = vizValues
        .map((viz) => new Viz(
          JSON.parse(viz.value),
          viz.id,
          viz.mapValues,
          viz.dataset_id,
          viz.data,
          viz.description,
          viz.permissions,
          viz.img_url
        ))
    } else {
      this.vizzes = [ new Viz()]
    }
    this.activate(0)
    return this.vizzes
  },
  new() {
    this.vizzes.push(new Viz)
    this.activate(this.vizzes.length - 1)
    return this.vizzes
  },
  add(vizValues) {
    this.vizzes = [...this.vizzes, ...vizValues]
    return this.vizzes
  },
  delete(idx) {
    this.vizzes.splice(idx, 1)
    this.activate(0)
    return this.vizzes
  },
  activate(idx) {
    this.activeViz = this.vizzes[idx]
    this.open = idx
    return this.activeViz
  }
}

export default Vizzes