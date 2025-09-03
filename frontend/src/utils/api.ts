import { getAuth } from 'firebase/auth';

// Use production backend - no local development needed
const API_BASE = 'https://agritruk.onrender.com/api';

// Test logging function - call this to verify terminal logging works
export function testTerminalLogging() {
  console.log('\n' + '='.repeat(100));
  console.log('🧪 TESTING TERMINAL LOGGING - YOU SHOULD SEE THIS IN YOUR TERMINAL');
  console.log('='.repeat(100));
  console.log('✅ If you can see this message, terminal logging is working!');
  console.log('📱 This is a React Native app, so logs appear in the Metro terminal');
  console.log(
    '🔍 Look for logs with "================================================================================" separators',
  );
  console.log('⏰ Test timestamp:', new Date().toISOString());
  console.log('='.repeat(100) + '\n');
}

// Test backend connectivity
export async function testBackendConnectivity() {
  try {
    console.log('🔍 TESTING: Backend connectivity...');
    console.log('🔍 TESTING: Health endpoint:', `${API_BASE.replace('/api', '')}/api/health`);

    const response = await fetch(`${API_BASE.replace('/api', '')}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('🔍 TESTING: Health check response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is accessible:', data);
      return true;
    } else {
      console.log('❌ Backend health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Backend connectivity test failed:', error);
    return false;
  }
}

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload';
const CLOUDINARY_UPLOAD_PRESET = 'YOUR_UPLOAD_PRESET';

export async function apiRequest(endpoint: string, options: any = {}) {
  try {
    // Clear visual separator for terminal
    console.log('\n' + '='.repeat(100));
    console.log('🚀 STARTING API REQUEST - TERMINAL LOGGING ACTIVE');
    console.log('='.repeat(100));
    console.log('🔍 DEBUG: Starting API request...');
    console.log('🔍 DEBUG: Full URL will be:', `${API_BASE}${endpoint}`);

    // Get Firebase Auth token instead of AsyncStorage JWT
    const auth = getAuth();
    const user = auth.currentUser;
    let token = null;

    console.log('🔍 DEBUG: Firebase user:', user ? 'Authenticated' : 'Not authenticated');

    if (user) {
      try {
        token = await user.getIdToken(true); // Force refresh token
        console.log('🔍 DEBUG: Firebase token obtained:', token ? 'Success' : 'Failed');
      } catch (tokenError) {
        console.warn('Failed to get Firebase token:', tokenError);
        // Continue without token - some endpoints might not require auth
      }
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    console.log('='.repeat(80));
    console.log('🚀 API REQUEST DETAILS FOR BACKEND ENGINEER');
    console.log('='.repeat(80));
    console.log(`📍 Endpoint: ${API_BASE}${endpoint}`);
    console.log(`🔧 Method: ${options.method || 'GET'}`);
    console.log('⏰ Request Timestamp:', new Date().toISOString());
    console.log('🔑 Auth Token Present:', token ? 'YES' : 'NO');
    if (token) {
      console.log('🔑 Token Preview:', `${token.substring(0, 30)}...`);
    }
    console.log('👤 User UID:', user?.uid || 'No user');
    console.log('📋 Request Headers:', JSON.stringify(headers, null, 2));
    console.log(
      '📦 Request Body:',
      options.body ? JSON.stringify(JSON.parse(options.body), null, 2) : 'No body',
    );
    console.log('='.repeat(80));

    console.log('🔍 DEBUG: About to make fetch request...');
    console.log('🔍 DEBUG: Request options:', {
      method: options.method || 'GET',
      headers,
      body: options.body,
    });
    console.log('🔍 DEBUG: Full URL:', `${API_BASE}${endpoint}`);

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    console.log('='.repeat(80));
    console.log('📊 API RESPONSE DETAILS FOR BACKEND ENGINEER');
    console.log('='.repeat(80));
    console.log(`📍 Endpoint: ${API_BASE}${endpoint}`);
    console.log(`📋 Response Status: ${res.status} ${res.statusText}`);
    console.log('⏰ Response Timestamp:', new Date().toISOString());
    console.log(
      '📋 Response Headers:',
      JSON.stringify(Object.fromEntries(res.headers.entries()), null, 2),
    );

    const data = await res.json();
    console.log('📦 Response Data:', JSON.stringify(data, null, 2));
    console.log('='.repeat(80));

    if (!res.ok) {
      // Handle specific authentication errors
      if (res.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (res.status === 403) {
        throw new Error("Access denied. You don't have permission for this action.");
      } else if (res.status === 404) {
        throw new Error('Resource not found. Please check your request.');
      } else {
        throw new Error(data.message || `API error: ${res.status}`);
      }
    }
    return data;
  } catch (error: any) {
    console.log('='.repeat(80));
    console.log('❌ API ERROR DETAILS FOR BACKEND ENGINEER');
    console.log('='.repeat(80));
    console.log(`📍 Endpoint: ${API_BASE}${endpoint}`);
    console.log(`🔧 Method: ${options.method || 'GET'}`);
    console.log('⏰ Error Timestamp:', new Date().toISOString());
    console.log('❌ Error Name:', error.name);
    console.log('❌ Error Message:', error.message);
    console.log('❌ Error Stack:', error.stack);
    console.log('❌ Error Cause:', error.cause);
    console.log('='.repeat(80));

    // Provide better error messages
    if (error.message?.includes('Network request failed')) {
      throw new Error(
        'Network error: Unable to connect to backend server. Please check your internet connection.',
      );
    } else if (error.message?.includes('fetch')) {
      throw new Error(
        'Connection error: Unable to reach the backend server. Please try again later.',
      );
    } else if (error.message?.includes('Authentication failed')) {
      throw new Error('Authentication failed. Please log in again to continue.');
    } else {
      throw error;
    }
  }
}

export async function uploadToCloudinary(uri: string) {
  const formData = new FormData();
  formData.append('file', {
    uri,
    type: 'image/jpeg',
    name: 'upload.jpg',
  } as any);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!data.secure_url) throw new Error('Cloudinary upload failed');
  return data.secure_url;
}
