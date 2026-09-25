export default {
  chart: 'bars',
  xAxis: { title: '', type: '', slug: '', func: '', showLabel: false },
  yAxis: { title: '', type: '', slug: '', func: '', showLabel: false },
  groupBy: { title: '', type: '', slug: '' },
  collapseBy: { title: '', type: '', slug: '', func: '' },
  filters: [],
  // Editorial annotations, each with a stable id a story step references.
  // Absent or [] on every chart saved before they existed.
  annotations: [],
  // Highest annotation id number ever issued; never decremented, so a
  // deleted id is never handed out again. 0 on a chart with none.
  annotationSeq: 0,
  orderBy: { order: 'asc', slug: '' },
  unitsName: '',
  decimals: 1,
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