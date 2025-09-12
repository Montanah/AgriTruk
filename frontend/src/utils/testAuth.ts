import { getAuth } from 'firebase/auth';
import { API_ENDPOINTS } from '../constants/api';
import { apiRequest } from './api';

export async function testAuthentication() {
  try {
    console.log('🔍 TESTING AUTHENTICATION STATUS');
    console.log('='.repeat(50));
    
    const auth = getAuth();
    const user = auth.currentUser;
    
    console.log('👤 Current user:', user ? 'Authenticated' : 'Not authenticated');
    console.log('👤 User UID:', user?.uid || 'No UID');
    console.log('👤 User email:', user?.email || 'No email');
    
    if (user) {
      try {
        const token = await user.getIdToken(true);
        console.log('🔑 Token obtained:', token ? 'Success' : 'Failed');
        console.log('🔑 Token preview:', token ? `${token.substring(0, 30)}...` : 'No token');
        
        // Test API call with token
        console.log('🚀 Testing API call...');
        const result = await apiRequest('/transporters/available/list', {}, {
          screen: 'TestAuth',
          action: 'test_api_call'
        });
        
        console.log('✅ API call successful:', result);
        return { success: true, result };
      } catch (tokenError) {
        console.error('❌ Token error:', tokenError);
        return { success: false, error: 'Token error', details: tokenError };
      }
    } else {
      console.log('❌ No authenticated user');
      return { success: false, error: 'No authenticated user' };
    }
  } catch (error) {
    console.error('❌ Authentication test failed:', error);
    return { success: false, error: 'Test failed', details: error };
  }
}

export async function testBackendWithoutAuth() {
  try {
    console.log('🔍 TESTING BACKEND WITHOUT AUTH');
    console.log('='.repeat(50));
    
    const response = await fetch(API_ENDPOINTS.HEALTH, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    console.log('✅ Backend health check:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Backend test failed:', error);
    return { success: false, error: 'Backend test failed', details: error };
  }
}
