import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyAXJfJ7Vc5AavATttxs50DKHaW-OMV5L2A",
  authDomain: "agritruk-d543b.firebaseapp.com",
  projectId: "agritruk-d543b",
  storageBucket: "agritruk-d543b.firebasestorage.app",
  messagingSenderId: "86814869135",
  appId: "1:86814869135:web:49d6806e9b9917eb6e92fa",
};

// Initialize Firebase app only if it doesn't exist
let app: any;
let db: any;
let auth: any;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);

  if (Platform.OS === "web") {
    // Web: use getAuth and setPersistence
    const {
      getAuth,
      setPersistence,
      browserLocalPersistence,
    } = require("firebase/auth");
    auth = getAuth(app);
    setPersistence(auth, browserLocalPersistence);
  } else {
    // Native: use initializeAuth with AsyncStorage
    const {
      initializeAuth,
      getReactNativePersistence,
    } = require("firebase/auth");
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;

    // Always use initializeAuth for React Native to ensure AsyncStorage persistence
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
  // Create fallback objects to prevent crashes
  app = null;
  db = null;
  auth = null;
}

export { app, auth, db };
