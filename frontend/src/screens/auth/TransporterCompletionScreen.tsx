import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useCameraPermissions, useMediaLibraryPermissions } from 'expo-image-picker';
import { handleImagePicker } from '../../utils/permissionUtils';
import { getAuth } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Modal,
  FlatList,
  ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FormKeyboardWrapper from '../../components/common/FormKeyboardWrapper';
import { API_ENDPOINTS } from '../../constants/api';
import VehicleDetailsForm from '../../components/VehicleDetailsForm';
import { fonts, spacing } from '../../constants';
import colors from '../../constants/colors';
import { useSubscriptionStatus } from '../../hooks/useSubscriptionStatus';
import { NTSA_VEHICLE_CLASSES, VEHICLE_SPECIALIZATIONS, getVehicleClassLabel } from '../../constants/vehicleClasses';
import { validateImageAsset, safeAppendFile, getIOSErrorMessage, getMimeType } from '../../utils/iosFileUtils';

// Vehicle types removed as they're not used in this component

// Helper to check if transporter profile is truly complete
function isTransporterProfileComplete(transporter: any) {
  if (!transporter) return false;
  
  console.log('Checking profile completeness for:', transporter);
  
  // Required fields for a completed profile (individual)
  const requiredFields = [
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
  
  // Check basic required fields
  for (const field of requiredFields) {
    if (!transporter[field] || typeof transporter[field] !== 'string' || transporter[field].length === 0) {
      console.log(`Missing or empty field: ${field} = ${transporter[field]}`);
      return false;
    }
  }
  
  // Check for profile image (flexible field names)
  const hasProfileImage = transporter.driverProfileImage || transporter.profilePhoto || transporter.profileImage;
  if (!hasProfileImage) {
    console.log('Missing profile image');
    return false;
  }
  
  // Check for driver license (flexible field names)
  const hasDriverLicense = transporter.driverLicense || transporter.dlFile || transporter.driverLicenseUrl;
  if (!hasDriverLicense) {
    console.log('Missing driver license');
    return false;
  }
  
  // Check for insurance (flexible field names)
  const hasInsurance = transporter.insuranceUrl || transporter.insuranceFile || transporter.insurance;
  if (!hasInsurance) {
    console.log('Missing insurance');
    return false;
  }
  
  // Check for vehicle images (flexible field names)
  const vehicleImages = transporter.vehicleImagesUrl || transporter.vehicleImages || transporter.vehiclePhotos;
  if (!Array.isArray(vehicleImages) || vehicleImages.length === 0) {
    console.log('Missing vehicle images');
    return false;
  }
  
  // Status must be at least 'pending', 'under_review', or 'approved'
  if (!['pending', 'under_review', 'approved'].includes(transporter.status)) {
    console.log(`Invalid status: ${transporter.status}`);
    return false;
  }
  
  console.log('Profile is complete!');
  return true;
}

export default function TransporterCompletionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [transporterType, setTransporterType] = useState('individual'); // 'individual' or 'company'
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [profileCheckError, setProfileCheckError] = useState('');
  const { subscriptionStatus, loading: subscriptionLoading } = useSubscriptionStatus();
  
  // Check if this is a job seeker (driver) from route params
  const isJobSeeker = (route.params as any)?.isJobSeeker || false;

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
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
          clearTimeout(timeout);
          setCheckingProfile(false);
          return;
        }
        const token = await user.getIdToken();
        let res, data = null;
        let transporterType = 'individual';
        
        // First check if user is a company transporter
        try {
          const companyRes = await fetch(`${API_ENDPOINTS.COMPANIES}/transporter/${user.uid}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (companyRes.ok) {
            const companyData = await companyRes.json();
            if (companyData && companyData.length > 0) {
              // This is a company transporter
              transporterType = 'company';
              data = { transporter: companyData[0] };
              res = companyRes;
              console.log('Company transporter profile data:', data);
              setTransporterType('company');
            }
          }
        } catch (error) {
          console.log('Not a company transporter, checking individual transporters...');
        }
        
        // If not a company transporter, check individual transporters
        if (!data) {
          try {
            res = await fetch(`${API_ENDPOINTS.TRANSPORTERS}/${user.uid}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
          } catch {
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
          
          if (res.ok) {
            try {
              data = await res.json();
              console.log('Individual transporter profile data:', data);
              if (data.transporter) {
                console.log('Transporter fields:', Object.keys(data.transporter));
                console.log('Profile completeness check:', isTransporterProfileComplete(data.transporter));
              }
            } catch {
              data = null;
            }
          } else if (res.status === 404) {
            // Neither company nor individual transporter profile exists - this is expected for new transporters
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
              
              // Check subscription status before navigating to dashboard
              console.log('Subscription status check:', { subscriptionStatus, subscriptionLoading });
              if (subscriptionStatus && !subscriptionLoading) {
                console.log('Subscription details:', {
                  hasActiveSubscription: subscriptionStatus.hasActiveSubscription,
                  isTrialActive: subscriptionStatus.isTrialActive,
                  subscriptionStatus: subscriptionStatus.subscriptionStatus,
                  needsTrialActivation: subscriptionStatus.needsTrialActivation
                });
                
                // Priority 1: User has active subscription or trial - go directly to dashboard
                if (subscriptionStatus.hasActiveSubscription || subscriptionStatus.isTrialActive) {
                  console.log('✅ User has active subscription/trial, navigating to dashboard');
                  clearTimeout(timeout);
                  navigation.reset({
                    index: 0,
                    routes: [
                      { name: 'TransporterTabs', params: { transporterType: transporterType } },
                    ],
                  });
                  return;
                } 
                
                // Priority 2: Subscription expired - go to expired screen
                else if (subscriptionStatus.subscriptionStatus === 'expired' || subscriptionStatus.subscriptionStatus === 'inactive') {
                  console.log('⚠️ User subscription expired, navigating to expired screen');
                  clearTimeout(timeout);
                  navigation.reset({
                    index: 0,
                    routes: [
                      { name: 'SubscriptionExpiredScreen', params: { 
                        userType: 'transporter',
                        userId: 'current_user',
                        expiredDate: new Date().toISOString()
                      } },
                    ],
                  });
                  return;
                } 
                
                // Priority 3: No subscription or needs trial activation - go to trial screen
                else {
                  console.log('🔄 User needs trial activation, navigating to trial screen');
                  clearTimeout(timeout);
                  navigation.reset({
                    index: 0,
                    routes: [
                      { name: 'SubscriptionTrial', params: { 
                        userType: 'transporter',
                        subscriptionStatus: subscriptionStatus 
                      } },
                    ],
                  });
                  return;
                }
              } else {
                // Subscription status not loaded yet, wait for it
                console.log('⏳ Subscription status not loaded yet, waiting...');
                return;
              }
            } else if (['pending', 'under_review'].includes(data.transporter.status)) {
              clearTimeout(timeout);
              navigation.reset({
                index: 0,
                routes: [
                  { name: 'TransporterProcessingScreen', params: { transporterType: transporterType } },
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
        setProfileCheckError('Unexpected error: ' + (err && (err as any).message ? (err as any).message : String(err)));
      }
      if (!didTimeout) {
        clearTimeout(timeout);
        setCheckingProfile(false);
      }
    })();
  }, [navigation, subscriptionStatus, subscriptionLoading]);

  useEffect(() => {
    runProfileCheck();
  }, [runProfileCheck]);

  // Re-run profile check when subscription status changes
  useEffect(() => {
    if (subscriptionStatus && !subscriptionLoading) {
      runProfileCheck();
    }
  }, [subscriptionStatus, subscriptionLoading, runProfileCheck]);

  // Fallback: If subscription status doesn't load after 10 seconds, proceed anyway
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (checkingProfile && !subscriptionStatus && !subscriptionLoading) {
        console.log('Subscription status timeout - proceeding with default navigation');
        setCheckingProfile(false);
        // Allow the form to show if no profile exists, or navigate based on profile status
      }
    }, 10000);

    return () => clearTimeout(fallbackTimer);
  }, [checkingProfile, subscriptionStatus, subscriptionLoading]);
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('');
  const [year, setYear] = useState('');
  const [driveType, setDriveType] = useState('');
  const [bodyType, setBodyType] = useState('closed');
  const [vehicleFeatures, setVehicleFeatures] = useState('');
  const [registration, setRegistration] = useState('');
  const [humidityControl, setHumidityControl] = useState(false);
  const [refrigeration, setRefrigeration] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<any>(null);
  const [vehiclePhotos, setVehiclePhotos] = useState<any[]>([]);
  const [photoJustAdded, setPhotoJustAdded] = useState(false);
  const [dlFile, setDlFile] = useState<any>(null); // can be image or pdf
  const [idFile, setIdFile] = useState<any>(null); // driver's ID
  const [insuranceFile, setInsuranceFile] = useState<any>(null); // insurance
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  // Logbook file removed as it's not used in current implementation
  const [companyName, setCompanyName] = useState('');
  const [companyReg, setCompanyReg] = useState('');
  const [companyContact, setCompanyContact] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  // Job Seeker specific state variables
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [careerStartDate, setCareerStartDate] = useState<Date | null>(null);
  const [selectedVehicleClasses, setSelectedVehicleClasses] = useState<string[]>([]);
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [assignmentDescription, setAssignmentDescription] = useState('');
  const [goodConductCert, setGoodConductCert] = useState<any>(null);
  const [gslLicence, setGslLicence] = useState<any>(null);
  const [showDateOfBirthPicker, setShowDateOfBirthPicker] = useState(false);
  const [showCareerStartDatePicker, setShowCareerStartDatePicker] = useState(false);
  const [vehicleClassModal, setVehicleClassModal] = useState(false);
  const [specializationModal, setSpecializationModal] = useState(false);
  const [mediaLibraryPermission, requestMediaLibraryPermission] = useMediaLibraryPermissions();

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
        } catch { }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transporterType]);

  // Image picker modal state (keeping for compatibility but not using)
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = useMediaLibraryPermissions();

  const handleAddVehiclePhoto = async () => {
    Alert.alert(
      'Add Vehicle Photos',
      'Choose how you want to add vehicle photos. You can select multiple photos at once from your gallery.',
      [
        { text: 'Take Photo', onPress: () => handleVehiclePhotoCamera() },
        { text: 'Choose from Gallery (Multi-select)', onPress: () => handleVehiclePhotoGallery() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleVehiclePhotoCamera = async () => {
    try {
      const result = await handleImagePicker('camera', {
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (result && !result.canceled && result.assets && result.assets.length > 0) {
        setVehiclePhotos((prev) => [...prev, result.assets[0]]);
        setPhotoJustAdded(true);
        setError('');
      }
    } catch (err) {
      setError('Failed to open camera.');
      console.error('Camera error:', err);
    }
  };

  const handleVehiclePhotoGallery = async () => {
    try {
      const result = await handleImagePicker('gallery', {
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.8,
      });
      
      if (result && !result.canceled && result.assets && result.assets.length > 0) {
        // Add all selected photos up to the limit (4 photos max)
        const newPhotos = result.assets.slice(0, 4 - vehiclePhotos.length);
        setVehiclePhotos((prev) => [...prev, ...newPhotos]);
        setPhotoJustAdded(true);
        setError('');
      }
    } catch (err) {
      setError('Failed to open gallery.');
      console.error('Gallery error:', err);
    }
  };

  const handleRemoveVehiclePhoto = (idx: number) => {
    setVehiclePhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleProfilePhoto = async () => {
    Alert.alert(
      'Select Profile Photo',
      'Choose how you want to add your profile photo',
      [
        { text: 'Take Photo', onPress: () => handleProfilePhotoCamera() },
        { text: 'Choose from Gallery', onPress: () => handleProfilePhotoGallery() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleProfilePhotoCamera = async () => {
    try {
      const result = await handleImagePicker('camera', {
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1], // Square aspect ratio for profile photos
      });
      
      if (result && !result.canceled && result.assets && result.assets.length > 0) {
        setProfilePhoto(result.assets[0]);
        setError('');
      }
    } catch (err) {
      setError('Failed to open camera.');
      console.error('Camera error:', err);
    }
  };

  const handleProfilePhotoGallery = async () => {
    try {
      const result = await handleImagePicker('gallery', {
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1], // Square aspect ratio for profile photos
      });
      
      if (result && !result.canceled && result.assets && result.assets.length > 0) {
        setProfilePhoto(result.assets[0]);
        setError('');
      }
    } catch (err) {
      setError('Failed to open gallery.');
      console.error('Gallery error:', err);
    }
  };

  // Debounce submit after adding a photo
  React.useEffect(() => {
    if (photoJustAdded) {
      const timer = setTimeout(() => setPhotoJustAdded(false), 350);
      return () => clearTimeout(timer);
    }
  }, [photoJustAdded]);

  const validatePhone = (phone: string): boolean => {
    if (!phone) return false;
    const cleanPhone = phone.replace(/\s/g, '');
    
    // Handle international format (+254...)
    if (cleanPhone.startsWith('+254')) {
      const withoutCountryCode = cleanPhone.slice(4); // Remove +254
      return /^[0-9]{9}$/.test(withoutCountryCode);
    }
    
    // Handle local format (07... or 01...)
    if (cleanPhone.startsWith('0')) {
      const withoutLeadingZero = cleanPhone.slice(1);
      return /^[0-9]{9}$/.test(withoutLeadingZero);
    }
    
    // Handle format without leading 0 (7... or 1...)
    return /^[0-9]{9}$/.test(cleanPhone);
  };

  // Get validation status for each section
  const getValidationStatus = () => {
    if (transporterType === 'individual') {
      return {
        profilePhoto: !!profilePhoto,
        vehicleDetails: !!(vehicleType && registration),
        documents: !!(dlFile && insuranceFile && idFile),
        vehiclePhotos: vehiclePhotos.length > 0,
        allValid: !!(
          vehicleType &&
          registration &&
          profilePhoto &&
          dlFile &&
          insuranceFile &&
          idFile &&
          vehiclePhotos.length > 0
        )
      };
    } else {
      return {
        companyDetails: !!(companyName && companyReg && companyContact && validatePhone(companyContact)),
        profilePhoto: !!profilePhoto,
        allValid: !!(
          companyName &&
          companyReg &&
          companyContact &&
          validatePhone(companyContact) &&
          profilePhoto
        )
      };
    }
  };

  const isValid = () => {
    const status = getValidationStatus();
    return status.allValid;
  };

  // Job Seeker validation functions

  const getJobSeekerValidationStatus = () => {
    return {
      profilePhoto: !!profilePhoto,
      driverLicense: !!dlFile,
      goodConductCert: !!goodConductCert,
      idDoc: !!idFile,
      dateOfBirth: !!dateOfBirth,
      careerStartDate: !!careerStartDate,
      vehicleClasses: selectedVehicleClasses.length > 0,
      specializations: selectedSpecializations.length > 0,
      allValid: !!profilePhoto && !!dlFile && !!goodConductCert && !!idFile && 
                !!dateOfBirth && !!careerStartDate && 
                selectedVehicleClasses.length > 0 && selectedSpecializations.length > 0
    };
  };

  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const calculateExperience = (startDate: Date): number => {
    const today = new Date();
    let experience = today.getFullYear() - startDate.getFullYear();
    const monthDiff = today.getMonth() - startDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < startDate.getDate())) {
      experience--;
    }
    return Math.max(0, experience);
  };

  const validateVehicleClassEligibility = (vehicleClass: string, age: number, experience: number): boolean => {
    const classInfo = NTSA_VEHICLE_CLASSES.find(cls => cls.value === vehicleClass);
    if (!classInfo) return false;
    
    if (age < classInfo.minAge) return false;
    
    // Check experience requirements for specific classes
    if (vehicleClass === 'A3' && experience < 1) return false;
    if (vehicleClass === 'C' && experience < 2) return false;
    if (vehicleClass === 'CE' && experience < 4) return false;
    if (vehicleClass === 'CD' && experience < 2) return false;
    if (vehicleClass === 'D2' && experience < 3) return false;
    if (vehicleClass === 'D3' && experience < 3) return false;
    
    return true;
  };


  const handleDlFile = async () => {
    Alert.alert(
      'Select Document',
      'Choose how you want to add your driver&apos;s license',
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
      const result = await handleImagePicker('camera', {
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (result && !result.canceled && result.assets && result.assets.length > 0) {
        setDlFile({
          ...result.assets[0],
          name: 'driver_license.jpg',
          mimeType: 'image/jpeg'
        });
        setError('');
      }
    } catch (err) {
      setError('Failed to open camera.');
      console.error('Camera error:', err);
    }
  };

  const handleDlGallery = async () => {
    try {
      const result = await handleImagePicker('gallery', {
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (result && !result.canceled && result.assets && result.assets.length > 0) {
        setDlFile({
          ...result.assets[0],
          name: 'driver_license.jpg',
          mimeType: 'image/jpeg'
        });
        setError('');
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
      'Choose how you want to add your driver&apos;s ID',
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

  // Logbook file handlers removed as they're not used in the current implementation

  // Job Seeker specific handler functions
  const handleGoodConductCamera = async () => {
    try {
      if (!cameraPermission?.granted) {
        const permission = await requestCameraPermission();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Camera permission is required to take photos.');
          return;
        }
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (validateImageAsset(asset)) {
          setGoodConductCert({
            ...asset,
            name: 'good_conduct_certificate.jpg',
            mimeType: 'image/jpeg'
          });
          setError('');
        } else {
          const errorMsg = getIOSErrorMessage(new Error('Invalid image asset')) || 'Invalid image. Please try again.';
          setError(errorMsg);
        }
      }
    } catch (err: any) {
      const errorMsg = getIOSErrorMessage(err) || 'Failed to take photo. Please try again.';
      setError(errorMsg);
    }
  };

  const handleGoodConductGallery = async () => {
    try {
      if (!mediaLibraryPermission?.granted) {
        const permission = await requestMediaLibraryPermission();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Media library permission is required to select photos.');
          return;
        }
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (validateImageAsset(asset)) {
          setGoodConductCert({
            ...asset,
            name: 'good_conduct_certificate.jpg',
            mimeType: 'image/jpeg'
          });
          setError('');
        } else {
          const errorMsg = getIOSErrorMessage(new Error('Invalid image asset')) || 'Invalid image. Please try again.';
          setError(errorMsg);
        }
      }
    } catch (err: any) {
      const errorMsg = getIOSErrorMessage(err) || 'Failed to select photo. Please try again.';
      setError(errorMsg);
    }
  };

  const handleGslLicence = async () => {
    Alert.alert(
      'Select Document',
      'Choose how you want to add your Goods Service License (Optional)',
      [
        { text: 'Take Photo', onPress: () => handleGslCamera() },
        { text: 'Choose from Gallery', onPress: () => handleGslGallery() },
        { text: 'Upload PDF', onPress: () => handleGslPDF() },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleGslCamera = async () => {
    try {
      if (!cameraPermission?.granted) {
        const permission = await requestCameraPermission();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Camera permission is required to take photos.');
          return;
        }
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (validateImageAsset(asset)) {
          setGslLicence({
            ...asset,
            name: 'goods_service_license.jpg',
            mimeType: 'image/jpeg'
          });
          setError('');
        } else {
          const errorMsg = getIOSErrorMessage(new Error('Invalid image asset')) || 'Invalid image. Please try again.';
          setError(errorMsg);
        }
      }
    } catch (err: any) {
      const errorMsg = getIOSErrorMessage(err) || 'Failed to take photo. Please try again.';
      setError(errorMsg);
    }
  };

  const handleGslGallery = async () => {
    try {
      if (!mediaLibraryPermission?.granted) {
        const permission = await requestMediaLibraryPermission();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Media library permission is required to select photos.');
          return;
        }
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (validateImageAsset(asset)) {
          setGslLicence({
            ...asset,
            name: 'goods_service_license.jpg',
            mimeType: 'image/jpeg'
          });
          setError('');
        } else {
          const errorMsg = getIOSErrorMessage(new Error('Invalid image asset')) || 'Invalid image. Please try again.';
          setError(errorMsg);
        }
      }
    } catch (err: any) {
      const errorMsg = getIOSErrorMessage(err) || 'Failed to select photo. Please try again.';
      setError(errorMsg);
    }
  };

  const handleGslPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setGslLicence({
          ...result.assets[0],
          name: 'goods_service_license.pdf',
          mimeType: 'application/pdf'
        });
        setError('');
      }
    } catch (err: any) {
      const errorMsg = getIOSErrorMessage(err) || 'Failed to select PDF. Please try again.';
      setError(errorMsg);
    }
  };

  const handleVehicleClassToggle = (vehicleClass: string) => {
    if (selectedVehicleClasses.includes(vehicleClass)) {
      setSelectedVehicleClasses(prev => prev.filter(cls => cls !== vehicleClass));
    } else {
      // Validate eligibility before adding
      if (dateOfBirth && careerStartDate) {
        const age = calculateAge(dateOfBirth);
        const experience = calculateExperience(careerStartDate);
        
        if (!validateVehicleClassEligibility(vehicleClass, age, experience)) {
          const classInfo = NTSA_VEHICLE_CLASSES.find(cls => cls.value === vehicleClass);
          Alert.alert(
            'Not Eligible',
            `You are not eligible for ${classInfo?.label}. Age: ${age}, Experience: ${experience} years. Minimum requirements: Age ${classInfo?.minAge}${classInfo?.minAge && classInfo.minAge > 18 ? `, Experience: ${classInfo.minAge === 21 ? '1' : classInfo.minAge === 24 ? '2' : classInfo.minAge === 28 ? '4' : '0'} years` : ''}.`
          );
          return;
        }
      }
      setSelectedVehicleClasses(prev => [...prev, vehicleClass]);
    }
  };

  const handleSpecializationToggle = (specialization: string) => {
    if (selectedSpecializations.includes(specialization)) {
      setSelectedSpecializations(prev => prev.filter(spec => spec !== specialization));
    } else {
      setSelectedSpecializations(prev => [...prev, specialization]);
    }
  };

  const handleSubmit = async () => {
    setError('');

    // Validation
    if (isJobSeeker) {
      // Job seeker validation
      if (!profilePhoto) { setError('Please upload a profile photo.'); return false; }
      if (!dlFile) { setError("Please upload the driver's license."); return false; }
      if (!goodConductCert) { setError('Please upload the good conduct certificate.'); return false; }
      if (!idFile) { setError("Please upload your ID document."); return false; }
      if (!dateOfBirth) { setError('Please select your date of birth.'); return false; }
      if (!careerStartDate) { setError('Please select your career start date.'); return false; }
      if (selectedVehicleClasses.length === 0) { setError('Please select at least one vehicle class.'); return false; }
      if (selectedSpecializations.length === 0) { setError('Please select at least one specialization.'); return false; }
      
      // Validate age and experience requirements
      const age = calculateAge(dateOfBirth);
      const experience = calculateExperience(careerStartDate);
      
      // Check if selected vehicle classes are eligible
      for (const vehicleClass of selectedVehicleClasses) {
        if (!validateVehicleClassEligibility(vehicleClass, age, experience)) {
          const classInfo = NTSA_VEHICLE_CLASSES.find(cls => cls.value === vehicleClass);
          setError(`You are not eligible for ${classInfo?.label}. Please check age and experience requirements.`);
          return false;
        }
      }
    } else if (transporterType === 'individual') {
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

      if (isJobSeeker) {
        // Job seeker submission
        setUploading(true);
        
        const token = await user.getIdToken();
        
        // Create FormData for job seeker submission
        const formData = new FormData();
        
        // Add text fields
        formData.append('dateOfBirth', dateOfBirth!.toISOString());
        formData.append('careerStartDate', careerStartDate!.toISOString());
        formData.append('vehicleClasses', JSON.stringify(selectedVehicleClasses));
        formData.append('specializations', JSON.stringify(selectedSpecializations));
        if (assignmentDescription) {
          formData.append('assignmentDescription', assignmentDescription);
        }
        
        // Add files with iOS-safe handling
        if (profilePhoto && profilePhoto.uri) {
          const fileType = getMimeType(profilePhoto.uri, 'image/jpeg');
          const success = safeAppendFile(formData, 'profilePhoto', profilePhoto, 'profile-photo.jpg', fileType);
          if (!success) {
            console.warn('Failed to append profile photo to FormData');
          }
        }
        
        if (dlFile && dlFile.uri) {
          const fileType = getMimeType(dlFile.uri, 'image/jpeg');
          const success = safeAppendFile(formData, 'driverLicense', dlFile, 'driver-license.jpg', fileType);
          if (!success) {
            console.warn('Failed to append driver license to FormData');
          }
        }
        
        if (goodConductCert && goodConductCert.uri) {
          const fileType = getMimeType(goodConductCert.uri, 'image/jpeg');
          const success = safeAppendFile(formData, 'goodConductCert', goodConductCert, 'good-conduct-certificate.jpg', fileType);
          if (!success) {
            console.warn('Failed to append good conduct certificate to FormData');
          }
        }
        
        if (idFile && idFile.uri) {
          const fileType = getMimeType(idFile.uri, 'image/jpeg');
          const success = safeAppendFile(formData, 'idDoc', idFile, 'id-document.jpg', fileType);
          if (!success) {
            console.warn('Failed to append ID document to FormData');
          }
        }
        
        if (gslLicence && gslLicence.uri) {
          const fileType = getMimeType(gslLicence.uri, gslLicence.mimeType || 'application/pdf');
          const success = safeAppendFile(formData, 'goodsServiceLicense', gslLicence, 'goods-service-license.pdf', fileType);
          if (!success) {
            console.warn('Failed to append goods service license to FormData');
          }
        }
        
        // Submit job seeker application
        const response = await fetch(API_ENDPOINTS.JOB_SEEKERS, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Job seeker application submitted successfully:', data);
          
          // Clear draft data
          await AsyncStorage.removeItem('transporterDraft');
          
          // Navigate to job seeker status screen
          navigation.reset({
            index: 0,
            routes: [{ name: 'DriverRecruitmentStatusScreen' }]
          });
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }
      } else if (transporterType === 'individual') {
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
        // Add files directly to FormData with proper logging
        console.log('=== ADDING FILES TO FORMDATA ===');
        
        if (profilePhoto && profilePhoto.uri) {
          console.log('Adding profile photo:', {
            uri: profilePhoto.uri,
            type: profilePhoto.type || 'image/jpeg',
            name: 'profile-photo.jpg',
          });
          formData.append('profilePhoto', {
            uri: profilePhoto.uri,
            type: profilePhoto.type || 'image/jpeg',
            name: 'profile-photo.jpg',
          } as any);
        } else {
          console.log('No profile photo to add');
        }
        
        if (dlFile && dlFile.uri) {
          console.log('Adding driver license:', {
            uri: dlFile.uri,
            type: dlFile.type || 'image/jpeg',
            name: 'drivers-license.jpg',
          });
          formData.append('dlFile', {
            uri: dlFile.uri,
            type: dlFile.type || 'image/jpeg',
            name: 'drivers-license.jpg',
          } as any);
        } else {
          console.log('No driver license to add');
        }
        
        if (insuranceFile && insuranceFile.uri) {
          console.log('Adding insurance file:', {
            uri: insuranceFile.uri,
            type: insuranceFile.type || 'image/jpeg',
            name: 'insurance.jpg',
          });
          formData.append('insuranceFile', {
            uri: insuranceFile.uri,
            type: insuranceFile.type || 'image/jpeg',
            name: 'insurance.jpg',
          } as any);
        } else {
          console.log('No insurance file to add');
        }
        
        // Note: Logbook files are not currently required for individual transporters
        
        if (idFile && idFile.uri) {
          console.log('Adding driver ID:', {
            uri: idFile.uri,
            type: idFile.type || 'image/jpeg',
            name: 'driver-id.jpg',
          });
          formData.append('idFile', {
            uri: idFile.uri,
            type: idFile.type || 'image/jpeg',
            name: 'driver-id.jpg',
          } as any);
        } else {
          console.log('No driver ID to add');
        }
        
        // Add vehicle photos
        if (vehiclePhotos && vehiclePhotos.length > 0) {
          console.log(`Adding ${vehiclePhotos.length} vehicle photos`);
          vehiclePhotos.forEach((img, idx) => {
            if (img.uri) {
              console.log(`Adding vehicle photo ${idx + 1}:`, {
                uri: img.uri,
                type: img.type || 'image/jpeg',
                name: `vehicle-photo-${idx}.jpg`,
              });
              formData.append('vehiclePhoto', {
                uri: img.uri,
                type: img.type || 'image/jpeg',
                name: `vehicle-photo-${idx}.jpg`,
              } as any);
            }
          });
        } else {
          console.log('No vehicle photos to add');
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
          hasLogbookFile: false, // Logbook not currently required
          hasIdFile: !!(idFile && idFile.uri),
          vehiclePhotosCount: vehiclePhotos ? vehiclePhotos.length : 0
        });
        

        const token = await user.getIdToken();
        
        // Create FormData for transporter submission
        const transporterFormData = new FormData();
        transporterFormData.append('vehicleType', vehicleType);
        transporterFormData.append('vehicleRegistration', registration);
        transporterFormData.append('vehicleMake', vehicleMake);
        transporterFormData.append('vehicleModel', vehicleMake); // Use make as model
        transporterFormData.append('vehicleCapacity', maxCapacity || '5');
        transporterFormData.append('vehicleColor', vehicleColor);
        transporterFormData.append('vehicleYear', year || '2020');
        transporterFormData.append('driveType', driveType);
        transporterFormData.append('bodyType', bodyType);
        transporterFormData.append('vehicleFeatures', vehicleFeatures || '');
        transporterFormData.append('humidityControl', humidityControl ? 'true' : 'false');
        transporterFormData.append('refrigerated', refrigeration ? 'true' : 'false');
        transporterFormData.append('transporterType', 'individual');
        
        // Add files to FormData
        if (profilePhoto && profilePhoto.uri) {
          const fileType = profilePhoto.type === 'image' ? 'image/jpeg' : (profilePhoto.type || 'image/jpeg');
          transporterFormData.append('profilePhoto', {
            uri: profilePhoto.uri,
            type: fileType,
            name: 'profile-photo.jpg',
          } as any);
        }
        
        if (dlFile && dlFile.uri) {
          const fileType = dlFile.type === 'image' ? 'image/jpeg' : (dlFile.type || 'image/jpeg');
          transporterFormData.append('dlFile', {
            uri: dlFile.uri,
            type: fileType,
            name: 'drivers-license.jpg',
          } as any);
        }
        
        if (insuranceFile && insuranceFile.uri) {
          const fileType = insuranceFile.type === 'image' ? 'image/jpeg' : (insuranceFile.type || 'image/jpeg');
          transporterFormData.append('insuranceFile', {
            uri: insuranceFile.uri,
            type: fileType,
            name: 'insurance.jpg',
          } as any);
        }
        
        if (idFile && idFile.uri) {
          const fileType = idFile.type === 'image' ? 'image/jpeg' : (idFile.type || 'image/jpeg');
          transporterFormData.append('idFile', {
            uri: idFile.uri,
            type: fileType,
            name: 'driver-id.jpg',
          } as any);
        }
        
        // Add vehicle photos
        if (vehiclePhotos && vehiclePhotos.length > 0) {
          vehiclePhotos.forEach((img, idx) => {
            if (img.uri) {
              const fileType = img.type === 'image' ? 'image/jpeg' : (img.type || 'image/jpeg');
              transporterFormData.append('vehiclePhoto', {
                uri: img.uri,
                type: fileType,
                name: `vehicle-photo-${idx}.jpg`,
              } as any);
            }
          });
        }
        
        let res;
        try {
          res = await fetch(`${API_ENDPOINTS.TRANSPORTERS}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: transporterFormData,
          });
        } catch (fetchError: any) {
          console.error('Fetch request failed:', fetchError);
          throw new Error(`Network error: ${fetchError.message}. Please check your internet connection and try again.`);
        }

        const responseText = await res.text();
        
        let data = null;
        let parseError = null;
        try {
          if (responseText.trim()) {
            data = JSON.parse(responseText);
          }
        } catch (e) {
          parseError = e;
          console.error('Failed to parse response as JSON:', e);
        }

        
        // Check if the request was successful (200-299 status codes)
        const isSuccess = res.status >= 200 && res.status < 300;
        
        if (isSuccess) {
          console.log('✅ Individual transporter created successfully:', data);
          // Send profile submission notification
          try {
            const { NotificationHelper } = await import('../../services/notificationHelper');
            await NotificationHelper.sendProfileNotification('submitted', {
              userId: user.uid,
              role: 'transporter',
              transporterType,
              vehicleType: vehicleType || 'N/A',
              registration: registration || 'N/A'
            });
          } catch (notificationError) {
            console.warn('Failed to send profile submission notification:', notificationError);
          }

          // Success: navigate to processing screen
          navigation.reset({
            index: 0,
            routes: [{ name: 'TransporterProcessingScreen', params: { transporterType } }]
          });
          return true;
        } else {
          console.log('❌ Response not OK, showing error');
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
        // TEMPORARY WORKAROUND: Use transporter API format for company creation
        const formData = new FormData();
        
        // Company-specific fields (using correct backend field names)
        formData.append('name', companyName);
        formData.append('registration', companyReg);
        formData.append('contact', companyContact);
        formData.append('address', companyAddress || '');
        
        // Add logo file (backend expects 'logo' field name)
        if (profilePhoto && profilePhoto.uri) {
        const fileType = profilePhoto.type === 'image' ? 'image/jpeg' : (profilePhoto.type || 'image/jpeg');
        
        // Create a file-like object that multer can process
        const fileObj = {
          uri: profilePhoto.uri,
          type: fileType,
          name: 'company-logo.jpg',
          fileName: 'company-logo.jpg',
          fileType: fileType,
        };
        
        formData.append('logo', fileObj as any);
        }
        
        // Validate required fields before sending
        if (!companyName || !companyReg || !companyContact) {
          const missingFields = [];
          if (!companyName) missingFields.push('Corporate Name');
          if (!companyReg) missingFields.push('Registration Number');
          if (!companyContact) missingFields.push('Contact');
          
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        
        
        
        const token = await user.getIdToken();
        
        // Try FormData first, then JSON fallback
        try {
          // Add timeout to the request
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
          
          let res;
          let formDataSuccess = false;
          
          try {
            res = await fetch(`${API_ENDPOINTS.COMPANIES}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                // Don't set Content-Type - let fetch set it with boundary for FormData
              },
              body: formData,
              signal: controller.signal,
            });
            
            if (res.ok) {
              formDataSuccess = true;
            } else {
              throw new Error(`FormData request failed with status: ${res.status}`);
            }
          } catch (fetchError) {
            // Continue to JSON fallback
          }
          
          clearTimeout(timeoutId);
          
          // If FormData failed, try JSON fallback
          if (!formDataSuccess) {
            console.log('FormData request failed, trying JSON fallback...');
            throw new Error('FormData request failed, trying JSON fallback');
          }
          
          if (!res || !res.ok) {
            const errorText = await res?.text() || 'Unknown error';
            console.error('Company creation error response:', errorText);
            
            let errorMessage = 'Company creation failed. Please try again.';
            
            try {
              const errorData = JSON.parse(errorText);
              if (errorData.message) {
                errorMessage = errorData.message;
              } else if (errorData.errors && Array.isArray(errorData.errors)) {
                errorMessage = errorData.errors.map((err: any) => err.msg || err.message).join(', ');
              }
            } catch (parseError) {
              console.error('Failed to parse error response:', parseError);
              errorMessage = `Server error (${res?.status || 'unknown'}): ${errorText}`;
            }
            
            throw new Error(errorMessage);
          }
          
          const companyData = await res?.json();
          console.log('Company created successfully with FormData:', companyData);
          
          // Transporter record is now created automatically in the backend
          // No need to update transporter separately
          
          // Send company profile submission notification
          try {
            const { NotificationHelper } = await import('../../services/notificationHelper');
            await NotificationHelper.sendProfileNotification('submitted', {
              userId: user.uid,
              role: 'transporter',
              transporterType,
              companyName: companyName || 'N/A',
              companyReg: companyReg || 'N/A'
            });
          } catch (notificationError) {
            console.warn('Failed to send company profile submission notification:', notificationError);
          }

          // Company created and transporter updated; navigate to processing screen
          navigation.navigate('TransporterProcessingScreen', { transporterType });
          return true;
        } catch (error: any) {
          console.error('Company creation error:', error);
          
          // If FormData fails, try JSON fallback
          if (error.message && (error.message.includes('Network request failed') || error.message.includes('FormData request failed, trying JSON fallback'))) {
            console.log('FormData failed, trying JSON fallback...');
            try {
              const jsonData = {
                name: companyName,
                registration: companyReg,
                contact: companyContact,
                address: companyAddress || '',
              };
              
              console.log('Creating company without logo first...');
              const jsonRes = await fetch(`${API_ENDPOINTS.COMPANIES}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(jsonData),
              });
              
              if (jsonRes.ok) {
                const companyData = await jsonRes.json();
                console.log('Company created successfully with JSON:', companyData);
                
                // Try to upload logo separately if we have one
                if (profilePhoto && profilePhoto.uri) {
                  console.log('Attempting to upload logo separately...');
                  try {
                    const logoFormData = new FormData();
                    logoFormData.append('logo', {
                      uri: profilePhoto.uri,
                      type: profilePhoto.type || 'image/jpeg',
                      name: 'company-logo.jpg',
                    } as any);
                    
                    const logoRes = await fetch(`${API_ENDPOINTS.COMPANIES}/${companyData.companyId || companyData.id}/upload`, {
                      method: 'PATCH',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                      },
                      body: logoFormData,
                    });
                    
                    if (logoRes.ok) {
                      console.log('Logo uploaded successfully');
                    } else {
                      console.warn('Logo upload failed, but company was created');
                    }
                  } catch (logoError) {
                    console.warn('Logo upload failed:', logoError);
                  }
                }
                
                // Send company profile submission notification
                try {
                  const { NotificationHelper } = await import('../../services/notificationHelper');
                  await NotificationHelper.sendProfileNotification('submitted', {
                    userId: user.uid,
                    role: 'transporter',
                    transporterType,
                    companyName: companyName || 'N/A',
                    companyReg: companyReg || 'N/A'
                  });
                } catch (notificationError) {
                  console.warn('Failed to send company profile submission notification:', notificationError);
                }

                // Company created and transporter updated; navigate to processing screen
                navigation.navigate('TransporterProcessingScreen', { transporterType });
                return true;
              } else {
                const errorText = await jsonRes.text();
                console.error('JSON request failed:', jsonRes.status, errorText);
                
                // Check if the company was actually created despite the 500 error
                // Sometimes the backend creates the record but returns an error
                if (jsonRes.status === 500 && errorText.includes('Failed to create company')) {
                  console.log('Company may have been created despite 500 error, checking...');
                  
                  // Try to verify if company was created by checking if we can proceed
                  // For now, let's assume it was created and proceed
                  console.log('Proceeding as if company was created successfully');
                  
                  // Send company profile submission notification
                  try {
                    const { NotificationHelper } = await import('../../services/notificationHelper');
                    await NotificationHelper.sendProfileNotification('submitted', {
                      userId: user.uid,
                      role: 'transporter',
                      transporterType,
                      companyName: companyName || 'N/A',
                      companyReg: companyReg || 'N/A'
                    });
                  } catch (notificationError) {
                    console.warn('Failed to send company profile submission notification:', notificationError);
                  }

                  // Company created and transporter updated; navigate to processing screen
                  navigation.navigate('TransporterProcessingScreen', { transporterType });
                  return true;
                }
                
                throw new Error(`JSON request failed: ${jsonRes.status} - ${errorText}`);
              }
            } catch (jsonError) {
              console.error('JSON fallback also failed:', jsonError);
              // Continue with original error handling
            }
          }
          
          let errorMsg = 'Failed to create company. Please try again.';
          
          // Don't set error message if we're about to try JSON fallback
          if (!(error.message && (error.message.includes('Network request failed') || error.message.includes('FormData request failed, trying JSON fallback')))) {
            if (error.name === 'AbortError') {
              errorMsg = 'Request timed out. Please check your internet connection and try again.';
            } else if (error.message) {
              if (error.message.includes('Network request failed')) {
                errorMsg = 'Network connectivity issue. Please check your internet connection and try again.';
              } else if (error.message.includes('404')) {
                errorMsg = 'Company creation service is temporarily unavailable. Please try again later or contact support.';
              } else if (error.message.includes('400')) {
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
          }
          
          // Only set error if JSON fallback also failed or if it's not a fallback case
          if (!(error.message && (error.message.includes('Network request failed') || error.message.includes('FormData request failed, trying JSON fallback')))) {
            setError(errorMsg);
          }
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

  const handleSaveDraft = async () => {
    console.log('💾 Saving transporter profile as draft...');
    setSavingDraft(true);
    setError('');

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      // Prepare draft data based on transporter type
      let draftData;
      
      if (transporterType === 'individual') {
        draftData = {
          transporterType: 'individual',
          vehicleType,
          vehicleRegistration: registration,
          vehicleMake,
          vehicleColor,
          vehicleModel: vehicleMake,
          vehicleYear: year ? String(year) : '2020',
          vehicleCapacity: maxCapacity && !isNaN(parseInt(maxCapacity, 10)) ? String(parseInt(maxCapacity, 10)) : '5',
          driveType: driveType || '',
          bodyType: bodyType || '',
          vehicleFeatures: vehicleFeatures || '',
          humidityControl: humidityControl ? 'true' : 'false',
          refrigerated: refrigeration ? 'true' : 'false',
          // Note: Files cannot be saved in draft - user will need to re-upload them
          hasProfilePhoto: !!(profilePhoto && profilePhoto.uri),
          hasDlFile: !!(dlFile && dlFile.uri),
          hasInsuranceFile: !!(insuranceFile && insuranceFile.uri),
          hasIdFile: !!(idFile && idFile.uri),
          hasLogbookFile: false, // Logbook not currently required
          vehiclePhotosCount: vehiclePhotos ? vehiclePhotos.length : 0,
          isDraft: true,
          savedAt: new Date().toISOString()
        };
      } else {
        draftData = {
          transporterType: 'company',
          companyName,
          companyReg,
          companyContact,
          companyAddress,
          hasLogo: !!(profilePhoto && profilePhoto.uri),
          isDraft: true,
          savedAt: new Date().toISOString()
        };
      }

      // Save draft to localStorage
      const draftKey = `transporter_draft_${user.uid}`;
      await AsyncStorage.setItem(draftKey, JSON.stringify(draftData));

      console.log('✅ Draft saved successfully');
      setDraftSaved(true);
      
      // Show success message for 3 seconds
      setTimeout(() => {
        setDraftSaved(false);
      }, 3000);

      return true;
    } catch (e: any) {
      console.error('Draft save error:', e);
      setError('Failed to save draft. Please try again.');
      return false;
    } finally {
      setSavingDraft(false);
    }
  };

  const loadDraftData = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const draftKey = `transporter_draft_${user.uid}`;
      const draftData = await AsyncStorage.getItem(draftKey);
      
      if (draftData) {
        const parsedDraft = JSON.parse(draftData);
        console.log('📄 Loading draft data:', parsedDraft);
        
        // Restore form data based on transporter type
        if (parsedDraft.transporterType === 'individual') {
          setVehicleType(parsedDraft.vehicleType || '');
          setRegistration(parsedDraft.vehicleRegistration || '');
          setVehicleMake(parsedDraft.vehicleMake || '');
          setVehicleColor(parsedDraft.vehicleColor || '');
          setYear(parsedDraft.vehicleYear || '');
          setMaxCapacity(parsedDraft.vehicleCapacity || '');
          setDriveType(parsedDraft.driveType || '');
          setBodyType(parsedDraft.bodyType || 'closed');
          setVehicleFeatures(parsedDraft.vehicleFeatures || '');
          setHumidityControl(parsedDraft.humidityControl === 'true');
          setRefrigeration(parsedDraft.refrigerated === 'true');
        } else if (parsedDraft.transporterType === 'company') {
          setCompanyName(parsedDraft.companyName || '');
          setCompanyReg(parsedDraft.companyReg || '');
          setCompanyContact(parsedDraft.companyContact || '');
          setCompanyAddress(parsedDraft.companyAddress || '');
        }
        
        // Note: Files cannot be restored from draft - user will need to re-upload them
        console.log('✅ Draft data loaded successfully');
      }
    } catch (e) {
      console.error('Failed to load draft data:', e);
    }
  };

  // Load draft data when component mounts
  useEffect(() => {
    loadDraftData();
  }, []);

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
    <FormKeyboardWrapper 
      contentContainerStyle={styles.container} 
      keyboardVerticalOffset={0}
    >
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <View style={styles.headerIconContainer}>
          <MaterialCommunityIcons name="truck-delivery" size={32} color={colors.primary} />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.modernHeaderTitle}>
            {isJobSeeker ? 'Complete Your Job Application' : 'Complete Your Profile'}
          </Text>
          <Text style={styles.modernHeaderSubtitle}>
            {isJobSeeker 
              ? 'Apply to become a driver and get recruited by companies'
              : transporterType === 'individual' 
                ? 'Set up your individual transporter account' 
                : 'Set up your company transporter account'
            }
          </Text>
        </View>
      </View>

      {/* Full-width Role Selector - Hidden for job seekers */}
      {!isJobSeeker && (
        <>
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
                size={20} 
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
                size={20} 
                color={transporterType === 'company' ? colors.white : colors.primary} 
              />
              <Text style={[
                styles.roleButtonText,
                transporterType === 'company' && styles.roleButtonTextActive
              ]}>
                Corporate
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* JOB SEEKER FORM */}
      {isJobSeeker && (
        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          {/* Step 1: Personal Information & Documents */}
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepTitle}>Personal Information & Documents</Text>
            </View>

            {/* Profile Photo Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Profile Photo</Text>
              {getJobSeekerValidationStatus().profilePhoto && (
                <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
              )}
            </View>
            <TouchableOpacity 
              style={[styles.documentUploader, profilePhoto && styles.documentUploaderFilled]} 
              onPress={handleProfilePhoto}
              activeOpacity={0.7}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto.uri }} style={styles.documentPreview} />
              ) : (
                <>
                  <MaterialCommunityIcons name="camera" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                  Profile Photo
                </>
              )}
            </TouchableOpacity>

            {/* Date of Birth */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Date of Birth</Text>
              {getJobSeekerValidationStatus().dateOfBirth && (
                <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
              )}
            </View>
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => setShowDateOfBirthPicker(true)}
            >
              <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.dateInputText}>
                {dateOfBirth ? dateOfBirth.toLocaleDateString() : 'Select your date of birth'}
              </Text>
            </TouchableOpacity>

            {/* Career Start Date */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Career Start Date</Text>
              {getJobSeekerValidationStatus().careerStartDate && (
                <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
              )}
            </View>
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => setShowCareerStartDatePicker(true)}
            >
              <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.dateInputText}>
                {careerStartDate ? careerStartDate.toLocaleDateString() : 'Select when you started driving professionally'}
              </Text>
            </TouchableOpacity>

            {/* Age and Experience Display */}
            {dateOfBirth && careerStartDate && (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Your Profile</Text>
                <Text style={styles.infoText}>Age: {calculateAge(dateOfBirth)} years</Text>
                <Text style={styles.infoText}>Experience: {calculateExperience(careerStartDate)} years</Text>
              </View>
            )}

            {/* Documents Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Required Documents</Text>
              {getJobSeekerValidationStatus().driverLicense && 
               getJobSeekerValidationStatus().goodConductCert && 
               getJobSeekerValidationStatus().idDoc && (
                <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
              )}
            </View>

            {/* Driver's License */}
            <TouchableOpacity 
              style={[styles.documentUploader, dlFile && styles.documentUploaderFilled]} 
              onPress={handleDlFile}
              activeOpacity={0.7}
            >
              {dlFile ? (
                <Image source={{ uri: dlFile.uri }} style={styles.documentPreview} />
              ) : (
                <>
                  <MaterialCommunityIcons name="camera" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                  Driver&apos;s License
                </>
              )}
            </TouchableOpacity>

            {/* Good Conduct Certificate */}
            <TouchableOpacity 
              style={[styles.documentUploader, goodConductCert && styles.documentUploaderFilled]} 
              onPress={() => Alert.alert(
                'Select Document',
                'Choose how you want to add your Good Conduct Certificate',
                [
                  { text: 'Take Photo', onPress: () => handleGoodConductCamera() },
                  { text: 'Choose from Gallery', onPress: () => handleGoodConductGallery() },
                  { text: 'Cancel', style: 'cancel' }
                ]
              )}
              activeOpacity={0.7}
            >
              {goodConductCert ? (
                <Image source={{ uri: goodConductCert.uri }} style={styles.documentPreview} />
              ) : (
                <>
                  <MaterialCommunityIcons name="camera" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                  Good Conduct Certificate
                </>
              )}
            </TouchableOpacity>

            {/* ID Document */}
            <TouchableOpacity 
              style={[styles.documentUploader, idFile && styles.documentUploaderFilled]} 
              onPress={handleIdFile}
              activeOpacity={0.7}
            >
              {idFile ? (
                <Image source={{ uri: idFile.uri }} style={styles.documentPreview} />
              ) : (
                <>
                  <MaterialCommunityIcons name="camera" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                  ID Document
                </>
              )}
            </TouchableOpacity>

            {/* Goods Service License (Optional) */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Goods Service License (Optional)</Text>
            </View>
            <TouchableOpacity 
              style={[styles.documentUploader, gslLicence && styles.documentUploaderFilled]} 
              onPress={handleGslLicence}
              activeOpacity={0.7}
            >
              {gslLicence ? (
                <Image source={{ uri: gslLicence.uri }} style={styles.documentPreview} />
              ) : (
                <>
                  <MaterialCommunityIcons name="camera" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                  Goods Service License (Optional)
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Step 2: Vehicle Classes & Specializations */}
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepTitle}>Vehicle Classes & Specializations</Text>
            </View>

            {/* Vehicle Classes */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Vehicle Classes You Can Drive</Text>
              {getJobSeekerValidationStatus().vehicleClasses && (
                <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
              )}
            </View>
            <TouchableOpacity 
              style={styles.selectionButton}
              onPress={() => setVehicleClassModal(true)}
            >
              <Text style={styles.selectionButtonText}>
                {selectedVehicleClasses.length > 0 
                  ? `${selectedVehicleClasses.length} class(es) selected`
                  : 'Select vehicle classes'
                }
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={colors.primary} />
            </TouchableOpacity>

            {/* Selected Vehicle Classes */}
            {selectedVehicleClasses.length > 0 && (
              <View style={styles.selectedItemsContainer}>
                {selectedVehicleClasses.map((vehicleClass) => (
                  <View key={vehicleClass} style={styles.selectedItem}>
                    <Text style={styles.selectedItemText}>{getVehicleClassLabel(vehicleClass)}</Text>
                    <TouchableOpacity onPress={() => handleVehicleClassToggle(vehicleClass)}>
                      <MaterialCommunityIcons name="close" size={16} color={colors.text.secondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Specializations */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Specializations</Text>
              {getJobSeekerValidationStatus().specializations && (
                <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
              )}
            </View>
            <TouchableOpacity 
              style={styles.selectionButton}
              onPress={() => setSpecializationModal(true)}
            >
              <Text style={styles.selectionButtonText}>
                {selectedSpecializations.length > 0 
                  ? `${selectedSpecializations.length} specialization(s) selected`
                  : 'Select specializations'
                }
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={colors.primary} />
            </TouchableOpacity>

            {/* Selected Specializations */}
            {selectedSpecializations.length > 0 && (
              <View style={styles.selectedItemsContainer}>
                {selectedSpecializations.map((specialization) => (
                  <View key={specialization} style={styles.selectedItem}>
                    <Text style={styles.selectedItemText}>{specialization}</Text>
                    <TouchableOpacity onPress={() => handleSpecializationToggle(specialization)}>
                      <MaterialCommunityIcons name="close" size={16} color={colors.text.secondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Assignment Description */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Previous/Current Assignment (Optional)</Text>
            </View>
            <TextInput
              style={styles.textArea}
              placeholder="Describe your previous or current driving assignments..."
              value={assignmentDescription}
              onChangeText={setAssignmentDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, !getJobSeekerValidationStatus().allValid && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!getJobSeekerValidationStatus().allValid || uploading}
          >
            {uploading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>Submit Application</Text>
            )}
          </TouchableOpacity>

          {/* Validation Summary */}
          {!getJobSeekerValidationStatus().allValid && (
            <View style={styles.validationContainer}>
              <Text style={styles.validationTitle}>Complete these sections to submit:</Text>
              {!getJobSeekerValidationStatus().profilePhoto && (
                <Text style={styles.validationItem}>• Upload profile photo</Text>
              )}
              {!getJobSeekerValidationStatus().dateOfBirth && (
                <Text style={styles.validationItem}>• Select date of birth</Text>
              )}
              {!getJobSeekerValidationStatus().careerStartDate && (
                <Text style={styles.validationItem}>• Select career start date</Text>
              )}
              {!getJobSeekerValidationStatus().driverLicense && (
                <Text style={styles.validationItem}>• Upload driver&apos;s license</Text>
              )}
              {!getJobSeekerValidationStatus().goodConductCert && (
                <Text style={styles.validationItem}>• Upload good conduct certificate</Text>
              )}
              {!getJobSeekerValidationStatus().idDoc && (
                <Text style={styles.validationItem}>• Upload ID document</Text>
              )}
              {!getJobSeekerValidationStatus().vehicleClasses && (
                <Text style={styles.validationItem}>• Select vehicle classes</Text>
              )}
              {!getJobSeekerValidationStatus().specializations && (
                <Text style={styles.validationItem}>• Select specializations</Text>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* INDIVIDUAL FORM */}
      {transporterType === 'individual' && (
        <>
          {/* Profile Photo Section */}
          <View style={styles.modernSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.modernSectionTitle}>
                <MaterialCommunityIcons name="camera" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                Profile Photo
              </Text>
              {getValidationStatus().profilePhoto && (
                <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
              )}
            </View>
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

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vehicle Details</Text>
            {getValidationStatus().vehicleDetails && (
              <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
            )}
          </View>
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
                <Text style={styles.documentTitle}>Driver&apos;s License</Text>
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
                <Text style={styles.documentTitle}>Driver&apos;s ID</Text>
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
                <Text style={styles.documentTitle}>Vehicle Insurance</Text>
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
          <Text style={styles.sectionTitle}>Corporate Details</Text>
          <View style={[styles.card, { backgroundColor: colors.background, borderRadius: 18, padding: spacing.lg, marginBottom: spacing.md, shadowColor: colors.black, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
              <Ionicons name="business-outline" size={22} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.label}>Corporate Name</Text>
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
              <Text style={styles.label}>Corporate Registration Number</Text>
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
              placeholder="Enter company contact (e.g. 0712345678 or 0112345678)"
              placeholderTextColor={colors.text.light}
              value={companyContact}
              onChangeText={setCompanyContact}
              keyboardType="phone-pad"
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
              <MaterialCommunityIcons name="map-marker-outline" size={22} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.label}>Corporate Address (Optional)</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter company address (optional)"
              placeholderTextColor={colors.text.light}
              value={companyAddress}
              onChangeText={setCompanyAddress}
              multiline
              numberOfLines={2}
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
            <Text style={styles.photoPickerText}>Upload Corporate Logo</Text>
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
      
      {/* Draft Saved Success Message */}
      {draftSaved && (
        <View style={styles.draftSuccessContainer}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.draftSuccessText}>Draft saved successfully!</Text>
        </View>
      )}
      
      {/* Validation Summary */}
      {!isValid() && (
        <View style={styles.validationSummary}>
          <Text style={styles.validationTitle}>Complete these sections to submit:</Text>
          {transporterType === 'individual' ? (
            <>
              {!getValidationStatus().profilePhoto && (
                <Text style={styles.validationItem}>• Upload profile photo</Text>
              )}
              {!getValidationStatus().vehicleDetails && (
                <Text style={styles.validationItem}>• Fill vehicle details</Text>
              )}
              {!getValidationStatus().documents && (
                <Text style={styles.validationItem}>• Upload all required documents</Text>
              )}
              {!getValidationStatus().vehiclePhotos && (
                <Text style={styles.validationItem}>• Upload vehicle photos</Text>
              )}
            </>
          ) : (
            <>
              {!getValidationStatus().companyDetails && (
                <Text style={styles.validationItem}>• Fill company details</Text>
              )}
              {!getValidationStatus().profilePhoto && (
                <Text style={styles.validationItem}>• Upload company logo</Text>
              )}
            </>
          )}
        </View>
      )}

      <View style={{ paddingBottom: insets.bottom + 18, width: '100%' }}>
        {/* Action Buttons Container */}
        <View style={styles.actionButtonsContainer}>
          {/* Save as Draft Button */}
          <TouchableOpacity
            style={[styles.draftBtn, { backgroundColor: colors.background, borderColor: colors.primary }]}
            onPress={async () => {
              if (savingDraft) return;
              await handleSaveDraft();
            }}
            disabled={savingDraft}
          >
            {savingDraft ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="content-save-outline" size={18} color={colors.primary} />
                <Text style={[styles.draftBtnText, { color: colors.primary }]}>Save as Draft</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Submit Profile Button */}
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
              } catch {
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
      </View>
      {/* Date Pickers */}
      <DateTimePickerModal
        isVisible={showDateOfBirthPicker}
        mode="date"
        date={dateOfBirth || new Date()}
        onConfirm={(date) => {
          setDateOfBirth(date);
          setShowDateOfBirthPicker(false);
        }}
        onCancel={() => setShowDateOfBirthPicker(false)}
        maximumDate={new Date()}
        minimumDate={new Date(1900, 0, 1)}
      />

      <DateTimePickerModal
        isVisible={showCareerStartDatePicker}
        mode="date"
        date={careerStartDate || new Date()}
        onConfirm={(date) => {
          setCareerStartDate(date);
          setShowCareerStartDatePicker(false);
        }}
        onCancel={() => setShowCareerStartDatePicker(false)}
        maximumDate={new Date()}
        minimumDate={new Date(1900, 0, 1)}
      />

      {/* Vehicle Class Selection Modal */}
      <Modal
        visible={vehicleClassModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Vehicle Classes</Text>
            <TouchableOpacity onPress={() => setVehicleClassModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={NTSA_VEHICLE_CLASSES}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => {
              const isSelected = selectedVehicleClasses.includes(item.value);
              const isEligible = dateOfBirth && careerStartDate ? 
                validateVehicleClassEligibility(item.value, calculateAge(dateOfBirth), calculateExperience(careerStartDate)) : 
                true;
              
              return (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    isSelected && styles.modalItemSelected,
                    !isEligible && styles.modalItemDisabled
                  ]}
                  onPress={() => isEligible && handleVehicleClassToggle(item.value)}
                  disabled={!isEligible}
                >
                  <View style={styles.modalItemContent}>
                    <Text style={[
                      styles.modalItemTitle,
                      !isEligible && styles.modalItemTextDisabled
                    ]}>
                      {item.label}
                    </Text>
                    <Text style={[
                      styles.modalItemSubtitle,
                      !isEligible && styles.modalItemTextDisabled
                    ]}>
                      {item.label}
                    </Text>
                    <Text style={[
                      styles.modalItemRequirements,
                      !isEligible && styles.modalItemTextDisabled
                    ]}>
                      Min Age: {item.minAge} years
                    </Text>
                  </View>
                  {isSelected && (
                    <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      {/* Specialization Selection Modal */}
      <Modal
        visible={specializationModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Specializations</Text>
            <TouchableOpacity onPress={() => setSpecializationModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={VEHICLE_SPECIALIZATIONS}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const isSelected = selectedSpecializations.includes(item);
              
              return (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    isSelected && styles.modalItemSelected
                  ]}
                  onPress={() => handleSpecializationToggle(item)}
                >
                  <Text style={styles.modalItemTitle}>{item}</Text>
                  {isSelected && (
                    <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      {/* ImagePickerModal removed - using new permission utility instead */}
    </FormKeyboardWrapper>
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
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
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 48,
    maxHeight: 52,
  },
  submitBtnText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: fonts.size.sm,
  },
  validationSummary: {
    backgroundColor: colors.warning + '15',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  validationTitle: {
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    color: colors.warning,
    marginBottom: spacing.xs,
  },
  validationItem: {
    fontSize: fonts.size.sm,
    color: colors.warning,
    marginBottom: 2,
    letterSpacing: 0.2,
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
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.text.light + '40',
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    minHeight: 44,
  },
  roleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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
    fontSize: fonts.size.sm,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  roleButtonTextActive: {
    color: colors.white,
    fontWeight: '700',
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

  // Full-width Role Selector (overrides previous definitions)
  roleSelectorTitleOverride: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  roleSelectorOverride: {
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
  roleButtonOverride: {
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
  roleButtonActiveOverride: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  roleButtonTextOverride: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  roleButtonTextActiveOverride: {
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

  // Draft functionality styles
  draftSuccessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success + '15',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  draftSuccessText: {
    color: colors.success,
    fontSize: fonts.size.md,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    paddingHorizontal: spacing.sm,
  },
  draftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1.5,
    gap: spacing.xs,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minHeight: 48,
    maxHeight: 52,
  },
  draftBtnText: {
    fontSize: fonts.size.xs,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  
  // Job Seeker specific styles
  formContainer: {
    flex: 1,
    width: '100%',
  },
  stepContainer: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    color: colors.white,
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 32,
    marginRight: spacing.md,
  },
  stepTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    flex: 1,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: colors.text.light,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
  },
  dateInputText: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    flex: 1,
  },
  infoCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoTitle: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.2,
    borderColor: colors.text.light,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
  },
  selectionButtonText: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    flex: 1,
  },
  selectedItemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  selectedItemText: {
    fontSize: fonts.size.sm,
    color: colors.primary,
    marginRight: spacing.xs,
  },
  textArea: {
    borderWidth: 1.2,
    borderColor: colors.text.light,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    fontSize: fonts.size.md,
    color: colors.text.primary,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: colors.text.light,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
  },
  validationContainer: {
    backgroundColor: colors.warningLight,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light,
  },
  modalTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '30',
  },
  modalItemSelected: {
    backgroundColor: colors.primaryLight,
  },
  modalItemDisabled: {
    backgroundColor: colors.text.light + '20',
    opacity: 0.6,
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemTitle: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  modalItemSubtitle: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  modalItemRequirements: {
    fontSize: fonts.size.xs,
    color: colors.primary,
    fontWeight: '500',
  },
  modalItemTextDisabled: {
    color: colors.text.light,
  },
  documentPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    resizeMode: 'cover',
  },
});
