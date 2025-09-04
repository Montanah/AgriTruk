const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Add support for platform-specific extensions
defaultConfig.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Add asset extensions
defaultConfig.resolver.assetExts.push('cjs');

// Disable package exports for better compatibility
defaultConfig.resolver.unstable_enablePackageExports = false;

module.exports = defaultConfig;
