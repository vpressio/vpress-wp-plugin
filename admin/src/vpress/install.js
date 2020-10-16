const install = function (Vue) {
  if (install.installed) return
  install.installed = true
  Vue.mixin({
    beforeCreate() {
      this.$vpress = {}
    }
  })
}
 
export default install
