module.exports = {
  productionSourceMap: false,
  publicPath: process.env.NODE_ENV === 'production'
    ? './vpress/wp-content/plugins/vpres/admin/dist/'
    : 'http://localhost:8080/',
  configureWebpack: {
    devServer: {
      // contentBase: '/wp-content/plugins/vpress/dist/',
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
    }
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
