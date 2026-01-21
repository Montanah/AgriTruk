import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { API_ENDPOINTS } from '../constants/api';
import { apiRequest } from '../utils/api';
import subscriptionService, { SubscriptionStatus } from '../services/subscriptionService';
import companyFleetValidationService, { FleetValidationResult } from '../services/companyFleetValidationService';

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  driverLicense: string;
  driverLicenseExpiryDate: string;
  idNumber: string;
  idExpiryDate: string;
  profileImage: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive';
  assignedVehicleId?: string;
  assignedVehicle?: {
    id: string;
    make: string;
    model: string;
    registration: string;
    year?: number;
    color?: string;
    capacity?: number;
    bodyType?: string;
    driveType?: string;
    status?: string;
  };
  createdAt: string;
  updatedAt: string;
  lastActive?: string;
}

const DriverManagementScreen = () => {
  const navigation = useNavigation();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  
  // Recruit driver modal state
  const [recruitModal, setRecruitModal] = useState(false);
  const [recruitName, setRecruitName] = useState('');
  const [recruitEmail, setRecruitEmail] = useState('');
  const [recruitPhone, setRecruitPhone] = useState('');
  const [recruitLicenseNumber, setRecruitLicenseNumber] = useState('');
  const [recruitIdNumber, setRecruitIdNumber] = useState('');
  const [recruitPhoto, setRecruitPhoto] = useState<any>(null);
  const [recruitIdDoc, setRecruitIdDoc] = useState<any>(null);
  const [recruitLicense, setRecruitLicense] = useState<any>(null);
  const [recruiting, setRecruiting] = useState(false);
  const [recruitmentStep, setRecruitmentStep] = useState('');
  
  // Subscription state
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [driverValidation, setDriverValidation] = useState<FleetValidationResult | null>(null);
  const [vehicleValidation, setVehicleValidation] = useState<FleetValidationResult | null>(null);
  const [vehicleCount, setVehicleCount] = useState(0);

  const fetchSubscriptionStatus = async () => {
    try {
      // IMMEDIATE TRIAL LIMITS - Set default trial limits immediately for company transporters
      const immediateTrialStatus: SubscriptionStatus = {
        hasActiveSubscription: false,
        isTrialActive: true,
        needsTrialActivation: false,
        currentPlan: null,
        daysRemaining: 30,
        subscriptionStatus: 'trial',
        freeTrialActive: true,
        freeTrialDaysRemaining: 30,
        driverLimit: 3,
        vehicleLimit: 3,
        currentDriverCount: 0,
        currentVehicleCount: 0,
        canAddDriver: true,
        canAddVehicle: true,
        transporterType: 'company'
      };
      
      // Set immediate trial limits
      setSubscriptionStatus(immediateTrialStatus);
      
      // Set immediate validation with trial limits
      const immediateDriverValidation = {
        canAdd: true,
        currentCount: 0,
        limit: 3,
        percentage: 0,
        reason: 'Free trial allows up to 3 drivers'
      };
      
      const immediateVehicleValidation = {
        canAdd: true,
        currentCount: 0,
        limit: 3,
        percentage: 0,
        reason: 'Free trial allows up to 3 vehicles'
      };
      
      setDriverValidation(immediateDriverValidation);
      setVehicleValidation(immediateVehicleValidation);
      
      console.log('✅ IMMEDIATE TRIAL LIMITS SET - Company can add drivers/vehicles immediately');
      
      // Then fetch real subscription status in background
      try {
        const realStatus = await subscriptionService.getSubscriptionStatus();
        console.log('📊 Real subscription status loaded:', realStatus);
        
        // Update with real data if available
        if (realStatus && (realStatus.driverLimit > 0 || realStatus.vehicleLimit > 0)) {
          setSubscriptionStatus(realStatus);
          
          const driverValidation = companyFleetValidationService.validateDriverAddition(realStatus);
          setDriverValidation(driverValidation);
          
          const vehicleValidation = companyFleetValidationService.validateVehicleAddition(realStatus);
          setVehicleValidation(vehicleValidation);
          
          console.log('✅ Real subscription data applied');
        }
      } catch (realError) {
        console.warn('Real subscription fetch failed, keeping trial limits:', realError);
        // Keep the immediate trial limits if real fetch fails
      }
    } catch (error) {
      console.error('Error in subscription handling:', error);
      // Fallback to trial limits even on error
      const fallbackTrialStatus: SubscriptionStatus = {
        hasActiveSubscription: false,
        isTrialActive: true,
        needsTrialActivation: false,
        currentPlan: null,
        daysRemaining: 30,
        subscriptionStatus: 'trial',
        freeTrialActive: true,
        freeTrialDaysRemaining: 30,
        driverLimit: 3,
        vehicleLimit: 3,
        currentDriverCount: 0,
        currentVehicleCount: 0,
        canAddDriver: true,
        canAddVehicle: true,
        transporterType: 'company'
      };
      
      setSubscriptionStatus(fallbackTrialStatus);
      setDriverValidation({
        canAdd: true,
        currentCount: 0,
        limit: 3,
        percentage: 0,
        reason: 'Free trial allows up to 3 drivers'
      });
      setVehicleValidation({
        canAdd: true,
        currentCount: 0,
        limit: 3,
        percentage: 0,
        reason: 'Free trial allows up to 3 vehicles'
      });
    }
  };

  const updateSubscriptionWithRealCounts = (vehicleCount: number, driverCount: number) => {
    if (subscriptionStatus) {
      console.log('📊 DriverManagementScreen - Updating subscription with real counts:', { vehicleCount, driverCount });
      console.log('📊 DriverManagementScreen - Current subscription status:', subscriptionStatus);
      
      // DYNAMIC LIMITS - Use actual subscription plan limits
      const getVehicleLimit = () => {
        if (subscriptionStatus.freeTrialActive || subscriptionStatus.isTrialActive) return 3; // Trial limit
        if (subscriptionStatus.currentPlan?.id === 'fleet_basic') return 5;
        if (subscriptionStatus.currentPlan?.id === 'fleet_growing') return 15;
        if (subscriptionStatus.currentPlan?.id === 'fleet_enterprise') return -1; // Unlimited
        return 3; // Default trial limit
      };
      
      const getDriverLimit = () => {
        if (subscriptionStatus.freeTrialActive || subscriptionStatus.isTrialActive) return 3; // Trial limit
        if (subscriptionStatus.currentPlan?.id === 'fleet_basic') return 5;
        if (subscriptionStatus.currentPlan?.id === 'fleet_growing') return 15;
        if (subscriptionStatus.currentPlan?.id === 'fleet_enterprise') return -1; // Unlimited
        return 3; // Default trial limit
      };
      
      const vehicleLimit = getVehicleLimit();
      const driverLimit = getDriverLimit();
      
      const forcedVehicleValidation = {
        canAdd: vehicleLimit === -1 || vehicleCount < vehicleLimit,
        currentCount: vehicleCount, // Use actual vehicle count
        limit: vehicleLimit,
        percentage: vehicleLimit === -1 ? 0 : Math.min((vehicleCount / vehicleLimit) * 100, 100),
        reason: vehicleLimit === -1 ? 'Unlimited vehicles' : `Plan allows up to ${vehicleLimit} vehicles`
      };
      
      const forcedDriverValidation = {
        canAdd: driverLimit === -1 || driverCount < driverLimit,
        currentCount: driverCount, // Use actual driver count
        limit: driverLimit,
        percentage: driverLimit === -1 ? 0 : Math.min((driverCount / driverLimit) * 100, 100),
        reason: driverLimit === -1 ? 'Unlimited drivers' : `Plan allows up to ${driverLimit} drivers`
      };
      
      console.log('🔍 DriverManagementScreen - DYNAMIC Vehicle validation result:', JSON.stringify(forcedVehicleValidation, null, 2));
      console.log('🔍 DriverManagementScreen - DYNAMIC Driver validation result:', JSON.stringify(forcedDriverValidation, null, 2));
      
      setVehicleValidation(forcedVehicleValidation);
      setDriverValidation(forcedDriverValidation);
      
      console.log('✅ DriverManagementScreen - Validation set successfully');
    }
  };

  const fetchVehicleCount = async () => {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      
      // Get company ID first
      const companyResponse = await fetch(`${API_ENDPOINTS.COMPANIES}/transporter/${user.uid}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (companyResponse.ok) {
        const companyData = await companyResponse.json();
        const company = companyData[0] || companyData;
        if (company?.id) {
          // Fetch vehicles for this company
          const vehiclesResponse = await fetch(`${API_ENDPOINTS.VEHICLES}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (vehiclesResponse.ok) {
            const vehiclesData = await vehiclesResponse.json();
            const actualVehicleCount = vehiclesData.vehicles?.length || vehiclesData.length || 0;
            setVehicleCount(actualVehicleCount);
            
            // Update subscription status with real counts
            updateSubscriptionWithRealCounts(actualVehicleCount, drivers.length);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching vehicle count:', error);
    }
  };

  const fetchDrivers = async () => {
    try {
      setError(null);
      // Get company ID from route params or fetch it
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const companyResponse = await fetch(`${API_ENDPOINTS.COMPANIES}/transporter/${user.uid}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (companyResponse.ok) {
        const companyData = await companyResponse.json();
        const company = companyData[0] || companyData;
        if (company?.id) {
          // Store company info for context
          setCompanyInfo(company);
          
          // Fetch drivers for this company
          const driversResponse = await fetch(`${API_ENDPOINTS.DRIVERS}?companyId=${company.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (driversResponse.ok) {
            const driversData = await driversResponse.json();
            const driversList = driversData.drivers || driversData || [];
            setDrivers(driversList);
            
            // Update subscription status with real driver count
            updateSubscriptionWithRealCounts(vehicleCount, driversList.length);
          } else {
            setDrivers([]);
          }
        } else {
          setDrivers([]);
        }
      } else {
        setDrivers([]);
      }
    } catch (err: any) {
      console.error('Error fetching drivers:', err);
      setError(err.message || 'Failed to fetch drivers');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDrivers();
    setRefreshing(false);
  };

  // File picker functions
  const pickDriverPhoto = async (setFn: (value: any) => void) => {
    Alert.alert(
      'Select Profile Photo',
      'Choose how you want to add the driver\'s profile photo',
      [
        { text: 'Take Photo', onPress: () => pickDriverPhotoFromCamera(setFn) },
        { text: 'Choose from Gallery', onPress: () => pickDriverPhotoFromGallery(setFn) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const pickDriverPhotoFromCamera = async (setFn: (value: any) => void) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Permission to access camera is required!');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        setFn({
          ...result.assets[0],
          name: 'profile_photo.jpg',
          mimeType: 'image/jpeg'
        });
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickDriverPhotoFromGallery = async (setFn: (value: any) => void) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Permission to access media library is required!');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        setFn({
          ...result.assets[0],
          name: 'profile_photo.jpg',
          mimeType: 'image/jpeg'
        });
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const pickDriverIdDoc = async (setFn: (value: any) => void) => {
    Alert.alert(
      'Select ID Document',
      'Choose how you want to add your ID document',
      [
        { text: 'Take Photo', onPress: () => pickDriverIdDocFromCamera(setFn) },
        { text: 'Choose from Gallery', onPress: () => pickDriverIdDocFromGallery(setFn) },
        { text: 'Upload PDF', onPress: () => pickDriverIdDocFromPDF(setFn) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const pickDriverIdDocFromCamera = async (setFn: (value: any) => void) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Permission to access camera is required!');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        setFn({
          ...result.assets[0],
          name: 'id_document.jpg',
          mimeType: 'image/jpeg'
        });
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickDriverIdDocFromGallery = async (setFn: (value: any) => void) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Permission to access media library is required!');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        setFn({
          ...result.assets[0],
          name: 'id_document.jpg',
          mimeType: 'image/jpeg'
        });
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const pickDriverIdDocFromPDF = async (setFn: (value: any) => void) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        setFn({
          ...result.assets[0],
          name: result.assets[0].name || 'id_document.pdf',
          mimeType: 'application/pdf'
        });
      }
    } catch (error) {
      console.error('PDF picker error:', error);
      Alert.alert('Error', 'Failed to select PDF');
    }
  };

  const pickDriverLicense = async (setFn: (value: any) => void) => {
    Alert.alert(
      'Select Driver\'s License',
      'Choose how you want to add your driver\'s license',
      [
        { text: 'Take Photo', onPress: () => pickDriverLicenseFromCamera(setFn) },
        { text: 'Choose from Gallery', onPress: () => pickDriverLicenseFromGallery(setFn) },
        { text: 'Upload PDF', onPress: () => pickDriverLicenseFromPDF(setFn) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const pickDriverLicenseFromCamera = async (setFn: (value: any) => void) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Permission to access camera is required!');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        setFn({
          ...result.assets[0],
          name: 'driver_license.jpg',
          mimeType: 'image/jpeg'
        });
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickDriverLicenseFromGallery = async (setFn: (value: any) => void) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Permission to access media library is required!');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        setFn({
          ...result.assets[0],
          name: 'driver_license.jpg',
          mimeType: 'image/jpeg'
        });
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const pickDriverLicenseFromPDF = async (setFn: (value: any) => void) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        setFn({
          ...result.assets[0],
          name: result.assets[0].name || 'driver_license.pdf',
          mimeType: 'application/pdf'
        });
      }
    } catch (error) {
      console.error('PDF picker error:', error);
      Alert.alert('Error', 'Failed to select PDF');
    }
  };

  const handleRecruitDriver = async () => {
    if (!recruitName.trim() || !recruitEmail.trim() || !recruitPhone.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!recruitIdDoc || !recruitLicense) {
      Alert.alert('Error', 'Please upload both ID document and driver\'s license');
      return;
    }

    setRecruiting(true);
    setRecruitmentStep('Preparing driver data...');
    
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        Alert.alert('Error', 'Please log in to recruit drivers');
        setRecruiting(false);
        setRecruitmentStep('');
        return;
      }

      setRecruitmentStep('Authenticating...');
      const token = await user.getIdToken();
      
      // Prepare form data for multipart upload
      const formData = new FormData();
      
      // Split name into first and last name
      const nameParts = recruitName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || firstName; // Use first name as last name if only one name provided
      
      formData.append('companyId', companyInfo?.id || '');
      formData.append('firstName', firstName);
      formData.append('lastName', lastName);
      formData.append('email', recruitEmail.trim());
      formData.append('phone', recruitPhone.trim());
      formData.append('driverLicenseNumber', recruitLicenseNumber.trim() || 'DL-' + Date.now()); // Use provided or generate temporary
      formData.append('idNumber', recruitIdNumber.trim() || 'ID-' + Date.now()); // Use provided or generate temporary
      
      // Set expiry dates to 1 year from now (proper default)
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      formData.append('driverLicenseExpiryDate', oneYearFromNow.toISOString());
      formData.append('idExpiryDate', oneYearFromNow.toISOString());
      
      // Add files
      if (recruitPhoto) {
        formData.append('profileImage', {
          uri: recruitPhoto.uri,
          type: recruitPhoto.mimeType || 'image/jpeg',
          name: recruitPhoto.fileName || 'profile_photo.jpg',
        } as any);
      }
      
      if (recruitIdDoc) {
        formData.append('idDocument', {
          uri: recruitIdDoc.uri,
          type: recruitIdDoc.mimeType || 'image/jpeg',
          name: recruitIdDoc.fileName || 'id_document.jpg',
        } as any);
      }
      
      if (recruitLicense) {
        formData.append('driverLicense', {
          uri: recruitLicense.uri,
          type: recruitLicense.mimeType || 'image/jpeg',
          name: recruitLicense.fileName || 'driver_license.jpg',
        } as any);
      }

      setRecruitmentStep('Uploading files...');
      console.log('Recruiting driver with company ID:', companyInfo?.id);
      console.log('Form data prepared for:', firstName, lastName, recruitEmail);

      setRecruitmentStep('Submitting driver application...');
      console.log('🚗 About to submit driver recruitment request...');
      
      const response = await fetch(`${API_ENDPOINTS.DRIVERS}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData - let React Native handle it automatically
        },
        body: formData,
      });

      console.log('🚗 Driver recruitment response status:', response.status);
      console.log('🚗 Driver recruitment response ok:', response.ok);
      
      const responseText = await response.text();
      console.log('🚗 Driver recruitment response text:', responseText);
      
      let result = null;
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('🚗 Failed to parse driver recruitment response:', parseError);
        throw new Error('Invalid response format from server');
      }
      
      console.log('🚗 Driver recruitment parsed result:', result);

      if (response.ok) {
        setRecruitmentStep('Driver recruited successfully!');
        Alert.alert('Success', 'Driver recruited successfully! They will receive login credentials via email.');
        setRecruitModal(false);
        resetRecruitForm();
        await fetchDrivers(); // Refresh the list
      } else {
        console.error('🚗 Driver recruitment failed:', result);
        const errorMessage = result?.message || result?.errors?.map((err: any) => err.msg || err.message).join(', ') || 'Failed to recruit driver';
        Alert.alert('Error', errorMessage);
      }
    } catch (error: any) {
      console.error('🚗 Driver recruitment error:', error);
      console.error('🚗 Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        type: typeof error
      });
      
      let errorMessage = 'Failed to recruit driver. Please try again.';
      if (error.message.includes('Invalid response format')) {
        errorMessage = 'Server returned invalid response. Please try again.';
      } else if (error.message.includes('Network request failed')) {
        errorMessage = 'Network connection failed. Please check your internet connection.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setRecruiting(false);
      setRecruitmentStep('');
    }
  };

  const resetRecruitForm = () => {
    setRecruitName('');
    setRecruitEmail('');
    setRecruitPhone('');
    setRecruitLicenseNumber('');
    setRecruitIdNumber('');
    setRecruitPhoto(null);
    setRecruitIdDoc(null);
    setRecruitLicense(null);
  };

  const handleDriverAction = async (driverId: string, action: 'approve' | 'reject' | 'activate' | 'deactivate') => {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.DRIVERS}/${driverId}/${action}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        Alert.alert('Success', `Driver ${action}d successfully`);
        fetchDrivers(); // Refresh the list
      } else {
        throw new Error(`Failed to ${action} driver`);
      }
    } catch (err: any) {
      console.error(`Error ${action}ing driver:`, err);
      Alert.alert('Error', err.message || `Failed to ${action} driver`);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      await fetchSubscriptionStatus();
      await fetchDrivers();
      await fetchVehicleCount();
    };
    
    initializeData();
  }, []);

  const renderDriver = ({ item }: { item: Driver }) => (
    <View style={styles.driverCard}>
      <View style={styles.driverHeader}>
        {/* Driver Profile Image */}
        <View style={styles.driverProfileContainer}>
          {item.profileImage ? (
            <Image source={{ uri: item.profileImage }} style={styles.driverProfileImage} />
          ) : (
            <View style={styles.driverProfilePlaceholder}>
              <MaterialCommunityIcons name="account" size={24} color={colors.text.secondary} />
            </View>
          )}
        </View>
        
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={styles.driverPhone}>{item.phone}</Text>
          <Text style={styles.driverEmail}>{item.email}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { 
            backgroundColor: item.status === 'approved' || item.status === 'active' ? colors.success : 
                           item.status === 'rejected' ? colors.error : 
                           item.status === 'inactive' ? colors.text.secondary : colors.warning 
          }
        ]}>
          <Text style={styles.statusText}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.driverDetails}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="card-account-details" size={16} color={colors.text.secondary} />
          <Text style={styles.detailText}>License: {item.driverLicense}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="calendar" size={16} color={colors.text.secondary} />
          <Text style={styles.detailText}>
            Expires: {new Date(item.driverLicenseExpiryDate).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="id-card" size={16} color={colors.text.secondary} />
          <Text style={styles.detailText}>ID: {item.idNumber}</Text>
        </View>
      </View>

      {item.assignedVehicle && (
        <View style={styles.vehicleInfo}>
          <View style={styles.vehicleHeader}>
            <MaterialCommunityIcons name="truck" size={16} color={colors.primary} />
            <Text style={styles.vehicleTitle}>Assigned Vehicle</Text>
          </View>
          <View style={styles.vehicleDetails}>
            <Text style={styles.vehicleText}>
              {item.assignedVehicle.make} {item.assignedVehicle.model}
              {item.assignedVehicle.year && ` (${item.assignedVehicle.year})`}
            </Text>
            <Text style={styles.vehicleRegistration}>
              Registration: {item.assignedVehicle.registration}
            </Text>
            
            {/* Additional Vehicle Details */}
            <View style={styles.vehicleSpecs}>
              {item.assignedVehicle.color && (
                <View style={styles.vehicleSpecItem}>
                  <MaterialCommunityIcons name="palette" size={12} color={colors.text.secondary} />
                  <Text style={styles.vehicleSpecText}>{item.assignedVehicle.color}</Text>
                </View>
              )}
              {item.assignedVehicle.capacity && (
                <View style={styles.vehicleSpecItem}>
                  <MaterialCommunityIcons name="weight" size={12} color={colors.text.secondary} />
                  <Text style={styles.vehicleSpecText}>{item.assignedVehicle.capacity}t</Text>
                </View>
              )}
              {item.assignedVehicle.bodyType && (
                <View style={styles.vehicleSpecItem}>
                  <MaterialCommunityIcons name="car" size={12} color={colors.text.secondary} />
                  <Text style={styles.vehicleSpecText}>{item.assignedVehicle.bodyType}</Text>
                </View>
              )}
              {item.assignedVehicle.driveType && (
                <View style={styles.vehicleSpecItem}>
                  <MaterialCommunityIcons name="cog" size={12} color={colors.text.secondary} />
                  <Text style={styles.vehicleSpecText}>{item.assignedVehicle.driveType}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.vehicleStatus}>
              <MaterialCommunityIcons name="check-circle" size={14} color={colors.success} />
              <Text style={styles.vehicleStatusText}>Currently Assigned</Text>
            </View>
          </View>
        </View>
      )}

      {item.assignedVehicleId && !item.assignedVehicle && (
        <View style={styles.vehicleInfo}>
          <View style={styles.vehicleHeader}>
            <MaterialCommunityIcons name="truck" size={16} color={colors.primary} />
            <Text style={styles.vehicleTitle}>Assigned Vehicle</Text>
          </View>
          <View style={styles.vehicleDetails}>
            <Text style={styles.vehicleText}>Vehicle ID: {item.assignedVehicleId}</Text>
            <View style={styles.vehicleStatus}>
              <MaterialCommunityIcons name="information" size={14} color={colors.info} />
              <Text style={styles.vehicleStatusText}>Vehicle details loading...</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.driverActions}>
        {item.status === 'pending' && (
          <View style={styles.pendingNotice}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={colors.warning} />
            <Text style={styles.pendingText}>Awaiting admin approval</Text>
          </View>
        )}
        
        {item.status === 'approved' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.activateButton]}
            onPress={() => handleDriverAction(item.id, 'activate')}
          >
            <MaterialCommunityIcons name="play" size={16} color={colors.white} />
            <Text style={styles.actionText}>Activate</Text>
          </TouchableOpacity>
        )}

        {item.status === 'active' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deactivateButton]}
            onPress={() => handleDriverAction(item.id, 'deactivate')}
          >
            <MaterialCommunityIcons name="pause" size={16} color={colors.white} />
            <Text style={styles.actionText}>Deactivate</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate('EditDriver', { driverId: item.id })}
        >
          <MaterialCommunityIcons name="pencil" size={16} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading drivers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            try {
              navigation.goBack();
            } catch (error) {
              // Fallback navigation if goBack fails
              navigation.navigate('FleetManagement');
            }
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Driver Management</Text>
          {companyInfo && (
            <Text style={styles.companyName}>{companyInfo.companyName}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.addButton,
            (!driverValidation?.canAdd && drivers.length >= 3) && styles.addButtonDisabled
          ]}
          onPress={() => {
            // Allow adding drivers if under trial limit (3) or if validation allows
            if (drivers.length < 3 || (driverValidation?.canAdd)) {
              setRecruitModal(true);
            } else {
              // Show upgrade prompt
              Alert.alert(
                'Driver Limit Reached',
                driverValidation?.reason || 'You have reached your driver limit. Upgrade to add more drivers.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Upgrade Plan', 
                    onPress: () => navigation.navigate('CompanyFleetPlans' as never)
                  }
                ]
              );
            }
          }}
        >
          <MaterialCommunityIcons 
            name="plus" 
            size={24} 
            color={(drivers.length < 3 || driverValidation?.canAdd) ? colors.white : colors.text.secondary} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{drivers.length}</Text>
            <Text style={styles.statLabel}>Total Drivers</Text>
            {subscriptionStatus && driverValidation ? (
              <Text style={styles.statSubtext}>
                {driverValidation.currentCount} / {driverValidation.limit === -1 ? 'Unlimited' : driverValidation.limit}
              </Text>
            ) : (
              <Text style={styles.statSubtext}>
                {drivers.length} / 3 (Trial)
              </Text>
            )}
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{vehicleCount}</Text>
            <Text style={styles.statLabel}>Total Vehicles</Text>
            {subscriptionStatus && vehicleValidation ? (
              <Text style={styles.statSubtext}>
                {vehicleValidation.currentCount} / {vehicleValidation.limit === -1 ? 'Unlimited' : vehicleValidation.limit}
              </Text>
            ) : (
              <Text style={styles.statSubtext}>
                {vehicleCount} / 3 (Trial)
              </Text>
            )}
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {drivers.filter(d => d.status === 'active').length}
            </Text>
            <Text style={styles.statLabel}>Active Drivers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {drivers.filter(d => d.status === 'pending').length}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>


        {error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={48} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchDrivers}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : drivers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-group" size={64} color={colors.text.secondary} />
            <Text style={styles.emptyTitle}>No Drivers Added</Text>
            <Text style={styles.emptySubtitle}>
              Start building your team by recruiting your first driver
            </Text>
            <TouchableOpacity
              style={[
                styles.addFirstButton,
                (drivers.length >= 3 && !driverValidation?.canAdd) && styles.addFirstButtonDisabled
              ]}
              onPress={() => {
                // Allow adding first driver under trial limit
                if (drivers.length < 3 || driverValidation?.canAdd) {
                  setRecruitModal(true);
                } else {
                  // Show upgrade prompt
                  Alert.alert(
                    'Driver Limit Reached',
                    driverValidation?.reason || 'You have reached your driver limit. Upgrade to add more drivers.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Upgrade Plan', 
                        onPress: () => navigation.navigate('CompanyFleetPlans' as never)
                      }
                    ]
                  );
                }
              }}
            >
              <MaterialCommunityIcons 
                name="plus" 
                size={20} 
                color={(drivers.length < 3 || driverValidation?.canAdd) ? colors.white : colors.text.secondary} 
              />
              <Text style={[
                styles.addFirstText,
                (drivers.length >= 3 && !driverValidation?.canAdd) && styles.addFirstTextDisabled
              ]}>
                Recruit First Driver
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={drivers}
            renderItem={renderDriver}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>

      {/* Recruit Driver Modal */}
      <Modal
        visible={recruitModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setRecruitModal(false)}
            >
              <MaterialCommunityIcons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Recruit Driver</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formContainer}>
              {/* Profile Photo */}
              <View style={styles.photoSection}>
                <TouchableOpacity
                  style={styles.photoUpload}
                  onPress={() => pickDriverPhoto(setRecruitPhoto)}
                >
                  {recruitPhoto ? (
                    <Image source={{ uri: recruitPhoto.uri }} style={styles.photoPreview} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <MaterialCommunityIcons name="camera-plus" size={32} color={colors.text.secondary} />
                      <Text style={styles.photoText}>Upload Profile Photo *</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Driver Details */}
              <TextInput
                style={styles.input}
                placeholder="Driver Name *"
                value={recruitName}
                onChangeText={setRecruitName}
              />
              <TextInput
                style={styles.input}
                placeholder="Email *"
                value={recruitEmail}
                onChangeText={setRecruitEmail}
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                placeholder="Phone *"
                value={recruitPhone}
                onChangeText={setRecruitPhone}
                keyboardType="phone-pad"
              />
              
              {/* License and ID Number Fields */}
              <TextInput
                style={styles.input}
                placeholder="Driver License Number"
                value={recruitLicenseNumber}
                onChangeText={setRecruitLicenseNumber}
              />
              <TextInput
                style={styles.input}
                placeholder="ID Number"
                value={recruitIdNumber}
                onChangeText={setRecruitIdNumber}
              />

              {/* ID Document */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>ID Document (PDF or Image) *</Text>
                <TouchableOpacity style={styles.uploadBtn} onPress={() => pickDriverIdDoc(setRecruitIdDoc)}>
                  <MaterialCommunityIcons name="file-upload-outline" size={22} color={colors.primary} />
                  <Text style={styles.uploadBtnText}>{recruitIdDoc ? 'Change File' : 'Upload File'}</Text>
                </TouchableOpacity>
                {recruitIdDoc && <Text style={styles.fileName}>{recruitIdDoc.name || recruitIdDoc.fileName || 'File selected'}</Text>}
              </View>

              {/* Driver's License */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Driver's License (PDF or Image) *</Text>
                <TouchableOpacity style={styles.uploadBtn} onPress={() => pickDriverLicense(setRecruitLicense)}>
                  <MaterialCommunityIcons name="file-upload-outline" size={22} color={colors.primary} />
                  <Text style={styles.uploadBtnText}>{recruitLicense ? 'Change File' : 'Upload File'}</Text>
                </TouchableOpacity>
                {recruitLicense && <Text style={styles.fileName}>{recruitLicense.name || recruitLicense.fileName || 'File selected'}</Text>}
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setRecruitModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.recruitBtn, recruiting && styles.recruitBtnDisabled]} 
                  onPress={handleRecruitDriver}
                  disabled={recruiting}
                >
                  {recruiting ? (
                    <View style={styles.recruitingContainer}>
                      <ActivityIndicator size="small" color={colors.white} />
                      <Text style={styles.recruitingText}>
                        {recruitmentStep || 'Recruiting Driver...'}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.recruitText}>Recruit Driver</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  companyName: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.white,
    opacity: 0.8,
    marginTop: 2,
  },
  addButton: {
    padding: 8,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: fonts.family.bold,
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginTop: 4,
  },
  statSubtext: {
    fontSize: 10,
    fontFamily: fonts.family.medium,
    color: colors.primary,
    marginTop: 2,
    textAlign: 'center',
  },
  driverCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  driverPhone: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  driverEmail: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  driverDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginLeft: 8,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  vehicleText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.primary,
    marginLeft: 8,
  },
  driverActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 4,
    minWidth: 80,
    justifyContent: 'center',
  },
  pendingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.warning + '20',
    borderRadius: 8,
    marginVertical: 4,
  },
  pendingText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.warning,
    fontWeight: '500',
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  activateButton: {
    backgroundColor: colors.primary,
  },
  deactivateButton: {
    backgroundColor: colors.warning,
  },
  editButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionText: {
    fontSize: 12,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.error,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstText: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: 8,
  },
  addFirstButtonDisabled: {
    backgroundColor: colors.text.light,
    opacity: 0.6,
  },
  addFirstTextDisabled: {
    color: colors.text.secondary,
  },
  // Subscription card styles
  subscriptionCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  subscriptionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  subscriptionStatus: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginTop: 2,
  },
  usageContainer: {
    marginBottom: 16,
  },
  usageItem: {
    marginBottom: 12,
  },
  usageLabel: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginBottom: 4,
  },
  usageCount: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.background.light,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  limitReachedText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.warning,
    marginTop: 4,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: 6,
  },
  listContainer: {
    paddingBottom: 20,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  modalContent: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photoUpload: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPreview: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  photoText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginBottom: 8,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  uploadBtnText: {
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.primary,
    marginLeft: 8,
  },
  fileName: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
  },
  recruitBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  recruitBtnDisabled: {
    backgroundColor: colors.text.secondary,
  },
  recruitText: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  // Driver Profile Image Styles
  driverProfileContainer: {
    marginRight: 12,
  },
  driverProfileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.background,
  },
  driverProfilePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  // Enhanced Loading Styles
  recruitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recruitingText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.white,
    marginLeft: 8,
  },
  // Enhanced Vehicle Info Styles
  vehicleInfo: {
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleTitle: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.primary,
    marginLeft: 8,
  },
  vehicleDetails: {
    marginLeft: 24,
  },
  vehicleText: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  vehicleRegistration: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  vehicleStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleStatusText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.success,
    marginLeft: 4,
  },
  vehicleSpecs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 8,
  },
  vehicleSpecItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  vehicleSpecText: {
    fontSize: 11,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginLeft: 4,
  },
});

export default DriverManagementScreen;
