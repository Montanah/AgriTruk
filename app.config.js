module.exports = {
  expo: {
    name: "TRUKapp",
    slug: "TRUKapp",
    version: "1.0.3",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    scheme: "trukapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      bundleIdentifier: "com.truk.trukapp",
      buildNumber: "10",
      supportsTablet: true,
      icon: "./assets/images/ios-icon-1024.png",
      // Updated to iOS 14.0 to support iOS 26 SDK (was 13.4)
      // iOS 26 SDK requires minimum deployment target of at least iOS 14
      deploymentTarget: "14.0",
      config: {
        googleMapsApiKey: "AIzaSyCXdOCFJZUxcJMDn7Alip-JfIgOrHpT_Q4",
      },
      infoPlist: {
        // ============================================
        // CRITICAL iOS Info.plist SETTINGS - EXPLICITLY ENFORCED
        // These settings are REQUIRED to prevent iOS crashes
        // DO NOT REMOVE OR MODIFY WITHOUT TESTING
        // ============================================

        // Performance fix to prevent crashes - CRITICAL
        CADisableMinimumFrameDurationOnPhone: true,

        // Google Maps API Key - REQUIRED for map functionality
        GMSApiKey: "AIzaSyCXdOCFJZUxcJMDn7Alip-JfIgOrHpT_Q4",

        // Encryption declaration - REQUIRED for App Store submission
        ITSAppUsesNonExemptEncryption: false,

        // Minimum iOS version - REQUIRED
        // Updated to iOS 13.4 to meet Apple App Store requirements (iOS 13+ for 2025)
        LSMinimumSystemVersion: "13.4",

        // App Transport Security settings - REQUIRED for network requests
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
          NSAllowsLocalNetworking: true,
        },

        // Location permissions - REQUIRED for location features
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "Allow TRUKapp to use your location to show your position on the map and calculate routes.",
        NSLocationAlwaysUsageDescription:
          "Allow TRUKapp to access your location",
        NSLocationWhenInUseUsageDescription:
          "This app needs access to location to show your position on the map and calculate routes.",

        // Camera permission - REQUIRED for camera features
        NSCameraUsageDescription:
          "Allow TRUKapp to use your camera to capture relevant images.",

        // Photo library permission - REQUIRED for photo uploads
        NSPhotoLibraryUsageDescription:
          "Allow TRUKapp to upload images from your photo library",

        // URL schemes for deep linking - REQUIRED for app links
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: ["trukapp", "com.truk.trukapp"],
          },
        ],

        // Launch screen - REQUIRED
        UILaunchStoryboardName: "SplashScreen",

        // UI settings - REQUIRED for proper display
        UIRequiresFullScreen: false,
        UIStatusBarStyle: "UIStatusBarStyleDefault",
        UIUserInterfaceStyle: "Automatic",
        UIViewControllerBasedStatusBarAppearance: false,

        // Supported orientations - REQUIRED
        UISupportedInterfaceOrientations: [
          "UIInterfaceOrientationPortrait",
          "UIInterfaceOrientationPortraitUpsideDown",
        ],
        "UISupportedInterfaceOrientations~ipad": [
          "UIInterfaceOrientationPortrait",
          "UIInterfaceOrientationPortraitUpsideDown",
          "UIInterfaceOrientationLandscapeLeft",
          "UIInterfaceOrientationLandscapeRight",
        ],

        // ============================================
        // END OF CRITICAL iOS Info.plist SETTINGS
        // ============================================
      },
    },
    android: {
      package: "com.truk.trukapp",
      versionCode: 10,
      icon: "./assets/images/android-icon-512.png",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon-foreground.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      // Ensure Hermes is used for better startup performance on device
      jsEngine: "hermes",
      // Large screen support - remove resizability restrictions
      resizeableActivity: true,
      // Support multiple screen sizes and densities for large screen devices
      supportsTablet: true,
      config: {
        googleMaps: {
          apiKey: "AIzaSyCXdOCFJZUxcJMDn7Alip-JfIgOrHpT_Q4",
        },
      },
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_LOCATION",
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
      ],
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "*.trukapp.com",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    plugins: [
      "@react-native-community/datetimepicker",
      "expo-asset",
      "expo-font",
      "expo-web-browser",
      "./plugins/withAndroidLocationPermissions",
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        projectId: "24d1984c-eb71-4672-bace-c6a0ddeb648b",
      },
      // Environment variables
      EXPO_PUBLIC_API_URL: "https://agritruk.onrender.com",
      EXPO_PUBLIC_GOOGLE_MAPS_API_KEY:
        "AIzaSyCXdOCFJZUxcJMDn7Alip-JfIgOrHpT_Q4",
      EXPO_PUBLIC_FIREBASE_API_KEY: "AIzaSyAXJfJ7Vc5AavATttxs50DKHaW-OMV5L2A",
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "agritruk-d543b.firebaseapp.com",
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: "agritruk-d543b",
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: "agritruk-d543b.firebasestorage.app",
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "86814869135",
      EXPO_PUBLIC_FIREBASE_APP_ID: "1:86814869135:web:49d6806e9b9917eb6e92fa",
    },
  },
};
