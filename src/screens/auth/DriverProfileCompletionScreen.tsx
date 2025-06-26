import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import colors from '../../constants/colors';
import { spacing, fonts } from '../../constants';

const vehicleTypes = [
  { key: 'van', label: 'Van' },
  { key: 'truck', label: 'Truck' },
  { key: 'pickup', label: 'Pickup' },
  { key: 'refrigerated', label: 'Refrigerated Truck' },
  { key: 'other', label: 'Other' },
];

const DriverProfileCompletionScreen = ({ navigation, route }) => {
  const [vehicleType, setVehicleType] = useState('');
  const [logbookImage, setLogbookImage] = useState(null);
  const [vehiclePhotos, setVehiclePhotos] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const pickImage = async (setImage) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0]);
    }
  };

  const pickMultipleImages = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setVehiclePhotos(result.assets.slice(0, 5));
    }
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const { uploadToCloudinary, apiRequest } = await import('../../utils/api');
      // Upload logbook
      let logbookUrl = '';
      if (logbookImage) {
        logbookUrl = await uploadToCloudinary(logbookImage.uri);
      }
      // Upload vehicle photos
      let vehiclePhotoUrls = [];
      for (const photo of vehiclePhotos) {
        const url = await uploadToCloudinary(photo.uri);
        vehiclePhotoUrls.push(url);
      }
      // Send to backend
      await apiRequest('/auth/update', {
        method: 'PUT',
        body: JSON.stringify({
          vehicleType,
          logbookUrl,
          vehiclePhotoUrls,
        }),
      });
      navigation.navigate('MainTabs');
    } catch (err) {
      setError('Failed to complete profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Complete Your Driver Profile</Text>
          <Text style={styles.subtitle}>
            Add your vehicle details and documents to activate your account.
          </Text>
          <Text style={styles.label}>Vehicle Type</Text>
          <View style={styles.vehicleTypeRow}>
            {vehicleTypes.map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.vehicleTypeBtn,
                  vehicleType === type.key && { backgroundColor: colors.primary },
                ]}
                onPress={() => setVehicleType(type.key)}
              >
                <MaterialCommunityIcons
                  name="truck"
                  size={20}
                  color={vehicleType === type.key ? colors.white : colors.primary}
                />
                <Text
                  style={[
                    styles.vehicleTypeText,
                    vehicleType === type.key && { color: colors.white },
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Logbook (Proof of Ownership)</Text>
          <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage(setLogbookImage)}>
            <Ionicons name="cloud-upload-outline" size={22} color={colors.secondary} />
            <Text style={styles.uploadBtnText}>
              {logbookImage ? 'Change Logbook Image' : 'Upload Logbook Image'}
            </Text>
          </TouchableOpacity>
          {logbookImage && <Image source={{ uri: logbookImage.uri }} style={styles.previewImage} />}
          <Text style={styles.label}>Vehicle Photos (3-5)</Text>
          <TouchableOpacity style={styles.uploadBtn} onPress={pickMultipleImages}>
            <Ionicons name="cloud-upload-outline" size={22} color={colors.secondary} />
            <Text style={styles.uploadBtnText}>Upload Vehicle Photos</Text>
          </TouchableOpacity>
          <View style={styles.photoRow}>
            {vehiclePhotos.map((photo, idx) => (
              <Image key={idx} source={{ uri: photo.uri }} style={styles.previewThumb} />
            ))}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={loading || !vehicleType || !logbookImage || vehiclePhotos.length < 3}
          >
            <Text style={styles.submitBtnText}>
              {loading ? 'Submitting...' : 'Complete Profile'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 36 : 48,
    left: 0,
    zIndex: 10,
    padding: 8,
  },
  title: {
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.md,
    fontFamily: fonts.family.bold,
    letterSpacing: 0.5,
    marginTop: spacing.xl,
  },
  subtitle: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  label: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  vehicleTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
    width: '100%',
    justifyContent: 'flex-start',
  },
  vehicleTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    marginRight: 10,
    marginBottom: 10,
  },
  vehicleTypeText: {
    fontSize: fonts.size.md,
    marginLeft: 6,
    fontWeight: '600',
    color: colors.primary,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginBottom: spacing.sm,
    marginTop: 2,
  },
  uploadBtnText: {
    color: colors.secondary,
    fontWeight: '600',
    fontSize: fonts.size.md,
    marginLeft: 8,
  },
  previewImage: {
    width: 180,
    height: 120,
    borderRadius: 10,
    marginBottom: spacing.md,
    marginTop: 2,
  },
  photoRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    width: '100%',
    flexWrap: 'wrap',
  },
  previewThumb: {
    width: 70,
    height: 50,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  error: {
    color: colors.error,
    marginBottom: spacing.md,
    fontSize: fonts.size.md,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  submitBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: fonts.size.md,
  },
});

export default DriverProfileCompletionScreen;
