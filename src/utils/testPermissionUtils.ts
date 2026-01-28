// Test file for permission utilities
import { handleImagePicker, requestCameraPermission, requestMediaLibraryPermission } from './permissionUtils';

export const testPermissionUtils = async () => {
  console.log('Testing permission utilities...');
  
  try {
    // Test camera permission
    console.log('Testing camera permission...');
    const cameraResult = await requestCameraPermission();
    console.log('Camera permission result:', cameraResult);
    
    // Test media library permission
    console.log('Testing media library permission...');
    const mediaResult = await requestMediaLibraryPermission();
    console.log('Media library permission result:', mediaResult);
    
    // Test image picker (camera)
    console.log('Testing camera image picker...');
    const cameraImage = await handleImagePicker('camera', {
      allowsEditing: true,
      quality: 0.8,
    });
    console.log('Camera image picker result:', cameraImage);
    
    // Test image picker (gallery)
    console.log('Testing gallery image picker...');
    const galleryImage = await handleImagePicker('gallery', {
      allowsEditing: true,
      quality: 0.8,
    });
    console.log('Gallery image picker result:', galleryImage);
    
    console.log('Permission utilities test completed successfully!');
    return true;
  } catch (error) {
    console.error('Permission utilities test failed:', error);
    return false;
  }
};
