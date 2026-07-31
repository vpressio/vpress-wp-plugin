const install = function (app) {
  if (install.installed) return;
  install.installed = true;
  app.mixin({
    beforeCreate() {
      this.$vpress = {};
    }
  });
};

export default install;
