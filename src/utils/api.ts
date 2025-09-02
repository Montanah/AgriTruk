import { getAuth } from 'firebase/auth';

// Use production backend - no local development needed
const API_BASE = 'https://agritruk-backend.onrender.com/api';

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload';
const CLOUDINARY_UPLOAD_PRESET = 'YOUR_UPLOAD_PRESET';

export async function apiRequest(endpoint: string, options: any = {}) {
  try {
    // Get Firebase Auth token instead of AsyncStorage JWT
    const auth = getAuth();
    const user = auth.currentUser;
    let token = null;

    if (user) {
      try {
        token = await user.getIdToken(true); // Force refresh token
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

    console.log(`API Request: ${API_BASE}${endpoint}`);
    console.log('Headers:', headers);
    console.log('Body:', options.body);

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    console.log('API Response Status:', res.status);
    console.log('API Response Headers:', res.headers);

    const data = await res.json();
    console.log('API Response Data:', data);

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
    console.error('API Request failed:', error);

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
