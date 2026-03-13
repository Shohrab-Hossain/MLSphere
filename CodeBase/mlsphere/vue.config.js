const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    resolve: {
      alias: {
        vue$: 'vue/dist/vue.esm-bundler.js',
        'vue/dist/vue.runtime.esm.js': 'vue/dist/vue.runtime.esm-bundler.js'
      }
    }
  }
})
