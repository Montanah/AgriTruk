import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

// Validate Firebase configuration
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

if (missingKeys.length > 0) {
  console.warn('Firebase configuration missing keys:', missingKeys);
}

// Initialize Firebase app only if it doesn't exist
let app;
let db;
let auth;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);

  if (Platform.OS === 'web') {
    // Web: use getAuth and setPersistence
    const { getAuth, setPersistence, browserLocalPersistence } = require('firebase/auth');
    auth = getAuth(app);
    setPersistence(auth, browserLocalPersistence);
  } else {
    // Native: use initializeAuth with AsyncStorage
    const { initializeAuth, getReactNativePersistence, getAuth } = require('firebase/auth');
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    try {
      // Try to get existing auth instance first
      auth = getAuth(app);
    } catch (error) {
      // If no auth instance exists, create one
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    }
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Create fallback objects to prevent crashes
  app = null;
  db = null;
  auth = null;
}

export { app, auth, db };
