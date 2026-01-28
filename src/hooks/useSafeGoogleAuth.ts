import { useState } from 'react';

// Conditionally import Google auth - may not be available if expo-crypto is not linked
let GoogleModule: any = null;
let useAuthRequestHook: any = null;
try {
  GoogleModule = require('expo-auth-session/providers/google');
  useAuthRequestHook = GoogleModule?.useAuthRequest;
} catch (error) {
  // Module not available - will use safe defaults
}

// Safe wrapper hook that always returns values (hooks must be called unconditionally)
export function useSafeGoogleAuth() {
  // Always call the hook if available, otherwise use safe defaults
  // This prevents crashes if expo-crypto is not linked
  try {
    if (useAuthRequestHook) {
      const [request, response, promptAsync] = useAuthRequestHook({
        clientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID || '86814869135-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com',
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '86814869135-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com',
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '86814869135-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com',
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '86814869135-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com',
      });
      return { request, response, promptAsync, isAvailable: true };
    }
  } catch (error: any) {
    // If expo-crypto is not available, the hook call will fail
    // Return safe defaults - app will continue without Google auth
    console.warn('Google auth not available (expo-crypto may not be linked):', error?.message || error);
  }
  
  // Return safe defaults when module is not available
  return { request: null, response: null, promptAsync: null, isAvailable: false };
}

