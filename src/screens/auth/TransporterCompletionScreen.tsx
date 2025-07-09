import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Divider from '../../components/common/Divider';
import { fonts, spacing } from '../../constants';
import colors from '../../constants/colors';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const VEHICLE_TYPES = [
  {
    label: 'Truck',
    value: 'truck',
    icon: (active: boolean) => (
      <FontAwesome5 name="truck" size={28} color={active ? colors.white : colors.primary} />
    ),
  },
  {
    label: 'Van',
    value: 'van',
    icon: (active: boolean) => (
      <MaterialCommunityIcons name="van-utility" size={28} color={active ? colors.white : colors.secondary} />
    ),
  },
  {
    label: 'Pickup',
    value: 'pickup',
    icon: (active: boolean) => (
      <MaterialCommunityIcons name="car-pickup" size={28} color={active ? colors.white : colors.tertiary} />
    ),
  },
  {
    label: 'Refrigerated Truck',
    value: 'refrigerated_truck',
    icon: (active: boolean) => (
      <MaterialCommunityIcons name="snowflake" size={28} color={active ? colors.white : colors.success} />
    ),
  },
  {
    label: 'Other',
    value: 'other',
    icon: (active: boolean) => (
      <Ionicons name="car-outline" size={28} color={active ? colors.white : colors.text.primary} />
    ),
  },
];

