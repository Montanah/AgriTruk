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
import { API_ENDPOINTS } from '../../constants/api';
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
          aspect: [1, 1], // Square aspect ratio for profile photos
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
          aspect: [1, 1], // Square aspect ratio for profile photos
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
        // Upload all files to Cloudinary first
        const uploadPromises = [];
        
        if (profilePhoto && profilePhoto.uri) {
          uploadPromises.push(uploadFile(profilePhoto.uri, 'profile', user.uid).then(url => ({ type: 'profilePhoto', url })));
        }
        if (dlFile && dlFile.uri) {
          uploadPromises.push(uploadFile(dlFile.uri, 'document', user.uid).then(url => ({ type: 'dlFile', url })));
        }
        if (insuranceFile && insuranceFile.uri) {
          uploadPromises.push(uploadFile(insuranceFile.uri, 'document', user.uid).then(url => ({ type: 'insuranceFile', url })));
        }
        if (logBookFile && logBookFile.uri) {
          uploadPromises.push(uploadFile(logBookFile.uri, 'document', user.uid).then(url => ({ type: 'logbook', url })));
        }
        if (idFile && idFile.uri) {
          uploadPromises.push(uploadFile(idFile.uri, 'document', user.uid).then(url => ({ type: 'idFile', url })));
        }
        if (vehiclePhotos && vehiclePhotos.length > 0) {
          vehiclePhotos.forEach((img, idx) => {
            if (img.uri) {
              uploadPromises.push(uploadFile(img.uri, 'transporter', user.uid).then(url => ({ type: 'vehiclePhoto', url, index: idx })));
            }
          });
        }

        // Wait for all uploads to complete
        const uploadResults = await Promise.all(uploadPromises);
        
        // Prepare JSON payload with uploaded URLs
        const transporterData = {
          vehicleType,
          vehicleRegistration: registration,
          vehicleMake,
          vehicleColor,
          vehicleModel: vehicleMake,
          vehicleYear: year ? String(year) : '',
          vehicleCapacity: maxCapacity && !isNaN(parseInt(maxCapacity, 10)) ? parseInt(maxCapacity, 10) : null,
          driveType: driveType || '',
          bodyType: bodyType || '',
          vehicleFeatures: vehicleFeatures || '',
          humidityControl,
          refrigerated: refrigeration,
          transporterType,
        };

        // Add uploaded file URLs to the payload
        uploadResults.forEach(result => {
          if (result.type === 'profilePhoto') {
            transporterData.driverProfileImage = result.url;
          } else if (result.type === 'dlFile') {
            transporterData.driverLicense = result.url;
          } else if (result.type === 'insuranceFile') {
            transporterData.insuranceUrl = result.url;
          } else if (result.type === 'logbook') {
            transporterData.logbookUrl = result.url;
          } else if (result.type === 'idFile') {
            transporterData.idDocument = result.url;
          } else if (result.type === 'vehiclePhoto') {
            if (!transporterData.vehicleImagesUrl) transporterData.vehicleImagesUrl = [];
            transporterData.vehicleImagesUrl.push(result.url);
          }
        });

        const token = await user.getIdToken();
        const res = await fetch(`${API_ENDPOINTS.TRANSPORTERS}/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transporterData),
        });

        let data = null;
        let parseError = null;
        try {
          data = await res.json();
        } catch (e) {
          parseError = e;
        }

        if (res.ok) {
          // Success: navigate to processing screen
          navigation.reset({
            index: 0,
            routes: [{ name: 'TransporterProcessingScreen', params: { transporterType } }]
          });
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
        
        console.log('FormData contents:', {
          name: companyName,
          registration: companyReg,
          contact: companyContact,
          hasLogo: !!(profilePhoto && profilePhoto.uri)
        });
        
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
          setError(`Failed to create company: ${error.message || 'Unknown error'}`);
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
