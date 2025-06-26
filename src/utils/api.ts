import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://agritruk-backend.onrender.com/api';
const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload';
const CLOUDINARY_UPLOAD_PRESET = 'YOUR_UPLOAD_PRESET';

export async function apiRequest(endpoint: string, options: any = {}) {
  const token = await AsyncStorage.getItem('jwt');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'API error');
  return data;
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
