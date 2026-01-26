const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// CRITICAL: Force disable Hermes to prevent linux64-bin/hermesc binary failure on EAS cloud builds
// The Hermes compiler fails on Linux-based EAS build servers
// Use JavaScriptCore (JSC) as the fallback JavaScript engine instead
config.transformer = {
  ...config.transformer,
  // Explicitly disable Hermes compilation
  enableBabelRCLookup: false,
  // Force JSC engine - DO NOT use Hermes
  useHermesParser: false,
  minifierPath: require.resolve('metro-minify-terser'),
};

// Additional safeguard: disable Hermes in the serializer options if available
if (config.serializer) {
  config.serializer = {
    ...config.serializer,
    jsChildProcessRenderArgs: ['--no-hermes'],
  };
}

module.exports = config;
