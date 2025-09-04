// Environment configuration for TRUKAPP
// This file handles loading environment variables properly

// For development, we'll use the values directly from the .env file
// In production, these should be set as environment variables

export const ENV_CONFIG = {
  // Google Maps API Key
  GOOGLE_MAPS_API_KEY: 'AIzaSyCXdOCFJZUxcJMDn7Alip-JfIgOrHpT_Q4',
  
  // Firebase Configuration
  FIREBASE_API_KEY: 'AIzaSyAXJfJ7Vc5AavATttxs50DKHaW-OMV5L2A',
  FIREBASE_AUTH_DOMAIN: 'agritruk-d543b.firebaseapp.com',
  FIREBASE_PROJECT_ID: 'agritruk-d543b',
  FIREBASE_STORAGE_BUCKET: 'agritruk-d543b.firebasestorage.app',
  FIREBASE_MESSAGING_SENDER_ID: '86814869135',
  FIREBASE_APP_ID: '1:86814869135:web:49d6806e9b9917eb6e92fa',
  FIREBASE_MEASUREMENT_ID: 'G-3Q0CMS0HC1',
  
  // Google OAuth
  GOOGLE_IOS_CLIENT_ID: '86814869135-cn89maaq0lm0r7iujeumaa6lrj1uf65f.apps.googleusercontent.com',
  GOOGLE_EXPO_CLIENT_ID: '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',
  GOOGLE_ANDROID_CLIENT_ID: '86814869135-12sl91qdbj1hh62vfncvd2hscu9o1vt3.apps.googleusercontent.com',
  GOOGLE_WEB_CLIENT_ID: '86814869135-3o6j7mou7eo9ba6gmnts85fmhvt6jokk.apps.googleusercontent.com',
};

// Debug logging
console.log('🔍 ENV_CONFIG loaded with Google Maps API Key:', ENV_CONFIG.GOOGLE_MAPS_API_KEY);
