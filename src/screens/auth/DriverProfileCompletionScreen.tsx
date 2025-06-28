import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, fonts } from '../../constants';

const VEHICLE_TYPES = [
  { label: 'Truck', value: 'truck', icon: <FontAwesome5 name="truck" size={20} color={colors.primary} /> },
  { label: 'Van', value: 'van', icon: <MaterialCommunityIcons name="van-utility" size={22} color={colors.primary} /> },
  { label: 'Pickup', value: 'pickup', icon: <MaterialCommunityIcons name="pickup-truck" size={22} color={colors.primary} /> },
  { label: 'Refrigerated Truck', value: 'refrigerated_truck', icon: <MaterialCommunityIcons name="snowflake" size={20} color={colors.primary} /> },
  { label: 'Other', value: 'other', icon: <Ionicons name="car-outline" size={20} color={colors.primary} /> },
];

export default function DriverProfileCompletionScreen() {
  const [vehicleType, setVehicleType] = useState('');
  const [registration, setRegistration] = useState('');
  const [humidityControl, setHumidityControl] = useState(false);
  const [refrigeration, setRefrigeration] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [vehiclePhotos, setVehiclePhotos] = useState([]);
  const [dlFile, setDlFile] = useState(null); // can be image or pdf
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [logBookFile, setLogBookFile] = useState(null); // can be image or pdf

  // Image picker helper
  const pickImage = async (onPick) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      onPick(result.assets[0]);
    }
  };

  const handleAddVehiclePhoto = () => {
    pickImage((img) => setVehiclePhotos((prev) => [...prev, img]));
  };

  const handleRemoveVehiclePhoto = (idx) => {
    setVehiclePhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleProfilePhoto = () => {
    pickImage(setProfilePhoto);
  };

  const handleDlPhoto = () => {
    pickImage(setDlPhoto);
  };

  const isValid = () => {
    return (
      vehicleType &&
      registration &&
      profilePhoto &&
      dlFile &&
      logBookFile &&
      vehiclePhotos.length > 0
    );
  };

  const handleDlFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setDlFile(result.assets[0]);
    }
  };

  const handleLogBookFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setLogBookFile(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setUploading(true);
    try {
      // TODO: Upload images to backend/cloud, get URLs, and save all data to Firestore
      // Example: await uploadProfile({ vehicleType, registration, humidityControl, refrigeration, ... })
      // Simulate upload
      await new Promise((res) => setTimeout(res, 1800));
      // Success: navigate or show success message
    } catch (e) {
      setError('Failed to submit profile. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Complete Your Driver Profile</Text>
      <Text style={styles.sectionTitle}>Profile Photo</Text>
      <TouchableOpacity style={styles.photoPicker} onPress={handleProfilePhoto}>
        {profilePhoto ? (
          <Image source={{ uri: profilePhoto.uri }} style={styles.profilePhoto} />
        ) : (
          <Ionicons name="person-circle-outline" size={80} color={colors.text.light} />
        )}
        <Text style={styles.photoPickerText}>Upload Profile Photo</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Vehicle Details</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Vehicle Type</Text>
        <View style={styles.vehicleTypeRow}>
          {VEHICLE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[styles.vehicleTypeBtn, vehicleType === type.value && styles.vehicleTypeBtnActive]}
              onPress={() => setVehicleType(type.value)}
            >
              {type.icon}
              <Text style={[styles.vehicleTypeText, vehicleType === type.value && { color: colors.white }]}>{type.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Registration Number</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. KDA 123A"
          value={registration}
          onChangeText={setRegistration}
          autoCapitalize="characters"
        />
        <View style={styles.switchRow}>
          <Text style={styles.label}>Humidity Control Facility</Text>
          <Switch
            value={humidityControl}
            onValueChange={setHumidityControl}
            thumbColor={humidityControl ? colors.primary : '#ccc'}
            trackColor={{ true: colors.primary, false: '#ccc' }}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Refrigeration Facility</Text>
          <Switch
            value={refrigeration}
            onValueChange={setRefrigeration}
            thumbColor={refrigeration ? colors.primary : '#ccc'}
            trackColor={{ true: colors.primary, false: '#ccc' }}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Vehicle Photos</Text>
      <View style={styles.photoRow}>
        {vehiclePhotos.map((img, idx) => (
          <View key={idx} style={styles.vehiclePhotoWrap}>
            <Image source={{ uri: img.uri }} style={styles.vehiclePhoto} />
            <TouchableOpacity style={styles.removePhotoBtn} onPress={() => handleRemoveVehiclePhoto(idx)}>
              <Ionicons name="close-circle" size={22} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}
        {vehiclePhotos.length < 4 && (
          <TouchableOpacity style={styles.addPhotoBtn} onPress={handleAddVehiclePhoto}>
            <Ionicons name="add-circle" size={38} color={colors.primary} />
            <Text style={styles.addPhotoText}>Add Photo</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionTitle}>Driver's License (Image or PDF)</Text>
      <TouchableOpacity style={styles.photoPicker} onPress={handleDlFile}>
        {dlFile ? (
          dlFile.mimeType && dlFile.mimeType.startsWith('image/') ? (
            <Image source={{ uri: dlFile.uri }} style={styles.dlPhoto} />
          ) : (
            <View style={{ alignItems: 'center' }}>
              <MaterialCommunityIcons name="file-pdf-box" size={60} color={colors.error} />
              <Text style={{ color: colors.text.secondary, marginTop: 4 }}>{dlFile.name || 'PDF File'}</Text>
            </View>
          )
        ) : (
          <MaterialCommunityIcons name="card-account-details-outline" size={60} color={colors.text.light} />
        )}
        <Text style={styles.photoPickerText}>Upload Driver's License</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Log Book Copy (Image or PDF)</Text>
      <TouchableOpacity style={styles.photoPicker} onPress={handleLogBookFile}>
        {logBookFile ? (
          logBookFile.mimeType && logBookFile.mimeType.startsWith('image/') ? (
            <Image source={{ uri: logBookFile.uri }} style={styles.dlPhoto} />
          ) : (
            <View style={{ alignItems: 'center' }}>
              <MaterialCommunityIcons name="file-pdf-box" size={60} color={colors.error} />
              <Text style={{ color: colors.text.secondary, marginTop: 4 }}>{logBookFile.name || 'PDF File'}</Text>
            </View>
          )
        ) : (
          <MaterialCommunityIcons name="book-open-variant" size={60} color={colors.text.light} />
        )}
        <Text style={styles.photoPickerText}>Upload Log Book Copy</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: isValid() ? colors.primary : colors.text.light }]}
        onPress={handleSubmit}
        disabled={!isValid() || uploading}
      >
        {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Profile</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    alignItems: 'center',
    flexGrow: 1,
  },
  header: {
    fontSize: fonts.size.xl + 2,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.lg,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.secondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    width: '100%',
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1.2,
    borderColor: colors.text.light,
    borderRadius: 10,
    padding: 12,
    fontSize: fonts.size.md,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
    width: '100%',
  },
  vehicleTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
    marginTop: 2,
  },
  vehicleTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 10,
    marginBottom: 10,
    backgroundColor: colors.white,
  },
  vehicleTypeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  vehicleTypeText: {
    fontSize: fonts.size.md,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  photoPicker: {
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: 2,
    width: '100%',
  },
  photoPickerText: {
    color: colors.primary,
    fontWeight: 'bold',
    marginTop: 6,
    fontSize: fonts.size.md,
  },
  profilePhoto: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 6,
    backgroundColor: '#eee',
  },
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: spacing.md,
    width: '100%',
  },
  vehiclePhotoWrap: {
    position: 'relative',
    marginRight: 10,
    marginBottom: 10,
  },
  vehiclePhoto: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#eee',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
  },
  addPhotoBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: colors.primary,
    backgroundColor: '#fafbfc',
    marginBottom: 10,
  },
  addPhotoText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: fonts.size.sm,
    marginTop: 2,
  },
  dlPhoto: {
    width: 120,
    height: 80,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#eee',
  },
  submitBtn: {
    marginTop: spacing.lg,
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: fonts.size.lg,
  },
  error: {
    color: colors.error,
    marginBottom: spacing.md,
    fontSize: fonts.size.md,
    textAlign: 'center',
  },
});
