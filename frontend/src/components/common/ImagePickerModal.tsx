import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, fonts, spacing } from '../../constants';

interface ImagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (image: any) => void;
  title?: string;
  allowsEditing?: boolean;
  quality?: number;
  aspect?: [number, number];
}

const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
  visible,
  onClose,
  onImageSelected,
  title = 'Select Image',
  allowsEditing = true,
  quality = 0.8,
  aspect,
}) => {
  const [loading, setLoading] = useState(false);

  const requestCameraPermission = async () => {
    // Use ImagePicker permission flow on all platforms
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  };

  const requestMediaLibraryPermission = async () => {
    // Use ImagePicker permission flow on all platforms (covers Android 13+ READ_MEDIA_IMAGES)
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  };

  const handleCameraPress = async () => {
    setLoading(true);
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        setLoading(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing,
        quality,
        aspect,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        onImageSelected({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || 'photo.jpg',
          width: asset.width,
          height: asset.height,
        });
        onClose();
      } else if (result.canceled) {
        onClose();
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleGalleryPress = async () => {
    setLoading(true);
    try {
      const hasPermission = await requestMediaLibraryPermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Media library permission is required to select photos.');
        setLoading(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing,
        quality,
        aspect,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        onImageSelected({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || 'photo.jpg',
          width: asset.width,
          height: asset.height,
        });
        onClose();
      } else if (result.canceled) {
        onClose();
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to open gallery. Please try again.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{title}</Text>
          
          <TouchableOpacity
            style={[styles.option, loading && styles.optionDisabled]}
            onPress={handleCameraPress}
            disabled={loading}
          >
            <Ionicons name="camera" size={24} color={colors.primary} />
            <Text style={styles.optionText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, loading && styles.optionDisabled]}
            onPress={handleGalleryPress}
            disabled={loading}
          >
            <Ionicons name="images" size={24} color={colors.primary} />
            <Text style={styles.optionText}>Choose from Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    width: '80%',
    maxWidth: 300,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionText: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    backgroundColor: colors.error + '10',
    marginTop: spacing.sm,
  },
  cancelText: {
    fontSize: fonts.size.md,
    color: colors.error,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default ImagePickerModal;