import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { signOut } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { notificationService } from '../../services/notificationService';
import SubscriptionStatusCard from '../components/common/SubscriptionStatusCard';
import SubscriptionModal from '../components/TransporterService/SubscriptionModal';
import VehicleDetailsForm from '../components/VehicleDetailsForm';
import colors from '../constants/colors';
import { API_ENDPOINTS } from '../constants/api';
import { convertCoordinatesToPlaceName, getShortLocationName } from '../utils/locationUtils';
import { auth } from '../firebaseConfig';
import locationService from '../services/locationService';
import subscriptionService from '../services/subscriptionService';
import { apiRequest, uploadFile } from '../utils/api';

export default function ManageTransporterScreen({ route }: any) {
  const transporterType = route?.params?.transporterType || 'company';
  const navigation = useNavigation<any>();

  // Modal state and profile state for individual
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  const handlePayment = async () => {
    try {
      // Get available plans
      const plans = await subscriptionService.getSubscriptionPlans();
      if (plans.length === 0) {
        Alert.alert('No Plans Available', 'No subscription plans are currently available.');
        return;
      }

      // For now, use the first available plan
      const selectedPlan = plans[0];
      const result = await subscriptionService.upgradePlan(selectedPlan.id, 'mpesa');

      if (result.success) {
        Alert.alert('Success', 'Payment processed successfully!');
        // Refresh subscription status
        const status = await subscriptionService.getSubscriptionStatus();
        setSubscriptionStatus(status);
      } else {
        Alert.alert('Payment Failed', result.message || 'Failed to process payment.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    }
  };

  const handleSubscribe = (planData: any) => {
    // Navigate directly to PaymentScreen within the current stack
    navigation.navigate('PaymentScreen', {
      plan: planData,
      userType: 'transporter',
      billingPeriod: 'monthly',
      isUpgrade: true
    });
  };

  const handleActivateTrial = async () => {
    try {
      const result = await subscriptionService.activateTrial('transporter');
      if (result.success) {
        Alert.alert('Trial Activated!', 'Your free trial has been activated successfully.');
        // Refresh subscription status
        const status = await subscriptionService.getSubscriptionStatus();
        setSubscriptionStatus(status);
      } else {
        Alert.alert('Activation Failed', result.message || 'Failed to activate trial.');
      }
    } catch (error) {
      console.error('Trial activation error:', error);
      Alert.alert('Error', 'Failed to activate trial. Please try again.');
    }
  };

  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editProfilePhoto, setEditProfilePhoto] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  // Verification states for company transporter
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [acceptingBooking, setAcceptingBooking] = useState(false);
  const [updatingBookingStatus, setUpdatingBookingStatus] = useState(false);
  
  // Individual transporter states
  const [individualProfile, setIndividualProfile] = useState<any>(null);
  const [loadingIndividualProfile, setLoadingIndividualProfile] = useState(true);
  const [individualProfilePhoto, setIndividualProfilePhoto] = useState<any>(null);
  
  // Location tracking state
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [locationPermission, setLocationPermission] = useState<string | null>(null);
  const [locationHistory, setLocationHistory] = useState<any[]>([]);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<Date | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [locationSpeed, setLocationSpeed] = useState<number | null>(null);
  const [locationHeading, setLocationHeading] = useState<number | null>(null);
  const [locationAltitude, setLocationAltitude] = useState<number | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [locationNameLoading, setLocationNameLoading] = useState<boolean>(false);
  
  // Modal states
  const [insuranceModalVisible, setInsuranceModalVisible] = useState(false);
  const [licenseModalVisible, setLicenseModalVisible] = useState(false);
  const [photoGalleryModalVisible, setPhotoGalleryModalVisible] = useState(false);

  // Fetch drivers and vehicles data (only for company transporters)
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Only fetch drivers/vehicles for company transporters
        if (transporterType === 'company') {
          // Fetch drivers
          const driversData = await apiRequest('/transporters/drivers');
          setDrivers(driversData || []);

          // Fetch vehicles
          const vehiclesData = await apiRequest('/transporters/vehicles');
          setVehicles(vehiclesData || []);
        } else {
          // For individual transporters, set empty arrays
          setDrivers([]);
          setVehicles([]);
        }

      } catch (error) {
        console.error('Failed to fetch drivers/vehicles:', error);
        // Set empty arrays on error
        setDrivers([]);
        setVehicles([]);
      } finally {
        setLoadingDrivers(false);
        setLoadingVehicles(false);
      }
    };

    fetchData();
  }, [transporterType]);

  // Fetch subscription status
  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      try {
        setLoadingSubscription(true);
        const status = await subscriptionService.getSubscriptionStatus();
        setSubscriptionStatus(status);
      } catch (error) {
        console.error('Error fetching subscription status:', error);
      } finally {
        setLoadingSubscription(false);
      }
    };

    fetchSubscriptionStatus();
  }, []);

  // Fetch user profile for verification status
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { getAuth } = require('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        const token = await user.getIdToken();
        const response = await fetch(`${API_ENDPOINTS.AUTH}/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const userProfileData = data.userData || data;
          setUserProfile({
            ...userProfileData,
            emailVerified: userProfileData.emailVerified === true || userProfileData.isVerified === true,
            phoneVerified: userProfileData.phoneVerified === true,
            isVerified: userProfileData.isVerified === true || userProfileData.emailVerified === true,
          });
        } else {
          console.error('Failed to fetch user profile:', response.status, response.statusText);
          // Fallback to Firebase user data
          setUserProfile({
            name: user.displayName || user.email?.split('@')[0] || 'User',
            firstName: user.displayName || user.email?.split('@')[0] || 'User',
            profilePhotoUrl: user.photoURL || null,
            email: user.email,
            phoneNumber: user.phoneNumber,
            emailVerified: user.emailVerified === true,
            phoneVerified: false,
            isVerified: user.emailVerified === true,
            role: 'transporter',
            status: 'active'
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Fallback to Firebase user data on error
        const { getAuth } = require('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          setUserProfile({
            name: user.displayName || user.email?.split('@')[0] || 'User',
            firstName: user.displayName || user.email?.split('@')[0] || 'User',
            profilePhotoUrl: user.photoURL || null,
            email: user.email,
            phoneNumber: user.phoneNumber,
            emailVerified: user.emailVerified === true,
            phoneVerified: false,
            isVerified: user.emailVerified === true,
            role: 'transporter',
            status: 'active'
          });
        }
      }
    };

    fetchUserProfile();
  }, []);

  // Individual transporter profile fetch
  useEffect(() => {
    if (transporterType === 'individual') {
      const fetchProfile = async () => {
        try {
          const { getAuth } = require('firebase/auth');
          const auth = getAuth();
          const user = auth.currentUser;
          if (!user) return;
          const token = await user.getIdToken();
          
          // Fetch both transporter profile and user verification status
          const [transporterRes, userRes] = await Promise.all([
            fetch(`${API_ENDPOINTS.TRANSPORTERS}/${user.uid}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }),
            fetch(`${API_ENDPOINTS.AUTH}/profile`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            })
          ]);
          
          if (transporterRes.ok) {
            const transporterData = await transporterRes.json();
            setIndividualProfile(transporterData.transporter);
            setAcceptingBooking(transporterData.transporter?.acceptingBooking || false);
            if (transporterData.transporter?.driverProfileImage) {
              setIndividualProfilePhoto({ uri: transporterData.transporter.driverProfileImage });
            }
          }
          
          if (userRes.ok) {
            const userData = await userRes.json();
            const userProfileData = userData.userData || userData;
            setUserProfile({
              ...userProfileData,
              emailVerified: userProfileData.emailVerified === true || userProfileData.isVerified === true,
              phoneVerified: userProfileData.phoneVerified === true,
              isVerified: userProfileData.isVerified === true || userProfileData.emailVerified === true,
            });
          }
        } catch (error) {
          console.error('Error fetching individual transporter profile:', error);
        }
        setLoadingIndividualProfile(false);
      };
      fetchProfile();
    }
  }, [transporterType]);

  // Function to update location in backend
  const updateLocationInBackend = async (location: any) => {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.TRANSPORTERS}/update-location`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
        }),
      });

      if (response.ok) {
        console.log('Location updated in backend successfully');
        // Update the individual profile with the new location
        setIndividualProfile((prev: any) => ({
          ...prev,
          lastKnownLocation: {
            latitude: location.latitude,
            longitude: location.longitude,
            updatedAt: new Date().toISOString(),
          }
        }));
      } else {
        console.error('Failed to update location in backend:', response.status);
      }
    } catch (error) {
      console.error('Error updating location in backend:', error);
    }
  };

  // Location tracking setup
  useEffect(() => {
    if (transporterType === 'individual') {
      const setupLocationTracking = async () => {
          try {
            // Set up location update callback
            locationService.setLocationUpdateCallback(async (location) => {
              setCurrentLocation(location);
              
              // Update location in backend
              await updateLocationInBackend(location);
              
              // Convert coordinates to place name
              if (location.latitude && location.longitude) {
                setLocationNameLoading(true);
                try {
                  const placeName = await getShortLocationName({
                    latitude: location.latitude,
                    longitude: location.longitude
                  });
                  setLocationName(placeName);
                } catch (error) {
                  console.error('Error converting coordinates to place name:', error);
                  setLocationName(null);
                } finally {
                  setLocationNameLoading(false);
                }
              }
            });

          // Check if location tracking should be active
          // This would typically be based on transporter's online status
          // For now, we'll start tracking when the component mounts
          const isTracking = await locationService.startLocationTracking();
          setIsLocationTracking(isTracking);
        } catch (error) {
          console.error('Location tracking setup error:', error);
        }
      };

      setupLocationTracking();
    }
  }, [transporterType]);

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { getAuth } = require('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const res = await fetch(`${API_ENDPOINTS.TRANSPORTERS}/${user.uid}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (res.ok) {
          const data = await res.json();
          setEditName(data.transporter?.displayName || '');
          setEditPhone(data.transporter?.phoneNumber || '');
          if (data.transporter?.driverProfileImage) {
            setEditProfilePhoto({ uri: data.transporter.driverProfileImage });
          }
        } else if (res.status === 404) {
          // Profile doesn't exist yet, this is expected for new transporters
          // Transporter profile not found - user needs to complete profile setup
        }
      } catch (error) {
        console.error('Error fetching transporter profile:', error);
      }
      setLoadingProfile(false);
    };
    fetchProfile();
  }, []);

  const pickProfilePhoto = async () => {
    Alert.alert(
      'Select Photo',
      'Choose how you want to add your profile photo',
      [
        { text: 'Take Photo', onPress: () => pickProfilePhotoCamera() },
        { text: 'Choose from Gallery', onPress: () => pickProfilePhotoGallery() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const pickProfilePhotoCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Permission to access camera is required!');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        // No aspect ratio constraint - allows flexible cropping for profile photos
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].uri) {
        const asset = result.assets[0];
        setEditProfilePhoto(asset);
        
        // Upload the photo
        try {
          setLoadingProfile(true);
          const user = auth.currentUser;
          if (user) {
            const uploadedUrl = await uploadFile(asset.uri, 'profile', user.uid);
            setEditProfilePhoto({ ...asset, uri: uploadedUrl });
            Alert.alert('Success', 'Profile photo updated successfully');
          }
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
          Alert.alert('Upload Error', 'Failed to upload profile photo. Please try again.');
        } finally {
          setLoadingProfile(false);
        }
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickProfilePhotoGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Permission to access media library is required!');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        // No aspect ratio constraint - allows flexible cropping for profile photos
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].uri) {
        const asset = result.assets[0];
        setEditProfilePhoto(asset);
        
        // Upload the photo
        try {
          setLoadingProfile(true);
          const user = auth.currentUser;
          if (user) {
            const uploadedUrl = await uploadFile(asset.uri, 'profile', user.uid);
            setEditProfilePhoto({ ...asset, uri: uploadedUrl });
            Alert.alert('Success', 'Profile photo updated successfully');
          }
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
          Alert.alert('Upload Error', 'Failed to upload profile photo. Please try again.');
        } finally {
          setLoadingProfile(false);
        }
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  // Updated logout handler: use common logout function
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              // After sign out, App.tsx auth listener will render the Welcome flow.
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Logout Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (editPassword) {
      try {
        if (auth.currentUser) {
          await auth.currentUser.updatePassword(editPassword);
        }
      } catch (err: any) {
        Alert.alert('Password Change Error', err.message || 'Failed to change password.');
        return;
      }
    }
    setEditModal(false);
    setEditPassword('');
  };

  // Vehicles and Drivers state
  const [vehicleSearch, setVehicleSearch] = useState('');

  // Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignModalVehicleIdx, setAssignModalVehicleIdx] = useState<number | null>(null);
  const [driverSearch, setDriverSearch] = useState('');

  // Recruit Driver modal state and fields
  const [recruitModal, setRecruitModal] = useState(false);
  const [recruitName, setRecruitName] = useState('');
  const [recruitEmail, setRecruitEmail] = useState('');
  const [recruitPhone, setRecruitPhone] = useState('');
  const [recruitPhoto, setRecruitPhoto] = useState<any>(null);
  const [recruitIdDoc, setRecruitIdDoc] = useState<any>(null);
  const [recruitLicense, setRecruitLicense] = useState<any>(null);

  // Recruit driver logic
  const openRecruitDriver = () => {
    setRecruitName('');
    setRecruitEmail('');
    setRecruitPhone('');
    setRecruitPhoto(null);
    setRecruitIdDoc(null);
    setRecruitLicense(null);
    setRecruitModal(true);
  };
  const handleRecruitDriver = () => {
    if (!recruitName || !recruitEmail || !recruitPhone || !recruitPhoto || !recruitIdDoc || !recruitLicense) {
      Alert.alert('Missing Info', 'Please fill all required fields.');
      return;
    }
    const driver = {
      id: Date.now().toString(),
      name: recruitName,
      email: recruitEmail,
      phone: recruitPhone,
      photo: recruitPhoto,
      idDoc: recruitIdDoc,
      license: recruitLicense,
    };
    setDrivers([...drivers, driver]);
    setRecruitModal(false);
    // Trigger notifications for driver recruitment
    notificationService.sendEmail(
      driver.email,
      'Welcome to TRUKAPP',
      `Hi ${driver.name}, you have been recruited as a driver. Please await vehicle assignment and further instructions.`,
      'driver',
      'driver_recruited',
      { driver }
    );
    notificationService.sendSMS(
      driver.phone,
      `Welcome to TRUKAPP, ${driver.name}! You have been recruited as a driver.`,
      'driver',
      'driver_recruited',
      { driver }
    );
    notificationService.sendInApp(
      driver.id,
      'You have been recruited as a driver. Please await vehicle assignment.',
      'driver',
      'driver_recruited',
      { driver }
    );
  };

  // Modularized image/file pickers for recruitment
  const pickDriverPhoto = async (setFn: (value: any) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 });
    if (!result.canceled && result.assets && result.assets[0].uri) setFn(result.assets[0]);
  };
  const pickDriverIdDoc = async (setFn: (value: any) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, allowsEditing: true, quality: 0.7 });
    if (!result.canceled && result.assets && result.assets[0].uri) setFn(result.assets[0]);
  };
  const pickDriverLicense = async (setFn: (value: any) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, allowsEditing: true, quality: 0.7 });
    if (!result.canceled && result.assets && result.assets[0].uri) setFn(result.assets[0]);
  };

  // Vehicle modal state and fields
  const [vehicleModal, setVehicleModal] = useState(false);
  const [vehicleEditIdx, setVehicleEditIdx] = useState<number | null>(null);
  const VEHICLE_TYPES = [
    {
      label: 'Truck',
      value: 'truck',
      icon: (active: boolean) => (
        <MaterialCommunityIcons name="truck" size={26} color={active ? colors.primary : colors.text.secondary} />
      ),
    },
    {
      label: 'Tractor',
      value: 'tractor',
      icon: (active: boolean) => (
        <FontAwesome5 name="tractor" size={26} color={active ? colors.primary : colors.text.secondary} />
      ),
    },
    {
      label: 'Trailer',
      value: 'trailer',
      icon: (active: boolean) => (
        <MaterialCommunityIcons name="truck-trailer" size={26} color={active ? colors.primary : colors.text.secondary} />
      ),
    },
    {
      label: 'Tanker',
      value: 'tanker',
      icon: (active: boolean) => (
        <MaterialCommunityIcons name="truck-cargo-container" size={26} color={active ? colors.primary : colors.text.secondary} />
      ),
    },
    {
      label: 'Flatbed',
      value: 'flatbed',
      icon: (active: boolean) => (
        <MaterialCommunityIcons name="truck-flatbed" size={26} color={active ? colors.primary : colors.text.secondary} />
      ),
    },
    {
      label: 'Van',
      value: 'van',
      icon: (active: boolean) => (
        <MaterialCommunityIcons name="van-utility" size={26} color={active ? colors.primary : colors.text.secondary} />
      ),
    },
    {
      label: 'Pickup',
      value: 'pickup',
      icon: (active: boolean) => (
        <MaterialCommunityIcons name="car-pickup" size={26} color={active ? colors.primary : colors.text.secondary} />
      ),
    },
    {
      label: 'Refrigerated Truck',
      value: 'refrigerated_truck',
      icon: (active: boolean) => (
        <MaterialCommunityIcons name="snowflake" size={26} color={active ? colors.primary : colors.text.secondary} />
      ),
    },
    {
      label: 'Other',
      value: 'other',
      icon: (active: boolean) => (
        <Ionicons name="car-outline" size={26} color={active ? colors.primary : colors.text.secondary} />
      ),
    },
  ];
  const [vehicleType, setVehicleType] = useState('');
  const [showVehicleTypeDropdown, setShowVehicleTypeDropdown] = useState(false);
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleCapacity, setVehicleCapacity] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleDriveType, setVehicleDriveType] = useState('');
  const [bodyType, setBodyType] = useState('closed'); // 'closed' or 'open'
  const [vehicleReg, setVehicleReg] = useState('');
  const [refrigeration, setRefrigeration] = useState(false);
  const [humidityControl, setHumidityControl] = useState(false);
  const [specialCargo, setSpecialCargo] = useState(false);
  const [vehicleFeatures, setVehicleFeatures] = useState('');
  const [insurance, setInsurance] = useState<any>(null);
  const [vehiclePhotos, setVehiclePhotos] = useState<any[]>([]);
  const [assignedDriverId, setAssignedDriverId] = useState<string | null>(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // Robust photo add handler (always uses latest state)
  const pickVehiclePhotos = async () => {
    if (vehiclePhotos.length >= 5) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 });
    if (!result.canceled && result.assets && result.assets[0].uri) {
      setVehiclePhotos(prev => [...prev, result.assets[0]]);
    }
  };
  // Robust photo remove handler
  const removeVehiclePhoto = (idx: number) => {
    setVehiclePhotos(prev => prev.filter((_, i) => i !== idx));
  };

  // Driver modal state and fields
  const [driverModal, setDriverModal] = useState(false);
  const [driverEditIdx, setDriverEditIdx] = useState<number | null>(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverPhoto, setDriverPhoto] = useState<any>(null);
  const [driverLicense, setDriverLicense] = useState<any>(null);

  // Image/file pickers (handled above as modularized functions)
  const pickInsurance = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, allowsEditing: true, quality: 0.7 });
    if (!result.canceled && result.assets && result.assets[0].uri) setInsurance(result.assets[0]);
  };

  // Vehicle add/edit logic
  const openAddVehicle = () => {
    setVehicleEditIdx(null);
    setVehicleType(''); setVehicleReg(''); setRefrigeration(false); setHumidityControl(false); setSpecialCargo(false); setVehicleFeatures(''); setInsurance(null); setVehiclePhotos([]); setAssignedDriverId(null);
    setVehicleModal(true);
  };
  const openEditVehicle = (idx: number) => {
    const v = vehicles[idx];
    setVehicleEditIdx(idx);
    setVehicleType(v.type); setVehicleReg(v.reg); setRefrigeration(v.refrigeration); setHumidityControl(v.humidityControl); setSpecialCargo(v.specialCargo); setVehicleFeatures(v.features); setInsurance(v.insurance); setVehiclePhotos(v.photos); setAssignedDriverId(v.assignedDriverId || null);
    setVehicleModal(true);
  };
  const handleSaveVehicle = () => {
    if (!vehicleType || !vehicleReg || !insurance || vehiclePhotos.length < 3) {
      Alert.alert('Missing Info', 'Please fill all required fields and upload at least 3 photos.');
      return;
    }
    const vehicle = {
      id: vehicleEditIdx !== null ? vehicles[vehicleEditIdx].id : Date.now().toString(),
      type: vehicleType,
      reg: vehicleReg,
      bodyType,
      refrigeration,
      humidityControl,
      specialCargo,
      features: vehicleFeatures,
      insurance,
      photos: vehiclePhotos,
      assignedDriverId,
    };
    let updated;
    if (vehicleEditIdx !== null) {
      updated = [...vehicles];
      updated[vehicleEditIdx] = vehicle;
    } else {
      updated = [...vehicles, vehicle];
    }
    setVehicles(updated);
    setVehicleModal(false);
    // If editing, notify the assigned driver (if changed)
    const assignedDriver = vehicle.assignedDriverId && drivers.find(d => d.id === vehicle.assignedDriverId);
    if (assignedDriver) {
      notificationService.sendEmail(
        assignedDriver.email,
        'Vehicle Assignment',
        `Hi ${assignedDriver.name}, you have been assigned vehicle ${vehicle.reg} (${vehicle.type}).`,
        'driver',
        'vehicle_assigned',
        { vehicle, driver: assignedDriver }
      );
      notificationService.sendSMS(
        assignedDriver.phone,
        `You have been assigned vehicle ${vehicle.reg} (${vehicle.type}).`,
        'driver',
        'vehicle_assigned',
        { vehicle, driver: assignedDriver }
      );
      notificationService.sendInApp(
        assignedDriver.id,
        `You have been assigned vehicle ${vehicle.reg} (${vehicle.type}).`,
        'driver',
        'vehicle_assigned',
        { vehicle, driver: assignedDriver }
      );
    }
  };
  const handleRemoveVehicle = (idx: number) => {
    setVehicles(vehicles.filter((_, i) => i !== idx));
  };

  // Driver add/edit logic
  const openAddDriver = () => {
    setDriverEditIdx(null);
    setDriverName(''); setDriverPhone(''); setDriverPhoto(null); setDriverLicense(null);
    setDriverModal(true);
  };
  const openEditDriver = (idx: number) => {
    const d = drivers[idx];
    setDriverEditIdx(idx);
    setDriverName(d.name); setDriverPhone(d.phone); setDriverPhoto(d.photo); setDriverLicense(d.license);
    setDriverModal(true);
  };
  const handleSaveDriver = () => {
    if (!driverName || !driverPhoto || !driverLicense) {
      Alert.alert('Missing Info', 'Please provide name, profile photo, and license.');
      return;
    }
    const driver = {
      id: driverEditIdx !== null ? drivers[driverEditIdx].id : Date.now().toString(),
      name: driverName,
      phone: driverPhone,
      photo: driverPhoto,
      license: driverLicense,
    };
    let updated;
    if (driverEditIdx !== null) {
      updated = [...drivers];
      updated[driverEditIdx] = driver;
    } else {
      updated = [...drivers, driver];
    }
    setDrivers(updated);
    setDriverModal(false);
  };
  const handleRemoveDriver = (idx: number) => {
    setDrivers(drivers.filter((_, i) => i !== idx));
    setVehicles(vehicles.map(v => v.assignedDriverId === drivers[idx].id ? { ...v, assignedDriverId: null } : v));
  };

  // Verification functions for company transporter
  const handleVerifyEmail = async () => {
    if (!auth.currentUser?.email) {
      Alert.alert('Error', 'No email address found.');
      return;
    }
    try {
      setVerifyingEmail(true);

      // Use backend API for email verification - same pattern as EmailVerificationScreen
      await apiRequest('/auth', {
        method: 'POST',
        body: JSON.stringify({
          action: 'resend-email-code',
          email: auth.currentUser.email
        }),
      });

      Alert.alert(
        'Verification Email Sent',
        'Please check your email for the verification code. You can then use your email to log in.',
        [
          { text: 'OK' },
          {
            text: 'Go to Verification',
            onPress: () => navigation.navigate('EmailVerification')
          }
        ]
      );
    } catch (e: any) {
      console.error('Email verification error:', e);
      Alert.alert(
        'Verification Failed',
        e.message || 'Unable to send verification email. Please check your internet connection and try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!editPhone) {
      Alert.alert('Error', 'No phone number found.');
      return;
    }
    try {
      setVerifyingPhone(true);

      // Use backend API for phone verification - same pattern as auth flow
      await apiRequest('/auth', {
        method: 'POST',
        body: JSON.stringify({
          action: 'resend-phone-code',
          phoneNumber: editPhone
        }),
      });

      Alert.alert(
        'Verification SMS Sent',
        'Please check your phone for the verification code. You can then use your phone to log in.',
        [
          { text: 'OK' },
          {
            text: 'Go to Verification',
            onPress: () => navigation.navigate('PhoneOTPScreen')
          }
        ]
      );
    } catch (e: any) {
      console.error('Phone verification error:', e);
      Alert.alert(
        'Verification Failed',
        e.message || 'Unable to send verification SMS. Please check your internet connection and try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setVerifyingPhone(false);
    }
  };

  // Availability toggle functionality for company transporter
  const updateAcceptingBookingStatus = async (newStatus: boolean) => {
    try {
      setUpdatingBookingStatus(true);
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.TRANSPORTERS}/${user.uid}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          acceptingBooking: newStatus,
        }),
      });

      if (response.ok) {
        setAcceptingBooking(newStatus);
        Alert.alert(
          'Status Updated',
          `You are now ${newStatus ? 'accepting' : 'not accepting'} new booking requests.`
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update booking status');
      }
    } catch (error: any) {
      console.error('Error updating booking status:', error);
      Alert.alert('Error', error.message || 'Failed to update booking status. Please try again.');
    } finally {
      setUpdatingBookingStatus(false);
    }
  };

  const assignDriverToVehicle = (vehicleIdx: number, driverId: string) => {
    setVehicles(vehicles.map((v, i) => i === vehicleIdx ? { ...v, assignedDriverId: driverId } : v));
  };

  if (transporterType === 'company') {
    return (
      <>
        <ScrollView style={styles.bg} contentContainerStyle={[styles.container, { paddingTop: 32, paddingBottom: 100 }]}>
          <Text style={styles.title}>Manage Vehicles, Drivers, Assignments</Text>
          {/* Profile Section */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setEditModal(true)}>
              <MaterialCommunityIcons name="account-edit" size={20} color={colors.secondary} />
              <Text style={styles.actionText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ alignItems: 'center', marginBottom: 8 }} onPress={pickProfilePhoto} activeOpacity={0.7}>
              {editProfilePhoto ? (
                <Image source={{ uri: editProfilePhoto.uri }} style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.background }} />
              ) : loadingProfile ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : (
                <MaterialCommunityIcons name="account-circle" size={80} color={colors.primary} />
              )}
              <Text style={{ color: colors.primary, marginTop: 6, textAlign: 'center' }}>Upload Profile Photo</Text>
            </TouchableOpacity>
            <Text style={styles.value}>Name: {editName}</Text>
            <Text style={styles.value}>Phone: {editPhone}</Text>
            
            {/* Accepting Requests Toggle for Company */}
            <View style={styles.toggleContainer}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Accepting New Requests</Text>
                <Text style={styles.toggleDescription}>
                  {acceptingBooking 
                    ? 'You are currently accepting new booking requests' 
                    : 'You are not accepting new booking requests'
                  }
                </Text>
              </View>
              <Switch
                value={acceptingBooking}
                onValueChange={updateAcceptingBookingStatus}
                disabled={updatingBookingStatus}
                trackColor={{ false: colors.text.light, true: colors.primary + '40' }}
                thumbColor={acceptingBooking ? colors.primary : colors.text.light}
                ios_backgroundColor={colors.text.light}
              />
            </View>
            
            <TouchableOpacity style={[styles.actionBtn, { marginTop: 10 }]} onPress={handleLogout}>
              <MaterialCommunityIcons name="logout" size={20} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>Logout</Text>
            </TouchableOpacity>
          </View>

          {/* Contact Verification Section */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Contact Verification</Text>
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: colors.text.primary, fontSize: 16, fontWeight: '600' }}>Email</Text>
                <View style={[
                  styles.verificationBadge,
                  userProfile?.emailVerified ? styles.verifiedBadge : styles.unverifiedBadge
                ]}>
                  <MaterialCommunityIcons
                    name={userProfile?.emailVerified ? "check-circle" : "close-circle"}
                    size={12}
                    color={userProfile?.emailVerified ? colors.success : colors.error}
                  />
                  <Text style={[
                    styles.verificationBadgeText,
                    userProfile?.emailVerified ? styles.verifiedText : styles.unverifiedText
                  ]}>
                    {userProfile?.emailVerified ? 'Verified' : 'Unverified'}
                  </Text>
                </View>
              </View>
              <Text style={{ color: colors.text.secondary, fontSize: 14, marginBottom: 8 }}>
                {userProfile?.email || 'No email set'}
              </Text>
              <TouchableOpacity
                style={styles.verifyButton}
                onPress={handleVerifyEmail}
                disabled={verifyingEmail}
              >
                {verifyingEmail ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify Email</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: colors.text.primary, fontSize: 16, fontWeight: '600' }}>Phone</Text>
                <View style={[
                  styles.verificationBadge,
                  userProfile?.phoneVerified ? styles.verifiedBadge : styles.unverifiedBadge
                ]}>
                  <MaterialCommunityIcons
                    name={userProfile?.phoneVerified ? "check-circle" : "close-circle"}
                    size={12}
                    color={userProfile?.phoneVerified ? colors.success : colors.error}
                  />
                  <Text style={[
                    styles.verificationBadgeText,
                    userProfile?.phoneVerified ? styles.verifiedText : styles.unverifiedText
                  ]}>
                    {userProfile?.phoneVerified ? 'Verified' : 'Unverified'}
                  </Text>
                </View>
              </View>
              <Text style={{ color: colors.text.secondary, fontSize: 14, marginBottom: 8 }}>
                {userProfile?.phone || editPhone || 'No phone set'}
              </Text>
              <TouchableOpacity
                style={styles.verifyButton}
                onPress={handleVerifyPhone}
                disabled={verifyingPhone}
              >
                {verifyingPhone ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify Phone</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          {/* Vehicles List */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Vehicles</Text>
            <TouchableOpacity style={styles.actionBtn} onPress={openAddVehicle}>
              <Ionicons name="add-circle" size={20} color={colors.primary} />
              <Text style={styles.actionText}>Add Vehicle</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Search vehicles..."
              value={vehicleSearch}
              onChangeText={setVehicleSearch}
            />
            {vehicles.length === 0 ? (
              <Text style={styles.value}>No vehicles added.</Text>
            ) : (
              vehicles.filter(item => {
                const assignedDriver = drivers.find(d => d.id === item.assignedDriverId);
                return (
                  item.reg.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
                  item.type.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
                  (assignedDriver && assignedDriver.name.toLowerCase().includes(vehicleSearch.toLowerCase()))
                );
              }).map((item, index) => (
                <View style={styles.vehicleListItem} key={item.id}>
                  <Text style={styles.value}>{item.reg} ({item.type})</Text>
                  <Text style={styles.value}>Assigned Driver: {item.assignedDriverId ? (drivers.find(d => d.id === item.assignedDriverId)?.name || 'Unknown') : 'None'}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 4 }}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEditVehicle(index)}>
                      <Ionicons name="create-outline" size={18} color={colors.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveVehicle(index)}>
                      <Ionicons name="trash" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ marginTop: 6 }}>
                    <TouchableOpacity style={[styles.driverAssignBtn, { minWidth: 180, justifyContent: 'center' }]} onPress={() => { setAssignModalVehicleIdx(index); setShowAssignModal(true); }}>
                      <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
                      <Text style={{ color: colors.primary, marginLeft: 8, fontWeight: 'bold' }}>Assign Driver</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
          {/* Assign Driver Modal */}
          <Modal
            visible={showAssignModal}
            animationType="slide"
            transparent
            onRequestClose={() => setShowAssignModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.vehicleModalCard}>
                <Text style={styles.editTitle}>Assign Driver</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Search drivers by name, email, or phone"
                  value={driverSearch}
                  onChangeText={setDriverSearch}
                />
                <ScrollView style={{ maxHeight: 320, width: '100%' }}>
                  {drivers.filter(d =>
                    d.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
                    d.email.toLowerCase().includes(driverSearch.toLowerCase()) ||
                    d.phone.toLowerCase().includes(driverSearch.toLowerCase())
                  ).map((d) => (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.driverAssignBtn, assignModalVehicleIdx !== null && vehicles[assignModalVehicleIdx]?.assignedDriverId === d.id && styles.driverAssignBtnActive, { flexDirection: 'row', alignItems: 'center', marginBottom: 8 }]}
                      onPress={() => {
                        if (assignModalVehicleIdx !== null) {
                          assignDriverToVehicle(assignModalVehicleIdx, d.id);
                        }
                        setShowAssignModal(false);
                      }}
                    >
                      <Image source={{ uri: d.photo?.uri }} style={styles.driverAssignPhoto} />
                      <View style={{ marginLeft: 8, flex: 1 }}>
                        <Text style={styles.driverAssignName}>Name: {d.name}</Text>
                        <Text style={styles.driverAssignName}>Contact: {d.phone}</Text>
                        <Text style={styles.driverAssignName}>Email: {d.email}</Text>
                        <Text style={styles.driverAssignName}>ID: {d.id}</Text>
                      </View>
                      {assignModalVehicleIdx !== null && vehicles[assignModalVehicleIdx]?.assignedDriverId === d.id && (
                        <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={{ marginLeft: 8 }} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={styles.editActionsRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAssignModal(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          {/* Add/Edit Vehicle Modal */}
          <Modal
            visible={vehicleModal}
            animationType="slide"
            transparent
            onRequestClose={() => setVehicleModal(false)}
          >
            <View style={styles.modalOverlay}>
              <ScrollView style={{ width: '100%' }} contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}>
                <View style={styles.vehicleModalCard}>
                  <Text style={styles.editTitle}>{vehicleEditIdx !== null ? 'Edit Vehicle' : 'Add Vehicle'}</Text>
                  {/* Vehicle Details Form (Reusable) */}
                  <VehicleDetailsForm
                    initial={{}}
                    onChange={() => { }}
                    onPhotoAdd={pickVehiclePhotos}
                    onPhotoRemove={removeVehiclePhoto}
                    vehiclePhotos={vehiclePhotos}
                    error={undefined}
                  />
                  <TextInput style={styles.input} placeholder="Registration Number *" value={vehicleReg} onChangeText={setVehicleReg} />
                  <View style={styles.featuresRow}>
                    <TouchableOpacity style={[styles.featureBtn, refrigeration && styles.featureBtnActive]} onPress={() => setRefrigeration(!refrigeration)}>
                      <MaterialCommunityIcons name="snowflake" size={18} color={refrigeration ? colors.white : colors.primary} />
                      <Text style={[styles.featureText, refrigeration && { color: colors.white }]}>Refrigeration</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.featureBtn, humidityControl && styles.featureBtnActive]} onPress={() => setHumidityControl(!humidityControl)}>
                      <MaterialCommunityIcons name="water-percent" size={18} color={humidityControl ? colors.white : colors.primary} />
                      <Text style={[styles.featureText, humidityControl && { color: colors.white }]}>Humidity Control</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.featureBtn, specialCargo && styles.featureBtnActive]} onPress={() => setSpecialCargo(!specialCargo)}>
                      <MaterialCommunityIcons name="cube-outline" size={18} color={specialCargo ? colors.white : colors.primary} />
                      <Text style={[styles.featureText, specialCargo && { color: colors.white }]}>Special Cargo</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput style={styles.input} placeholder="Other Features (comma separated)" value={vehicleFeatures} onChangeText={setVehicleFeatures} />
                  <View style={styles.section}>
                    <Text style={styles.editLabel}>Insurance Document (PDF or Image) *</Text>
                    <TouchableOpacity style={styles.uploadBtn} onPress={pickInsurance}>
                      <MaterialCommunityIcons name="file-upload-outline" size={22} color={colors.primary} />
                      <Text style={styles.uploadBtnText}>{insurance ? 'Change File' : 'Upload File'}</Text>
                    </TouchableOpacity>
                    {insurance && <Text style={styles.fileName}>{insurance.fileName || insurance.uri?.split('/').pop()}</Text>}
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.editLabel}>Vehicle Photos (3-5) *</Text>
                    <View style={styles.photosRow}>
                      {vehiclePhotos.map((photo, idx) => (
                        <View key={idx} style={styles.photoWrap}>
                          <Image source={{ uri: photo.uri }} style={styles.photo} />
                          <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removeVehiclePhoto(idx)}>
                            <Ionicons name="close-circle" size={20} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      ))}
                      {vehiclePhotos.length < 5 && (
                        <TouchableOpacity style={styles.addPhotoBtn} onPress={pickVehiclePhotos}>
                          <Ionicons name="add" size={28} color={colors.primary} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.photoHint}>Add at least 3 photos</Text>
                  </View>
                  <View style={styles.editActionsRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setVehicleModal(false)}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSaveVehicle}>
                      <Text style={styles.saveText}>{vehicleEditIdx !== null ? 'Save Changes' : 'Add Vehicle'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </Modal>
          {/* Drivers List */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Drivers</Text>
            <TouchableOpacity style={styles.actionBtn} onPress={openRecruitDriver}>
              <Ionicons name="add-circle" size={20} color={colors.primary} />
              <Text style={styles.actionText}>Recruit Driver</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Search drivers..."
              value={driverSearch}
              onChangeText={setDriverSearch}
            />
            {drivers.length === 0 ? (
              <Text style={styles.value}>No drivers added.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 340 }}>
                {drivers.filter(item =>
                  item.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
                  item.email.toLowerCase().includes(driverSearch.toLowerCase()) ||
                  item.phone.toLowerCase().includes(driverSearch.toLowerCase())
                ).map((item, index) => (
                  <View style={styles.driverListItem} key={item.id}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Image source={{ uri: item.photo?.uri }} style={styles.driverPhoto} />
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={styles.value}>{item.name}</Text>
                        <Text style={styles.value}>{item.email}</Text>
                        <Text style={styles.value}>{item.phone}</Text>
                      </View>
                      <TouchableOpacity style={styles.editBtn} onPress={() => openEditDriver(index)}>
                        <Ionicons name="create-outline" size={18} color={colors.secondary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveDriver(index)}>
                        <Ionicons name="trash" size={18} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
          {/* Recruit Driver Modal */}
          <Modal
            visible={recruitModal}
            animationType="slide"
            transparent
            onRequestClose={() => setRecruitModal(false)}
          >
            <View style={styles.modalOverlay}>
              <ScrollView style={{ width: '100%' }} contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}>
                <View style={styles.vehicleModalCard}>
                  <Text style={styles.editTitle}>Recruit Driver</Text>
                  <TouchableOpacity style={{ alignSelf: 'center', marginBottom: 16 }} onPress={() => pickDriverPhoto(setRecruitPhoto)}>
                    {recruitPhoto ? (
                      <Image source={{ uri: recruitPhoto.uri }} style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.background }} />
                    ) : (
                      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="person-circle-outline" size={60} color={colors.text.light} />
                      </View>
                    )}
                    <Text style={{ color: colors.primary, marginTop: 6, textAlign: 'center' }}>Upload Profile Photo *</Text>
                  </TouchableOpacity>
                  <TextInput style={styles.input} placeholder="Driver Name *" value={recruitName} onChangeText={setRecruitName} />
                  <TextInput style={styles.input} placeholder="Email *" value={recruitEmail} onChangeText={setRecruitEmail} keyboardType="email-address" />
                  <TextInput style={styles.input} placeholder="Phone *" value={recruitPhone} onChangeText={setRecruitPhone} keyboardType="phone-pad" />
                  <View style={styles.section}>
                    <Text style={styles.editLabel}>ID Document (PDF or Image) *</Text>
                    <TouchableOpacity style={styles.uploadBtn} onPress={() => pickDriverIdDoc(setRecruitIdDoc)}>
                      <MaterialCommunityIcons name="file-upload-outline" size={22} color={colors.primary} />
                      <Text style={styles.uploadBtnText}>{recruitIdDoc ? 'Change File' : 'Upload File'}</Text>
                    </TouchableOpacity>
                    {recruitIdDoc && <Text style={styles.fileName}>{recruitIdDoc.fileName || recruitIdDoc.uri?.split('/').pop()}</Text>}
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.editLabel}>Driver&apos;s License (PDF or Image) *</Text>
                    <TouchableOpacity style={styles.uploadBtn} onPress={() => pickDriverLicense(setRecruitLicense)}>
                      <MaterialCommunityIcons name="file-upload-outline" size={22} color={colors.primary} />
                      <Text style={styles.uploadBtnText}>{recruitLicense ? 'Change File' : 'Upload File'}</Text>
                    </TouchableOpacity>
                    {recruitLicense && <Text style={styles.fileName}>{recruitLicense.fileName || recruitLicense.uri?.split('/').pop()}</Text>}
                  </View>
                  <View style={styles.editActionsRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setRecruitModal(false)}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleRecruitDriver}>
                      <Text style={styles.saveText}>Recruit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </Modal>
          {/* Add/Edit Driver Modal */}
          <Modal
            visible={driverModal}
            animationType="slide"
            transparent
            onRequestClose={() => setDriverModal(false)}
          >
            <View style={styles.modalOverlay}>
              <ScrollView style={{ width: '100%' }} contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}>
                <View style={styles.vehicleModalCard}>
                  <Text style={styles.editTitle}>{driverEditIdx !== null ? 'Edit Driver' : 'Add Driver'}</Text>
                  <TouchableOpacity style={{ alignSelf: 'center', marginBottom: 16 }} onPress={() => pickDriverPhoto(setDriverPhoto)}>
                    {driverPhoto ? (
                      <Image source={{ uri: driverPhoto.uri }} style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.background }} />
                    ) : (
                      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="person-circle-outline" size={60} color={colors.text.light} />
                      </View>
                    )}
                    <Text style={{ color: colors.primary, marginTop: 6, textAlign: 'center' }}>Upload Profile Photo *</Text>
                  </TouchableOpacity>
                  <TextInput style={styles.input} placeholder="Driver Name *" value={driverName} onChangeText={setDriverName} />
                  <TextInput style={styles.input} placeholder="Phone Number" value={driverPhone} onChangeText={setDriverPhone} />
                  <View style={styles.section}>
                    <Text style={styles.editLabel}>License Document (PDF or Image) *</Text>
                    <TouchableOpacity style={styles.uploadBtn} onPress={() => pickDriverLicense(setDriverLicense)}>
                      <MaterialCommunityIcons name="file-upload-outline" size={22} color={colors.primary} />
                      <Text style={styles.uploadBtnText}>{driverLicense ? 'Change File' : 'Upload File'}</Text>
                    </TouchableOpacity>
                    {driverLicense && <Text style={styles.fileName}>{driverLicense.fileName || driverLicense.uri?.split('/').pop()}</Text>}
                  </View>
                  <View style={styles.editActionsRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setDriverModal(false)}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSaveDriver}>
                      <Text style={styles.saveText}>{driverEditIdx !== null ? 'Save Changes' : 'Add Driver'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </Modal>
        </ScrollView>
        {/* Edit Profile Modal (always rendered) */}
        <Modal
          visible={editModal}
          animationType="slide"
          transparent
          onRequestClose={() => setEditModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.editModalCard}>
              <Text style={styles.editTitle}>Edit Profile</Text>
              <TouchableOpacity style={{ alignSelf: 'center', marginBottom: 16 }} onPress={pickProfilePhoto} activeOpacity={0.7}>
                {editProfilePhoto ? (
                  <Image source={{ uri: editProfilePhoto.uri }} style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.background }} />
                ) : (
                  <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="person-circle-outline" size={60} color={colors.text.light} />
                  </View>
                )}
                <Text style={{ color: colors.primary, marginTop: 6, textAlign: 'center' }}>Upload Profile Photo</Text>
              </TouchableOpacity>
              <View style={styles.editFieldWrap}>
                <Text style={styles.editLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Full Name"
                />
              </View>
              <View style={styles.editDivider} />
              <View style={styles.editFieldWrap}>
                <Text style={styles.editLabel}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Phone"
                />
              </View>
              <View style={styles.editDivider} />
              <View style={styles.editFieldWrap}>
                <Text style={styles.editLabel}>Change Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="New Password"
                  secureTextEntry
                  value={editPassword}
                  onChangeText={setEditPassword}
                />
              </View>
              <View style={styles.editActionsRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  } else {
    // Individual transporter: fetch and show real profile
  // Add: image picker for individual profile
  const pickIndividualProfilePhoto = async () => {
    Alert.alert(
      'Select Photo',
      'Choose how you want to add your profile photo',
      [
        { text: 'Take Photo', onPress: () => pickIndividualProfilePhotoCamera() },
        { text: 'Choose from Gallery', onPress: () => pickIndividualProfilePhotoGallery() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const pickIndividualProfilePhotoCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Permission to access camera is required!');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].uri) {
        setIndividualProfilePhoto({ uri: result.assets[0].uri });
        // Optionally: upload to backend here
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickIndividualProfilePhotoGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Permission to access media library is required!');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].uri) {
        setIndividualProfilePhoto({ uri: result.assets[0].uri });
        // Optionally: upload to backend here
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

    
    // Verification functions
    const handleVerifyEmail = async () => {
      if (!auth.currentUser?.email) {
        Alert.alert('Error', 'No email address found.');
        return;
      }
      try {
        setVerifyingEmail(true);

        // Use backend API for email verification - same pattern as EmailVerificationScreen
        await apiRequest('/auth', {
          method: 'POST',
          body: JSON.stringify({
            action: 'resend-email-code',
            email: auth.currentUser.email
          }),
        });

        Alert.alert(
          'Verification Email Sent',
          'Please check your email for the verification code. You can then use your email to log in.',
          [
            { text: 'OK' },
            {
              text: 'Go to Verification',
              onPress: () => navigation.navigate('EmailVerification')
            }
          ]
        );
      } catch (e: any) {
        console.error('Email verification error:', e);
        Alert.alert(
          'Verification Failed',
          e.message || 'Unable to send verification email. Please check your internet connection and try again later.',
          [{ text: 'OK' }]
        );
      } finally {
        setVerifyingEmail(false);
      }
    };

    const handleVerifyPhone = async () => {
      if (!individualProfile?.phoneNumber) {
        Alert.alert('Error', 'No phone number found.');
        return;
      }
      try {
        setVerifyingPhone(true);

        // Use backend API for phone verification - same pattern as auth flow
        await apiRequest('/auth', {
          method: 'POST',
          body: JSON.stringify({
            action: 'resend-phone-code',
            phoneNumber: individualProfile.phoneNumber
          }),
        });

        Alert.alert(
          'Verification SMS Sent',
          'Please check your phone for the verification code. You can then use your phone to log in.',
          [
            { text: 'OK' },
            {
              text: 'Go to Verification',
              onPress: () => navigation.navigate('PhoneOTPScreen')
            }
          ]
        );
      } catch (e: any) {
        console.error('Phone verification error:', e);
        Alert.alert(
          'Verification Failed',
          e.message || 'Unable to send verification SMS. Please check your internet connection and try again later.',
          [{ text: 'OK' }]
        );
      } finally {
        setVerifyingPhone(false);
      }
    };

    const updateAcceptingBookingStatus = async (newStatus: boolean) => {
      try {
        setUpdatingBookingStatus(true);
        const { getAuth } = require('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) throw new Error('Not authenticated');

        const token = await user.getIdToken();
        const response = await fetch(`${API_ENDPOINTS.TRANSPORTERS}/${user.uid}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            acceptingBooking: newStatus,
          }),
        });

        if (response.ok) {
          setAcceptingBooking(newStatus);
          setIndividualProfile((prev: any) => ({ ...prev, acceptingBooking: newStatus }));
          Alert.alert(
            'Status Updated',
            `You are now ${newStatus ? 'accepting' : 'not accepting'} new booking requests.`
          );
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update booking status');
        }
      } catch (error: any) {
        console.error('Error updating booking status:', error);
        Alert.alert('Error', error.message || 'Failed to update booking status. Please try again.');
      } finally {
        setUpdatingBookingStatus(false);
      }
    };
    
    // Modal state for insurance and photo gallery
    return (
      <>
        {/* --- INDIVIDUAL UI --- */}
        <ScrollView style={styles.bg} contentContainerStyle={{ ...styles.container, paddingBottom: 120 }}>
          <Text style={styles.title}>Manage My Vehicle & Profile</Text>
          <View style={[styles.card, { alignItems: 'center', paddingTop: 24, paddingBottom: 18, marginBottom: 12 }]}>
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              {individualProfilePhoto ? (
                <Image source={{ uri: individualProfilePhoto.uri }} style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: colors.background, marginBottom: 10, borderWidth: 2, borderColor: colors.primary }} />
              ) : loadingIndividualProfile ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : (
                <MaterialCommunityIcons name="account-circle" size={100} color={colors.primary} style={{ marginBottom: 10 }} />
              )}
              <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 18, marginBottom: 2 }}>{individualProfile?.displayName || ''}</Text>
                    <Text style={{ color: colors.text.secondary, fontSize: 15 }}>{individualProfile?.phoneNumber || ''}</Text>
            </View>
            
            {/* Accepting Requests Toggle */}
            <View style={styles.toggleContainer}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Accepting New Requests</Text>
                <Text style={styles.toggleDescription}>
                  {acceptingBooking 
                    ? 'You are currently accepting new booking requests' 
                    : 'You are not accepting new booking requests'
                  }
                </Text>
              </View>
              <Switch
                value={acceptingBooking}
                onValueChange={updateAcceptingBookingStatus}
                disabled={updatingBookingStatus}
                trackColor={{ false: colors.text.light, true: colors.primary + '40' }}
                thumbColor={acceptingBooking ? colors.primary : colors.text.light}
                ios_backgroundColor={colors.text.light}
              />
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 6 }}>
              <TouchableOpacity style={{ backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 22, marginRight: 8 }} onPress={() => setEditModal(true)}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ backgroundColor: colors.error, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 22 }} onPress={handleLogout}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Contact Verification Section */}
          <View style={[styles.card, { marginBottom: 12 }]}>
            <Text style={styles.sectionTitle}>Contact Verification</Text>
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: colors.text.primary, fontSize: 16, fontWeight: '600' }}>Email</Text>
                <View style={[
                  styles.verificationBadge,
                  userProfile?.emailVerified ? styles.verifiedBadge : styles.unverifiedBadge
                ]}>
                  <MaterialCommunityIcons
                    name={userProfile?.emailVerified ? "check-circle" : "close-circle"}
                    size={12}
                    color={userProfile?.emailVerified ? colors.success : colors.error}
                  />
                  <Text style={[
                    styles.verificationBadgeText,
                    userProfile?.emailVerified ? styles.verifiedText : styles.unverifiedText
                  ]}>
                    {userProfile?.emailVerified ? 'Verified' : 'Unverified'}
                  </Text>
                </View>
              </View>
              <Text style={{ color: colors.text.secondary, fontSize: 14, marginBottom: 8 }}>
                {individualProfile?.email || 'No email set'}
              </Text>
              {!userProfile?.emailVerified && (
                <TouchableOpacity
                  style={styles.verifyButton}
                  onPress={handleVerifyEmail}
                  disabled={verifyingEmail}
                >
                  {verifyingEmail ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.verifyButtonText}>Verify Email</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: colors.text.primary, fontSize: 16, fontWeight: '600' }}>Phone</Text>
                <View style={[
                  styles.verificationBadge,
                  individualProfile?.phoneVerified ? styles.verifiedBadge : styles.unverifiedBadge
                ]}>
                  <MaterialCommunityIcons
                    name={individualProfile?.phoneVerified ? "check-circle" : "close-circle"}
                    size={12}
                    color={individualProfile?.phoneVerified ? colors.success : colors.error}
                  />
                  <Text style={[
                    styles.verificationBadgeText,
                    individualProfile?.phoneVerified ? styles.verifiedText : styles.unverifiedText
                  ]}>
                    {individualProfile?.phoneVerified ? 'Verified' : 'Unverified'}
                  </Text>
                </View>
              </View>
              <Text style={{ color: colors.text.secondary, fontSize: 14, marginBottom: 8 }}>
                {individualProfile?.phoneNumber || 'No phone set'}
              </Text>
              {!individualProfile?.phoneVerified && (
                <TouchableOpacity
                  style={styles.verifyButton}
                  onPress={handleVerifyPhone}
                  disabled={verifyingPhone}
                >
                  {verifyingPhone ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.verifyButtonText}>Verify Phone</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {userProfile?.emailVerified && userProfile?.phoneVerified && (
              <View style={styles.allVerified}>
                <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                <Text style={styles.allVerifiedText}>All contact methods verified!</Text>
              </View>
            )}
          </View>

          {/* Location Tracking Section */}
          <View style={[styles.card, { marginTop: 8 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={styles.sectionTitle}>Location Tracking</Text>
              <TouchableOpacity
                style={{
                  backgroundColor: isLocationTracking ? colors.success : colors.error,
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
                onPress={async () => {
                  if (isLocationTracking) {
                    await locationService.stopLocationTracking();
                    setIsLocationTracking(false);
                  } else {
                    const started = await locationService.startLocationTracking();
                    setIsLocationTracking(started);
                  }
                }}
              >
                <MaterialCommunityIcons
                  name={isLocationTracking ? "map-marker" : "map-marker-off"}
                  size={16}
                  color="#fff"
                  style={{ marginRight: 6 }}
                />
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
                  {isLocationTracking ? 'Tracking' : 'Start Tracking'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: colors.text.secondary, fontSize: 14, marginBottom: 8 }}>
              {isLocationTracking
                ? 'Your location is being tracked and shared with clients during trips.'
                : 'Enable location tracking to receive nearby job requests and share your location with clients.'
              }
            </Text>
            {!locationName && (currentLocation || individualProfile?.lastKnownLocation) && (
              <Text style={{ color: colors.warning, fontSize: 12, marginBottom: 8, fontStyle: 'italic' }}>
                Note: Location names require a valid Google Maps API key. Coordinates are shown as fallback.
              </Text>
            )}
            {(currentLocation || individualProfile?.lastKnownLocation) && (
              <View style={{ backgroundColor: colors.background, borderRadius: 8, padding: 12, marginTop: 8 }}>
                <Text style={{ color: colors.text.secondary, fontSize: 12, marginBottom: 4 }}>Last Updated Location:</Text>
                {locationNameLoading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={{ color: colors.text.secondary, fontSize: 14 }}>Loading location name...</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.primary, fontSize: 14, fontWeight: 'bold', flex: 1 }}>
                      {locationName || (() => {
                        // Use current location if available, otherwise fall back to lastKnownLocation from backend
                        const location = currentLocation || individualProfile?.lastKnownLocation;
                        if (location) {
                          return `Near ${location.latitude?.toFixed(4) || location.lat?.toFixed(4)}, ${location.longitude?.toFixed(4) || location.lng?.toFixed(4)}`;
                        }
                        return 'Location not available';
                      })()}
                    </Text>
                    {!locationName && (currentLocation || individualProfile?.lastKnownLocation) && (
                      <TouchableOpacity 
                        onPress={async () => {
                          const location = currentLocation || individualProfile?.lastKnownLocation;
                          if (location) {
                            setLocationNameLoading(true);
                            try {
                              const placeName = await getShortLocationName({
                                latitude: location.latitude || location.lat,
                                longitude: location.longitude || location.lng
                              });
                              setLocationName(placeName);
                            } catch (error) {
                              console.error('Error converting coordinates to place name:', error);
                            } finally {
                              setLocationNameLoading(false);
                            }
                          }
                        }}
                        style={{ padding: 4 }}
                      >
                        <MaterialCommunityIcons name="refresh" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                <Text style={{ color: colors.text.secondary, fontSize: 12, marginTop: 4 }}>
                  Updated: {(() => {
                    const location = currentLocation || individualProfile?.lastKnownLocation;
                    if (location?.timestamp) {
                      return new Date(location.timestamp).toLocaleTimeString();
                    } else if (location?.updatedAt) {
                      return new Date(location.updatedAt).toLocaleTimeString();
                    }
                    return 'Unknown';
                  })()}
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.card, { marginTop: 8 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={styles.sectionTitle}>Vehicle</Text>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 50,
                  width: 44,
                  height: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: colors.primary,
                  shadowOpacity: 0.18,
                  shadowRadius: 8,
                  elevation: 3,
                }}
                onPress={() => setVehicleModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            {individualProfile ? (
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                {/* Main Photo with overlay registration */}
                {individualProfile.vehicleImagesUrl && individualProfile.vehicleImagesUrl.length > 0 ? (
                  <View style={{ width: 210, height: 130, borderRadius: 18, overflow: 'hidden', marginBottom: 10, backgroundColor: '#eee', elevation: 2, shadowColor: colors.primary, shadowOpacity: 0.08, shadowRadius: 8 }}>
                    <Image source={{ uri: individualProfile.vehicleImagesUrl[0] }} style={{ width: 210, height: 130, resizeMode: 'cover' }} />
                    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.primary + 'cc', paddingVertical: 4, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15, letterSpacing: 1 }}>{individualProfile.vehicleRegistration}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ width: 120, height: 90, borderRadius: 12, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <MaterialCommunityIcons name="truck" size={48} color={colors.primary} />
                  </View>
                )}
                {/* Main Info and Status */}
                <Text style={{ fontWeight: 'bold', fontSize: 20, color: colors.primaryDark, marginBottom: 4 }}>{individualProfile.vehicleMake} ({individualProfile.vehicleType})</Text>
                {/* Documents Card */}
                <View style={{ width: '100%', backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 12, marginTop: 2, elevation: 1 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 15, color: colors.secondary, marginBottom: 8 }}>Documents</Text>
                  {/* Insurance Row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialCommunityIcons name={individualProfile.insuranceUrl ? 'shield-check' : 'shield-alert'} size={20} color={individualProfile.insuranceUrl ? colors.success : colors.error} style={{ marginRight: 8 }} />
                      <Text style={{ color: individualProfile.insuranceUrl ? colors.success : colors.error, fontWeight: 'bold', fontSize: 15, marginRight: 8 }}>Insurance</Text>
                      <Text style={{ color: colors.text.secondary, fontSize: 13 }}>
                        {individualProfile.insuranceUrl ? 'Uploaded' : 'Not Uploaded'}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setInsuranceModalVisible(true)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 14 }}>
                      <MaterialCommunityIcons name="file-upload-outline" size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13, marginLeft: 6 }}>Renew</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ height: 1, backgroundColor: colors.text.light, marginVertical: 4, width: '100%' }} />
                  {/* DL Row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2, justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialCommunityIcons name={individualProfile.driverLicense ? 'card-account-details-outline' : 'card-account-details-outline'} size={20} color={individualProfile.driverLicense ? colors.success : colors.error} style={{ marginRight: 8 }} />
                      <Text style={{ color: individualProfile.driverLicense ? colors.success : colors.error, fontWeight: 'bold', fontSize: 15, marginRight: 8 }}>Driver&apos;s License</Text>
                      <Text style={{ color: colors.text.secondary, fontSize: 13 }}>
                        {individualProfile.driverLicense ? 'Uploaded' : 'Not Uploaded'}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setLicenseModalVisible(true)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 14 }}>
                      <MaterialCommunityIcons name="file-upload-outline" size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13, marginLeft: 6 }}>Renew</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {/* End Documents Card */}

                {/* Features Card */}
                <View style={{ width: '100%', backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 12, marginTop: 2, elevation: 1 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 15, color: colors.secondary, marginBottom: 8 }}>Features</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 2 }}>
                    {/* Capacity */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '11', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 }}>
                      <MaterialCommunityIcons name="weight-kilogram" size={16} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={{ color: colors.primary, fontSize: 13 }}>{individualProfile.vehicleCapacity ? `${individualProfile.vehicleCapacity}t` : '--'}</Text>
                    </View>
                    {/* Body Type */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.secondary + '11', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 }}>
                      <MaterialCommunityIcons name="car-cog" size={16} color={colors.secondary} style={{ marginRight: 4 }} />
                      <Text style={{ color: colors.secondary, fontSize: 13 }}>{individualProfile.bodyType ? individualProfile.bodyType.charAt(0).toUpperCase() + individualProfile.bodyType.slice(1) : '--'}</Text>
                    </View>
                    {/* Drive Type */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.secondary + '11', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 }}>
                      <MaterialCommunityIcons name="steering" size={16} color={colors.secondary} style={{ marginRight: 4 }} />
                      <Text style={{ color: colors.secondary, fontSize: 13 }}>{individualProfile.driveType ? individualProfile.driveType : '--'}</Text>
                    </View>
                    {/* Refrigeration */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: individualProfile.refrigeration ? '#e0f7fa' : colors.text.light + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 }}>
                      <MaterialCommunityIcons name="snowflake" size={16} color={individualProfile.refrigeration ? colors.primary : colors.text.secondary} style={{ marginRight: 4 }} />
                      <Text style={{ color: individualProfile.refrigeration ? colors.primary : colors.text.secondary, fontSize: 13 }}>Refrigeration</Text>
                    </View>
                    {/* Humidity */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: individualProfile.humidityControl ? '#e3f2fd' : colors.text.light + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 }}>
                      <MaterialCommunityIcons name="water-percent" size={16} color={individualProfile.humidityControl ? colors.primary : colors.text.secondary} style={{ marginRight: 4 }} />
                      <Text style={{ color: individualProfile.humidityControl ? colors.primary : colors.text.secondary, fontSize: 13 }}>Humidity</Text>
                    </View>
                    {/* Special Cargo */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: individualProfile.specialCargo ? '#f3e5f5' : colors.text.light + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 }}>
                      <MaterialCommunityIcons name="cube-outline" size={16} color={individualProfile.specialCargo ? colors.primary : colors.text.secondary} style={{ marginRight: 4 }} />
                      <Text style={{ color: individualProfile.specialCargo ? colors.primary : colors.text.secondary, fontSize: 13 }}>Special Cargo</Text>
                    </View>
                    {/* Other Features */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: individualProfile.vehicleFeatures ? colors.primary + '22' : colors.text.light + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 }}>
                      <MaterialCommunityIcons name="star-circle" size={16} color={individualProfile.vehicleFeatures ? colors.primary : colors.text.secondary} style={{ marginRight: 4 }} />
                      <Text style={{ color: individualProfile.vehicleFeatures ? colors.primary : colors.text.secondary, fontSize: 13 }}>{individualProfile.vehicleFeatures ? individualProfile.vehicleFeatures : 'Other Features'}</Text>
                    </View>
                  </View>
                </View>
                {/* End Features Card */}
                {/* Body Type Toggle */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10, backgroundColor: colors.background, borderRadius: 10, padding: 6 }}>
                  <Text style={{ color: colors.secondary, fontWeight: 'bold', fontSize: 14, marginRight: 8 }}>Body:</Text>
                  <TouchableOpacity
                    style={{
                      backgroundColor: individualProfile.bodyType === 'closed' ? colors.primary : colors.surface,
                      borderRadius: 8,
                      paddingVertical: 6,
                      paddingHorizontal: 18,
                      marginRight: 6,
                    }}
                    onPress={() => {
                      // TODO: update backend; for now, just show feedback
                      Alert.alert('Body Type', 'Switch to Closed (backend update needed)');
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={{ color: individualProfile.bodyType === 'closed' ? '#fff' : colors.primary, fontWeight: 'bold' }}>Closed</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      backgroundColor: individualProfile.bodyType === 'open' ? colors.primary : colors.surface,
                      borderRadius: 8,
                      paddingVertical: 6,
                      paddingHorizontal: 18,
                    }}
                    onPress={() => {
                      // TODO: update backend; for now, just show feedback
                      Alert.alert('Body Type', 'Switch to Open (backend update needed)');
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={{ color: individualProfile.bodyType === 'open' ? '#fff' : colors.primary, fontWeight: 'bold' }}>Open</Text>
                  </TouchableOpacity>
                </View>
                {/* Action Row */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 2, gap: 10 }}>
                  <TouchableOpacity onPress={() => setPhotoGalleryModalVisible(true)} style={{ marginHorizontal: 4 }}>
                    <MaterialCommunityIcons name="image-multiple" size={22} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setVehicleModal(true)} style={{ marginHorizontal: 4 }}>
                    <MaterialCommunityIcons name="pencil" size={22} color={colors.secondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setInsuranceModalVisible(true)} style={{ marginHorizontal: 4 }}>
                    <MaterialCommunityIcons name="file-document-edit" size={22} color={colors.secondary} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <MaterialCommunityIcons name="truck-plus" size={60} color={colors.primary} style={{ marginBottom: 10 }} />
                <Text style={{ color: colors.text.secondary, fontSize: 16, marginBottom: 8 }}>No vehicle data found.</Text>
                <TouchableOpacity style={{ backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 28, marginTop: 8 }} onPress={() => setVehicleModal(true)}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Add Vehicle</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          {/* Add Vehicle Modal for Individual */}
          <Modal
            visible={vehicleModal}
            animationType="slide"
            transparent
            onRequestClose={() => setVehicleModal(false)}
          >
            <View style={styles.modalOverlay}>
              <ScrollView style={{ width: '100%' }} contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}>
                <View style={styles.vehicleModalCard}>
                  <Text style={styles.editTitle}>Add/Replace Vehicle</Text>
                  <VehicleDetailsForm
                    initial={{}}
                    onChange={() => { }}
                    onPhotoAdd={pickVehiclePhotos}
                    onPhotoRemove={removeVehiclePhoto}
                    vehiclePhotos={vehiclePhotos}
                    error={undefined}
                  />
                  <View style={styles.editActionsRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setVehicleModal(false)}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={() => {
                      // Replace the current vehicle with the new one
                      // (In real app, send to backend and refetch profile)
                      setVehicleModal(false);
                      Alert.alert('Vehicle Updated', 'Your vehicle has been replaced. Await approval if required.');
                    }}>
                      <Text style={styles.saveText}>Save Vehicle</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </Modal>
          {/* Subscription Section */}
          <SubscriptionStatusCard
            subscriptionStatus={subscriptionStatus || {
              hasActiveSubscription: false,
              isTrialActive: false,
              needsTrialActivation: true,
              currentPlan: null,
              daysRemaining: 0,
              subscriptionStatus: 'none'
            }}
            onManagePress={() => setSubscriptionModalVisible(true)}
            onRenewPress={handlePayment}
            onActivateTrial={handleActivateTrial}
            loading={loadingSubscription}
          />
          {/* Subscription Plans Modal */}
          {subscriptionModalVisible && (
            <SubscriptionModal
              selectedPlan={selectedPlan}
              setSelectedPlan={setSelectedPlan}
              onClose={() => setSubscriptionModalVisible(false)}
              onSubscribe={handleSubscribe}
            />
          )}
        </ScrollView>
        {/* Edit Profile Modal (always rendered) */}
        <Modal
          visible={editModal}
          animationType="slide"
          transparent
          onRequestClose={() => setEditModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.editModalCard}>
              <Text style={styles.editTitle}>Edit Profile</Text>
              {/* Profile Photo Picker for Individual */}
              <TouchableOpacity style={{ alignSelf: 'center', marginBottom: 16 }} onPress={pickIndividualProfilePhoto} activeOpacity={0.7}>
                {individualProfilePhoto ? (
                  <Image source={{ uri: individualProfilePhoto.uri }} style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.background }} />
                ) : (
                  <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="person-circle-outline" size={60} color={colors.text.light} />
                  </View>
                )}
                <Text style={{ color: colors.primary, marginTop: 6, textAlign: 'center' }}>Upload Profile Photo</Text>
              </TouchableOpacity>
              <View style={styles.editFieldWrap}>
                <Text style={styles.editLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Full Name"
                />
              </View>
              <View style={styles.editDivider} />
              <View style={styles.editFieldWrap}>
                <Text style={styles.editLabel}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Phone"
                />
              </View>
              <View style={styles.editActionsRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.background },
  container: { padding: 18, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.primaryDark, marginBottom: 18, textAlign: 'center' },
  card: { backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 16, elevation: 1 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: colors.secondary, marginBottom: 8 },
  value: { fontSize: 15, color: colors.text.primary, marginBottom: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 2 },
  actionText: { color: colors.primary, fontWeight: 'bold', marginLeft: 6, fontSize: 15 },
  vehicleListItem: { borderBottomWidth: 1, borderBottomColor: colors.background, paddingVertical: 10, marginBottom: 6 },
  driverListItem: { borderBottomWidth: 1, borderBottomColor: colors.background, paddingVertical: 10, marginBottom: 6 },
  editBtn: { marginRight: 10 },
  removeBtn: {},
  driverAssignBtn: { alignItems: 'center', marginRight: 10, padding: 6, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.text.light },
  driverAssignBtnActive: { backgroundColor: colors.primary + '22', borderColor: colors.primary },
  driverAssignPhoto: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eee' },
  driverAssignName: { fontSize: 12, color: colors.text.primary, marginTop: 2 },
  driverPhoto: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
  editModalCard: { backgroundColor: colors.white, borderRadius: 22, padding: 22, width: '92%', shadowColor: colors.black, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  editTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primaryDark, marginBottom: 16, textAlign: 'center' },
  editFieldWrap: { marginBottom: 10, width: '100%' },
  editLabel: { color: colors.text.secondary, fontWeight: '600', marginBottom: 4, fontSize: 14 },
  editDivider: { height: 1, backgroundColor: colors.background, marginVertical: 6, width: '100%' },
  editActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  cancelBtn: { backgroundColor: colors.background, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18, borderWidth: 1, borderColor: colors.text.light, marginRight: 8 },
  cancelText: { color: colors.error, fontWeight: 'bold', fontSize: 15 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 },
  saveText: { color: colors.white, fontWeight: 'bold' },
  vehicleModalCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 22,
    width: '96%',
    maxWidth: 420,
    alignSelf: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 60,
    marginBottom: 40,
  },
  section: { backgroundColor: colors.background, borderRadius: 12, padding: 10, marginBottom: 12 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, padding: 10, marginTop: 6, marginBottom: 4 },
  uploadBtnText: { color: colors.primary, marginLeft: 8, fontWeight: 'bold' },
  fileName: { color: colors.text.secondary, fontSize: 13, marginTop: 2 },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 2,
    gap: 8,
    justifyContent: 'flex-start',
  },
  featureBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8 },
  featureBtnActive: { backgroundColor: colors.primary },
  featureText: { color: colors.primary, marginLeft: 6, fontWeight: '600' },
  photosRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  photoWrap: { position: 'relative', marginRight: 8 },
  photo: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#eee' },
  removePhotoBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: colors.background, borderRadius: 10 },
  addPhotoBtn: { width: 64, height: 64, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary },
  photoHint: { color: colors.text.light, fontSize: 13, marginTop: 4 },
  inputDropdownWrap: { marginBottom: 12 },
  inputDropdownLabel: { color: colors.text.secondary, fontWeight: '600', marginBottom: 4, fontSize: 14 },
  inputDropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: colors.text.light },
  dropdownList: { backgroundColor: colors.white, borderRadius: 8, marginTop: 2, borderWidth: 1, borderColor: colors.text.light, width: '100%' },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.background },
  input: { backgroundColor: colors.background, borderRadius: 8, padding: 10, marginVertical: 6, fontSize: 15, borderWidth: 1, borderColor: colors.text.light, color: colors.text.primary },
  // Verification styles
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  verifiedBadge: {
    backgroundColor: colors.success + '20',
  },
  unverifiedBadge: {
    backgroundColor: colors.warning + '20',
  },
  verificationBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  verifiedText: {
    color: colors.success,
  },
  unverifiedText: {
    color: colors.warning,
  },
  verifyButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  verifyButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  allVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '10',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  allVerifiedText: {
    color: colors.success,
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  // Toggle styles
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.text.light + '30',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 18,
  },
});
