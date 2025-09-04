import { Platform } from 'react-native';

// Use platform-specific Firebase configurations
if (Platform.OS === 'web') {
  // Web: use web-specific configuration
  module.exports = require('./firebaseConfig.web');
} else {
  // Native: use native configuration with proper error handling
  try {
    const { initializeApp } = require('firebase/app');
    const { getFirestore } = require('firebase/firestore');
    const { initializeAuth, getReactNativePersistence } = require('firebase/auth');
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;

    const firebaseConfig = {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:123456789:android:abcdef',
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });

    module.exports = { app, auth, db };
  } catch (error) {
    console.error('Firebase initialization error:', error);
    // Fallback configuration
    module.exports = {
      app: null,
      auth: null,
      db: null,
    };
  }
}
