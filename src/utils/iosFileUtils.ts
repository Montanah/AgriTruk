import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

/**
 * iOS-specific file utilities to prevent crashes
 */

export interface IOSFileObject {
  uri: string;
  type: string;
  name: string;
  fileName: string;
  fileType: string;
}

/**
 * Validate if a file URI exists and is accessible
 */
export const validateFileUri = async (uri: string): Promise<boolean> => {
  try {
    if (!uri) return false;
    
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(uri);
    return fileInfo.exists;
  } catch (error) {
    console.error('Error validating file URI:', error);
    return false;
  }
};

/**
 * Create iOS-compatible file object for FormData
 */
export const createIOSFileObject = (
  asset: any,
  defaultName: string,
  defaultType: string = 'image/jpeg'
): IOSFileObject => {
  const fileName = asset.fileName || asset.name || defaultName;
  const fileType = asset.type || asset.mimeType || defaultType;
  
  return {
    uri: asset.uri,
    type: fileType,
    name: fileName,
    fileName: fileName,
    fileType: fileType,
  };
};

/**
 * Validate image asset for iOS compatibility
 */
export const validateImageAsset = (asset: any): boolean => {
  if (!asset) return false;
  
  // Check required properties
  if (!asset.uri) return false;
  if (!asset.width || !asset.height) return false;
  
  // Additional iOS-specific validations
  if (Platform.OS === 'ios') {
    // Ensure URI is properly formatted
    if (!asset.uri.startsWith('file://') && !asset.uri.startsWith('content://')) {
      return false;
    }
  }
  
  return true;
};

/**
 * Safe file append to FormData with iOS compatibility
 */
export const safeAppendFile = (
  formData: FormData,
  fieldName: string,
  asset: any,
  defaultName: string,
  defaultType: string = 'image/jpeg'
): boolean => {
  try {
    if (!validateImageAsset(asset)) {
      console.warn(`Invalid asset for field ${fieldName}:`, asset);
      return false;
    }
    
    const fileObj = createIOSFileObject(asset, defaultName, defaultType);
    formData.append(fieldName, fileObj as any);
    return true;
  } catch (error) {
    console.error(`Error appending file ${fieldName}:`, error);
    return false;
  }
};

/**
 * Get proper MIME type for file
 */
export const getMimeType = (uri: string, fallback: string = 'image/jpeg'): string => {
  if (!uri) return fallback;
  
  const extension = uri.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  
  return mimeTypes[extension || ''] || fallback;
};

/**
 * iOS-specific error messages
 */
export const getIOSErrorMessage = (error: any): string => {
  if (Platform.OS !== 'ios') return 'An error occurred';
  
  const errorMessage = error?.message || error?.toString() || 'Unknown error';
  
  // Common iOS-specific error patterns
  if (errorMessage.includes('NSURLErrorDomain')) {
    return 'Network error. Please check your connection and try again.';
  }
  
  if (errorMessage.includes('NSFileManager')) {
    return 'File access error. Please try selecting the file again.';
  }
  
  if (errorMessage.includes('UIImagePickerController')) {
    return 'Image picker error. Please try again.';
  }
  
  if (errorMessage.includes('AVFoundation')) {
    return 'Camera error. Please check camera permissions and try again.';
  }
  
  return errorMessage;
};
