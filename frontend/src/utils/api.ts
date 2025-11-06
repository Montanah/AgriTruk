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
  console.log('🔥 API REQUEST CALLED:', endpoint);
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
        console.log('✅ Firebase token obtained successfully');
      } catch (tokenError) {
        console.warn('Failed to get Firebase token:', tokenError);
        // For network errors, try to get cached token
        if (tokenError.message?.includes('network-request-failed')) {
          try {
            token = await user.getIdToken(false); // Try cached token
            console.log('✅ Using cached Firebase token');
          } catch (cachedError) {
            console.warn('Failed to get cached Firebase token:', cachedError);
            // Continue without token - some endpoints might not require auth
          }
        } else {
          // Continue without token - some endpoints might not require auth
        }
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
    
    // Detect if body is FormData to avoid setting Content-Type
    const isFormData = options.body instanceof FormData;
    
    console.log('🔍 FormData detection:', {
      isFormData,
      bodyType: typeof options.body,
      bodyConstructor: options.body?.constructor?.name,
      isFormDataInstance: options.body instanceof FormData,
      hasBody: !!options.body
    });
    
    // For FormData, don't set Content-Type at all - let React Native handle it
    const headers = {
      // Only set Content-Type for non-FormData requests
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token && !hasCustomAuth ? { Authorization: `Bearer ${token}` } : {}), // Add token if no custom auth provided
      ...options.headers, // Custom headers last to override defaults
    };
    
    // Remove Content-Type completely for FormData to let React Native set it
    if (isFormData && headers['Content-Type']) {
      delete headers['Content-Type'];
    }
    
    console.log('Final headers:', {
      'Content-Type': headers['Content-Type'],
      'Authorization': headers.Authorization ? `${headers.Authorization.substring(0, 20)}...` : 'None'
    });

    // API request details

    // Making fetch request
    const fullUrl = `${API_BASE}${endpoint}`;
    console.log('🌐 Making API request to:', fullUrl);
    console.log('📝 Request options:', {
      method: options.method || 'GET',
      headers: headers,
      bodyLength: options.body ? options.body.length : 0
    });
    console.log('🔗 Full URL constructed:', fullUrl);
    
    // Log the actual request body for debugging
    if (options.body) {
      console.log('📦 Request body:', options.body);
    }

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const res = await fetch(fullUrl, {
      ...options,
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    // API response details
    console.log('📡 Response status:', res.status, res.statusText);
    console.log('📡 Response headers:', Object.fromEntries(res.headers.entries()));
    
    const data = await res.json();
    console.log('📄 Response data:', data);

    if (!res.ok) {
      // Log error details for debugging (but don't show to user for expected 404s)
      if (res.status !== 404) {
        console.error('API Error Response:', {
          status: res.status,
          statusText: res.statusText,
          data: data
        });
      }
      
      // Handle specific authentication errors
      if (res.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (res.status === 403) {
        throw new Error("Access denied. You don't have permission for this action.");
      } else if (res.status === 404) {
        // 404 is expected for empty resources - throw a specific error that can be caught
        const notFoundError: any = new Error(data.message || 'Resource not found');
        notFoundError.status = 404;
        notFoundError.isNotFound = true; // Flag to indicate this is an expected 404
        throw notFoundError;
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
    // Skip logging for expected 404 errors (empty resources)
    if (error?.isNotFound && error?.status === 404) {
      // Re-throw 404 errors silently - they're expected for empty resources
      throw error;
    }
    
    // API error details - handle Error objects properly
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStatus = error?.status || error?.response?.status || 'N/A';
    const errorData = error?.response?.data || error?.data || null;
    
    // Only log non-404 errors
    if (errorStatus !== 404) {
      console.error('🚨 API Request Error:', errorMessage);
      console.error('🚨 Error status:', errorStatus);
      if (errorData) {
        console.error('🚨 Error data:', errorData);
      }
    }

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
      // Preserve the original error message instead of masking it
      throw error;
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
  // All retries failed - throw the last error to allow caller to display a proper failure
  throw lastError;
}

// Upload to backend instead of Cloudinary
async function uploadToBackend(uri: string, type: 'profile' | 'logo' | 'document' | 'transporter' = 'profile', resourceId?: string) {
  try {
    console.log(`📤 Uploading ${type} to backend...`);
    console.log(`📤 File URI:`, uri);
    console.log(`📤 Resource ID:`, resourceId);
    
    // Get Firebase Auth token for backend authentication
    const { getAuth } = require('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const token = await user.getIdToken();
    console.log(`📤 Using Firebase token for authentication`);
    
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'image/jpeg',
      name: `${type}_${Date.now()}.jpg`,
    } as any);
    formData.append('type', type);
    if (resourceId) {
      formData.append('resourceId', resourceId);
    }
    
    // Try different upload endpoints
    const uploadUrl = `${API_BASE}/upload`;
    console.log(`📤 Upload URL:`, uploadUrl);
    
    // If /upload doesn't exist, we might need to use a different approach
    // Let's try the vehicles endpoint with file upload
    console.log(`📤 Note: If /upload fails, we may need to use vehicle endpoint with FormData`);
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type for FormData
      },
    });
    
    console.log(`📤 Upload response status:`, response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`📤 Upload failed:`, errorText);
      throw new Error(`Backend upload failed: ${response.status} - ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`📤 Upload response data:`, data);
    
    if (!data.url) {
      throw new Error('No URL returned from backend upload');
    }
    
    console.log(`✅ Backend upload successful:`, data.url);
    return data.url;
  } catch (error) {
    console.error('❌ Backend upload error:', error);
    throw error;
  }
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
    
    // Always use backend upload since Cloudinary credentials are on the backend
    console.log('📤 Using backend upload (Cloudinary credentials are on backend)...');
    const backendResult = await uploadToBackend(uri, type, resourceId);
    console.log('✅ Backend upload successful:', backendResult);
    return backendResult;
    
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
    
    // Create timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Cloudinary upload timeout after 30 seconds');
      controller.abort();
    }, 30000);

    const res = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData - let the browser set it
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    
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
        throw signedError;
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
