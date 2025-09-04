const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Add support for platform-specific extensions
defaultConfig.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Add asset extensions
defaultConfig.resolver.assetExts.push('cjs');

// Disable package exports for better compatibility
defaultConfig.resolver.unstable_enablePackageExports = false;

// Better web platform resolution
defaultConfig.resolver.sourceExts = ['js', 'jsx', 'json', 'ts', 'tsx', 'web.js', 'web.jsx', 'web.ts', 'web.tsx'];

// Web-specific transformer options
defaultConfig.transformer = {
  ...defaultConfig.transformer,
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
};

module.exports = defaultConfig;
