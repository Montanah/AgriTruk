import { Alert, Linking, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export interface PermissionResult {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}

/**
 * Request camera permission with proper error handling and settings redirect
 */
export const requestCameraPermission = async (): Promise<PermissionResult> => {
  try {
    const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status === 'granted') {
      return { granted: true, canAskAgain, status };
    }
    
    if (status === 'denied' && canAskAgain) {
      // Permission was denied but we can ask again
      return { granted: false, canAskAgain, status };
    }
    
    if (status === 'denied' && !canAskAgain) {
      // Permission was permanently denied, redirect to settings
      showPermissionDeniedAlert('Camera', 'camera');
      return { granted: false, canAskAgain, status };
    }
    
    return { granted: false, canAskAgain, status };
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return { granted: false, canAskAgain: false, status: 'error' };
  }
};

/**
 * Request media library permission with proper error handling and settings redirect
 */
export const requestMediaLibraryPermission = async (): Promise<PermissionResult> => {
  try {
    const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status === 'granted') {
      return { granted: true, canAskAgain, status };
    }
    
    if (status === 'denied' && canAskAgain) {
      // Permission was denied but we can ask again
      return { granted: false, canAskAgain, status };
    }
    
    if (status === 'denied' && !canAskAgain) {
      // Permission was permanently denied, redirect to settings
      showPermissionDeniedAlert('Media Library', 'photos');
      return { granted: false, canAskAgain, status };
    }
    
    return { granted: false, canAskAgain, status };
  } catch (error) {
    console.error('Error requesting media library permission:', error);
    return { granted: false, canAskAgain: false, status: 'error' };
  }
};

/**
 * Show permission denied alert with option to open settings
 */
const showPermissionDeniedAlert = (permissionName: string, settingsKey: string) => {
  Alert.alert(
    'Permission Required',
    `${permissionName} permission is required to select photos. Please enable it in your device settings.`,
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Open Settings',
        onPress: () => openAppSettings(settingsKey),
      },
    ]
  );
};

/**
 * Open device settings for the app
 */
const openAppSettings = async (settingsKey: string) => {
  try {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      // Android - open app settings
      await Linking.openSettings();
    }
  } catch (error) {
    console.error('Error opening settings:', error);
    // Fallback to general settings
    try {
      await Linking.openSettings();
    } catch (fallbackError) {
      console.error('Error opening fallback settings:', fallbackError);
    }
  }
};

/**
 * Check if camera permission is granted
 */
export const checkCameraPermission = async (): Promise<boolean> => {
  try {
    const { status } = await ImagePicker.getCameraPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking camera permission:', error);
    return false;
  }
};

/**
 * Check if media library permission is granted
 */
export const checkMediaLibraryPermission = async (): Promise<boolean> => {
  try {
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking media library permission:', error);
    return false;
  }
};

/**
 * Handle image picker with proper permission flow
 */
export const handleImagePicker = async (
  source: 'camera' | 'gallery',
  options?: ImagePicker.ImagePickerOptions
): Promise<ImagePicker.ImagePickerResult | null> => {
  try {
    let permissionResult: PermissionResult;
    
    if (source === 'camera') {
      permissionResult = await requestCameraPermission();
    } else {
      permissionResult = await requestMediaLibraryPermission();
    }
    
    if (!permissionResult.granted) {
      return null;
    }
    
    // Launch the appropriate picker
    if (source === 'camera') {
      return await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        ...options,
      });
    } else {
      return await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        ...options,
      });
    }
  } catch (error) {
    console.error('Error in handleImagePicker:', error);
    return null;
  }
};
