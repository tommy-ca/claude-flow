export default {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: '20'
      },
      modules: false
    }]
  ],
  env: {
    test: {
      presets: [
        ['@babel/preset-env', {
          targets: {
            node: '20'
          },
          modules: 'commonjs'
        }]
      ]
    }
  }
};