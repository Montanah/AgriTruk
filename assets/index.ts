// Centralized asset exports
// This file provides a single source of truth for all app assets
// Located in assets/ folder alongside the actual image files

export const Images = {
  // Logo assets - relative to assets/ folder
  trukLogo: require("./images/truk-logo.png"),
  googleLogo: require("./images/google_g.png"),

  // App icons
  icon: require("./images/icon.png"),
  adaptiveIcon: require("./images/adaptive-icon.png"),
  splash: require("./images/splash-icon.png"),

  // Other images
  mapMockup: require("./images/map-mockup.jpg"),
  reactLogo: require("./images/react-logo.png"),
  notificationIcon: require("./images/notification-icon.png"),
};

export default Images;
