import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useCameraPermissions, useMediaLibraryPermissions } from 'expo-image-picker';
import { getAuth } from 'firebase/auth';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated, Easing,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ImagePickerModal from '../../components/common/ImagePickerModal';
import VehicleDetailsForm from '../../components/VehicleDetailsForm';
import { fonts, spacing } from '../../constants';
import colors from '../../constants/colors';

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

// Helper to check if transporter profile is truly complete
function isTransporterProfileComplete(transporter) {
  if (!transporter) return false;
  // Required fields for a completed profile (individual)
  const requiredFields = [
    'driverProfileImage',
    'driverLicense',
    'insuranceUrl',
    'vehicleType',
    'vehicleRegistration',
    'vehicleMake',
    'vehicleColor',
    'vehicleYear',
    'bodyType',
    'driveType',
    'email',
    'phoneNumber',
    'status',
  ];
  for (const field of requiredFields) {
    if (!transporter[field] || typeof transporter[field] !== 'string' || transporter[field].length === 0) {
      return false;
    }
  }
  // At least one vehicle image
  if (!Array.isArray(transporter.vehicleImagesUrl) || transporter.vehicleImagesUrl.length === 0) {
    return false;
  }
  // Status must be at least 'pending', 'under_review', or 'approved'
  if (!['pending', 'under_review', 'approved'].includes(transporter.status)) {
    return false;
  }
  return true;
}

