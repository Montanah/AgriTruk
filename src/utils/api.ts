import AsyncStorage from '@react-native-async-storage/async-storage';

// Use production backend - no local development needed
const API_BASE = 'https://agritruk-backend.onrender.com/api';

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload';
const CLOUDINARY_UPLOAD_PRESET = 'YOUR_UPLOAD_PRESET';

export async function apiRequest(endpoint: string, options: any = {}) {
  try {
    const token = await AsyncStorage.getItem('jwt');
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
      throw new Error(data.message || `API error: ${res.status}`);
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
  if (!res.secure_url) throw new Error('Cloudinary upload failed');
  return data.secure_url;
}
