// Firebase connection test utility
import { db, auth } from '../firebaseConfig';

export const testFirebaseConnection = async () => {
  console.log('🧪 Testing Firebase connection...');
  
  try {
    // Test 1: Check if Firebase is initialized
    if (!db || !auth) {
      console.error('❌ Firebase not initialized');
      return false;
    }
    
    console.log('✅ Firebase initialized');
    
    // Test 2: Check auth state
    const user = auth.currentUser;
    console.log('👤 Current user:', user ? user.uid : 'No user');
    
    // Test 3: Test Firestore connection (without authentication)
    try {
      const { collection, getDocs, limit, query } = await import('firebase/firestore');
      const testQuery = query(collection(db, 'test'), limit(1));
      await getDocs(testQuery);
      console.log('✅ Firestore connection successful');
      return true;
    } catch (firestoreError: any) {
      console.warn('⚠️ Firestore connection failed:', firestoreError.message);
      
      // Check if it's a network error
      if (firestoreError.code === 'unavailable' || firestoreError.message.includes('network')) {
        console.log('🌐 Network connectivity issue detected');
        console.log('💡 This might be due to:');
        console.log('   - Internet connection problems');
        console.log('   - Firebase project not properly configured');
        console.log('   - Firestore not enabled in Firebase console');
        console.log('   - Network restrictions or firewall');
      }
      
      return false;
    }
  } catch (error: any) {
    console.error('❌ Firebase test failed:', error.message);
    return false;
  }
};

export const checkFirebaseProjectStatus = () => {
  console.log('🔍 Firebase Project Status Check:');
  console.log('   Project ID: agritruk-d543b');
  console.log('   Auth Domain: agritruk-d543b.firebaseapp.com');
  console.log('   Storage Bucket: agritruk-d543b.firebasestorage.app');
  console.log('');
  console.log('💡 To fix Firestore connection issues:');
  console.log('   1. Go to Firebase Console: https://console.firebase.google.com/');
  console.log('   2. Select project: agritruk-d543b');
  console.log('   3. Enable Firestore Database in the left sidebar');
  console.log('   4. Create database in production mode');
  console.log('   5. Set up security rules');
  console.log('   6. Check if your IP is not blocked');
};

