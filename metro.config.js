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
// Use process.cwd() to get the actual project root in EAS build environment
const projectRoot = process.env.EAS_BUILD_WORKINGDIR || __dirname;
config.resolver.alias = {
  "./assets": path.resolve(projectRoot, "assets"),
  "../../assets": path.resolve(projectRoot, "assets"),
};

// Set project root explicitly for EAS builds
config.projectRoot = projectRoot;
config.watchFolders = [projectRoot];

module.exports = config;
