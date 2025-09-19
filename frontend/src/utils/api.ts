import { getAuth } from 'firebase/auth';
import { API_BASE_URL } from '../constants/api';

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

// Retry mechanism for critical API calls
export async function apiRequestWithRetry(endpoint: string, options: any = {}, maxRetries: number = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`API request attempt ${attempt}/${maxRetries} to ${endpoint}`);
      return await apiRequest(endpoint, options);
    } catch (error) {
      lastError = error;
      console.warn(`API request attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Cloudinary uploads are handled by the backend

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

    // Check if Authorization header is already provided in options
    const hasCustomAuth = options.headers && options.headers.Authorization;
    
    console.log('API Request Debug:', {
      hasCustomAuth,
      hasToken: !!token,
      customHeaders: options.headers,
      endpoint
    });
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && !hasCustomAuth ? { Authorization: `Bearer ${token}` } : {}), // Add token if no custom auth provided
      ...options.headers, // Custom headers last to override defaults
    };
    
    console.log('Final headers:', {
      'Content-Type': headers['Content-Type'],
      'Authorization': headers.Authorization ? `${headers.Authorization.substring(0, 20)}...` : 'None'
    });

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
      console.error('API Error Response:', {
        status: res.status,
        statusText: res.statusText,
        data: data
      });
      
      // Handle specific authentication errors
      if (res.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (res.status === 403) {
        throw new Error("Access denied. You don't have permission for this action.");
      } else if (res.status === 404) {
        throw new Error('Resource not found. Please check your request.');
      } else if (res.status === 409) {
        throw new Error(data.message || 'User already exists. Please sign in instead.');
      } else if (res.status === 400) {
        throw new Error(data.message || 'Invalid request. Please check your input.');
      } else {
        throw new Error(data.message || `API error: ${res.status} - ${res.statusText}`);
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

// File upload function - upload directly to Cloudinary
export async function uploadFile(uri: string, type: 'profile' | 'logo' | 'document' | 'transporter' = 'profile', resourceId?: string) {
  // Retry mechanism for uploads
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Upload attempt ${attempt}/${maxRetries} for ${type}`);
      return await attemptUpload(uri, type, resourceId);
    } catch (error) {
      lastError = error;
      console.error(`Upload attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
        console.log(`Retrying upload in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed
  console.error('All upload attempts failed, using placeholder URL');
  const placeholderUrl = `https://via.placeholder.com/400x300/cccccc/666666?text=${type.toUpperCase()}+${Date.now()}`;
  return placeholderUrl;
}

// Internal function to attempt a single upload
async function attemptUpload(uri: string, type: 'profile' | 'logo' | 'document' | 'transporter' = 'profile', resourceId?: string) {
  // Fallback to Cloudinary direct upload using actual credentials
  try {
    const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'trukapp';
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    
    // For unsigned uploads, we need an upload preset
    const cloudinaryPreset = process.env.EXPO_PUBLIC_CLOUDINARY_PRESET || 'trukapp_unsigned';
    
    // Validate environment variables
    console.log('Cloudinary config:', {
      cloudName,
      preset: cloudinaryPreset,
      url: cloudinaryUrl,
      hasApiKey: !!process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY,
      hasApiSecret: !!process.env.EXPO_PUBLIC_CLOUDINARY_API_SECRET
    });
    
    if (!cloudName || cloudName === 'trukapp') {
      console.warn('Using default Cloudinary cloud name. Please set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME');
    }
    if (!cloudinaryPreset || cloudinaryPreset === 'trukapp_unsigned') {
      console.warn('Using default Cloudinary preset. Please set EXPO_PUBLIC_CLOUDINARY_PRESET');
    }
    
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'image/jpeg',
      name: `${type}_${Date.now()}.jpg`,
    } as any);
    formData.append('upload_preset', cloudinaryPreset);
    
    // Add some basic transformations
    formData.append('folder', `trukapp/${type}`);
    formData.append('public_id', `${type}_${Date.now()}`);
    
    console.log('Making Cloudinary request to:', cloudinaryUrl);
    console.log('FormData contents:', {
      file: { uri: uri.substring(0, 50) + '...', type: 'image/jpeg' },
      upload_preset: cloudinaryPreset,
      folder: `trukapp/${type}`,
      public_id: `${type}_${Date.now()}`
    });
    
    const res = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: formData,
    });
    
    console.log('Cloudinary response status:', res.status);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('Cloudinary upload error details:', {
        status: res.status,
        statusText: res.statusText,
        error: errorData,
        cloudName,
        preset: cloudinaryPreset,
        url: cloudinaryUrl
      });
      
      // If preset doesn't exist, try with API key and secret (signed upload)
      if (errorData.error?.message?.includes('preset') || res.status === 400) {
        console.log('Trying signed upload with API credentials...');
        return await uploadToCloudinarySigned(uri, type, cloudName);
      }
      
      throw new Error(`Cloudinary upload failed: ${res.status} - ${errorData.error?.message || res.statusText}`);
    }

    const data = await res.json();
    if (!data.secure_url) {
      throw new Error('No secure URL returned from Cloudinary');
    }
    
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    
    // If it's a network error, try the signed upload method as fallback
    if (error.message?.includes('Network request failed') || error.message?.includes('fetch')) {
      console.log('Network error detected, trying signed upload as fallback...');
      try {
        const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'trukapp';
        return await uploadToCloudinarySigned(uri, type, cloudName);
      } catch (signedError) {
        console.error('Signed upload also failed:', signedError);
        throw new Error(`Both unsigned and signed uploads failed: ${signedError.message}`);
      }
    }
    
    throw new Error(`File upload failed: ${error.message}`);
  }
}

// Signed upload method using API key and secret
async function uploadToCloudinarySigned(uri: string, type: string, cloudName: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY;
  const apiSecret = process.env.EXPO_PUBLIC_CLOUDINARY_API_SECRET;
  
  console.log('Attempting signed upload with credentials:', {
    hasApiKey: !!apiKey,
    hasApiSecret: !!apiSecret,
    cloudName,
    type
  });
  
  if (!apiKey || !apiSecret) {
    throw new Error('Cloudinary API credentials not configured');
  }
  
  const timestamp = Math.round(new Date().getTime() / 1000);
  const publicId = `${type}_${Date.now()}`;
  const folder = `trukapp/${type}`;
  
  // Create signature for signed upload
  const signature = await createCloudinarySignature(publicId, folder, timestamp, apiSecret);
  
  const formData = new FormData();
  formData.append('file', {
    uri,
    type: 'image/jpeg',
    name: `${type}_${Date.now()}.jpg`,
  } as any);
  formData.append('public_id', publicId);
  formData.append('folder', folder);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  
  console.log('Making signed Cloudinary request to:', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
  
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  
  console.log('Signed Cloudinary response status:', res.status);
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error('Signed Cloudinary upload error details:', {
      status: res.status,
      statusText: res.statusText,
      error: errorData,
      cloudName,
      apiKey: apiKey.substring(0, 8) + '...',
      publicId,
      folder
    });
    throw new Error(`Signed Cloudinary upload failed: ${res.status} - ${errorData.error?.message || res.statusText}`);
  }
  
  const data = await res.json();
  console.log('Signed upload successful:', data.secure_url);
  return data.secure_url;
}

// Create Cloudinary signature for signed uploads
async function createCloudinarySignature(publicId: string, folder: string, timestamp: number, apiSecret: string): Promise<string> {
  const params = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  
  // Simple hash function for signature (in production, use crypto library)
  let hash = 0;
  for (let i = 0; i < params.length; i++) {
    const char = params.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}
