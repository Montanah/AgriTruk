import { signOut } from 'firebase/auth';
import { Alert } from 'react-native';
import { auth } from '../firebaseConfig';

/**
 * Common logout function that handles sign out and navigation
 * This function ensures consistent logout behavior across all profile screens
 */
export const handleLogout = async (navigation?: any) => {
  try {
    // Sign out from Firebase
    await signOut(auth);
    
    // Force a small delay to ensure auth state change is processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // If navigation is provided, try to navigate to Welcome screen
    if (navigation) {
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Welcome' }],
        });
      } catch (navError) {
        // Don't throw here - logout was successful even if navigation failed
      }
    }
  } catch (error) {
    Alert.alert('Logout Error', 'Failed to logout. Please try again.');
    throw error;
  }
};

/**
 * Logout with confirmation dialog
 */
export const handleLogoutWithConfirmation = (navigation?: any) => {
  Alert.alert(
    'Logout',
    'Are you sure you want to logout?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => handleLogout(navigation),
      },
    ]
  );
};
