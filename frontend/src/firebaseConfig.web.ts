// Web-specific Firebase configuration to avoid build issues
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';

// Import the actual Firebase configuration
import { ENV_CONFIG } from './config/env';

const firebaseConfig = {
  apiKey: ENV_CONFIG.FIREBASE_API_KEY,
  authDomain: ENV_CONFIG.FIREBASE_AUTH_DOMAIN,
  projectId: ENV_CONFIG.FIREBASE_PROJECT_ID,
  storageBucket: ENV_CONFIG.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: ENV_CONFIG.FIREBASE_MESSAGING_SENDER_ID,
  appId: ENV_CONFIG.FIREBASE_APP_ID,
};

console.log('🔥 Firebase Config (Web):', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'missing'
});

// Initialize Firebase with error handling
let app, db, auth;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);

  // Set persistence for web
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.warn('Firebase auth persistence error:', error);
  });

  console.log('✅ Firebase initialized successfully (Web)');
} catch (error) {
  console.error('Firebase web initialization error:', error);
  // Fallback values
  app = null;
  db = null;
  auth = null;
}

export { app, auth, db };
