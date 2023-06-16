const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  productionSourceMap: false,
  publicPath: process.env.NODE_ENV === 'production'
    ? '/wp-content/plugins/vpress/admin/dist/'
    : 'http://localhost:8080',
  //publicPath: '/wp-content/plugins/vpress/admin/dist/',
  configureWebpack: {
    devServer: {
      allowedHosts: [''],
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    },
    externals: {
      jquery: 'jQuery'
    },
    output: {
      filename: 'js/[name].js',
      chunkFilename: 'js/[name].js'
    },
    resolve: {
      symlinks: false
    },
    //plugins: [new BundleAnalyzerPlugin()]
  },
  css: {
    extract:
      process.env.NODE_ENV === 'production'
        ? {
            filename: 'css/[name].css',
            chunkFilename: 'css/[name].css'
          }
        : false
  },
  transpileDependencies: ['vuetify']
};
