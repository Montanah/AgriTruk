const isProduction = process.env.NODE_ENV === 'production' || process.env.EXPO_PUBLIC_BUILD_MODE === 'production';

export default {
  expo: {
    name: "TRUKapp",
    slug: "TRUKapp",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "trukapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: false, // Disabled for development client compatibility
    ios: {
      bundleIdentifier: "com.truk.trukapp",
      supportsTablet: true,
      icon: "./assets/images/ios-icon-1024.png",
      config: {
        googleMapsApiKey: "AIzaSyCXdOCFJZUxcJMDn7Alip-JfIgOrHpT_Q4"
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "This app needs access to location to show your position on the map and calculate routes.",
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      package: "com.truk.trukapp",
      icon: "./assets/images/android-icon-512.png",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon-foreground.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      config: {
        googleMaps: {
          apiKey: "AIzaSyCXdOCFJZUxcJMDn7Alip-JfIgOrHpT_Q4"
        }
      },
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE"
      ],
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "*.trukapp.com"
            }
          ],
          category: [
            "BROWSABLE",
            "DEFAULT"
          ]
        }
      ]
    },
    web: {
      bundler: "metro",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        }
      ],
      "expo-document-picker",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow TRUKapp to use your location to show your position on the map and calculate routes."
        }
      ],
      // expo-notifications removed for APK build compatibility
      // expo-crypto removed due to compatibility issues
      "expo-asset",
      "expo-font",
      "expo-maps",
      "expo-web-browser"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      eas: {
        projectId: "24d1984c-eb71-4672-bace-c6a0ddeb648b"
      },
      // Environment variables
      EXPO_PUBLIC_API_URL: "https://agritruk.onrender.com",
      EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: "AIzaSyCXdOCFJZUxcJMDn7Alip-JfIgOrHpT_Q4",
      EXPO_PUBLIC_FIREBASE_API_KEY: "AIzaSyAXJfJ7Vc5AavATttxs50DKHaW-OMV5L2A",
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "agritruk-d543b.firebaseapp.com",
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: "agritruk-d543b",
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: "agritruk-d543b.firebasestorage.app",
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "86814869135",
      EXPO_PUBLIC_FIREBASE_APP_ID: "1:86814869135:web:49d6806e9b9917eb6e92fa",
      // Cloudinary configuration
      EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME: "trukapp",
      EXPO_PUBLIC_CLOUDINARY_PRESET: "trukapp_unsigned",
      EXPO_PUBLIC_CLOUDINARY_API_KEY: "your_cloudinary_api_key_here",
      EXPO_PUBLIC_CLOUDINARY_API_SECRET: "your_cloudinary_api_secret_here",
    }
  }
};