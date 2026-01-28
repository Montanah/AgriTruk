import { signOut } from 'firebase/auth';
import { Alert } from 'react-native';
import { auth } from '../firebaseConfig';
import CustomAlert from '../components/common/CustomAlert';

/**
 * Common logout function that handles sign out and navigation
 * This function ensures consistent logout behavior across all profile screens
 */
export const handleLogout = async (navigation?: any) => {
  try {
    // Sign out from Firebase
    await signOut(auth);
    
    // Navigate to Welcome screen immediately
    if (navigation) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
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
