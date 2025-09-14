import { getAuth } from 'firebase/auth';
import { API_BASE_URL } from '../constants/api';
import { EXTERNAL_URLS } from '../constants/images';

// Use production backend - no local development needed
const API_BASE = `${API_BASE_URL}/api`;

// Test logging function - call this to verify terminal logging works
export function testTerminalLogging() {
  // Terminal logging test
}

// Test backend connectivity
export async function testBackendConnectivity() {
  try {
    // Testing backend connectivity

    const response = await fetch(`${API_BASE.replace('/api', '')}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Health check response received

    if (response.ok) {
      await response.json(); // Health check data
      // Backend is accessible
      return true;
    } else {
      // Backend health check failed
      return false;
    }
  } catch (error) {
    console.error('❌ Backend connectivity test failed:', error);
    return false;
  }
}

const CLOUDINARY_UPLOAD_URL = EXTERNAL_URLS.CLOUDINARY_UPLOAD;
const CLOUDINARY_UPLOAD_PRESET = EXTERNAL_URLS.CLOUDINARY_PRESET;

export async function apiRequest(endpoint: string, options: any = {}) {
  try {
    // Clear visual separator for terminal
    // Starting API request
    // Full URL constructed

    // Get Firebase Auth token instead of AsyncStorage JWT
    const auth = getAuth();
    const user = auth.currentUser;
    let token = null;

    // Firebase user status

    if (user) {
      try {
        token = await user.getIdToken(true); // Force refresh token
        // Firebase token obtained
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

    // API request details

    // Making fetch request

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    // API response details
    // Response received

    const data = await res.json();
    // Response data received

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
    // API error details

    // Provide better error messages
    if (error.message?.includes('Network request failed') || error.message?.includes('fetch')) {
      throw new Error(
        'Backend server is currently unavailable. Your data will be saved locally and synced when the server is back online.',
      );
    } else if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
      throw new Error(
        'Request timeout: The server is taking too long to respond. Your data will be saved locally.',
      );
    } else if (error.message?.includes('Authentication failed')) {
      throw new Error('Authentication failed. Please log in again to continue.');
    } else if (error.message?.includes('Backend server is currently unavailable')) {
      throw error; // Re-throw our custom message
    } else {
      throw new Error(
        'Server error: Unable to process your request. Your data will be saved locally.',
      );
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
