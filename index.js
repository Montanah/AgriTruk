// Import polyfills first - CRITICAL: Must be before any other imports
import "react-native-url-polyfill/auto";

import { AppRegistry } from "react-native";
import App from "./App.tsx";

// Use the correct app name - it should match what Expo expects
const appName = "main";

AppRegistry.registerComponent(appName, () => App);