export default function TransporterCompletionScreen() {
  const navigation = useNavigation();
  const [transporterType, setTransporterType] = useState('individual'); // 'individual' or 'company'
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [profileCheckError, setProfileCheckError] = useState('');

  const runProfileCheck = React.useCallback(() => {
    setCheckingProfile(true);
    setProfileCheckError('');
    let didTimeout = false;
    const timeout = setTimeout(() => {
      didTimeout = true;
      setCheckingProfile(false);
      setProfileCheckError('Profile check timed out. Please check your connection and try again.');
    }, 8000); // 8 seconds
    (async () => {
      try {
        const { getAuth } = require('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
          clearTimeout(timeout);
          setCheckingProfile(false);
          return;
        }
        const token = await user.getIdToken();
        let res, data = null;
        try {
          res = await fetch(`https://agritruk-backend.onrender.com/api/transporters/${user.uid}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        } catch (fetchErr) {
          clearTimeout(timeout);
          setCheckingProfile(false);
          setProfileCheckError('Network error: Could not reach backend.');
          return;
        }
        if (!res) {
          clearTimeout(timeout);
          setCheckingProfile(false);
          setProfileCheckError('No response from backend.');
          return;
        }
        let shouldNavigate = false;
        if (res.ok) {
          try {
            data = await res.json();
          } catch (e) {
            data = null;
          }
        } else {
          // Show backend error if available
          let errMsg = 'Profile check failed.';
          try {
            const errData = await res.json();
            if (errData && errData.message) errMsg = errData.message;
          } catch {}
          clearTimeout(timeout);
          setCheckingProfile(false);
          setProfileCheckError(errMsg + ` (HTTP ${res.status})`);
          return;
        }
        // Decide navigation based on profile completeness and status
        if (
          res.ok &&
          data &&
          typeof data.transporter === 'object' &&
          data.transporter !== null &&
          !Array.isArray(data.transporter) &&
          Object.keys(data.transporter).length > 0
        ) {
          if (isTransporterProfileComplete(data.transporter)) {
            if (data.transporter.status === 'approved') {
              clearTimeout(timeout);
              navigation.reset({
                index: 0,
                routes: [
                  { name: 'TransporterTabs', params: { transporterType: data.transporter.transporterType || 'individual' } },
                ],
              });
              return;
            } else if (['pending', 'under_review'].includes(data.transporter.status)) {
              clearTimeout(timeout);
              navigation.reset({
                index: 0,
                routes: [
                  { name: 'TransporterProcessingScreen', params: { transporterType: data.transporter.transporterType || 'individual' } },
                ],
              });
              return;
            }
          }
        }
        // If not complete or no transporter, allow form to show
      } catch (err) {
        clearTimeout(timeout);
        setCheckingProfile(false);
        setProfileCheckError('Unexpected error: ' + (err && err.message ? err.message : String(err)));
      }
      if (!didTimeout) {
        clearTimeout(timeout);
        setCheckingProfile(false);
      }
    })();
  }, [navigation]);

  useEffect(() => {
    runProfileCheck();
  }, [runProfileCheck]);
  const [vehicleType, setVehicleType] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [makeDropdownOpen, setMakeDropdownOpen] = useState(false);
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const [maxCapacity, setMaxCapacity] = useState('');
  const [year, setYear] = useState('');
  const [driveType, setDriveType] = useState('');
  const [bodyType, setBodyType] = useState('closed');
  const [vehicleFeatures, setVehicleFeatures] = useState('');
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
  const [photoJustAdded, setPhotoJustAdded] = useState(false);
  const [dlFile, setDlFile] = useState(null); // can be image or pdf
  const [idFile, setIdFile] = useState(null); // driver's ID
  const [insuranceFile, setInsuranceFile] = useState(null); // insurance
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [logBookFile, setLogBookFile] = useState(null); // can be image or pdf
  const [companyName, setCompanyName] = useState('');
  const [companyReg, setCompanyReg] = useState('');
  const [companyContact, setCompanyContact] = useState('');

  // Prefill company name and contact from Firebase Auth when switching to company tab
  useEffect(() => {
    if (transporterType === 'company') {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          setCompanyName(user.displayName || '');
          setCompanyContact(user.phoneNumber || '');
        }
      } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transporterType]);

  // Image picker modal state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [onImagePicked, setOnImagePicked] = useState(() => (img) => { });
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = useMediaLibraryPermissions();

  // Image picker helper using modal
  const pickImage = (onPick) => {
    setOnImagePicked(() => onPick);
    setPickerVisible(true);
  };

  const handleImagePickerSelect = async (choice) => {
    setPickerVisible(false);
    let result;
    try {
      if (choice === 'camera') {
        if (!cameraPermission?.granted) {
          const { status } = await requestCameraPermission();
          if (status !== 'granted') {
            setError('Permission to access camera is required!');
            return;
          }
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.IMAGE,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        });
      } else if (choice === 'gallery') {
        if (!mediaPermission?.granted) {
          const { status } = await requestMediaPermission();
          if (status !== 'granted') {
            setError('Permission to access media library is required!');
            return;
          }
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.IMAGE,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        });
      } else {
        return;
      }
      if (!result.canceled && result.assets && result.assets.length > 0) {
        onImagePicked(result.assets[0]);
      }
    } catch (err) {
      setError('Failed to open image picker.');
      console.error('Image picker error:', err);
    }
  };

  const handleAddVehiclePhoto = () => {
    pickImage((img) => {
      setVehiclePhotos((prev) => [...prev, img]);
      setPhotoJustAdded(true);
    });
  };

  const handleRemoveVehiclePhoto = (idx) => {
    setVehiclePhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleProfilePhoto = () => {
    pickImage(setProfilePhoto);
  };

  // Debounce submit after adding a photo
  React.useEffect(() => {
    if (photoJustAdded) {
      const timer = setTimeout(() => setPhotoJustAdded(false), 350);
      return () => clearTimeout(timer);
    }
  }, [photoJustAdded]);

  const isValid = () => {
    if (transporterType === 'individual') {
      return (
        vehicleType &&
        registration &&
        profilePhoto &&
        dlFile &&
        insuranceFile &&
        idFile &&
        vehiclePhotos.length > 0
      );
    } else {
      return (
        companyName &&
        companyReg &&
        companyContact &&
        profilePhoto
      );
    }
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

    // Validation
    if (transporterType === 'individual') {
      if (!vehicleType) { setError('Please select a vehicle type.'); return false; }
      if (!registration) { setError('Please enter the vehicle registration number.'); return false; }
      if (!profilePhoto) { setError('Please upload a profile photo.'); return false; }
      if (!dlFile) { setError("Please upload the driver's license."); return false; }
      if (!insuranceFile) { setError('Please upload the insurance document.'); return false; }
      if (!idFile) { setError("Please upload the driver's ID."); return false; }
      if (!vehiclePhotos || vehiclePhotos.length === 0) { setError('Please add at least one vehicle photo.'); return false; }
    } else {
      if (!companyName) { setError('Please enter the company name.'); return false; }
      if (!companyReg) { setError('Please enter the company registration number.'); return false; }
      if (!companyContact) { setError('Please enter the company contact number.'); return false; }
      if (!profilePhoto) { setError('Please upload a company logo.'); return false; }
    }

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      if (transporterType === 'individual') {
        // Prepare FormData for multipart/form-data
        const formData = new FormData();
        formData.append('vehicleType', vehicleType);
        formData.append('vehicleRegistration', registration);
        formData.append('vehicleMake', vehicleMake);
        formData.append('vehicleColor', vehicleColor);
        formData.append('vehicleModel', vehicleMake);
        formData.append('vehicleYear', year ? String(year) : '');
        if (maxCapacity && !isNaN(parseInt(maxCapacity, 10))) {
          formData.append('vehicleCapacity', String(parseInt(maxCapacity, 10)));
        }
        formData.append('driveType', driveType || '');
        formData.append('bodyType', bodyType || '');
        formData.append('vehicleFeatures', vehicleFeatures || '');
        formData.append('humidityControl', humidityControl ? 'true' : 'false');
        formData.append('refrigerated', refrigeration ? 'true' : 'false');
        formData.append('transporterType', transporterType);

        // Files
        if (profilePhoto && profilePhoto.uri) formData.append('profilePhoto', { uri: profilePhoto.uri, name: 'profile.jpg', type: 'image/jpeg' });
        if (dlFile && dlFile.uri) formData.append('dlFile', { uri: dlFile.uri, name: 'license.jpg', type: 'image/jpeg' });
        if (insuranceFile && insuranceFile.uri) formData.append('insuranceFile', { uri: insuranceFile.uri, name: 'insurance.jpg', type: 'image/jpeg' });
        if (logBookFile && logBookFile.uri) formData.append('logbook', { uri: logBookFile.uri, name: 'logbook.jpg', type: 'image/jpeg' });
        if (idFile && idFile.uri) formData.append('idFile', { uri: idFile.uri, name: 'id.jpg', type: 'image/jpeg' });
        if (vehiclePhotos && vehiclePhotos.length > 0) {
          vehiclePhotos.forEach((img, idx) => {
            if (img.uri) {
              formData.append('vehiclePhoto', { uri: img.uri, name: `vehicle_${idx}.jpg`, type: 'image/jpeg' });
            }
          });
        }

        const token = await user.getIdToken();
        const res = await fetch('https://agritruk-backend.onrender.com/api/transporters/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        let data = null;
        let parseError = null;
        try {
          data = await res.json();
        } catch (e) {
          parseError = e;
        }

        if (res.ok) {
          // Success: navigate immediately
          return true;
        } else {
          // Try to show backend error message if available
          let errorMsg = 'Failed to submit profile.';
          if (data && data.message) errorMsg = data.message;
          else if (parseError) errorMsg = 'Server error: could not parse response.';
          else if (res.statusText) errorMsg = res.statusText;
          setError(errorMsg);
          // Optionally log for debugging
          console.error('Profile submit error:', { status: res.status, data, parseError });
          return false;
        }
      } else {
        // Company submission (use FormData to include logo)
        const formData = new FormData();
        formData.append('name', companyName);
        formData.append('registration', companyReg);
        formData.append('contact', companyContact);
        if (profilePhoto && profilePhoto.uri) {
          formData.append('logo', { uri: profilePhoto.uri, name: 'logo.jpg', type: 'image/jpeg' });
        }
        const token = await user.getIdToken();
        // 1. Log FormData for companies endpoint
        console.log('Submitting to /api/companies with:');
        for (let pair of formData.entries()) {
          if (typeof pair[1] === 'object' && pair[1] !== null) {
            console.log(pair[0], '{ name:', pair[1].name, ', type:', pair[1].type, ', uri:', pair[1].uri, '}');
          } else {
            console.log(pair[0], pair[1]);
          }
        }
        const res = await fetch('https://agritruk-backend.onrender.com/api/companies', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
        if (!res.ok) {
          let data = null;
          try { data = await res.json(); } catch {}
          setError((data && data.message) || 'Failed to submit profile.');
          return false;
        }
        // 2. Also update the transporter document with company details
        const transporterForm = new FormData();
        transporterForm.append('transporterType', 'company');
        transporterForm.append('companyName', companyName);
        transporterForm.append('companyReg', companyReg);
        transporterForm.append('companyContact', companyContact);
        if (profilePhoto && profilePhoto.uri) {
          transporterForm.append('companyLogo', { uri: profilePhoto.uri, name: 'logo.jpg', type: 'image/jpeg' });
        }
        // Log FormData for transporter document
        console.log('Submitting to /api/transporters/ with:');
        for (let pair of transporterForm.entries()) {
          if (typeof pair[1] === 'object' && pair[1] !== null) {
            console.log(pair[0], '{ name:', pair[1].name, ', type:', pair[1].type, ', uri:', pair[1].uri, '}');
          } else {
            console.log(pair[0], pair[1]);
          }
        }
        const transporterRes = await fetch('https://agritruk-backend.onrender.com/api/transporters/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: transporterForm,
        });
        if (!transporterRes.ok) {
          let data = null;
          try { data = await transporterRes.json(); } catch {}
          setError((data && data.message) || 'Failed to update transporter profile.');
          return false;
        }
        // After submission, fetch company profile and check completeness
        const companyRes = await fetch(`https://agritruk-backend.onrender.com/api/companies/${user.uid}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (companyRes.ok) {
          let companyData = null;
          try { companyData = await companyRes.json(); } catch {}
          // Check if company profile is complete (name, registration, contact, logo)
          if (
            companyData &&
            typeof companyData === 'object' &&
            companyData.name &&
            companyData.registration &&
            companyData.contact &&
            companyData.logo
          ) {
            navigation.navigate('TransporterProcessingScreen', { transporterType });
            return true;
          } else {
            setError('Company profile is incomplete after submission. Please try again.');
            return false;
          }
        } else {
          setError('Failed to fetch company profile after submission.');
          return false;
        }
      }
    } catch (e) {
      setError('Failed to submit profile. Please try again.');
      return false;
    }
  };

  const insets = useSafeAreaInsets();

  if (checkingProfile) {
    return (
      <View style={styles.statusCheckerContainer}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 18 }} />
        <Text style={styles.statusCheckerText}>Checking profile status...</Text>
      </View>
    );
  }
  if (profileCheckError) {
    return (
      <View style={styles.statusCheckerContainer}>
        <Text style={[styles.statusCheckerText, { color: colors.error }]}>{profileCheckError}</Text>
        <TouchableOpacity
          style={{ marginTop: 18, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 22 }}
          onPress={runProfileCheck}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
          }}>Company</Text>
        </TouchableOpacity>
      </View>
      <View style={{ marginBottom: spacing.md, width: '100%' }}>
        {transporterType === 'individual' ? (
          <Text style={{ color: colors.text.secondary, fontSize: 15, textAlign: 'center' }}>
            Register as an <Text style={{ fontWeight: 'bold' }}>Individual</Text> to get jobs directly and manage your own vehicle profile.
          </Text>
        ) : (
          <Text style={{ color: colors.text.secondary, fontSize: 15, textAlign: 'center' }}>
            Register as a <Text style={{ fontWeight: 'bold' }}>Company</Text> to subscribe to plans, get transportation jobs, and assign them to your own or outsourced transporters.
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
          <VehicleDetailsForm
            initial={{ vehicleType, vehicleMake, vehicleColor, registration, maxCapacity, year, driveType, bodyType, vehicleFeatures }}
            onChange={({ vehicleType, vehicleMake, vehicleColor, registration, maxCapacity, year, driveType, bodyType, vehicleFeatures, humidityControl, refrigeration }) => {
              setVehicleType(vehicleType);
              setVehicleMake(vehicleMake);
              setVehicleColor(vehicleColor);
              setRegistration(registration);
              setMaxCapacity(maxCapacity);
              setYear(year);
              setDriveType(driveType);
              setBodyType(bodyType);
              setVehicleFeatures(vehicleFeatures);
              setHumidityControl(humidityControl);
              setRefrigeration(refrigeration);
            }}
            onPhotoAdd={handleAddVehiclePhoto}
            onPhotoRemove={handleRemoveVehiclePhoto}
            vehiclePhotos={vehiclePhotos}
            error={error}
          />

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
          <Text style={styles.sectionTitle}>Company Details</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Company Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter company name as registered (e.g. Acme Transporters Ltd.)"
              placeholderTextColor={colors.text.light}
              value={companyName}
              onChangeText={setCompanyName}
            />
            <Text style={styles.label}>Company Registration Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter registration number (e.g. CPR/2023/123456)"
              placeholderTextColor={colors.text.light}
              value={companyReg}
              onChangeText={setCompanyReg}
            />
            <Text style={styles.label}>Contact Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter company contact (e.g. +254712345678)"
              placeholderTextColor={colors.text.light}
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
            <Text style={styles.label}>Assign Jobs to Drivers</Text>
            <Text style={{ color: colors.text.secondary, fontSize: 15, marginBottom: 6 }}>
              As a company, you can assign jobs to your own drivers. This feature will be available after your company profile is approved and you have an active subscription.
            </Text>
            <View style={{ backgroundColor: colors.background, borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.text.light }}>
              <Ionicons name="people-outline" size={32} color={colors.primary} />
              <Text style={{ color: colors.text.secondary, fontSize: 14, marginTop: 4, textAlign: 'center' }}>
                Manage and assign jobs to your team from your dashboard.
              </Text>
            </View>
          </View>
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={{ paddingBottom: insets.bottom + 18, width: '100%' }}>
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: isValid() && !photoJustAdded ? colors.primary : colors.text.light }]}
          onPress={async () => {
            if (uploading || !isValid() || photoJustAdded) return;

            setUploading(true);
            try {
              const success = await handleSubmit();
              if (success) {
                navigation.navigate('TransporterProcessingScreen', { transporterType });
              }
            } catch (e) {
              setError('Failed to submit profile. Please try again.');
            } finally {
              setUploading(false);
            }
          }}
          disabled={!isValid() || uploading || photoJustAdded}
        >
          {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Profile</Text>}
        </TouchableOpacity>
      </View>
      <ImagePickerModal
        visible={pickerVisible}
        onSelect={handleImagePickerSelect}
        onCancel={() => setPickerVisible(false)}
      />
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
  statusCheckerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  statusCheckerText: {
    color: colors.primary,
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
});
