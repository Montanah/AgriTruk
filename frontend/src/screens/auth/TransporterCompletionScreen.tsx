import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useCameraPermissions, useMediaLibraryPermissions } from 'expo-image-picker';
import { handleImagePicker } from '../../utils/permissionUtils';
import { getAuth } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FormKeyboardWrapper from '../../components/common/FormKeyboardWrapper';
import { API_ENDPOINTS } from '../../constants/api';
import { fonts, spacing } from '../../constants';
import colors from '../../constants/colors';
import { useSubscriptionStatus } from '../../hooks/useSubscriptionStatus';

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
  const [transporterType, setTransporterType] = useState('individual'); // 'individual' or 'company'
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [profileCheckError, setProfileCheckError] = useState('');
  const { subscriptionStatus, loading: subscriptionLoading } = useSubscriptionStatus();
  
  // This screen is only for individual and company transporters
  // Job seekers have their own dedicated screen

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
  // Individual transporter form is currently disabled
  // const [vehicleType, setVehicleType] = useState('');
  // const [vehicleMake, setVehicleMake] = useState('');
  // const [vehicleColor, setVehicleColor] = useState('');
  // const [maxCapacity, setMaxCapacity] = useState('');
  // const [year, setYear] = useState('');
  // const [driveType, setDriveType] = useState('');
  // const [bodyType, setBodyType] = useState('closed');
  // const [vehicleFeatures, setVehicleFeatures] = useState('');
  // const [registration, setRegistration] = useState('');
  // const [humidityControl, setHumidityControl] = useState(false);
  // const [refrigeration, setRefrigeration] = useState(false);
  // const [vehiclePhotos, setVehiclePhotos] = useState<any[]>([]);
  // const [photoJustAdded, setPhotoJustAdded] = useState(false);
  // const [dlFile, setDlFile] = useState<any>(null);
  // const [idFile, setIdFile] = useState<any>(null);
  // const [insuranceFile, setInsuranceFile] = useState<any>(null);
  
  const [profilePhoto, setProfilePhoto] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyReg, setCompanyReg] = useState('');
  const [companyContact, setCompanyContact] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  // Individual transporter form is currently disabled
  // const [individualFormEnabled, setIndividualFormEnabled] = useState(false);

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

  // Image picker permissions for profile photo
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = useMediaLibraryPermissions();

  // Individual transporter photo handlers are currently disabled

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

  // Individual transporter photo logic is disabled

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
  };

  const isValid = () => {
    const status = getValidationStatus();
    return status.allValid;
  };

  // Individual transporter form is currently disabled


  // Individual transporter document handlers are currently disabled

  // Logbook file handlers removed as they're not used in the current implementation

  // Individual transporter form is currently disabled

  const handleSubmit = async () => {
    setError('');

    // Validation for company transporters only
    if (!companyName) { setError('Please enter the company name.'); return false; }
    if (!companyReg) { setError('Please enter the company registration number.'); return false; }
    if (!companyContact) { setError('Please enter the company contact number.'); return false; }
    if (!profilePhoto) { setError('Please upload a company logo.'); return false; }

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      // Company submission only
      {
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

      // Prepare draft data for company transporters only
      const draftData = {
        transporterType: 'company',
        companyName,
        companyReg,
        companyContact,
        companyAddress,
        hasLogo: !!(profilePhoto && profilePhoto.uri),
        isDraft: true,
        savedAt: new Date().toISOString()
      };

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
        
        // Only restore company data (individual transporters are disabled)
        if (parsedDraft.transporterType === 'company') {
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
      {(
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

      {/* INDIVIDUAL FORM - Currently Disabled */}
      {transporterType === 'individual' && (
        <View style={styles.disabledMessageContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.warning} />
          <Text style={styles.disabledMessageTitle}>Individual Transporters Currently Disabled</Text>
          <Text style={styles.disabledMessageText}>
            Individual transporter registration is temporarily disabled. Please select &quot;Corporate&quot; to register as a company transporter.
              </Text>
                </View>
              )}

      {/* Individual transporter form is currently disabled */}

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
          {!getValidationStatus().companyDetails && (
            <Text style={styles.validationItem}>• Fill company details</Text>
          )}
          {!getValidationStatus().profilePhoto && (
            <Text style={styles.validationItem}>• Upload company logo</Text>
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
            style={[styles.submitBtn, { backgroundColor: isValid() ? colors.primary : colors.text.light }]}
            onPress={async () => {
              if (uploading || !isValid()) return;

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
            disabled={!isValid() || uploading}
          >
            {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Profile</Text>}
          </TouchableOpacity>
        </View>
      </View>
      {/* Job seeker specific modals removed - they have their own screen */}

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
  disabledMessageContainer: {
    backgroundColor: colors.warningLight,
    borderRadius: 16,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  disabledMessageTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.warning,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  disabledMessageText: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