export default function TransporterCompletionScreen() {
  const navigation = useNavigation();
  const [transporterType, setTransporterType] = useState('individual'); // 'individual' or 'company'
  const [vehicleType, setVehicleType] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(dropdownAnim, {
      toValue: dropdownOpen ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [dropdownOpen]);
  const [registration, setRegistration] = useState('');
  const [humidityControl, setHumidityControl] = useState(false);
  const [refrigeration, setRefrigeration] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [vehiclePhotos, setVehiclePhotos] = useState([]);
  const [dlFile, setDlFile] = useState(null); // can be image or pdf
  const [idFile, setIdFile] = useState(null); // driver's ID
  const [insuranceFile, setInsuranceFile] = useState(null); // insurance
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [logBookFile, setLogBookFile] = useState(null); // can be image or pdf
  const [companyName, setCompanyName] = useState('');
  const [companyReg, setCompanyReg] = useState('');
  const [companyContact, setCompanyContact] = useState('');

  // Image picker helper
  const pickImage = async (onPick) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Permission to access media library is required!');
      return;
    }
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

  const isValid = () => {
    return (
      vehicleType &&
      registration &&
      profilePhoto &&
      dlFile &&
      logBookFile &&
      insuranceFile &&
      idFile &&
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

  const handleIdFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setIdFile(result.assets[0]);
    }
  };

  const handleInsuranceFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setInsuranceFile(result.assets[0]);
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
      // For now, just save the transporter profile to the "transporters" collection
      const auth = getAuth();
      const db = getFirestore();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      const transporterProfile = {
        transporterId: user.uid,
        profilePhoto: profilePhoto ? profilePhoto.uri : null,
        vehiclePhotos: vehiclePhotos.map((img) => img.uri),
        vehicleType,
        registration,
        humidityControl,
        refrigeration,
        dlFile: dlFile ? dlFile.uri : null,
        idFile: idFile ? idFile.uri : null,
        logBookFile: logBookFile ? logBookFile.uri : null,
        insuranceFile: insuranceFile ? insuranceFile.uri : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'pending',
      };
      await setDoc(doc(db, 'transporters', user.uid), transporterProfile);
      // After submit, let App.tsx handle navigation based on updated profile/status
    } catch (e) {
      setError('Failed to submit profile. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const insets = useSafeAreaInsets();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Complete Your Transporter Profile</Text>
      {/* Selector for Individual vs Company */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.lg }}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: transporterType === 'individual' ? colors.primary : colors.background,
            padding: 12,
            borderRadius: 8,
            marginRight: 6,
            borderWidth: 1.2,
            borderColor: colors.primary,
          }}
          onPress={() => setTransporterType('individual')}
        >
          <Text style={{
            color: transporterType === 'individual' ? '#fff' : colors.primary,
            fontWeight: 'bold',
            textAlign: 'center',
          }}>Individual</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: transporterType === 'company' ? colors.primary : colors.background,
            padding: 12,
            borderRadius: 8,
            marginLeft: 6,
            borderWidth: 1.2,
            borderColor: colors.primary,
          }}
          onPress={() => setTransporterType('company')}
        >
          <Text style={{
            color: transporterType === 'company' ? '#fff' : colors.primary,
            fontWeight: 'bold',
            textAlign: 'center',
          }}>Broker/Company</Text>
        </TouchableOpacity>
      </View>
      <View style={{ marginBottom: spacing.md, width: '100%' }}>
        {transporterType === 'individual' ? (
          <Text style={{ color: colors.text.secondary, fontSize: 15, textAlign: 'center' }}>
            Register as an <Text style={{ fontWeight: 'bold' }}>Individual Transporter</Text> to get jobs directly and manage your own vehicle profile.
          </Text>
        ) : (
          <Text style={{ color: colors.text.secondary, fontSize: 15, textAlign: 'center' }}>
            Register as a <Text style={{ fontWeight: 'bold' }}>Broker/Company</Text> to subscribe to plans, get transportation jobs, and assign them to your own or outsourced transporters.
          </Text>
        )}
      </View>

      {/* INDIVIDUAL FORM */}
      {transporterType === 'individual' && (
        <>
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
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdownSelected}
                onPress={() => setDropdownOpen((open) => !open)}
                activeOpacity={0.85}
              >
                {vehicleType ? (
                  <View style={styles.dropdownSelectedContent}>
                    {(() => {
                      const selected = VEHICLE_TYPES.find((t) => t.value === vehicleType);
                      if (!selected) return null;
                      switch (selected.value) {
                        case 'truck':
                          return <FontAwesome5 name="truck" size={28} color={colors.primary} />;
                        case 'van':
                          return <MaterialCommunityIcons name="van-utility" size={28} color={colors.secondary} />;
                        case 'pickup':
                          return <MaterialCommunityIcons name="car-pickup" size={28} color={colors.tertiary} />;
                        case 'refrigerated_truck':
                          return <MaterialCommunityIcons name="snowflake" size={28} color={colors.success} />;
                        case 'other':
                          return <Ionicons name="car-outline" size={28} color={colors.text.primary} />;
                        default:
                          return null;
                      }
                    })()}
                    <Text style={styles.dropdownSelectedText}>
                      {VEHICLE_TYPES.find((t) => t.value === vehicleType)?.label}
                    </Text>
                    <Ionicons name={dropdownOpen ? 'chevron-up' : 'chevron-down'} size={22} color={colors.primary} style={{ marginLeft: 8 }} />
                  </View>
                ) : (
                  <View style={styles.dropdownSelectedContent}>
                    <Ionicons name="car-outline" size={24} color={colors.text.light} />
                    <Text style={[styles.dropdownSelectedText, { color: colors.text.light }]}>Select vehicle type</Text>
                    <Ionicons name={dropdownOpen ? 'chevron-up' : 'chevron-down'} size={22} color={colors.primary} style={{ marginLeft: 8 }} />
                  </View>
                )}
              </TouchableOpacity>
              <Animated.View
                pointerEvents={dropdownOpen ? 'auto' : 'none'}
                style={[
                  styles.dropdownOptions,
                  {
                    opacity: dropdownAnim,
                    transform: [
                      {
                        translateY: dropdownAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-10, 0],
                        }),
                      },
                      {
                        scale: dropdownAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.98, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {VEHICLE_TYPES.map((type, idx) => (
                  <Animated.View
                    key={type.value}
                    style={{
                      opacity: dropdownAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                      }),
                      transform: [
                        {
                          translateY: dropdownAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [10, 0],
                          }),
                        },
                      ],
                    }}
                  >
                    <TouchableOpacity
                      style={[
                        styles.dropdownOption,
                        vehicleType === type.value && styles.dropdownOptionActive,
                      ]}
                      onPress={() => {
                        setVehicleType(type.value);
                        setDropdownOpen(false);
                      }}
                      activeOpacity={0.85}
                    >
                      {type.icon(vehicleType === type.value)}
                      <Text style={styles.dropdownOptionText}>{type.label}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </Animated.View>
            </View>
            <Divider style={{ marginVertical: spacing.md }} />
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

          {/* Grouped Document Uploads: DL + ID, Logbook + Insurance */}
          <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Driver's License</Text>
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
                <Text style={styles.photoPickerText}>Upload DL</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Driver's ID</Text>
              <TouchableOpacity style={styles.photoPicker} onPress={handleIdFile}>
                {idFile ? (
                  idFile.mimeType && idFile.mimeType.startsWith('image/') ? (
                    <Image source={{ uri: idFile.uri }} style={styles.dlPhoto} />
                  ) : (
                    <View style={{ alignItems: 'center' }}>
                      <MaterialCommunityIcons name="file-pdf-box" size={60} color={colors.error} />
                      <Text style={{ color: colors.text.secondary, marginTop: 4 }}>{idFile.name || 'PDF File'}</Text>
                    </View>
                  )
                ) : (
                  <MaterialCommunityIcons name="card-account-details-outline" size={60} color={colors.text.light} />
                )}
                <Text style={styles.photoPickerText}>Upload ID</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Log Book</Text>
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
                <Text style={styles.photoPickerText}>Upload Log Book</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Insurance</Text>
              <TouchableOpacity style={styles.photoPicker} onPress={handleInsuranceFile}>
                {insuranceFile ? (
                  insuranceFile.mimeType && insuranceFile.mimeType.startsWith('image/') ? (
                    <Image source={{ uri: insuranceFile.uri }} style={styles.dlPhoto} />
                  ) : (
                    <View style={{ alignItems: 'center' }}>
                      <MaterialCommunityIcons name="file-pdf-box" size={60} color={colors.error} />
                      <Text style={{ color: colors.text.secondary, marginTop: 4 }}>{insuranceFile.name || 'PDF File'}</Text>
                    </View>
                  )
                ) : (
                  <MaterialCommunityIcons name="shield-check-outline" size={60} color={colors.text.light} />
                )}
                <Text style={styles.photoPickerText}>Upload Insurance</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* COMPANY FORM */}
      {transporterType === 'company' && (
        <>
          <Text style={styles.sectionTitle}>Broker/Company Details</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Company Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Acme Transporters Ltd."
              value={companyName}
              onChangeText={setCompanyName}
            />
            <Text style={styles.label}>Company Registration Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. CPR/2023/123456"
              value={companyReg}
              onChangeText={setCompanyReg}
            />
            <Text style={styles.label}>Contact Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. +254712345678"
              value={companyContact}
              onChangeText={setCompanyContact}
              keyboardType="phone-pad"
            />
          </View>
          <Text style={styles.sectionTitle}>Profile Photo</Text>
          <TouchableOpacity style={styles.photoPicker} onPress={handleProfilePhoto}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto.uri }} style={styles.profilePhoto} />
            ) : (
              <Ionicons name="business-outline" size={80} color={colors.text.light} />
            )}
            <Text style={styles.photoPickerText}>Upload Company Logo</Text>
          </TouchableOpacity>
          <View style={[styles.card, { marginTop: 10 }]}> 
            <Text style={styles.label}>Assign Jobs to Transporters</Text>
            <Text style={{ color: colors.text.secondary, fontSize: 15, marginBottom: 6 }}>
              As a broker/company, you can assign jobs to your own drivers or outsource to other registered transporters. This feature will be available after your company profile is approved and you have an active subscription.
            </Text>
            <View style={{ backgroundColor: colors.background, borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.text.light }}>
              <Ionicons name="people-outline" size={32} color={colors.primary} />
              <Text style={{ color: colors.text.secondary, fontSize: 14, marginTop: 4, textAlign: 'center' }}>
                Manage and assign jobs to your team or outsource to other transporters from your dashboard.
              </Text>
            </View>
          </View>
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={{ paddingBottom: insets.bottom + 18, width: '100%' }}>
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: isValid() ? colors.primary : colors.text.light }]}
          onPress={handleSubmit}
          disabled={!isValid() || uploading}
        >
          {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Profile</Text>}
        </TouchableOpacity>
        {/* TEMPORARY LINKS FOR UI TESTING */}
        <View style={{ marginTop: 18 }}>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.secondary, marginBottom: 8 }]}
            onPress={() => navigation.navigate('TransporterProcessingScreen', { transporterType })}
          >
            <Text style={styles.submitBtnText}>Go to Approval Status ({transporterType === 'company' ? 'Broker/Company' : 'Individual'})</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    borderRadius: 18,
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
  vehicleTypeSimpleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
    width: '100%',
    gap: 6,
  },
  vehicleTypeSimpleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 2,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1.2,
    borderColor: colors.text.light,
    elevation: 0,
    flexDirection: 'column',
    transitionDuration: '200ms',
  },
  vehicleTypeSimpleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    elevation: 2,
  },
  vehicleTypeSimpleIconWrap: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 16,
    padding: 6,
    marginBottom: 4,
  },
  vehicleTypeSimpleIconWrapActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  vehicleTypeSimpleText: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  vehicleTypeSimpleTextActive: {
    color: '#fff',
  },
  dropdownContainer: {
    width: '100%',
    marginBottom: spacing.md,
    position: 'relative',
    zIndex: 10,
  },
  dropdownSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: colors.text.light,
    borderRadius: 12,
    backgroundColor: colors.background,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 48,
    elevation: 1,
  },
  dropdownSelectedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownSelectedText: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: '600',
    marginLeft: 10,
  },
  dropdownOptions: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: colors.text.light,
    shadowColor: colors.black,
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 20,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  dropdownOptionActive: {
    backgroundColor: colors.primary + '11',
  },
  dropdownOptionText: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: '500',
    marginLeft: 12,
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
