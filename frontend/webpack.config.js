const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // Fix Firebase postinstall.mjs issue
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "fs": false,
    "path": false,
    "os": false,
  };

  // Ignore problematic Firebase files
  config.resolve.alias = {
    ...config.resolve.alias,
    '@firebase/util/dist/postinstall.mjs': false,
  };

  // Add webpack ignore plugin for Firebase postinstall
  const webpack = require('webpack');
  config.plugins.push(
    new webpack.IgnorePlugin({
      resourceRegExp: /postinstall\.mjs$/,
    })
  );

  return config;
};
