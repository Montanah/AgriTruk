import { getAuth } from 'firebase/auth';
import { API_ENDPOINTS } from '../constants/api';
import { apiRequest } from './api';

export async function testAuthentication() {
  try {
    // Testing authentication status
    
    const auth = getAuth();
    const user = auth.currentUser;
    
    // Current user status
    
    if (user) {
      try {
        const token = await user.getIdToken(true);
        // Token obtained
        
        // Test API call with token
        // Testing API call
        const result = await apiRequest('/transporters/available/list', {}, {
          screen: 'TestAuth',
          action: 'test_api_call'
        });
        
        // API call successful
        return { success: true, result };
      } catch (tokenError) {
        console.error('❌ Token error:', tokenError);
        return { success: false, error: 'Token error', details: tokenError };
      }
    } else {
      // No authenticated user
      return { success: false, error: 'No authenticated user' };
    }
  } catch (error) {
    console.error('❌ Authentication test failed:', error);
    return { success: false, error: 'Test failed', details: error };
  }
}

export async function testBackendWithoutAuth() {
  try {
    // Testing backend without auth
    
    const response = await fetch(API_ENDPOINTS.HEALTH, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    // Backend health check successful
    return { success: true, data };
  } catch (error) {
    console.error('❌ Backend test failed:', error);
    return { success: false, error: 'Backend test failed', details: error };
  }
}
