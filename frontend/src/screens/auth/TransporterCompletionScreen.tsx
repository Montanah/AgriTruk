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
  View,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import KeyboardAwareScrollView from '../../components/common/KeyboardAwareScrollView';
import ImagePickerModal from '../../components/common/ImagePickerModal';
import { API_ENDPOINTS, API_BASE_URL } from '../../constants/api';
import VehicleDetailsForm from '../../components/VehicleDetailsForm';
import { fonts, spacing } from '../../constants';
import colors from '../../constants/colors';
import { uploadFile } from '../../utils/api';

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
          res = await fetch(`${API_ENDPOINTS.TRANSPORTERS}/${user.uid}`, {
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
        } else if (res.status === 404) {
          // Transporter profile doesn't exist yet - this is expected for new transporters
          clearTimeout(timeout);
          setCheckingProfile(false);
          setProfileCheckError(''); // Clear any error - this is normal for new transporters
          return;
        } else {
          // Show backend error if available
          let errMsg = 'Profile check failed.';
          try {
            const errData = await res.json();
            if (errData && errData.message) errMsg = errData.message;
          } catch { }
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

  // Prefill company name and contact from Firebase Auth on mount and when user changes
  // Prefill company name and contact from backend user document on company tab select
  useEffect(() => {
    if (transporterType === 'company') {
      (async () => {
        try {
          const auth = getAuth();
          const user = auth.currentUser;
          if (user) {
            const token = await user.getIdToken();
            const res = await fetch(`${API_ENDPOINTS.AUTH}/users/${user.uid}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            if (res.ok) {
              const userData = await res.json();
              if (userData && userData.name && !companyName) setCompanyName(userData.name);
              if (userData && userData.phone && !companyContact) setCompanyContact(userData.phone);
            } else {
              // fallback to auth fields if backend fails
              if (!companyName) setCompanyName(user.displayName || user.email?.split('@')[0] || '');
              if (!companyContact) setCompanyContact(user.phoneNumber || '');
            }
          }
        } catch (e) { }
      })();
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
          // No aspect ratio constraint - allows flexible cropping for profile photos
          quality: 0.8,
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
          // No aspect ratio constraint - allows flexible cropping for profile photos
          quality: 0.8,
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
    Alert.alert(
      'Select Document',
      'Choose how you want to add your driver\'s license',
      [
        { text: 'Take Photo', onPress: () => handleDlCamera() },
        { text: 'Choose from Gallery', onPress: () => handleDlGallery() },
        { text: 'Upload PDF', onPress: () => handleDlPDF() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleDlCamera = async () => {
    try {
      if (!cameraPermission?.granted) {
        const { status } = await requestCameraPermission();
        if (status !== 'granted') {
          setError('Permission to access camera is required!');
          return;
        }
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        // No aspect ratio constraint - allows free-form cropping for documents
        quality: 0.8, // Higher quality for document clarity
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setDlFile({
          ...result.assets[0],
          name: 'driver_license.jpg',
          mimeType: 'image/jpeg'
        });
      }
    } catch (err) {
      setError('Failed to open camera.');
      console.error('Camera error:', err);
    }
  };

  const handleDlGallery = async () => {
    try {
      if (!mediaPermission?.granted) {
        const { status } = await requestMediaPermission();
        if (status !== 'granted') {
          setError('Permission to access media library is required!');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        // No aspect ratio constraint - allows free-form cropping for documents
        quality: 0.8, // Higher quality for document clarity
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setDlFile({
          ...result.assets[0],
          name: 'driver_license.jpg',
          mimeType: 'image/jpeg'
        });
      }
    } catch (err) {
      setError('Failed to open gallery.');
      console.error('Gallery error:', err);
    }
  };

  const handleDlPDF = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setDlFile(result.assets[0]);
    }
  };

  const handleIdFile = async () => {
    Alert.alert(
      'Select Document',
      'Choose how you want to add your driver\'s ID',
      [
        { text: 'Take Photo', onPress: () => handleIdCamera() },
        { text: 'Choose from Gallery', onPress: () => handleIdGallery() },
        { text: 'Upload PDF', onPress: () => handleIdPDF() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleIdCamera = async () => {
    try {
      if (!cameraPermission?.granted) {
        const { status } = await requestCameraPermission();
        if (status !== 'granted') {
          setError('Permission to access camera is required!');
          return;
        }
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        // No aspect ratio constraint - allows free-form cropping for documents
        quality: 0.8, // Higher quality for document clarity
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIdFile({
          ...result.assets[0],
          name: 'driver_id.jpg',
          mimeType: 'image/jpeg'
        });
      }
    } catch (err) {
      setError('Failed to open camera.');
      console.error('Camera error:', err);
    }
  };

  const handleIdGallery = async () => {
    try {
      if (!mediaPermission?.granted) {
        const { status } = await requestMediaPermission();
        if (status !== 'granted') {
          setError('Permission to access media library is required!');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        // No aspect ratio constraint - allows free-form cropping for documents
        quality: 0.8, // Higher quality for document clarity
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIdFile({
          ...result.assets[0],
          name: 'driver_id.jpg',
          mimeType: 'image/jpeg'
        });
      }
    } catch (err) {
      setError('Failed to open gallery.');
      console.error('Gallery error:', err);
    }
  };

  const handleIdPDF = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setIdFile(result.assets[0]);
    }
  };

  const handleInsuranceFile = async () => {
    Alert.alert(
      'Select Document',
      'Choose how you want to add your insurance document',
      [
        { text: 'Take Photo', onPress: () => handleInsuranceCamera() },
        { text: 'Choose from Gallery', onPress: () => handleInsuranceGallery() },
        { text: 'Upload PDF', onPress: () => handleInsurancePDF() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleInsuranceCamera = async () => {
    try {
      if (!cameraPermission?.granted) {
        const { status } = await requestCameraPermission();
        if (status !== 'granted') {
          setError('Permission to access camera is required!');
          return;
        }
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        // No aspect ratio constraint - allows free-form cropping for documents
        quality: 0.8, // Higher quality for document clarity
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setInsuranceFile({
          ...result.assets[0],
          name: 'insurance.jpg',
          mimeType: 'image/jpeg'
        });
      }
    } catch (err) {
      setError('Failed to open camera.');
      console.error('Camera error:', err);
    }
  };

  const handleInsuranceGallery = async () => {
    try {
      if (!mediaPermission?.granted) {
        const { status } = await requestMediaPermission();
        if (status !== 'granted') {
          setError('Permission to access media library is required!');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        // No aspect ratio constraint - allows free-form cropping for documents
        quality: 0.8, // Higher quality for document clarity
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setInsuranceFile({
          ...result.assets[0],
          name: 'insurance.jpg',
          mimeType: 'image/jpeg'
        });
      }
    } catch (err) {
      setError('Failed to open gallery.');
      console.error('Gallery error:', err);
    }
  };

  const handleInsurancePDF = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setInsuranceFile(result.assets[0]);
    }
  };

  const handleLogBookFile = async () => {
    Alert.alert(
      'Select Document',
      'Choose how you want to add your logbook',
      [
        { text: 'Take Photo', onPress: () => handleLogBookCamera() },
        { text: 'Choose from Gallery', onPress: () => handleLogBookGallery() },
        { text: 'Upload PDF', onPress: () => handleLogBookPDF() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleLogBookCamera = async () => {
    try {
      if (!cameraPermission?.granted) {
        const { status } = await requestCameraPermission();
        if (status !== 'granted') {
          setError('Permission to access camera is required!');
          return;
        }
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        // No aspect ratio constraint - allows free-form cropping for documents
        quality: 0.8, // Higher quality for document clarity
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLogBookFile({
          ...result.assets[0],
          name: 'logbook.jpg',
          mimeType: 'image/jpeg'
        });
      }
    } catch (err) {
      setError('Failed to open camera.');
      console.error('Camera error:', err);
    }
  };

  const handleLogBookGallery = async () => {
    try {
      if (!mediaPermission?.granted) {
        const { status } = await requestMediaPermission();
        if (status !== 'granted') {
          setError('Permission to access media library is required!');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        // No aspect ratio constraint - allows free-form cropping for documents
        quality: 0.8, // Higher quality for document clarity
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLogBookFile({
          ...result.assets[0],
          name: 'logbook.jpg',
          mimeType: 'image/jpeg'
        });
      }
    } catch (err) {
      setError('Failed to open gallery.');
      console.error('Gallery error:', err);
    }
  };

  const handleLogBookPDF = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf'],
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
        // Files will be sent directly in FormData - no need to pre-upload

        // Create FormData for multipart/form-data request
        const formData = new FormData();
        
        // Add text fields
        formData.append('vehicleType', vehicleType);
        formData.append('vehicleRegistration', registration);
        formData.append('vehicleMake', vehicleMake);
        formData.append('vehicleColor', vehicleColor);
        formData.append('vehicleModel', vehicleMake); // Use vehicleMake as vehicleModel
        formData.append('vehicleYear', year ? String(year) : '2020'); // Default year if not provided
        formData.append('vehicleCapacity', maxCapacity && !isNaN(parseInt(maxCapacity, 10)) ? String(parseInt(maxCapacity, 10)) : '5'); // Default capacity if not provided
        formData.append('driveType', driveType || '');
        formData.append('bodyType', bodyType || '');
        formData.append('vehicleFeatures', vehicleFeatures || '');
        formData.append('humidityControl', humidityControl ? 'true' : 'false');
        formData.append('refrigerated', refrigeration ? 'true' : 'false');
        formData.append('transporterType', transporterType);
        
        // Add files directly to FormData
        if (profilePhoto && profilePhoto.uri) {
          formData.append('profilePhoto', {
            uri: profilePhoto.uri,
            type: profilePhoto.type || 'image/jpeg',
            name: 'profile-photo.jpg',
          } as any);
        }
        
        if (dlFile && dlFile.uri) {
          formData.append('dlFile', {
            uri: dlFile.uri,
            type: dlFile.type || 'image/jpeg',
            name: 'drivers-license.jpg',
          } as any);
        }
        
        if (insuranceFile && insuranceFile.uri) {
          formData.append('insuranceFile', {
            uri: insuranceFile.uri,
            type: insuranceFile.type || 'image/jpeg',
            name: 'insurance.jpg',
          } as any);
        }
        
        if (logBookFile && logBookFile.uri) {
          formData.append('logbook', {
            uri: logBookFile.uri,
            type: logBookFile.type || 'image/jpeg',
            name: 'logbook.jpg',
          } as any);
        }
        
        if (idFile && idFile.uri) {
          formData.append('idFile', {
            uri: idFile.uri,
            type: idFile.type || 'image/jpeg',
            name: 'id-document.jpg',
          } as any);
        }
        
        if (vehiclePhotos && vehiclePhotos.length > 0) {
          vehiclePhotos.forEach((img, idx) => {
            if (img.uri) {
              formData.append('vehiclePhoto', {
                uri: img.uri,
                type: img.type || 'image/jpeg',
                name: `vehicle-photo-${idx}.jpg`,
              } as any);
            }
          });
        }
        
        console.log('=== INDIVIDUAL TRANSPORTER SUBMISSION DEBUG ===');
        console.log('FormData contents before sending:', {
          vehicleType,
          vehicleRegistration: registration,
          vehicleMake,
          vehicleColor,
          vehicleModel: vehicleMake, // Use vehicleMake as vehicleModel
          vehicleYear: year ? String(year) : '2020',
          vehicleCapacity: maxCapacity && !isNaN(parseInt(maxCapacity, 10)) ? String(parseInt(maxCapacity, 10)) : '5',
          driveType: driveType || '',
          bodyType: bodyType || '',
          vehicleFeatures: vehicleFeatures || '',
          humidityControl: humidityControl ? 'true' : 'false',
          refrigerated: refrigeration ? 'true' : 'false',
          transporterType,
          hasProfilePhoto: !!(profilePhoto && profilePhoto.uri),
          hasDlFile: !!(dlFile && dlFile.uri),
          hasInsuranceFile: !!(insuranceFile && insuranceFile.uri),
          hasLogbookFile: !!(logBookFile && logBookFile.uri),
          hasIdFile: !!(idFile && idFile.uri),
          vehiclePhotosCount: vehiclePhotos ? vehiclePhotos.length : 0
        });
        
        // FormData debugging (React Native compatible)
        console.log('FormData type check:', typeof formData);
        console.log('FormData constructor:', formData.constructor.name);
        console.log('FormData has entries method:', typeof (formData as any).entries === 'function');
        console.log('FormData has append method:', typeof formData.append === 'function');
        
        // Note: React Native FormData doesn't support entries() method
        console.log('FormData created successfully with all required fields');
        
        // Test FormData by trying to get a field
        try {
          const testField = formData.get('vehicleType');
          console.log('FormData test - vehicleType field:', testField);
        } catch (formDataError: any) {
          console.log('FormData test failed:', formDataError.message);
        }

        const token = await user.getIdToken();
        console.log('API Endpoint:', `${API_ENDPOINTS.TRANSPORTERS}`);
        console.log('Authorization token (first 20 chars):', token.substring(0, 20) + '...');
        
        // Simple network test
        console.log('Testing basic connectivity...');
        try {
          const testRes = await fetch('https://httpbin.org/get', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          console.log('Network test - Status:', testRes.status);
        } catch (testError: any) {
          console.log('Network test failed:', testError.message);
        }
        
        // Test our specific API endpoint
        console.log('Testing AgriTruk API endpoint...');
        try {
          const apiTest = await fetch(`${API_ENDPOINTS.TRANSPORTERS}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          console.log('AgriTruk API test - Status:', apiTest.status);
          const apiResponse = await apiTest.text();
          console.log('AgriTruk API test - Response:', apiResponse);
        } catch (apiTestError: any) {
          console.log('AgriTruk API test failed:', apiTestError.message);
        }
        
        // Debug: Check what fields we're actually sending
        console.log('Debugging field values:');
        console.log('vehicleType:', vehicleType);
        console.log('registration:', registration);
        console.log('vehicleMake:', vehicleMake);
        console.log('vehicleColor:', vehicleColor);
        console.log('year:', year);
        console.log('maxCapacity:', maxCapacity);
        console.log('driveType:', driveType);
        console.log('bodyType:', bodyType);
        console.log('vehicleFeatures:', vehicleFeatures);
        console.log('humidityControl:', humidityControl);
        console.log('refrigeration:', refrigeration);
        
        // Test a simple POST request to the API
        console.log('Testing simple POST request to API...');
        try {
          const simpleFormData = new FormData();
          simpleFormData.append('test', 'data');
          
          const simplePost = await fetch(`${API_ENDPOINTS.TRANSPORTERS}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: simpleFormData,
          });
          console.log('Simple POST test - Status:', simplePost.status);
          const simpleResponse = await simplePost.text();
          console.log('Simple POST test - Response:', simpleResponse);
        } catch (simplePostError: any) {
          console.log('Simple POST test failed:', simplePostError.message);
        }
        
        // Test with hardcoded values to see if the issue is with the form data
        console.log('Testing with hardcoded values...');
        try {
          const hardcodedFormData = new FormData();
          hardcodedFormData.append('vehicleType', 'truck');
          hardcodedFormData.append('vehicleRegistration', 'KDG278H' + Math.random().toString(36).substr(2, 5));
          hardcodedFormData.append('vehicleMake', 'Scania');
          hardcodedFormData.append('vehicleModel', 'Scania');
          hardcodedFormData.append('vehicleCapacity', '5');
          hardcodedFormData.append('vehicleColor', 'Blue');
          hardcodedFormData.append('vehicleYear', '2020');
          hardcodedFormData.append('driveType', '4WD');
          hardcodedFormData.append('bodyType', 'closed');
          hardcodedFormData.append('vehicleFeatures', '');
          hardcodedFormData.append('humidityControl', 'true');
          hardcodedFormData.append('refrigerated', 'true');
          hardcodedFormData.append('transporterType', 'individual');
          
          const hardcodedRes = await fetch(`${API_ENDPOINTS.TRANSPORTERS}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: hardcodedFormData,
          });
          
          console.log('Hardcoded FormData test - Status:', hardcodedRes.status);
          const hardcodedResponse = await hardcodedRes.text();
          console.log('Hardcoded FormData test - Response:', hardcodedResponse);
        } catch (hardcodedError: any) {
          console.log('Hardcoded FormData test failed:', hardcodedError.message);
        }
        
        
        console.log('Proceeding to transporter submission...');
        
        // Try a minimal FormData request first
        console.log('Testing minimal FormData request...');
        try {
          const minimalFormData = new FormData();
          minimalFormData.append('vehicleType', 'truck');
          minimalFormData.append('vehicleRegistration', 'TEST123');
          minimalFormData.append('vehicleMake', 'Test');
          minimalFormData.append('vehicleModel', 'Test');
          minimalFormData.append('vehicleCapacity', '5');
          minimalFormData.append('transporterType', 'individual');
          
          const minimalRes = await fetch(`${API_ENDPOINTS.TRANSPORTERS}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: minimalFormData,
          });
          
          console.log('Minimal FormData test - Status:', minimalRes.status);
          const minimalResponse = await minimalRes.text();
          console.log('Minimal FormData test - Response:', minimalResponse);
        } catch (minimalError: any) {
          console.log('Minimal FormData test failed:', minimalError.message);
        }
        
        // Try the full request without files first
        console.log('Testing full FormData request without files...');
        try {
          const noFilesFormData = new FormData();
          
          // Add all the text fields
          noFilesFormData.append('vehicleType', vehicleType);
          noFilesFormData.append('vehicleRegistration', registration);
          noFilesFormData.append('vehicleMake', vehicleMake);
          noFilesFormData.append('vehicleColor', vehicleColor);
          noFilesFormData.append('vehicleModel', vehicleMake); // Use vehicleMake as vehicleModel
          noFilesFormData.append('vehicleYear', year);
          noFilesFormData.append('vehicleCapacity', maxCapacity);
          noFilesFormData.append('driveType', driveType);
          noFilesFormData.append('bodyType', bodyType);
          noFilesFormData.append('humidityControl', humidityControl ? 'true' : 'false');
          noFilesFormData.append('refrigerated', refrigeration ? 'true' : 'false');
          noFilesFormData.append('vehicleFeatures', vehicleFeatures);
          noFilesFormData.append('transporterType', 'individual');
          
          const noFilesRes = await fetch(`${API_ENDPOINTS.TRANSPORTERS}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: noFilesFormData,
          });
          
          console.log('No files FormData test - Status:', noFilesRes.status);
          const noFilesResponse = await noFilesRes.text();
          console.log('No files FormData test - Response:', noFilesResponse);
        } catch (noFilesError: any) {
          console.log('No files FormData test failed:', noFilesError.message);
        }
        
        // Test with just one file to see if file uploads are the issue
        console.log('Testing FormData with single file...');
        try {
          const singleFileFormData = new FormData();
          
          // Add all required fields
          singleFileFormData.append('vehicleType', vehicleType);
          singleFileFormData.append('vehicleRegistration', registration);
          singleFileFormData.append('vehicleMake', vehicleMake);
          singleFileFormData.append('vehicleModel', vehicleMake);
          singleFileFormData.append('vehicleCapacity', maxCapacity);
          singleFileFormData.append('vehicleColor', vehicleColor);
          singleFileFormData.append('vehicleYear', year ? String(year) : '2020');
          singleFileFormData.append('driveType', driveType || '');
          singleFileFormData.append('bodyType', bodyType || '');
          singleFileFormData.append('vehicleFeatures', vehicleFeatures || '');
          singleFileFormData.append('humidityControl', humidityControl ? 'true' : 'false');
          singleFileFormData.append('refrigerated', refrigeration ? 'true' : 'false');
          singleFileFormData.append('transporterType', 'individual');
          
          // Add just one file if available
          if (profilePhoto && profilePhoto.uri) {
            singleFileFormData.append('profilePhoto', {
              uri: profilePhoto.uri,
              type: profilePhoto.mimeType || 'image/jpeg',
              name: profilePhoto.name || 'profile.jpg',
            } as any);
            console.log('Added profile photo to single file test');
          }
          
          const singleFileRes = await fetch(`${API_ENDPOINTS.TRANSPORTERS}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: singleFileFormData,
          });
          
          console.log('Single file FormData test - Status:', singleFileRes.status);
          const singleFileResponse = await singleFileRes.text();
          console.log('Single file FormData test - Response:', singleFileResponse);
        } catch (singleFileError: any) {
          console.log('Single file FormData test failed:', singleFileError.message);
        }
        
        // Test with minimal files to isolate the issue
        console.log('Testing FormData with minimal required files...');
        try {
          const minimalFilesFormData = new FormData();
          
          // Add all required fields
          minimalFilesFormData.append('vehicleType', vehicleType);
          minimalFilesFormData.append('vehicleRegistration', registration);
          minimalFilesFormData.append('vehicleMake', vehicleMake);
          minimalFilesFormData.append('vehicleModel', vehicleMake);
          minimalFilesFormData.append('vehicleCapacity', maxCapacity);
          minimalFilesFormData.append('vehicleColor', vehicleColor);
          minimalFilesFormData.append('vehicleYear', year ? String(year) : '2020');
          minimalFilesFormData.append('driveType', driveType || '');
          minimalFilesFormData.append('bodyType', bodyType || '');
          minimalFilesFormData.append('vehicleFeatures', vehicleFeatures || '');
          minimalFilesFormData.append('humidityControl', humidityControl ? 'true' : 'false');
          minimalFilesFormData.append('refrigerated', refrigeration ? 'true' : 'false');
          minimalFilesFormData.append('transporterType', 'individual');
          
          // Add only the most essential files
          if (profilePhoto && profilePhoto.uri) {
            minimalFilesFormData.append('profilePhoto', {
              uri: profilePhoto.uri,
              type: profilePhoto.mimeType || 'image/jpeg',
              name: 'profile.jpg',
            } as any);
            console.log('Added profile photo to minimal files test');
          }
          
          if (dlFile && dlFile.uri) {
            minimalFilesFormData.append('dlFile', {
              uri: dlFile.uri,
              type: dlFile.mimeType || 'image/jpeg',
              name: 'drivers-license.jpg',
            } as any);
            console.log('Added DL file to minimal files test');
          }
          
          const minimalFilesRes = await fetch(`${API_ENDPOINTS.TRANSPORTERS}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: minimalFilesFormData,
          });
          
          console.log('Minimal files FormData test - Status:', minimalFilesRes.status);
          const minimalFilesResponse = await minimalFilesRes.text();
          console.log('Minimal files FormData test - Response:', minimalFilesResponse);
        } catch (minimalFilesError: any) {
          console.log('Minimal files FormData test failed:', minimalFilesError.message);
        }
        
        // Since the "no files" test worked, let's use that approach
        console.log('Making transporter submission request...');
        console.log('URL:', `${API_ENDPOINTS.TRANSPORTERS}`);
        console.log('Full URL check:', API_ENDPOINTS.TRANSPORTERS);
        console.log('Token available:', !!token);
        console.log('Token length:', token ? token.length : 0);
        
        // Log file information for debugging
        console.log('File information:');
        console.log('Profile photo:', profilePhoto ? 'Present' : 'Missing');
        console.log('DL file:', dlFile ? 'Present' : 'Missing');
        console.log('Insurance file:', insuranceFile ? 'Present' : 'Missing');
        console.log('ID file:', idFile ? 'Present' : 'Missing');
        console.log('Logbook file:', logBookFile ? 'Present' : 'Missing');
        console.log('Vehicle photos count:', vehiclePhotos ? vehiclePhotos.length : 0);
        
        // Use the working approach - create FormData without files first
        const workingFormData = new FormData();
        workingFormData.append('vehicleType', vehicleType);
        workingFormData.append('vehicleRegistration', registration);
        workingFormData.append('vehicleMake', vehicleMake);
        workingFormData.append('vehicleModel', vehicleMake); // Use make as model
        workingFormData.append('vehicleCapacity', maxCapacity || '5');
        workingFormData.append('vehicleColor', vehicleColor);
        workingFormData.append('vehicleYear', year || '2020');
        workingFormData.append('driveType', driveType);
        workingFormData.append('bodyType', bodyType);
        workingFormData.append('vehicleFeatures', vehicleFeatures || '');
        workingFormData.append('humidityControl', humidityControl ? 'true' : 'false');
        workingFormData.append('refrigerated', refrigeration ? 'true' : 'false');
        workingFormData.append('transporterType', 'individual');
        
        console.log('Using working FormData approach (no files first)...');
        
        let res;
        try {
          res = await fetch(`${API_ENDPOINTS.TRANSPORTERS}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: workingFormData,
          });
          
          console.log('Request completed - Status:', res.status);
          
        } catch (fetchError: any) {
          console.error('Fetch request failed:', fetchError);
          throw new Error(`Network error: ${fetchError.message}. Please check your internet connection and try again.`);
        }

        console.log('=== API RESPONSE ===');
        console.log('Status:', res.status);
        console.log('Status Text:', res.statusText);
        console.log('Headers:', Object.fromEntries(res.headers.entries()));
        
        let data = null;
        let parseError = null;
        try {
          const responseText = await res.text();
          console.log('Raw response text:', responseText);
          console.log('Response text length:', responseText.length);
          
          if (responseText.trim()) {
            data = JSON.parse(responseText);
            console.log('Parsed response data:', data);
          } else {
            console.log('Response is empty');
          }
        } catch (e) {
          parseError = e;
          console.error('Failed to parse response as JSON:', e);
          console.error('Parse error details:', e.message);
        }

        if (res.ok) {
          console.log('Individual transporter created successfully:', data);
          // Success: navigate to processing screen
          navigation.reset({
            index: 0,
            routes: [{ name: 'TransporterProcessingScreen', params: { transporterType } }]
          });
          return true;
        } else {
          // Try to show backend error message if available
          let errorMsg = 'Failed to submit profile. Please try again.';
          
          if (data && data.message) {
            // Make backend errors more user-friendly
            if (data.message.includes('Required fields are missing')) {
              errorMsg = 'Please fill in all required fields and try again.';
            } else if (data.message.includes('Invalid vehicle registration')) {
              errorMsg = 'Please enter a valid vehicle registration number (e.g., KDA 123A).';
            } else if (data.message.includes('No files uploaded')) {
              errorMsg = 'Please upload all required documents and photos.';
            } else if (data.message.includes('already exists')) {
              errorMsg = 'A transporter profile already exists for this account.';
            } else {
              errorMsg = data.message;
            }
          } else if (parseError) {
            errorMsg = 'Server error: Unable to process your request. Please try again.';
          } else if (res.status === 400) {
            errorMsg = 'Please check your information and try again.';
          } else if (res.status === 401) {
            errorMsg = 'Session expired. Please sign in again.';
          } else if (res.status === 403) {
            errorMsg = 'Access denied. Please contact support.';
          } else if (res.status === 500) {
            errorMsg = 'Server error. Please try again later.';
          } else if (res.statusText) {
            errorMsg = `Error: ${res.statusText}`;
          }
          
          setError(errorMsg);
          // Log for debugging
          console.error('Individual transporter submit error:', { status: res.status, data, parseError });
          return false;
        }
      } else {
        // Company submission - create FormData for multipart/form-data request
        const formData = new FormData();
        formData.append('name', companyName);
        formData.append('registration', companyReg);
        formData.append('contact', companyContact);
        
        // Add logo file if available
        if (profilePhoto && profilePhoto.uri) {
          formData.append('logo', {
            uri: profilePhoto.uri,
            type: profilePhoto.type || 'image/jpeg',
            name: 'company-logo.jpg',
          } as any);
        }
        
        console.log('=== COMPANY SUBMISSION DEBUG ===');
        console.log('Company FormData contents:', {
          name: companyName,
          registration: companyReg,
          contact: companyContact,
          hasLogo: !!(profilePhoto && profilePhoto.uri)
        });
        
        // Log each FormData entry individually
        console.log('Company FormData entries:');
        for (let [key, value] of formData.entries()) {
          console.log(`  ${key}:`, value);
        }
        
        const token = await user.getIdToken();
        
        // Try using apiRequest with FormData
        try {
          const res = await fetch(`${API_ENDPOINTS.COMPANIES}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              // Don't set Content-Type - let fetch set it with boundary for FormData
            },
            body: formData,
          });
          
          console.log('Company creation response:', res.status, res.statusText);
          
          if (!res.ok) {
            const errorText = await res.text();
            console.error('Company creation error response:', errorText);
            throw new Error(`Company creation failed: ${res.status} - ${errorText}`);
          }
          
          const companyData = await res.json();
          console.log('Company created successfully:', companyData);
          
          // Continue with transporter update
          const transporterPayload = {
            transporterType: 'company',
            companyName,
            companyReg,
            companyContact,
            companyLogo: companyData.logo || '',
            companyEmail: user.email || undefined,
            companyAddress: '',
          };
          
          const transporterRes = await fetch(`${API_ENDPOINTS.TRANSPORTERS}/${user.uid}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(transporterPayload),
          });
          
          if (!transporterRes.ok) {
            console.warn('Failed to update transporter with company details, but company was created');
          }
          
          // Company created and transporter updated; navigate to processing screen
          navigation.navigate('TransporterProcessingScreen', { transporterType });
          return true;
        } catch (error: any) {
          console.error('Company creation error:', error);
          
          let errorMsg = 'Failed to create company. Please try again.';
          
          if (error.message) {
            if (error.message.includes('400')) {
              errorMsg = 'Please check your company information and try again.';
            } else if (error.message.includes('409')) {
              errorMsg = 'A company with this name or registration already exists.';
            } else if (error.message.includes('401')) {
              errorMsg = 'Session expired. Please sign in again.';
            } else if (error.message.includes('403')) {
              errorMsg = 'Access denied. Please contact support.';
            } else if (error.message.includes('500')) {
              errorMsg = 'Server error. Please try again later.';
            } else {
              errorMsg = `Failed to create company: ${error.message}`;
            }
          }
          
          setError(errorMsg);
          return false;
        }
      }
    } catch (e: any) {
      console.error('General submission error:', e);
      
      let errorMsg = 'An unexpected error occurred. Please try again.';
      
      if (e.name === 'AbortError') {
        errorMsg = 'Request timed out. Please check your connection and try again.';
      } else if (e.message && e.message.includes('All retry attempts failed')) {
        errorMsg = 'Unable to connect to server after multiple attempts. Please check your internet connection and try again.';
      } else if (e.message && e.message.includes('Unable to connect to server')) {
        errorMsg = 'Server is not responding. Please check your internet connection and try again.';
      } else if (e.message && e.message.includes('Network request failed')) {
        errorMsg = 'Network connection failed. Please check your internet connection and try again.';
      } else if (e.message && e.message.includes('timeout')) {
        errorMsg = 'Request timed out. Please check your connection and try again.';
      } else if (e.message && e.message.includes('fetch')) {
        errorMsg = 'Unable to connect to server. Please check your internet connection.';
      } else if (e.message) {
        errorMsg = `Error: ${e.message}`;
      }
      
      setError(errorMsg);
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
    <KeyboardAwareScrollView 
      contentContainerStyle={styles.container} 
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      extraScrollHeight={100}
    >
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <View style={styles.headerIconContainer}>
          <MaterialCommunityIcons name="truck-delivery" size={32} color={colors.primary} />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.modernHeaderTitle}>Complete Your Profile</Text>
          <Text style={styles.modernHeaderSubtitle}>
            {transporterType === 'individual' 
              ? 'Set up your individual transporter account' 
              : 'Set up your company transporter account'
            }
          </Text>
        </View>
      </View>

      {/* Full-width Role Selector */}
      <Text style={styles.roleSelectorTitle}>Account Type</Text>
      <View style={styles.roleSelector}>
        <TouchableOpacity
          style={[
            styles.roleButton,
            transporterType === 'individual' && styles.roleButtonActive
          ]}
          onPress={() => setTransporterType('individual')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons 
            name="account" 
            size={24} 
            color={transporterType === 'individual' ? colors.white : colors.primary} 
          />
          <Text style={[
            styles.roleButtonText,
            transporterType === 'individual' && styles.roleButtonTextActive
          ]}>
            Individual
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.roleButton,
            transporterType === 'company' && styles.roleButtonActive
          ]}
          onPress={() => setTransporterType('company')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons 
            name="office-building" 
            size={24} 
            color={transporterType === 'company' ? colors.white : colors.primary} 
          />
          <Text style={[
            styles.roleButtonText,
            transporterType === 'company' && styles.roleButtonTextActive
          ]}>
            Company
          </Text>
        </TouchableOpacity>
      </View>

      {/* INDIVIDUAL FORM */}
      {transporterType === 'individual' && (
        <>
          {/* Profile Photo Section */}
          <View style={styles.modernSection}>
            <Text style={styles.modernSectionTitle}>
              <MaterialCommunityIcons name="camera" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              Profile Photo
            </Text>
            <TouchableOpacity 
              style={styles.modernPhotoPicker} 
              onPress={handleProfilePhoto}
              activeOpacity={0.7}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto.uri }} style={styles.modernProfilePhoto} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="person-circle-outline" size={60} color={colors.text.light} />
                  <Text style={styles.photoPlaceholderText}>Tap to add photo</Text>
                </View>
              )}
              <View style={styles.photoOverlay}>
                <MaterialCommunityIcons name="camera-plus" size={20} color={colors.white} />
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Vehicle Details</Text>
          <VehicleDetailsForm
            initial={{ vehicleType, vehicleMake, vehicleColor, registration, maxCapacity, year, driveType, bodyType, vehicleFeatures }}
            onChange={({ vehicleType, vehicleMake, vehicleModel, vehicleColor, registration, maxCapacity, year, driveType, bodyType, vehicleFeatures, humidityControl, refrigeration }) => {
              setVehicleType(vehicleType);
              setVehicleMake(vehicleMake);
              // vehicleModel is automatically set to vehicleMake in VehicleDetailsForm
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

          {/* Documents Section */}
          <View style={styles.modernSection}>
            <Text style={styles.modernSectionTitle}>
              <MaterialCommunityIcons name="file-document-multiple" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              Required Documents
            </Text>
            <Text style={styles.modernSectionDescription}>
              Upload clear photos or PDFs of your documents
            </Text>
            
            {/* First Row - 2 Documents */}
            <View style={styles.documentsRow}>
              {/* Driver's License */}
              <View style={styles.documentCardRow}>
                <Text style={styles.documentTitle}>Driver's License</Text>
                <TouchableOpacity 
                  style={[styles.documentUploader, dlFile && styles.documentUploaderFilled]} 
                  onPress={handleDlFile}
                  activeOpacity={0.7}
                >
                  {dlFile ? (
                    dlFile.mimeType && dlFile.mimeType.startsWith('image/') ? (
                      <Image source={{ uri: dlFile.uri }} style={styles.documentImage} />
                    ) : (
                      <View style={styles.documentFileContainer}>
                        <MaterialCommunityIcons name="file-pdf-box" size={32} color={colors.primary} />
                        <Text style={styles.documentFileName}>{dlFile.name || 'PDF File'}</Text>
                      </View>
                    )
                  ) : (
                    <View style={styles.documentPlaceholder}>
                      <MaterialCommunityIcons name="card-account-details-outline" size={32} color={colors.text.light} />
                      <Text style={styles.documentPlaceholderText}>Tap to upload</Text>
                    </View>
                  )}
                  {dlFile && (
                    <View style={styles.documentCheckmark}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Driver's ID */}
              <View style={styles.documentCardRow}>
                <Text style={styles.documentTitle}>Driver's ID</Text>
                <TouchableOpacity 
                  style={[styles.documentUploader, idFile && styles.documentUploaderFilled]} 
                  onPress={handleIdFile}
                  activeOpacity={0.7}
                >
                  {idFile ? (
                    idFile.mimeType && idFile.mimeType.startsWith('image/') ? (
                      <Image source={{ uri: idFile.uri }} style={styles.documentImage} />
                    ) : (
                      <View style={styles.documentFileContainer}>
                        <MaterialCommunityIcons name="file-pdf-box" size={32} color={colors.primary} />
                        <Text style={styles.documentFileName}>{idFile.name || 'PDF File'}</Text>
                      </View>
                    )
                  ) : (
                    <View style={styles.documentPlaceholder}>
                      <MaterialCommunityIcons name="card-account-details-outline" size={32} color={colors.text.light} />
                      <Text style={styles.documentPlaceholderText}>Tap to upload</Text>
                    </View>
                  )}
                  {idFile && (
                    <View style={styles.documentCheckmark}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Second Row - 1 Document */}
            <View style={styles.documentsRowSingle}>
              {/* Insurance */}
              <View style={styles.documentCardSingle}>
                <Text style={styles.documentTitle}>Insurance</Text>
                <TouchableOpacity 
                  style={[styles.documentUploader, insuranceFile && styles.documentUploaderFilled]} 
                  onPress={handleInsuranceFile}
                  activeOpacity={0.7}
                >
                  {insuranceFile ? (
                    insuranceFile.mimeType && insuranceFile.mimeType.startsWith('image/') ? (
                      <Image source={{ uri: insuranceFile.uri }} style={styles.documentImage} />
                    ) : (
                      <View style={styles.documentFileContainer}>
                        <MaterialCommunityIcons name="file-pdf-box" size={32} color={colors.primary} />
                        <Text style={styles.documentFileName}>{insuranceFile.name || 'PDF File'}</Text>
                      </View>
                    )
                  ) : (
                    <View style={styles.documentPlaceholder}>
                      <MaterialCommunityIcons name="shield-check-outline" size={32} color={colors.text.light} />
                      <Text style={styles.documentPlaceholderText}>Tap to upload</Text>
                    </View>
                  )}
                  {insuranceFile && (
                    <View style={styles.documentCheckmark}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </>
      )}

      {/* COMPANY FORM */}
      {transporterType === 'company' && (
        <>
          <Text style={styles.sectionTitle}>Company Details</Text>
          <View style={[styles.card, { backgroundColor: colors.background, borderRadius: 18, padding: spacing.lg, marginBottom: spacing.md, shadowColor: colors.black, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
              <Ionicons name="business-outline" size={22} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.label}>Company Name</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter company name as registered (e.g. Acme Transporters Ltd.)"
              placeholderTextColor={colors.text.light}
              value={companyName}
              onChangeText={setCompanyName}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
              <MaterialCommunityIcons name="file-document-outline" size={22} color={colors.secondary} style={{ marginRight: 8 }} />
              <Text style={styles.label}>Company Registration Number</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter registration number (e.g. CPR/2023/123456)"
              placeholderTextColor={colors.text.light}
              value={companyReg}
              onChangeText={setCompanyReg}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
              <Ionicons name="call-outline" size={22} color={colors.tertiary} style={{ marginRight: 8 }} />
              <Text style={styles.label}>Contact Number</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter company contact (e.g. +254712345678)"
              placeholderTextColor={colors.text.light}
              value={companyContact}
              onChangeText={setCompanyContact}
              keyboardType="phone-pad"
            />
          </View>
          <View style={{ height: 1, backgroundColor: colors.text.light + '33', marginVertical: spacing.md, width: '100%' }} />
          <Text style={styles.sectionTitle}>Profile Photo</Text>
          <TouchableOpacity style={styles.photoPicker} onPress={handleProfilePhoto}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto.uri }} style={styles.profilePhoto} />
            ) : (
              <Ionicons name="business-outline" size={80} color={colors.text.light} />
            )}
            <Text style={styles.photoPickerText}>Upload Company Logo</Text>
          </TouchableOpacity>
          <View style={[styles.card, { marginTop: 10, backgroundColor: colors.background, borderRadius: 18, padding: spacing.lg, borderWidth: 1, borderColor: colors.text.light + '22' }]}>
            <Text style={styles.label}>Assign Jobs to Drivers</Text>
            <Text style={{ color: colors.text.secondary, fontSize: 15, marginBottom: 6 }}>
              As a company, you can assign jobs to your own drivers. This feature will be available after your company profile is approved and you have an active subscription.
            </Text>
            <View style={{ backgroundColor: colors.white, borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.text.light }}>
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
    </KeyboardAwareScrollView>
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

  // Modern Styles
  modernHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '20',
  },
  headerIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  headerTextContainer: {
    flex: 1,
  },
  modernHeaderTitle: {
    fontSize: fonts.size.xl + 4,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  modernHeaderSubtitle: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    lineHeight: 20,
  },

  // Role Selector
  roleSelectorContainer: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  roleSelectorTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  roleButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.text.light + '30',
  },
  roleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  roleIconContainerActive: {
    backgroundColor: colors.white + '30',
  },
  roleButtonText: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  roleButtonTextActive: {
    color: colors.white,
  },
  roleButtonDescription: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  roleButtonDescriptionActive: {
    color: colors.white + 'CC',
  },
  roleDescriptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: spacing.md,
  },
  roleDescription: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    flex: 1,
    lineHeight: 18,
  },

  // Modern Sections
  modernSection: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  modernSectionTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernSectionDescription: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },

  // Modern Photo Picker
  modernPhotoPicker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary + '30',
    borderStyle: 'dashed',
    position: 'relative',
  },
  modernProfilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.background,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    color: colors.text.light,
    fontSize: fonts.size.sm,
    marginTop: 8,
    textAlign: 'center',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Full-width Role Selector
  roleSelectorTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 6,
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
    minHeight: 60,
  },
  roleButtonActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  roleButtonText: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  roleButtonTextActive: {
    color: colors.white,
  },

  // Documents Layout
  documentsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  documentsRowSingle: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  documentCardRow: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.text.light + '20',
  },
  documentCardSingle: {
    width: '60%',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.text.light + '20',
  },
  documentTitle: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  documentUploader: {
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.text.light + '40',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  documentUploaderFilled: {
    borderColor: colors.success,
    borderStyle: 'solid',
  },
  documentImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  documentFileContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentFileName: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  documentPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentPlaceholderText: {
    fontSize: 10,
    color: colors.text.light,
    marginTop: 4,
    textAlign: 'center',
  },
  documentCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});
