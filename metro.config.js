const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Add asset extensions
config.resolver.assetExts.push("png", "jpg", "jpeg", "gif", "svg");

// Ensure proper asset resolution
config.resolver.platforms = ["ios", "android", "native", "web"];

// Add URL polyfill to resolver
config.resolver.resolverMainFields = ["react-native", "browser", "main"];

// Configure resolver to look for assets from project root
// This helps with EAS build asset resolution
config.resolver.alias = {
  "./assets": path.resolve(__dirname, "assets"),
  "../../assets": path.resolve(__dirname, "assets"),
};

module.exports = config;
