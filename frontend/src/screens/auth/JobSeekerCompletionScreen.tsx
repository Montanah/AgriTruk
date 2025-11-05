import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
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
import FormKeyboardWrapper from '../../components/common/FormKeyboardWrapper';
import ModernDropdown from '../../components/common/ModernDropdown';
import { API_ENDPOINTS, API_BASE_URL } from '../../constants/api';
import { fonts, spacing } from '../../constants';
import colors from '../../constants/colors';
import { NTSA_VEHICLE_CLASSES, VEHICLE_SPECIALIZATIONS, getVehicleClassLabel } from '../../constants/vehicleClasses';
import { validateImageAsset, getIOSErrorMessage } from '../../utils/iosFileUtils';

interface JobSeekerCompletionScreenProps {
  route?: {
    params?: {
      correctionMode?: boolean;
      approvedDocuments?: any;
      userId?: string;
      phone?: string;
      role?: string;
    };
  };
}

export default function JobSeekerCompletionScreen({ route }: JobSeekerCompletionScreenProps) {
  const navigation = useNavigation();
  
  // Job Seeker specific state variables
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [careerStartDate, setCareerStartDate] = useState<Date | null>(null);
  const [gender, setGender] = useState<string>('');
  const [religion, setReligion] = useState<string>('');
  const [selectedVehicleClasses, setSelectedVehicleClasses] = useState<string[]>([]);
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [assignmentDescription, setAssignmentDescription] = useState('');

  // Religion options with valid Ionicons - using capitalized values to match marketplace filter
  const religionOptions = [
    { label: 'Christianity', value: 'Christianity', icon: 'add-circle' },
    { label: 'Islam', value: 'Islam', icon: 'moon' },
    { label: 'Hinduism', value: 'Hinduism', icon: 'flower' },
    { label: 'Buddhism', value: 'Buddhism', icon: 'leaf' },
    { label: 'Judaism', value: 'Judaism', icon: 'star' },
    { label: 'Sikhism', value: 'Sikhism', icon: 'shield' },
    { label: 'Jainism', value: 'Jainism', icon: 'hand-left' },
    { label: 'Baháʼí Faith', value: 'Baháʼí Faith', icon: 'star-outline' },
    { label: 'Traditional African Religions', value: 'Traditional African Religions', icon: 'earth' },
    { label: 'Other', value: 'Other', icon: 'ellipsis-horizontal' },
    { label: 'Prefer not to say', value: 'Prefer not to say', icon: 'eye-off' }
  ];

  // Gender options with valid Ionicons
  const genderOptions = [
    { label: 'Male', value: 'male', icon: 'male' },
    { label: 'Female', value: 'female', icon: 'female' },
    { label: 'Other', value: 'other', icon: 'transgender' }
  ];
  
  // Address fields
  const [address, setAddress] = useState({
    street: '',
    city: '',
    county: '',
    country: 'Kenya',
    postalCode: ''
  });
  
  const [profilePhoto, setProfilePhoto] = useState<any>(null);
  const [dlFile, setDlFile] = useState<any>(null);
  const [goodConductCert, setGoodConductCert] = useState<any>(null);
  const [idFile, setIdFile] = useState<any>(null);
  const [gslLicence, setGslLicence] = useState<any>(null);
  
  // Optional tertiary documents - only backend-expected ones
  const [showOptionalDocuments, setShowOptionalDocuments] = useState(false);
  const [optionalDocuments, setOptionalDocuments] = useState<any>({
    psvBadge: null,
    nightTravelLicense: null,
    rslLicense: null,
    // Note: Driving License, Good Conduct Certificate, and ID Document are already handled as required documents
  });
  const [showDateOfBirthPicker, setShowDateOfBirthPicker] = useState(false);
  const [showCareerStartDatePicker, setShowCareerStartDatePicker] = useState(false);
  const [vehicleClassModal, setVehicleClassModal] = useState(false);
  const [specializationModal, setSpecializationModal] = useState(false);
  const [mediaLibraryPermission, requestMediaLibraryPermission] = useMediaLibraryPermissions();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [consentToShare, setConsentToShare] = useState(false);
  
  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;
  
  // Correction mode and approved documents
  const correctionMode = route?.params?.correctionMode || false;
  const approvedDocuments = route?.params?.approvedDocuments || {};
  
  // Load approved documents in correction mode
  useEffect(() => {
    if (correctionMode && approvedDocuments) {
      // Pre-populate approved documents
      if (approvedDocuments.profilePhoto) {
        setProfilePhoto({ uri: approvedDocuments.profilePhoto.url });
      }
      if (approvedDocuments.idDoc) {
        setIdFile({ uri: approvedDocuments.idDoc.url });
      }
      if (approvedDocuments.drivingLicense) {
        setDlFile({ uri: approvedDocuments.drivingLicense.url });
      }
      if (approvedDocuments.goodConductCert) {
        setGoodConductCert({ uri: approvedDocuments.goodConductCert.url });
      }
      if (approvedDocuments.goodsServiceLicense) {
        setGslLicence({ uri: approvedDocuments.goodsServiceLicense.url });
      }
    }
  }, [correctionMode, approvedDocuments]);

  // Helper function to check if document is approved
  const isDocumentApproved = (docType: string) => {
    return correctionMode && approvedDocuments[docType] && approvedDocuments[docType].status === 'approved';
  };

  // Helper function to get document status
  const getDocumentStatus = (docType: string) => {
    if (!correctionMode || !approvedDocuments[docType]) return null;
    return approvedDocuments[docType].status;
  };

  // Step navigation functions
  const handleNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Check if current step is valid
  const isCurrentStepValid = () => {
    if (currentStep === 1) {
      return !!(
        profilePhoto &&
        dateOfBirth &&
        careerStartDate &&
        gender &&
        dlFile &&
        goodConductCert &&
        idFile
      );
    } else if (currentStep === 2) {
      return !!(
        selectedVehicleClasses.length > 0 &&
        selectedSpecializations.length > 0
      );
    }
    return false;
  };

  // Helper functions
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

  const getJobSeekerValidationStatus = () => {
    return {
      profilePhoto: !!profilePhoto,
      driverLicense: !!dlFile,
      goodConductCert: !!goodConductCert,
      idDoc: !!idFile,
      dateOfBirth: !!dateOfBirth,
      careerStartDate: !!careerStartDate,
      gender: !!gender,
      address: !!(address.street && address.city && address.county),
      vehicleClasses: selectedVehicleClasses.length > 0,
      specializations: selectedSpecializations.length > 0,
      consentToShare: !!consentToShare,
      allValid: !!profilePhoto && !!dlFile && !!goodConductCert && !!idFile && 
                !!dateOfBirth && !!careerStartDate && !!gender && !!religion &&
                !!(address.street && address.city && address.county) &&
                selectedVehicleClasses.length > 0 && selectedSpecializations.length > 0 &&
                !!consentToShare
    };
  };

  // Helper function to get vehicle class icon
  const getVehicleClassIcon = (vehicleClass: string) => {
    const iconMap: { [key: string]: string } = {
      'A1': 'motorbike',
      'A2': 'motorbike',
      'A3': 'motorbike',
      'B1': 'car',
      'B2': 'car',
      'B3': 'car',
      'C1': 'truck',
      'C': 'truck',
    };
    return iconMap[vehicleClass] || 'car';
  };

  // Helper function to get specialization icon
  const getSpecializationIcon = (specialization: string) => {
    const iconMap: { [key: string]: string } = {
      'Freight Transport': 'truck-delivery',
      'Passenger Transport': 'bus',
      'Courier Services': 'package-variant',
      'Construction Transport': 'truck-cargo-container',
      'Agricultural Transport': 'tractor',
      'Emergency Services': 'ambulance',
      'Logistics': 'truck-fast',
      'Heavy Machinery': 'excavator',
    };
    return iconMap[specialization] || 'cog';
  };

  // Helper function to get specialization description
  const getSpecializationDescription = (specialization: string) => {
    const descriptionMap: { [key: string]: string } = {
      'Freight Transport': 'Transporting goods and cargo',
      'Passenger Transport': 'Transporting people safely',
      'Courier Services': 'Fast delivery of packages and documents',
      'Construction Transport': 'Heavy materials and equipment transport',
      'Agricultural Transport': 'Farm produce and equipment transport',
      'Emergency Services': 'Critical and time-sensitive transport',
      'Logistics': 'Supply chain and distribution management',
      'Heavy Machinery': 'Operating specialized heavy vehicles',
    };
    return descriptionMap[specialization] || 'Specialized transport services';
  };

  // Image picker handlers - Profile photo camera only
  const handleProfilePhoto = async () => {
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
      setError('Failed to open camera. Please ensure camera permissions are granted.');
      console.error('Camera error:', err);
    }
  };

  // Optional document upload handler - simplified for backend-expected documents
  const handleOptionalDocumentUpload = async (documentType: string) => {
    Alert.alert(
      'Select Document',
      `Choose how you want to add your ${documentType.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
      [
        { text: 'Take Photo', onPress: () => handleOptionalDocumentCamera(documentType) },
        { text: 'Choose from Gallery', onPress: () => handleOptionalDocumentGallery(documentType) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleOptionalDocumentCamera = async (documentType: string) => {
    try {
      const result = await handleImagePicker('camera', {
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (result && !result.canceled && result.assets && result.assets.length > 0) {
        setOptionalDocuments((prev: any) => ({
          ...prev,
          [documentType]: {
            ...result.assets[0],
            name: `${documentType}.jpg`,
            type: 'image/jpeg'
          }
        }));
        setError('');
      }
    } catch (err) {
      setError('Failed to open camera.');
      console.error('Camera error:', err);
    }
  };

  const handleOptionalDocumentGallery = async (documentType: string) => {
    try {
      const result = await handleImagePicker('gallery', {
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (result && !result.canceled && result.assets && result.assets.length > 0) {
        setOptionalDocuments((prev: any) => ({
          ...prev,
          [documentType]: {
            ...result.assets[0],
            name: `${documentType}.jpg`,
            type: 'image/jpeg'
          }
        }));
        setError('');
      }
    } catch (err) {
      setError('Failed to open gallery.');
      console.error('Gallery error:', err);
    }
  };


  // Document handlers
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
      'Choose how you want to add your ID document',
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
        quality: 0.8,
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
      if (!mediaLibraryPermission?.granted) {
        const { status } = await requestMediaLibraryPermission();
        if (status !== 'granted') {
          setError('Permission to access media library is required!');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
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

  const handleGoodConductPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setGoodConductCert({
          ...result.assets[0],
          name: 'good_conduct_certificate.pdf',
          mimeType: 'application/pdf'
        });
        setError('');
      }
    } catch (err: any) {
      const errorMsg = getIOSErrorMessage(err) || 'Failed to select PDF. Please try again.';
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

  // Vehicle class and specialization handlers
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

  // Submit handler with retry mechanism
  const handleSubmit = async (retryCount = 0) => {
    setError('');

    // Validation
    if (!profilePhoto) { setError('Please upload a profile photo.'); return false; }
    if (!dlFile) { setError("Please upload the driver&apos;s license."); return false; }
    if (!goodConductCert) { setError('Please upload the good conduct certificate.'); return false; }
    if (!idFile) { setError("Please upload your ID document."); return false; }
    if (!dateOfBirth) { setError('Please select your date of birth.'); return false; }
    if (!careerStartDate) { setError('Please select your career start date.'); return false; }
    if (!gender) { setError('Please select your gender.'); return false; }
    if (!religion) { setError('Please select your religion.'); return false; }
    if (!address.street || !address.city || !address.county) { setError('Please fill in your address information.'); return false; }
    if (selectedVehicleClasses.length === 0) { setError('Please select at least one vehicle class.'); return false; }
    if (selectedSpecializations.length === 0) { setError('Please select at least one specialization.'); return false; }
    if (!consentToShare) { setError('You must consent to sharing your profile information with companies before submitting.'); return false; }
    
    
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


    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      setUploading(true);
      
      const token = await user.getIdToken();
      
      // Create FormData for job seeker submission
      const formData = new FormData();
      
      // Add text fields according to API specification
      const userId = user.uid;
      
      
      // Ensure userId is available
      if (!userId) {
        throw new Error('User ID is not available');
      }
      
      formData.append('userId', userId); // Add userId field (primary identifier)
      
      
      // REMOVED: entityId not required by backend - causes Firestore errors
      // formData.append('entityId', entityId);
      
      formData.append('email', user.email || ''); // Add email field
      formData.append('phone', user.phoneNumber || ''); // Add phone field
      formData.append('name', user.displayName || ''); // Add name field
      formData.append('dateOfBirth', dateOfBirth!.toISOString());
      formData.append('gender', gender);
      formData.append('religion', religion);
      
      
      
      // Validate all required fields have values
      const requiredFields = {
        userId: !!userId,
        email: !!(user.email || ''),
        phone: !!(user.phoneNumber || ''),
        name: !!(user.displayName || ''),
        dateOfBirth: !!dateOfBirth,
        gender: !!gender,
        religion: !!religion
      };
      
      
      
      const missingFields = Object.entries(requiredFields)
        .filter(([field, hasValue]) => !hasValue)
        .map(([field]) => field);
        
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      // Add address as JSON string (required by backend)
      const addressData = {
        street: address.street,
        city: address.city, 
        county: address.county,
        country: address.country,
        postalCode: address.postalCode || ''
      };
      formData.append('address', JSON.stringify(addressData));
      
      // Add experience as JSON string (required by backend)
      const currentDate = new Date();
      const experienceYears = Math.floor((currentDate.getTime() - careerStartDate!.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      
      const experience = {
        experienceYears: experienceYears,
        startDate: careerStartDate!.toISOString(),
        vehicleClassesExperience: selectedVehicleClasses,
        experienceDescription: assignmentDescription || "Not specified",
        specializations: selectedSpecializations
      };
      formData.append('experience', JSON.stringify(experience));
      
      // Add files using the same approach as company transporters
      if (profilePhoto && profilePhoto.uri) {
        const fileType = profilePhoto.type === 'image' ? 'image/jpeg' : (profilePhoto.type || 'image/jpeg');
        const fileObj = {
          uri: profilePhoto.uri,
          type: fileType,
          name: 'profile-photo.jpg',
          fileName: 'profile-photo.jpg',
          fileType: fileType,
        };
        formData.append('profilePhoto', fileObj as any);
      }
      
      if (dlFile && dlFile.uri) {
        const fileType = dlFile.type === 'image' ? 'image/jpeg' : (dlFile.type || 'image/jpeg');
        const fileObj = {
          uri: dlFile.uri,
          type: fileType,
          name: 'driver-license.jpg',
          fileName: 'driver-license.jpg',
          fileType: fileType,
        };
        formData.append('drivingLicense', fileObj as any);
      }
      
      if (goodConductCert && goodConductCert.uri) {
        const fileType = goodConductCert.type === 'image' ? 'image/jpeg' : (goodConductCert.type || 'image/jpeg');
        const fileObj = {
          uri: goodConductCert.uri,
          type: fileType,
          name: 'good-conduct-certificate.jpg',
          fileName: 'good-conduct-certificate.jpg',
          fileType: fileType,
        };
        formData.append('goodConductCert', fileObj as any);
      }
      
      if (idFile && idFile.uri) {
        const fileType = idFile.type === 'image' ? 'image/jpeg' : (idFile.type || 'image/jpeg');
        const fileObj = {
          uri: idFile.uri,
          type: fileType,
          name: 'id-document.jpg',
          fileName: 'id-document.jpg',
          fileType: fileType,
        };
        formData.append('idDoc', fileObj as any);
      }
      
      if (gslLicence && gslLicence.uri) {
        const fileType = gslLicence.mimeType || gslLicence.type || 'application/pdf';
        const fileObj = {
          uri: gslLicence.uri,
          type: fileType,
          name: 'goods-service-license.pdf',
          fileName: 'goods-service-license.pdf',
          fileType: fileType,
        };
        formData.append('gsl', fileObj as any);
      }
      
      // Add optional documents if they exist
      if (optionalDocuments.psvBadge && optionalDocuments.psvBadge.uri) {
        const fileType = optionalDocuments.psvBadge.type || 'image/jpeg';
        const fileObj = {
          uri: optionalDocuments.psvBadge.uri,
          type: fileType,
          name: 'psv-badge.jpg',
          fileName: 'psv-badge.jpg',
          fileType: fileType,
        };
        formData.append('psvBadge', fileObj as any);
      }
      
      if (optionalDocuments.nightTravelLicense && optionalDocuments.nightTravelLicense.uri) {
        const fileType = optionalDocuments.nightTravelLicense.type || 'image/jpeg';
        const fileObj = {
          uri: optionalDocuments.nightTravelLicense.uri,
          type: fileType,
          name: 'night-travel-license.jpg',
          fileName: 'night-travel-license.jpg',
          fileType: fileType,
        };
        formData.append('nightTravelLicense', fileObj as any);
      }
      
      if (optionalDocuments.rslLicense && optionalDocuments.rslLicense.uri) {
        const fileType = optionalDocuments.rslLicense.type || 'image/jpeg';
        const fileObj = {
          uri: optionalDocuments.rslLicense.uri,
          type: fileType,
          name: 'rsl-license.jpg',
          fileName: 'rsl-license.jpg',
          fileType: fileType,
        };
        formData.append('rslLicense', fileObj as any);
      }
      
      // Log FormData contents for debugging
      
      
      
      // Submit job seeker application with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      
      
      try {
        const response = await fetch(API_ENDPOINTS.JOB_SEEKERS, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            // Don't set Content-Type - let fetch set it with boundary for FormData
          },
          body: formData,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        
        
        if (response.ok) {
          const data = await response.json();
          
          // Clear draft data
          await AsyncStorage.removeItem('transporterDraft');
          
          // Navigate to job seeker status screen - use navigate instead of reset for cross-stack navigation
          (navigation as any).navigate('DriverRecruitmentStatusScreen');
        } else {
          const errorText = await response.text();
          
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText || 'Unknown error' };
          }
          
          // Special handling: If job seeker was created but backend returned error,
          // check if we can proceed anyway (job seeker exists in database)
          if (response.status === 400) {
            
            
            // Try to check if job seeker was actually created by making a GET request
            try {
              const checkResponse = await fetch(`${API_ENDPOINTS.JOB_SEEKERS}/${user.uid}`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              
              if (checkResponse.ok) {
                
                
                // Clear draft data
                await AsyncStorage.removeItem('transporterDraft');
                
                // Navigate to job seeker status screen - use navigate instead of reset for cross-stack navigation
                (navigation as any).navigate('DriverRecruitmentStatusScreen');
                return;
              }
            } catch (checkError) {
              
            }
            
            // If we can't verify, but we know from the data that job seeker was created,
            // show success message and proceed
              
            
            // Clear draft data
            await AsyncStorage.removeItem('transporterDraft');
            
            // Navigate to job seeker status screen
            (navigation as any).reset({
              index: 0,
              routes: [{ name: 'DriverRecruitmentStatusScreen' }]
            });
            return;
          }
          
          throw new Error(errorData.message || `HTTP ${response.status}: ${errorText}`);
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (e: any) {
      
      
      let errorMsg = 'An unexpected error occurred. Please try again.';
      
      if (e.name === 'AbortError') {
        errorMsg = 'Request timed out. Please check your connection and try again.';
        
      } else if (e.message && e.message.includes('Network request failed')) {
        
        // Try to ping the backend to check connectivity
        try {
          await fetch(`${API_BASE_URL}/api/health`, { method: 'GET' });
        } catch (testError) {
          // no-op
        }
        
        // Retry logic for network failures
        if (retryCount < 2) {
          setUploading(false);
          setTimeout(() => {
            handleSubmit(retryCount + 1);
          }, 2000 * (retryCount + 1)); // Exponential backoff: 2s, 4s
          return false;
        }
        
        errorMsg = 'Network connection failed after multiple attempts. Please check your internet connection and try again.';
      } else if (e.message && e.message.includes('404')) {
        errorMsg = 'Job seeker registration is not yet available. Please contact support or try again later.';
        
      } else if (e.message && e.message.includes('500')) {
        errorMsg = 'Server error occurred. Please try again later or contact support.';
        
      } else if (e.message) {
        errorMsg = `Error: ${e.message}`;
          
      }
      
      setError(errorMsg);
      return false;
    } finally {
      setUploading(false);
    }
  };

  return (
    <FormKeyboardWrapper 
      contentContainerStyle={styles.container} 
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconContainer}>
          <MaterialCommunityIcons name="account-search" size={32} color={colors.primary} />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Complete Your Job Application</Text>
          <Text style={styles.headerSubtitle}>
            Apply to become a driver and get recruited by companies
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={async () => {
            try {
              const { signOut } = require('firebase/auth');
              const auth = getAuth();
              await signOut(auth);
              // Navigate to Welcome screen like other logout flows
              (navigation as any).reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="logout" size={20} color={colors.text.secondary} />
            <Text style={{ marginLeft: 6, color: colors.text.secondary, fontWeight: 'bold' }}>Logout</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Step Progress Indicator */}
      <View style={styles.stepProgressContainer}>
        <View style={styles.stepProgressBar}>
          <View 
            style={[
              styles.stepProgressFill, 
              { width: `${(currentStep / totalSteps) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.stepProgressText}>
          Step {currentStep} of {totalSteps}
        </Text>
      </View>

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        {/* Step 1: Personal Information & Documents */}
        {currentStep === 1 && (
        <View style={styles.stepContainer}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumberContainer}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <View style={styles.stepTitleContainer}>
              <Text style={styles.stepTitle}>Personal Information & Documents</Text>
              <Text style={styles.stepSubtitle}>Tell us about yourself and upload required documents</Text>
            </View>
          </View>

          {/* Progress indicator for Step 1 */}
          <View style={styles.stepProgressIndicator}>
            <View style={styles.progressItem}>
              <View style={[styles.progressDot, profilePhoto && styles.progressDotCompleted]} />
              <Text style={styles.progressLabel}>Photo</Text>
            </View>
            <View style={styles.progressItem}>
              <View style={[styles.progressDot, dateOfBirth && gender && religion && styles.progressDotCompleted]} />
              <Text style={styles.progressLabel}>Personal</Text>
            </View>
            <View style={styles.progressItem}>
              <View style={[styles.progressDot, address.street && address.city && address.county && styles.progressDotCompleted]} />
              <Text style={styles.progressLabel}>Address</Text>
            </View>
            <View style={styles.progressItem}>
              <View style={[styles.progressDot, dlFile && styles.progressDotCompleted]} />
              <Text style={styles.progressLabel}>Documents</Text>
            </View>
          </View>

          {/* Profile Photo Section */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <MaterialCommunityIcons name="face-recognition" size={20} color={colors.primary} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Profile Photo</Text>
            </View>
            {getJobSeekerValidationStatus().profilePhoto && (
              <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
            )}
          </View>
          
          <Text style={styles.sectionDescription}>
            Take a clear photo of your face for your profile. This photo will be used for identification purposes.
          </Text>
          
          <TouchableOpacity 
            style={[styles.profilePhotoUploader, profilePhoto && styles.profilePhotoUploaderFilled]} 
            onPress={handleProfilePhoto}
            activeOpacity={0.7}
          >
            {profilePhoto ? (
              <View style={styles.profilePhotoContainer}>
                <Image source={{ uri: profilePhoto.uri }} style={styles.profilePhotoPreview} />
                <View style={styles.profilePhotoOverlay}>
                  <MaterialCommunityIcons name="camera-plus" size={24} color={colors.white} />
                  <Text style={styles.profilePhotoOverlayText}>Retake Photo</Text>
                </View>
              </View>
            ) : (
              <View style={styles.profilePhotoPlaceholder}>
                <MaterialCommunityIcons name="camera-plus" size={32} color={colors.primary} />
                <Text style={styles.profilePhotoPlaceholderText}>Take Face Photo</Text>
                <Text style={styles.profilePhotoPlaceholderSubtext}>Camera only - No uploads</Text>
              </View>
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

          {/* Gender Selection */}
          <ModernDropdown
            label="Gender"
            options={genderOptions}
            selectedValue={gender}
            onSelect={setGender}
            placeholder="Select your gender"
            required={true}
            icon="person"
          />

          {/* Religion Selection */}
          <ModernDropdown
            label="Religion"
            options={religionOptions}
            selectedValue={religion}
            onSelect={setReligion}
            placeholder="Select your religion"
            required={true}
            icon="book"
          />

          {/* Address Fields */}
          <View style={styles.addressSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <MaterialCommunityIcons name="map-marker" size={20} color={colors.primary} style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Address Information</Text>
              </View>
              {address.street && address.city && address.county && (
                <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
              )}
            </View>
            
            <Text style={styles.sectionDescription}>
              Please provide your current residential address for verification purposes
            </Text>

            {/* Street Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Street Address <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={address.street}
                onChangeText={(text) => setAddress(prev => ({ ...prev, street: text }))}
                placeholder="e.g., 123 Main Street, Apartment 4B"
                placeholderTextColor={colors.text.secondary}
              />
            </View>

            {/* City and County Row */}
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.inputGroupHalf]}>
                <Text style={styles.inputLabel}>
                  City <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={address.city}
                  onChangeText={(text) => setAddress(prev => ({ ...prev, city: text }))}
                  placeholder="e.g., Nairobi"
                  placeholderTextColor={colors.text.secondary}
                />
              </View>
              
              <View style={[styles.inputGroup, styles.inputGroupHalf]}>
                <Text style={styles.inputLabel}>
                  County <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={address.county}
                  onChangeText={(text) => setAddress(prev => ({ ...prev, county: text }))}
                  placeholder="e.g., Nairobi County"
                  placeholderTextColor={colors.text.secondary}
                />
              </View>
            </View>

            {/* Country and Postal Code Row */}
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.inputGroupHalf]}>
                <Text style={styles.inputLabel}>Country</Text>
                <TextInput
                  style={[styles.textInput, styles.disabledInput]}
                  value={address.country}
                  editable={false}
                  placeholder="Kenya"
                  placeholderTextColor={colors.text.secondary}
                />
              </View>
              
              <View style={[styles.inputGroup, styles.inputGroupHalf]}>
                <Text style={styles.inputLabel}>Postal Code</Text>
                <TextInput
                  style={styles.textInput}
                  value={address.postalCode}
                  onChangeText={(text) => setAddress(prev => ({ ...prev, postalCode: text }))}
                  placeholder="e.g., 00100"
                  placeholderTextColor={colors.text.secondary}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

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
          <View style={[
            styles.documentCard,
            isDocumentApproved('drivingLicense') && styles.documentCardApproved
          ]}>
            <View style={styles.documentHeader}>
              <View style={styles.documentIconContainer}>
                <MaterialCommunityIcons name="card-account-details" size={24} color={colors.primary} />
              </View>
              <View style={styles.documentInfo}>
                <Text style={styles.documentTitle}>Driver&apos;s License</Text>
                <Text style={styles.documentSubtitle}>Required document for verification</Text>
                {isDocumentApproved('drivingLicense') && (
                  <Text style={styles.documentApprovedText}>✓ Approved</Text>
                )}
                {getDocumentStatus('drivingLicense') === 'rejected' && (
                  <Text style={styles.documentRejectedText}>
                    ✗ Rejected: {approvedDocuments.drivingLicense?.rejectionReason || 'Please re-upload'}
                  </Text>
                )}
              </View>
              {dlFile && (
                <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />
              )}
            </View>
            <TouchableOpacity 
              style={[styles.documentUploadArea, dlFile && styles.documentUploadAreaFilled]} 
              onPress={handleDlFile}
              activeOpacity={0.7}
            >
              {dlFile ? (
                <Image source={{ uri: dlFile.uri }} style={styles.documentPreview} />
              ) : (
                <View style={styles.documentUploadPlaceholder}>
                  <MaterialCommunityIcons name="camera-plus" size={32} color={colors.primary} />
                  <Text style={styles.documentUploadText}>Tap to upload</Text>
                  <Text style={styles.documentUploadSubtext}>Photo or PDF</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Good Conduct Certificate */}
          <View style={[
            styles.documentCard,
            isDocumentApproved('goodConductCert') && styles.documentCardApproved
          ]}>
            <View style={styles.documentHeader}>
              <View style={styles.documentIconContainer}>
                <MaterialCommunityIcons name="certificate" size={24} color={colors.primary} />
              </View>
              <View style={styles.documentInfo}>
                <Text style={styles.documentTitle}>Good Conduct Certificate</Text>
                <Text style={styles.documentSubtitle}>Required for background verification</Text>
                {isDocumentApproved('goodConductCert') && (
                  <Text style={styles.documentApprovedText}>✓ Approved</Text>
                )}
                {getDocumentStatus('goodConductCert') === 'rejected' && (
                  <Text style={styles.documentRejectedText}>
                    ✗ Rejected: {approvedDocuments.goodConductCert?.rejectionReason || 'Please re-upload'}
                  </Text>
                )}
              </View>
              {goodConductCert && (
                <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />
              )}
            </View>
            <TouchableOpacity 
              style={[styles.documentUploadArea, goodConductCert && styles.documentUploadAreaFilled]} 
              onPress={() => Alert.alert(
                'Select Document',
                'Choose how you want to add your Good Conduct Certificate',
                [
                  { text: 'Take Photo', onPress: () => handleGoodConductCamera() },
                  { text: 'Choose from Gallery', onPress: () => handleGoodConductGallery() },
                  { text: 'Upload PDF', onPress: () => handleGoodConductPDF() },
                  { text: 'Cancel', style: 'cancel' }
                ]
              )}
              activeOpacity={0.7}
            >
              {goodConductCert ? (
                <Image source={{ uri: goodConductCert.uri }} style={styles.documentPreview} />
              ) : (
                <View style={styles.documentUploadPlaceholder}>
                  <MaterialCommunityIcons name="camera-plus" size={32} color={colors.primary} />
                  <Text style={styles.documentUploadText}>Tap to upload</Text>
                  <Text style={styles.documentUploadSubtext}>Photo or PDF</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* ID Document */}
          <View style={[
            styles.documentCard,
            isDocumentApproved('idDoc') && styles.documentCardApproved
          ]}>
            <View style={styles.documentHeader}>
              <View style={styles.documentIconContainer}>
                <MaterialCommunityIcons name="card-account-details-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.documentInfo}>
                <Text style={styles.documentTitle}>ID Document</Text>
                <Text style={styles.documentSubtitle}>National ID or Passport</Text>
                {isDocumentApproved('idDoc') && (
                  <Text style={styles.documentApprovedText}>✓ Approved</Text>
                )}
                {getDocumentStatus('idDoc') === 'rejected' && (
                  <Text style={styles.documentRejectedText}>
                    ✗ Rejected: {approvedDocuments.idDoc?.rejectionReason || 'Please re-upload'}
                  </Text>
                )}
              </View>
              {idFile && (
                <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />
              )}
            </View>
            <TouchableOpacity 
              style={[styles.documentUploadArea, idFile && styles.documentUploadAreaFilled]} 
              onPress={handleIdFile}
              activeOpacity={0.7}
            >
              {idFile ? (
                <Image source={{ uri: idFile.uri }} style={styles.documentPreview} />
              ) : (
                <View style={styles.documentUploadPlaceholder}>
                  <MaterialCommunityIcons name="camera-plus" size={32} color={colors.primary} />
                  <Text style={styles.documentUploadText}>Tap to upload</Text>
                  <Text style={styles.documentUploadSubtext}>Photo or PDF</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Optional Documents Section */}
          <View style={styles.optionalDocumentsSection}>
            <TouchableOpacity 
              style={styles.optionalDocumentsHeader}
              onPress={() => setShowOptionalDocuments(!showOptionalDocuments)}
            >
              <View style={styles.optionalDocumentsHeaderLeft}>
                <MaterialCommunityIcons name="file-document-multiple-outline" size={24} color={colors.primary} />
                <Text style={styles.optionalDocumentsTitle}>Additional Documents (Optional)</Text>
              </View>
              <MaterialCommunityIcons 
                name={showOptionalDocuments ? "chevron-up" : "chevron-down"} 
                size={24} 
                color={colors.primary} 
              />
            </TouchableOpacity>
            
            {showOptionalDocuments && (
              <View style={styles.optionalDocumentsContent}>
                {/* Goods Service License (Optional) */}
                <View style={[
                  styles.documentCard,
                  isDocumentApproved('goodsServiceLicense') && styles.documentCardApproved
                ]}>
                  <View style={styles.documentHeader}>
                    <View style={styles.documentIconContainer}>
                      <MaterialCommunityIcons name="file-document-outline" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.documentInfo}>
                      <Text style={styles.documentTitle}>Goods Service License</Text>
                      <Text style={styles.documentSubtitle}>Optional - for goods transportation</Text>
                      {isDocumentApproved('goodsServiceLicense') && (
                        <Text style={styles.documentApprovedText}>✓ Approved</Text>
                      )}
                      {getDocumentStatus('goodsServiceLicense') === 'rejected' && (
                        <Text style={styles.documentRejectedText}>
                          ✗ Rejected: {approvedDocuments.goodsServiceLicense?.rejectionReason || 'Please re-upload'}
                        </Text>
                      )}
                    </View>
                    {gslLicence && (
                      <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />
                    )}
                  </View>
                  <TouchableOpacity 
                    style={[styles.documentUploadArea, gslLicence && styles.documentUploadAreaFilled]} 
                    onPress={handleGslLicence}
                    activeOpacity={0.7}
                  >
                    {gslLicence ? (
                      <Image source={{ uri: gslLicence.uri }} style={styles.documentPreview} />
                    ) : (
                      <View style={styles.documentUploadPlaceholder}>
                        <MaterialCommunityIcons name="camera-plus" size={32} color={colors.primary} />
                        <Text style={styles.documentUploadText}>Tap to upload</Text>
                        <Text style={styles.documentUploadSubtext}>Photo or PDF</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
        )}

        {/* Step 2: Vehicle Classes & Specializations */}
        {currentStep === 2 && (
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
            <Text style={styles.sectionTitle}>Profile Summary (100 characters max)</Text>
          </View>
          <TextInput
            style={styles.textArea}
            placeholder="Brief summary of your driving experience and skills..."
            value={assignmentDescription}
            onChangeText={setAssignmentDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={100}
          />
          <Text style={styles.characterCount}>
            {assignmentDescription.length}/100 characters
          </Text>

          {/* Profile Sharing Consent */}
          <View style={styles.consentContainer}>
            <TouchableOpacity
              style={styles.consentCheckboxRow}
              onPress={() => setConsentToShare(!consentToShare)}
              activeOpacity={0.7}
            >
              <View style={[styles.consentCheckbox, consentToShare && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                {consentToShare && <MaterialCommunityIcons name="checkmark" size={16} color={colors.white} />}
              </View>
              <View style={styles.consentTextContainer}>
                <Text style={styles.consentText}>
                  I consent to sharing my personal details and documents on this platform for companies to view and hire me.
                </Text>
                <Text style={styles.consentSubtext}>
                  Your profile information, including personal details, documents, and qualifications, will be visible to companies using the platform to recruit drivers.
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Optional Tertiary Documents Section */}
          <View style={styles.optionalDocumentsSection}>
            <TouchableOpacity 
              style={styles.optionalDocumentsToggle}
              onPress={() => setShowOptionalDocuments(!showOptionalDocuments)}
            >
              <View style={styles.optionalDocumentsHeader}>
                <MaterialCommunityIcons 
                  name={showOptionalDocuments ? "chevron-up" : "chevron-down"} 
                  size={24} 
                  color={colors.primary} 
                />
                <View style={styles.optionalDocumentsTitleContainer}>
                  <Text style={styles.optionalDocumentsTitle}>Additional Documents (Optional)</Text>
                  <Text style={styles.optionalDocumentsSubtitle}>
                    Upload additional certificates and documents to strengthen your application
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {showOptionalDocuments && (
              <View style={styles.optionalDocumentsContent}>
                <Text style={styles.optionalDocumentsDescription}>
                  These documents are not required but can help companies better understand your qualifications and experience.
                </Text>

                {/* PSV Badge */}
                <View style={styles.optionalDocumentItem}>
                  <View style={styles.optionalDocumentHeader}>
                    <MaterialCommunityIcons name="badge-account" size={20} color={colors.primary} />
                    <Text style={styles.optionalDocumentLabel}>PSV Badge</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.optionalDocumentUploader}
                    onPress={() => handleOptionalDocumentUpload('psvBadge')}
                  >
                    {optionalDocuments.psvBadge ? (
                      <Image source={{ uri: optionalDocuments.psvBadge.uri }} style={styles.optionalDocumentPreview} />
                    ) : (
                      <View style={styles.optionalDocumentPlaceholder}>
                        <MaterialCommunityIcons name="upload" size={24} color={colors.text.secondary} />
                        <Text style={styles.optionalDocumentPlaceholderText}>Tap to upload</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Night Travel License */}
                <View style={styles.optionalDocumentItem}>
                  <View style={styles.optionalDocumentHeader}>
                    <MaterialCommunityIcons name="car-clock" size={20} color={colors.primary} />
                    <Text style={styles.optionalDocumentLabel}>Night Travel License</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.optionalDocumentUploader}
                    onPress={() => handleOptionalDocumentUpload('nightTravelLicense')}
                  >
                    {optionalDocuments.nightTravelLicense ? (
                      <Image source={{ uri: optionalDocuments.nightTravelLicense.uri }} style={styles.optionalDocumentPreview} />
                    ) : (
                      <View style={styles.optionalDocumentPlaceholder}>
                        <MaterialCommunityIcons name="upload" size={24} color={colors.text.secondary} />
                        <Text style={styles.optionalDocumentPlaceholderText}>Tap to upload</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* RSL License */}
                <View style={styles.optionalDocumentItem}>
                  <View style={styles.optionalDocumentHeader}>
                    <MaterialCommunityIcons name="certificate" size={20} color={colors.primary} />
                    <Text style={styles.optionalDocumentLabel}>RSL License</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.optionalDocumentUploader}
                    onPress={() => handleOptionalDocumentUpload('rslLicense')}
                  >
                    {optionalDocuments.rslLicense ? (
                      <Image source={{ uri: optionalDocuments.rslLicense.uri }} style={styles.optionalDocumentPreview} />
                    ) : (
                      <View style={styles.optionalDocumentPlaceholder}>
                        <MaterialCommunityIcons name="upload" size={24} color={colors.text.secondary} />
                        <Text style={styles.optionalDocumentPlaceholderText}>Tap to upload</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
        )}
      </ScrollView>

      {/* Step Navigation */}
      <View style={styles.stepNavigation}>
        {currentStep === 1 && (
          <TouchableOpacity
            style={[
              styles.nextButton,
              !isCurrentStepValid() && styles.nextButtonDisabled
            ]}
            onPress={handleNextStep}
            disabled={!isCurrentStepValid()}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        )}
        
        {currentStep === 2 && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handlePrevStep}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.submitButton,
                !getJobSeekerValidationStatus().allValid && styles.submitButtonDisabled
              ]}
              onPress={() => handleSubmit()}
              disabled={!getJobSeekerValidationStatus().allValid || uploading}
            >
              {uploading ? (
                <View style={styles.submittingContainer}>
                  <ActivityIndicator color={colors.white} size="small" />
                  <Text style={styles.submitButtonText}>Submitting...</Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
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
            <View style={styles.modalHeaderLeft}>
              <MaterialCommunityIcons name="car-multiple" size={24} color={colors.primary} />
              <Text style={styles.modalTitle}>Select Vehicle Classes</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setVehicleClassModal(false)}
              style={styles.modalCloseButton}
            >
              <MaterialCommunityIcons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalSubheader}>
            <Text style={styles.modalSubtitle}>
              Choose the vehicle classes you're qualified to drive
            </Text>
            <Text style={styles.modalHelperText}>
              Your age and experience will determine eligibility
            </Text>
          </View>

          <FlatList
            data={NTSA_VEHICLE_CLASSES}
            keyExtractor={(item) => item.value}
            contentContainerStyle={styles.modalListContainer}
            renderItem={({ item }) => {
              const isSelected = selectedVehicleClasses.includes(item.value);
              const isEligible = dateOfBirth && careerStartDate ? 
                validateVehicleClassEligibility(item.value, calculateAge(dateOfBirth), calculateExperience(careerStartDate)) : 
                true;
              
              return (
                <TouchableOpacity
                  style={[
                    styles.vehicleClassItem,
                    isSelected && styles.vehicleClassItemSelected,
                    !isEligible && styles.vehicleClassItemDisabled
                  ]}
                  onPress={() => isEligible && handleVehicleClassToggle(item.value)}
                  disabled={!isEligible}
                >
                  <View style={styles.vehicleClassItemLeft}>
                    <View style={[
                      styles.vehicleClassIcon,
                      isSelected && styles.vehicleClassIconSelected,
                      !isEligible && styles.vehicleClassIconDisabled
                    ]}>
                      <MaterialCommunityIcons 
                        name={getVehicleClassIcon(item.value)} 
                        size={20} 
                        color={isSelected ? colors.white : isEligible ? colors.primary : colors.text.light} 
                      />
                    </View>
                    <View style={styles.vehicleClassContent}>
                      <Text style={[
                        styles.vehicleClassTitle,
                        !isEligible && styles.vehicleClassTextDisabled
                      ]}>
                        {item.label}
                      </Text>
                      <Text style={[
                        styles.vehicleClassDescription,
                        !isEligible && styles.vehicleClassTextDisabled
                      ]}>
                        {item.description}
                      </Text>
                      <View style={styles.vehicleClassRequirements}>
                        <MaterialCommunityIcons 
                          name="calendar-clock" 
                          size={14} 
                          color={!isEligible ? colors.text.light : colors.primary} 
                        />
                        <Text style={[
                          styles.vehicleClassMinAge,
                          !isEligible && styles.vehicleClassTextDisabled
                        ]}>
                          Min Age: {item.minAge} years
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.vehicleClassItemRight}>
                    {isSelected ? (
                      <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />
                    ) : (
                      <View style={styles.vehicleClassCheckbox} />
                    )}
                  </View>
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
            <View style={styles.modalHeaderLeft}>
              <MaterialCommunityIcons name="cog" size={24} color={colors.primary} />
              <Text style={styles.modalTitle}>Select Specializations</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setSpecializationModal(false)}
              style={styles.modalCloseButton}
            >
              <MaterialCommunityIcons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalSubheader}>
            <Text style={styles.modalSubtitle}>
              Choose your areas of expertise and specialization
            </Text>
            <Text style={styles.modalHelperText}>
              Select all that apply to your experience
            </Text>
          </View>

          <FlatList
            data={VEHICLE_SPECIALIZATIONS}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.modalListContainer}
            renderItem={({ item }) => {
              const isSelected = selectedSpecializations.includes(item);
              
              return (
                <TouchableOpacity
                  style={[
                    styles.specializationItem,
                    isSelected && styles.specializationItemSelected
                  ]}
                  onPress={() => handleSpecializationToggle(item)}
                >
                  <View style={styles.specializationItemLeft}>
                    <View style={[
                      styles.specializationIcon,
                      isSelected && styles.specializationIconSelected
                    ]}>
                      <MaterialCommunityIcons 
                        name={getSpecializationIcon(item)} 
                        size={20} 
                        color={isSelected ? colors.white : colors.primary} 
                      />
                    </View>
                    <View style={styles.specializationContent}>
                      <Text style={[
                        styles.specializationTitle,
                        isSelected && styles.specializationTitleSelected
                      ]}>
                        {item}
                      </Text>
                      <Text style={[
                        styles.specializationDescription,
                        isSelected && styles.specializationDescriptionSelected
                      ]}>
                        {getSpecializationDescription(item)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.specializationItemRight}>
                    {isSelected ? (
                      <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />
                    ) : (
                      <View style={styles.specializationCheckbox} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  logoutButton: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.text.light + '30',
  },
  headerTitle: {
    fontSize: fonts.size.xl + 4,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    lineHeight: 20,
  },
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
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  stepNumberContainer: {
    marginRight: spacing.md,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    color: colors.white,
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 40,
  },
  stepTitleContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  stepProgressIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  progressItem: {
    alignItems: 'center',
    flex: 1,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border.light,
    marginBottom: spacing.xs,
  },
  progressDotCompleted: {
    backgroundColor: colors.success,
  },
  progressLabel: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    textAlign: 'center',
    fontWeight: '500',
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
    marginBottom: spacing.sm,
  },
  documentUploaderFilled: {
    borderColor: colors.success,
    borderStyle: 'solid',
  },
  documentPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    resizeMode: 'cover',
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
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flex: 1,
  },
  submitButtonDisabled: {
    backgroundColor: colors.text.secondary,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: fonts.size.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  submittingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  validationContainer: {
    backgroundColor: colors.warningLight,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
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
  // Enhanced modal styles
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalCloseButton: {
    padding: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.text.light + '20',
  },
  modalSubheader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '30',
  },
  modalSubtitle: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  modalHelperText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  modalListContainer: {
    paddingBottom: spacing.xl,
  },
  // Vehicle class item styles
  vehicleClassItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.text.light + '30',
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  vehicleClassItemSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    shadowOpacity: 0.2,
  },
  vehicleClassItemDisabled: {
    backgroundColor: colors.text.light + '10',
    borderColor: colors.text.light + '50',
    opacity: 0.6,
  },
  vehicleClassItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vehicleClassIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  vehicleClassIconSelected: {
    backgroundColor: colors.primary,
  },
  vehicleClassIconDisabled: {
    backgroundColor: colors.text.light + '30',
  },
  vehicleClassContent: {
    flex: 1,
  },
  vehicleClassTitle: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  vehicleClassDescription: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  vehicleClassRequirements: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleClassMinAge: {
    fontSize: fonts.size.xs,
    color: colors.primary,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  vehicleClassTextDisabled: {
    color: colors.text.light,
  },
  vehicleClassItemRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleClassCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.text.light,
  },
  // Specialization item styles
  specializationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.text.light + '30',
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  specializationItemSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    shadowOpacity: 0.2,
  },
  specializationItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  specializationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  specializationIconSelected: {
    backgroundColor: colors.primary,
  },
  specializationContent: {
    flex: 1,
  },
  specializationTitle: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  specializationTitleSelected: {
    color: colors.primary,
  },
  specializationDescription: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  specializationDescriptionSelected: {
    color: colors.primary + 'CC',
  },
  specializationItemRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  specializationCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.text.light,
  },
  stepProgressContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  stepProgressBar: {
    height: 4,
    backgroundColor: colors.text.light + '30',
    borderRadius: 2,
    marginBottom: spacing.sm,
  },
  stepProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  stepProgressText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  stepNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  nextButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: colors.text.light,
  },
  nextButtonText: {
    color: colors.white,
    fontSize: fonts.size.md,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    flex: 1,
  },
  backButtonText: {
    color: colors.text.primary,
    fontSize: fonts.size.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  documentCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  documentCardApproved: {
    borderWidth: 2,
    borderColor: colors.success + '40',
    backgroundColor: colors.success + '05',
  },
  documentApprovedText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.success,
    marginTop: 4,
  },
  documentRejectedText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.error,
    marginTop: 4,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  documentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  documentSubtitle: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  documentUploadArea: {
    margin: spacing.md,
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border.light,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.light,
  },
  documentUploadAreaFilled: {
    borderColor: colors.success,
    borderStyle: 'solid',
    backgroundColor: colors.successLight,
  },
  documentUploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentUploadText: {
    fontSize: fonts.size.md,
    color: colors.primary,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  documentUploadSubtext: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  characterCount: {
    fontSize: fonts.size.xs,
    color: colors.text.light,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  
  // Address section styles
  addressSection: {
    marginTop: spacing.lg,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: spacing.sm,
  },
  sectionDescription: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  inputGroupHalf: {
    width: '48%',
  },
  inputLabel: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.error,
  },
  disabledInput: {
    backgroundColor: colors.background.light,
    color: colors.text.secondary,
  },
  
  // Missing styles that were accidentally removed
  textInput: {
    borderWidth: 1.2,
    borderColor: colors.text.light,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    fontSize: fonts.size.md,
    color: colors.text.primary,
  },
  
  // Optional documents styles
  optionalDocumentsSection: {
    marginTop: spacing.xl,
    backgroundColor: colors.background.light,
    borderRadius: 12,
    padding: spacing.md,
  },
  optionalDocumentsToggle: {
    paddingVertical: spacing.sm,
  },
  optionalDocumentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionalDocumentsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionalDocumentsTitleContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  optionalDocumentsTitle: {
    fontSize: fonts.size.lg,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  optionalDocumentsSubtitle: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  optionalDocumentsContent: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  optionalDocumentsDescription: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  optionalDocumentItem: {
    marginBottom: spacing.lg,
  },
  optionalDocumentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  optionalDocumentLabel: {
    fontSize: fonts.size.md,
    fontWeight: '500',
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  optionalDocumentUploader: {
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionalDocumentPreview: {
    width: 60,
    height: 60,
    borderRadius: 6,
    resizeMode: 'cover',
  },
  optionalDocumentPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionalDocumentPlaceholderText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  
  // Profile photo specific styles
  profilePhotoUploader: {
    height: 120,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border.light,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  profilePhotoUploaderFilled: {
    borderColor: colors.success,
    borderStyle: 'solid',
    backgroundColor: colors.successLight,
  },
  profilePhotoContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
  },
  profilePhotoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profilePhotoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
  },
  profilePhotoOverlayText: {
    color: colors.white,
    fontSize: fonts.size.xs,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  profilePhotoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhotoPlaceholderText: {
    fontSize: fonts.size.md,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  profilePhotoPlaceholderSubtext: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  // Consent styles
  consentContainer: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.text.light + '30',
  },
  consentCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  consentCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.text.light,
    marginRight: spacing.sm,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  consentTextContainer: {
    flex: 1,
  },
  consentText: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    fontWeight: '500',
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  consentSubtext: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    lineHeight: 16,
  },
});

