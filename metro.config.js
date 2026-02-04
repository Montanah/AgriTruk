const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Add asset extensions
config.resolver.assetExts.push("png", "jpg", "jpeg", "gif", "svg");

// Ensure proper asset resolution
config.resolver.platforms = ["ios", "android", "native", "web"];

module.exports = config;
