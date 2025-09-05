import { Platform } from 'react-native';

// Initialize Firebase variables
let app: any = null;
let auth: any = null;
let db: any = null;

// Use platform-specific Firebase configurations
if (Platform.OS === 'web') {
  // Web: use web-specific configuration
  try {
    const webConfig = require('./firebaseConfig.web');
    app = webConfig.app;
    auth = webConfig.auth;
    db = webConfig.db;
  } catch (error) {
    console.error('Web Firebase config error:', error);
  }
} else {
  // Native: use native configuration with proper error handling
  try {
    const { initializeApp } = require('firebase/app');
    const { getFirestore } = require('firebase/firestore');
    const { initializeAuth, getReactNativePersistence } = require('firebase/auth');
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;

    // Import the actual Firebase configuration
    const { ENV_CONFIG } = require('./config/env');
    
    const firebaseConfig = {
      apiKey: ENV_CONFIG.FIREBASE_API_KEY,
      authDomain: ENV_CONFIG.FIREBASE_AUTH_DOMAIN,
      projectId: ENV_CONFIG.FIREBASE_PROJECT_ID,
      storageBucket: ENV_CONFIG.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: ENV_CONFIG.FIREBASE_MESSAGING_SENDER_ID,
      appId: ENV_CONFIG.FIREBASE_APP_ID,
    };

    console.log('🔥 Firebase Config (Native):', {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'missing'
    });

    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    
    // Configure Firestore for offline support
    const { enableNetwork, disableNetwork } = require('firebase/firestore');
    
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });

    console.log('✅ Firebase initialized successfully (Native)');
    
    // Test Firestore connection (async)
    if (db) {
      // Use setTimeout to make this async and avoid blocking initialization
      setTimeout(async () => {
        try {
          // Try to read from a test collection to verify connection
          const { collection, getDocs, limit, query } = require('firebase/firestore');
          const testQuery = query(collection(db, 'test'), limit(1));
          await getDocs(testQuery);
          console.log('✅ Firestore connection test successful');
        } catch (firestoreError) {
          console.warn('⚠️ Firestore connection test failed:', firestoreError.message);
          console.log('This might be normal if the test collection does not exist');
        }
      }, 1000);
    }
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    // Fallback configuration
    app = null;
    auth = null;
    db = null;
  }
}

// Export at the top level
export { app, auth, db };
