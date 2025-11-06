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
  Image,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import { apiRequest } from '../utils/api';
import { API_ENDPOINTS } from '../constants/api';
import VehicleDetailsForm from '../components/VehicleDetailsForm';
import subscriptionService, { SubscriptionStatus } from '../services/subscriptionService';
import companyFleetValidationService, { FleetValidationResult } from '../services/companyFleetValidationService';

interface Vehicle {
  id: string;
  vehicleType?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  vehicleRegistration?: string;
  vehicleCapacity?: number;
  bodyType: string;
  driveType: string;
  vehicleImagesUrl?: string[];
  insuranceUrl?: string;
  insuranceExpiryDate?: string;
  refrigerated?: boolean;
  humidityControl?: boolean;
  specialCargo?: boolean;
  features?: string;
  status: 'pending' | 'approved' | 'rejected';
  assignedDriver?: {
    id: string;
    name: string;
    phone: string;
  };
  createdAt?: string;
  updatedAt?: string;
  // Backend field names (from database)
  type?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  capacity?: number;
  registration?: string;
  images?: string[];
  insurance?: string;
}

const VehicleManagementScreen = () => {
  const navigation = useNavigation();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]); // Store all vehicles for statistics
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Vehicle modal state
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleEditIdx, setVehicleEditIdx] = useState<number | null>(null);
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [newInsuranceDocument, setNewInsuranceDocument] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  
  // Debug insurance state changes
  useEffect(() => {
    console.log('🚗 Insurance state changed:', insurance);
  }, [insurance]);
  
  // Debug form validation whenever any field changes
  useEffect(() => {
    console.log('🚗 Form fields changed - running validation check');
    isFormValid();
  }, [vehicleType, vehicleReg, vehicleMake, vehicleColor, vehicleYear, vehicleCapacity, insurance]);
  
  // Debug component rendering
  useEffect(() => {
    console.log('🚗 VehicleManagementScreen component mounted/rendered');
    console.log('🚗 Current form state:', {
      vehicleType,
      vehicleReg,
      vehicleMake,
      vehicleColor,
      vehicleYear,
      vehicleCapacity,
      insurance: !!insurance,
      showVehicleModal
    });
  }, []);
  
  // Vehicle form state
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [vehicleCapacity, setVehicleCapacity] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleDriveType, setVehicleDriveType] = useState('');
  const [bodyType, setBodyType] = useState('closed');
  const [humidityControl, setHumidityControl] = useState(false);
  const [refrigeration, setRefrigeration] = useState(false);
  const [specialCargo, setSpecialCargo] = useState(false);
  const [vehicleFeatures, setVehicleFeatures] = useState('');
  const [vehiclePhotos, setVehiclePhotos] = useState<any[]>([]);
  const [insurance, setInsurance] = useState<any>(null);
  const [assignedDriverId, setAssignedDriverId] = useState('');
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  
  // Subscription state
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [vehicleValidation, setVehicleValidation] = useState<FleetValidationResult | null>(null);
  const [driverValidation, setDriverValidation] = useState<FleetValidationResult | null>(null);
  const [driverCount, setDriverCount] = useState(0);
  const [loadingCompanyProfile, setLoadingCompanyProfile] = useState(false);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [filterVehicleType, setFilterVehicleType] = useState('all');
  const [filterBodyType, setFilterBodyType] = useState('all');
  const [filterDriveType, setFilterDriveType] = useState('all');
  const [filterFeatures, setFilterFeatures] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Filter vehicles based on search and filter criteria
  const getFilteredVehicles = () => {
    return vehicles.filter(vehicle => {
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          (vehicle.vehicleMake || vehicle.make || '').toLowerCase().includes(query) ||
          (vehicle.vehicleModel || vehicle.model || '').toLowerCase().includes(query) ||
          (vehicle.vehicleRegistration || vehicle.registration || '').toLowerCase().includes(query) ||
          (vehicle.vehicleType || vehicle.type || '').toLowerCase().includes(query) ||
          (vehicle.vehicleColor || vehicle.color || '').toLowerCase().includes(query);
        
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filterStatus !== 'all' && vehicle.status !== filterStatus) {
        return false;
      }

      // Vehicle type filter
      if (filterVehicleType !== 'all' && (vehicle.vehicleType || vehicle.type) !== filterVehicleType) {
        return false;
      }

      // Body type filter
      if (filterBodyType !== 'all' && vehicle.bodyType !== filterBodyType) {
        return false;
      }

      // Drive type filter
      if (filterDriveType !== 'all' && vehicle.driveType !== filterDriveType) {
        return false;
      }

      // Features filter
      if (filterFeatures.length > 0) {
        const vehicleFeatures: string[] = [];
        if (vehicle.refrigerated) vehicleFeatures.push('refrigerated');
        if (vehicle.humidityControl) vehicleFeatures.push('humidityControl');
        if (vehicle.specialCargo) vehicleFeatures.push('specialCargo');
        if (vehicle.driveType === '4WD') vehicleFeatures.push('4WD');
        if (vehicle.bodyType === 'open') vehicleFeatures.push('openBody');

        const hasMatchingFeature = filterFeatures.some(feature => vehicleFeatures.includes(feature));
        if (!hasMatchingFeature) return false;
      }

      return true;
    });
  };

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
      const immediateVehicleValidation = {
        canAdd: true,
        currentCount: 0,
        limit: 3,
        percentage: 0,
        reason: 'Free trial allows up to 3 vehicles'
      };
      
      const immediateDriverValidation = {
        canAdd: true,
        currentCount: 0,
        limit: 3,
        percentage: 0,
        reason: 'Free trial allows up to 3 drivers'
      };
      
      setVehicleValidation(immediateVehicleValidation);
      setDriverValidation(immediateDriverValidation);
      
      console.log('✅ IMMEDIATE TRIAL LIMITS SET - Company can add vehicles immediately');
      
      // Then fetch real subscription status in background
      try {
        const realStatus = await subscriptionService.getSubscriptionStatus();
        console.log('📊 Real subscription status loaded:', realStatus);
        
             // Update with real data if available
             if (realStatus && ((realStatus.driverLimit && realStatus.driverLimit > 0) || (realStatus.vehicleLimit && realStatus.vehicleLimit > 0))) {
          setSubscriptionStatus(realStatus);
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
      
      // Set fallback validation with trial limits
      setVehicleValidation({
        canAdd: true,
        currentCount: 0,
        limit: 3,
        percentage: 0,
        reason: 'Free trial allows up to 3 vehicles'
      });
      setDriverValidation({
        canAdd: true,
        currentCount: 0,
        limit: 3,
        percentage: 0,
        reason: 'Free trial allows up to 3 drivers'
      });
    }
  };

  const updateSubscriptionWithRealCounts = (vehicleCount: number, driverCount: number) => {
    if (subscriptionStatus) {
      console.log('📊 Updating subscription with real counts:', { vehicleCount, driverCount });
      console.log('📊 Current subscription status:', subscriptionStatus);
      
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
      
      console.log('🔍 VehicleManagementScreen - DYNAMIC Vehicle validation result:', JSON.stringify(forcedVehicleValidation, null, 2));
      console.log('🔍 VehicleManagementScreen - DYNAMIC Driver validation result:', JSON.stringify(forcedDriverValidation, null, 2));
      
      setVehicleValidation(forcedVehicleValidation);
      setDriverValidation(forcedDriverValidation);
      
      console.log('✅ VehicleManagementScreen - Validation set successfully');
    }
  };

  const fetchDriverCount = async () => {
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
          // Fetch drivers for this company
          const driversResponse = await fetch(`${API_ENDPOINTS.DRIVERS}?companyId=${company.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (driversResponse.ok) {
            const driversData = await driversResponse.json();
            const actualDriverCount = driversData.drivers?.length || 0;
            setDriverCount(actualDriverCount);
            
            // Update subscription status with real counts
            updateSubscriptionWithRealCounts(vehicles.length, actualDriverCount);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching driver count:', error);
    }
  };

  const fetchVehicles = async () => {
    try {
      setError(null);
      setLoading(true);
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      // Ensure company profile is loaded - get it directly from the function
      let currentProfile = companyProfile;
      if (!currentProfile?.id && !currentProfile?.companyId) {
        console.log('🏢 Company profile not loaded in fetchVehicles, fetching...');
        currentProfile = await fetchCompanyProfile();
        if (!currentProfile) {
          console.error('🏢 Failed to load company profile');
          setError('Unable to load company profile. Please try again.');
          setLoading(false);
          return;
        }
      }

      // Use the profile we just fetched or the existing one
      const companyId = currentProfile?.id || currentProfile?.companyId;
      if (!companyId) {
        console.error('🏢 Company ID not available');
        setError('Company ID not available. Please try again.');
        setLoading(false);
        return;
      }

      console.log('🏢 Fetching vehicles for company:', companyId);
      // Use company-specific endpoint
      const data = await apiRequest(`/companies/${companyId}/vehicles`);
      const vehiclesList = data.vehicles || [];
      // Store all vehicles for statistics, but only show approved vehicles in the list
      const allVehicles = vehiclesList;
      const approvedVehicles = vehiclesList.filter(v => v.status === 'approved');
      setAllVehicles(allVehicles);
      setVehicles(approvedVehicles);
      
      // Update subscription status with real vehicle count (only approved vehicles for limits)
      updateSubscriptionWithRealCounts(approvedVehicles.length, driverCount);
    } catch (err: any) {
      console.error('Error fetching vehicles:', err);
      setError(err.message || 'Failed to fetch vehicles');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCompanyProfile();
    await fetchVehicles();
    await fetchDriverCount();
    setRefreshing(false);
  };

  useEffect(() => {
    const initializeData = async () => {
      await fetchSubscriptionStatus();
      const profileLoaded = await fetchCompanyProfile();
      // Wait for company profile before fetching vehicles and drivers
      // The useEffect below will handle fetching vehicles/drivers when profile is loaded
    };
    
    initializeData();
  }, []);

  // Refetch vehicles and drivers when company profile is loaded
  useEffect(() => {
    if ((companyProfile?.id || companyProfile?.companyId) && !loading) {
      fetchVehicles();
      fetchDriverCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyProfile?.id, companyProfile?.companyId]);

  // Check if we should show the vehicle modal from route params
  useEffect(() => {
    const showModal = (navigation.getState()?.routes?.find(route => 
      route.name === 'VehicleManagement'
    )?.params as any)?.showVehicleModal;
    
    if (showModal) {
      setShowVehicleModal(true);
    }
  }, [navigation]);

  const fetchCompanyProfile = async (): Promise<any | null> => {
    if (loadingCompanyProfile) {
      console.log('🏢 Company profile already loading, skipping...');
      return companyProfile; // Return existing profile if already loading
    }

    try {
      setLoadingCompanyProfile(true);
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        console.error('🏢 No authenticated user');
        return null;
      }

      console.log('🏢 Fetching company profile for user:', user.uid);
      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.COMPANIES}/transporter/${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🏢 Company profile loaded:', data);
        const profile = data[0] || data;
        console.log('🏢 Setting company profile:', profile);
        console.log('🏢 Company ID:', profile?.id || profile?.companyId);
        setCompanyProfile(profile);
        return profile; // Return the profile data directly
      } else {
        console.error('🏢 Failed to load company profile:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('🏢 Error response:', errorText);
        return null;
      }
    } catch (error) {
      console.error('Error fetching company profile:', error);
      return null;
    } finally {
      setLoadingCompanyProfile(false);
    }
  };

  const openAddVehicle = async () => {
    console.log('🚗 Opening add vehicle modal...');
    console.log('🏢 Current company profile:', companyProfile);
    console.log('🏢 Company profile ID:', companyProfile?.id);
    console.log('🏢 Company profile companyId:', companyProfile?.companyId);
    
    // Ensure company profile is loaded before opening modal
    if (!companyProfile?.id && !companyProfile?.companyId) {
      console.log('🏢 Company profile not loaded, fetching...');
      
      const success = await fetchCompanyProfile();
      console.log('🏢 Fetch result:', success);
      console.log('🏢 Company profile after fetch:', companyProfile);
      
      // Check again after fetching
      if (!success || (!companyProfile?.id && !companyProfile?.companyId)) {
        Alert.alert(
          'Company Profile Error',
          'Unable to load your company profile. This might be a temporary issue.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Retry', 
              onPress: async () => {
                const retrySuccess = await fetchCompanyProfile();
                if (retrySuccess && (companyProfile?.id || companyProfile?.companyId)) {
                  setVehicleEditIdx(null);
                  resetVehicleForm();
                  setShowVehicleModal(true);
                } else {
                  Alert.alert('Error', 'Unable to load company profile. Please refresh the app and try again.');
                }
              }
            }
          ]
        );
        return;
      }
    }
    
    console.log('✅ Company profile loaded, opening modal');
    setVehicleEditIdx(null);
    resetVehicleForm();
    setShowVehicleModal(true);
  };

  const resetVehicleForm = () => {
    setVehicleType('');
    setVehicleMake('');
    setVehicleColor('');
    setVehicleReg('');
    setVehicleCapacity('');
    setVehicleYear('');
    setVehicleDriveType('');
    setBodyType('closed');
    setHumidityControl(false);
    setRefrigeration(false);
    setSpecialCargo(false);
    setVehicleFeatures('');
    setVehiclePhotos([]);
    setInsurance(null);
    setAssignedDriverId('');
  };

  const pickVehiclePhotos = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const newPhotos = result.assets.map(asset => ({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          fileName: asset.fileName || `vehicle_photo_${Date.now()}.jpg`,
        }));
        setVehiclePhotos(prev => [...prev, ...newPhotos]);
      }
    } catch (error) {
      console.error('Error picking vehicle photos:', error);
      Alert.alert('Error', 'Failed to pick photos');
    }
  };

  const removeVehiclePhoto = (index: number) => {
    setVehiclePhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Form validation function - require insurance as mandatory
  const isFormValid = () => {
    const isValid = !!(
      vehicleType && 
      vehicleReg && 
      vehicleMake && 
      vehicleColor && 
      vehicleYear && 
      vehicleCapacity &&
      insurance
    );
    
    console.log('🚗 Form validation check:', {
      vehicleType: !!vehicleType,
      vehicleReg: !!vehicleReg,
      vehicleMake: !!vehicleMake,
      vehicleColor: !!vehicleColor,
      vehicleYear: !!vehicleYear,
      vehicleCapacity: !!vehicleCapacity,
      insurance: !!insurance,
      isValid
    });
    
    return isValid;
  };

  const pickInsurance = async () => {
    try {
      console.log('🚗 Starting insurance document picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      console.log('🚗 Document picker result:', result);
      
      if (!result.canceled && result.assets) {
        const asset = result.assets[0];
        console.log('🚗 Selected insurance asset:', asset);
        setInsurance({
          uri: asset.uri,
          type: asset.mimeType || 'application/pdf',
          fileName: asset.name,
        });
        console.log('🚗 Insurance set successfully');
      } else {
        console.log('🚗 Document picker was canceled');
      }
    } catch (error) {
      console.error('Error picking insurance document:', error);
      Alert.alert('Error', 'Failed to pick insurance document');
    }
  };

  const handleSaveVehicle = async () => {
    console.log('🚗 ===== HANDLE SAVE VEHICLE CALLED =====');
    console.log('🚗 Function start - loadingProfile:', loadingProfile);
    console.log('🚗 Function start - isFormValid():', isFormValid());
    
    // Enhanced validation with detailed error messages
    const validationErrors = [];
    
    if (!vehicleType) {
      validationErrors.push('Vehicle Type is required');
    }
    
    if (!vehicleReg || vehicleReg.trim().length === 0) {
      validationErrors.push('Registration Number is required');
    } else if (vehicleReg.trim().length < 3) {
      validationErrors.push('Registration Number must be at least 3 characters');
    }
    
    if (!vehicleMake || vehicleMake.trim().length === 0) {
      validationErrors.push('Vehicle Make is required');
    }
    
    if (!vehicleColor || vehicleColor.trim().length === 0) {
      validationErrors.push('Vehicle Color is required');
    }
    
    const yearNum = parseInt(vehicleYear);
    const capacityNum = parseFloat(vehicleCapacity);
    
    if (!vehicleYear || yearNum < 1990 || yearNum > new Date().getFullYear() + 1) {
      validationErrors.push('Vehicle Year must be between 1990 and ' + (new Date().getFullYear() + 1));
    }
    
    if (!vehicleCapacity || capacityNum < 1 || capacityNum > 50) {
      validationErrors.push('Vehicle Capacity must be between 1 and 50 tons');
    }
    
    if (!insurance) {
      validationErrors.push('Vehicle Insurance Document is required');
    }
    
    if (vehiclePhotos.length < 1) {
      validationErrors.push('At least 1 vehicle photo is required');
    } else if (vehiclePhotos.length > 10) {
      validationErrors.push('Maximum 10 vehicle photos allowed');
    }
    
    if (validationErrors.length > 0) {
      Alert.alert(
        'Validation Error', 
        validationErrors.join('\n\n'),
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    if (!companyProfile?.id && !companyProfile?.companyId) {
      Alert.alert('Error', 'Company profile not loaded. Please refresh and try again.');
      console.error('🚗 Company profile missing:', companyProfile);
      return;
    }

    try {
      setLoadingProfile(true);
      
      // Get auth token
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const token = await user.getIdToken();
      
      // Create or update vehicle via API with FormData
      const isEdit = vehicleEditIdx !== null;
      const vehicleId = isEdit ? vehicles[vehicleEditIdx]?.id : null;
      
      // Check if we're at the vehicle limit before attempting to add
      if (!isEdit && vehicleValidation && !vehicleValidation.canAdd) {
        Alert.alert(
          'Vehicle Limit Reached',
          `You have reached your vehicle limit of ${vehicleValidation.limit} vehicles. Please upgrade your plan to add more vehicles.`,
          [{ text: 'OK' }]
        );
        return;
      }
        
      // Use the correct endpoint structure
      const companyId = companyProfile?.id || companyProfile?.companyId;
      console.log('🏢 Using company ID for vehicle endpoint:', companyId);
      console.log('🏢 Full company profile structure:', JSON.stringify(companyProfile, null, 2));
      
      if (!companyId) {
        throw new Error('Company ID not found in profile. Please refresh and try again.');
      }
      
      const url = isEdit 
        ? `${API_ENDPOINTS.VEHICLES}/${vehicleId}`
        : `${API_ENDPOINTS.VEHICLES}`;
      
      // Create FormData for multipart upload (original working approach)
      const formData = new FormData();
      
      // Add vehicle data fields - match backend field names and validation requirements
      formData.append('companyId', companyId);
      formData.append('vehicleType', vehicleType);
      formData.append('vehicleMake', vehicleMake);
      formData.append('vehicleModel', vehicleMake); // Backend validation requires this field
      formData.append('vehicleColor', vehicleColor);
      formData.append('vehicleRegistration', vehicleReg);
      formData.append('vehicleYear', vehicleYear);
      formData.append('vehicleCapacity', vehicleCapacity);
      formData.append('features', vehicleFeatures);
      formData.append('specialCargo', specialCargo.toString());
      formData.append('refrigerated', refrigeration.toString());
      formData.append('humidityControl', humidityControl.toString());
      formData.append('bodyType', bodyType);
      formData.append('driveType', vehicleDriveType);
      if (assignedDriverId) {
        formData.append('assignedDriverId', assignedDriverId);
      }
      
      // Add vehicle photos with proper file structure
      if (vehiclePhotos.length > 0) {
        vehiclePhotos.forEach((photo, index) => {
          formData.append('vehicleImages', {
            uri: photo.uri,
            type: photo.mimeType || 'image/jpeg',
            name: photo.fileName || `vehicle_photo_${index + 1}.jpg`,
          } as any);
          console.log(`🚗 Added vehicle photo ${index + 1}:`, photo.fileName || `vehicle_photo_${index + 1}.jpg`);
        });
        console.log(`🚗 Added ${vehiclePhotos.length} vehicle photos to FormData`);
      }
      
      // Add insurance document with proper file structure
      if (insurance) {
        formData.append('insurance', {
          uri: insurance.uri,
          type: insurance.mimeType || 'image/jpeg',
          name: insurance.fileName || 'insurance.pdf',
        } as any);
        console.log('🚗 Added insurance file to FormData:', insurance.fileName || 'insurance.pdf');
      }
      
      console.log('🚗 FormData created with vehicle data and files');
      
      try {
        // Create vehicle with FormData (using working driver recruitment pattern)
        console.log('🚗 Sending request to:', url);
        console.log('🚗 Request method:', isEdit ? 'PUT' : 'POST');
        console.log('🚗 FormData entries:');
        for (let [key, value] of formData.entries()) {
          console.log(`🚗 ${key}:`, typeof value === 'object' ? '[File]' : value);
        }
        
        console.log('🚗 About to make fetch request...');
        console.log('🚗 Request headers:', {
          'Authorization': `Bearer ${token.substring(0, 20)}...`,
          'Content-Type': 'multipart/form-data (auto-set by React Native)'
        });
        
        const response = await fetch(url, {
          method: isEdit ? 'PUT' : 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            // Don't set Content-Type for FormData - let React Native set it automatically
          },
          body: formData
        });
        
        console.log('🚗 Fetch request completed successfully');
        console.log('🚗 Response status:', response.status);
        console.log('🚗 Response ok:', response.ok);
          
          // Handle response like working version (text first, then parse)
          const responseText = await response.text();
          console.log('🚗 Response text:', responseText);
          
          let responseData = null;
          let parseError = null;
          
          try {
            if (responseText.trim()) {
              responseData = JSON.parse(responseText);
            }
          } catch (parseErr) {
            parseError = parseErr;
            console.error('🚗 JSON parse error:', parseErr);
          }
          
          if (parseError) {
            console.error('🚗 Failed to parse response as JSON:', responseText);
            throw new Error(`Invalid response format: ${responseText}`);
          }
          
          console.log('🚗 Response data:', responseData);
          
          // Check for validation errors
          if (!response.ok) {
            console.error('🚗 Request failed with status:', response.status);
            console.error('🚗 Error response:', responseData);
            
            if (response.status === 400 && responseData?.errors) {
              const errorMessages = responseData.errors.map((err: any) => err.msg || err.message).join(', ');
              throw new Error(`Validation failed: ${errorMessages}`);
            } else if (responseData?.message) {
              throw new Error(responseData.message);
            } else {
              throw new Error(`Request failed: ${response.status} - ${response.statusText}`);
            }
          }
          
          if (response.ok && responseData && responseData.success) {
            console.log('✅ Vehicle created successfully with files:', responseData);
            
            // Update local state
            const newVehicle: Vehicle = {
              id: responseData.data?.vehicle?.id || responseData.data?.id || Date.now().toString(),
              vehicleType: vehicleType,
              vehicleMake: vehicleMake,
              vehicleModel: vehicleMake, // Using make as model for now
              vehicleYear: parseInt(vehicleYear) || 2020,
              vehicleColor: vehicleColor,
              vehicleRegistration: vehicleReg,
              vehicleCapacity: parseFloat(vehicleCapacity) || 5,
              bodyType: bodyType,
              driveType: vehicleDriveType,
              vehicleImagesUrl: vehiclePhotos.map(photo => photo.uri),
              insuranceUrl: insurance?.uri || '',
              insuranceExpiryDate: '',
              refrigerated: refrigeration,
              humidityControl: humidityControl,
              specialCargo: specialCargo,
              features: vehicleFeatures,
              status: 'pending',
              assignedDriver: assignedDriverId ? { id: assignedDriverId, name: '', phone: '' } : undefined,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
          };
          
          let updated;
          if (vehicleEditIdx !== null) {
            updated = [...vehicles];
            updated[vehicleEditIdx] = newVehicle;
          } else {
            updated = [...vehicles, newVehicle];
          }
          setVehicles(updated);
          setShowVehicleModal(false);
          
          // Show success message
          Alert.alert(
            isEdit ? 'Vehicle Updated' : 'Vehicle Added',
            isEdit 
              ? 'Vehicle updated successfully!\n\nChanges will be reviewed by admin before approval.'
              : 'Vehicle added successfully!\n\nIt will be reviewed by admin before approval. You can track its status in the vehicles list.',
            [{ text: 'OK', style: 'default' }]
          );
          
          // Clear form after successful submission
          setVehicleType('');
          setVehicleReg('');
          setVehicleMake('');
          setVehicleColor('');
          setVehicleYear('2020');
          setVehicleCapacity('5');
          setBodyType('closed');
          setVehicleDriveType('2WD');
          setRefrigeration(false);
          setHumidityControl(false);
          setSpecialCargo(false);
          setVehicleFeatures('');
          setVehiclePhotos([]);
          setInsurance(null);
          setVehicleEditIdx(null);
          
          Alert.alert(
            'Success! 🎉', 
            'Vehicle added successfully!\n\nIt will be reviewed by admin before approval. You can track its status in the vehicles list.',
            [{ text: 'OK', style: 'default' }]
          );
        } else {
          const errorMessage = responseData?.message || `Server error: ${response.status} - ${response.statusText}`;
          console.error('❌ Vehicle creation failed:', responseData);
          Alert.alert('Error', errorMessage);
        }
      } catch (error: any) {
        console.error('❌ Vehicle creation error:', error);
        console.error('❌ Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          type: typeof error
        });
        
        // No fallback needed - the main FormData approach should work with the fixed backend
        
        let errorMessage = 'Network connection failed. Please check your internet connection and try again.';
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again with a better connection.';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Unable to connect to server. Please try again later.';
        } else if (error.message.includes('Network request failed')) {
          errorMessage = 'Network request failed. Please check your internet connection.';
        }
        
        console.error('❌ Showing error alert:', errorMessage);
        
        Alert.alert(
          'Network Error', 
          errorMessage,
          [{ text: 'OK', style: 'cancel' }] // Remove retry to prevent duplicates
        );
      } finally {
        setLoadingProfile(false);
      }
    } catch (error: any) {
      console.error('❌ Error creating vehicle:', error);
      Alert.alert('Error', 'Failed to create vehicle. Please try again.');
      setLoadingProfile(false);
    }
  };

  // Function to get colors for spec cards
  const getSpecCardColors = (specType: string, vehicleColor?: string) => {
    // Enhanced color mapping for vehicle colors
    const getVehicleColorHex = (color: string) => {
      const colorMap: { [key: string]: string } = {
        'white': '#FFFFFF',
        'black': '#000000',
        'red': '#FF0000',
        'blue': '#0066CC',
        'green': '#00AA00',
        'yellow': '#FFD700',
        'orange': '#FF8C00',
        'purple': '#800080',
        'pink': '#FF69B4',
        'brown': '#8B4513',
        'gray': '#808080',
        'grey': '#808080',
        'silver': '#C0C0C0',
        'gold': '#FFD700',
        'navy': '#000080',
        'maroon': '#800000',
        'lime': '#00FF00',
        'cyan': '#00FFFF',
        'magenta': '#FF00FF',
        'teal': '#008080',
        'olive': '#808000'
      };
      
      const normalizedColor = color.toLowerCase().trim();
      return colorMap[normalizedColor] || color;
    };

    const colorMap = {
      color: {
        background: vehicleColor ? getVehicleColorHex(vehicleColor) : '#BDBDBD',
        text: vehicleColor && vehicleColor.toLowerCase() !== 'white' ? '#FFFFFF' : '#000000',
        border: vehicleColor ? getVehicleColorHex(vehicleColor) : '#BDBDBD'
      },
      capacity: {
        background: colors.secondary + '20',
        text: colors.secondary,
        border: colors.secondary + '40'
      },
      bodyType: {
        background: colors.tertiary + '20',
        text: colors.tertiary,
        border: colors.tertiary + '40'
      },
      driveType: {
        background: colors.warning + '20',
        text: colors.warning,
        border: colors.warning + '40'
      }
    };
    
    return colorMap[specType as keyof typeof colorMap] || {
      background: colors.background,
      text: colors.text.primary,
      border: colors.border
    };
  };

  const renderVehicle = ({ item }: { item: Vehicle }) => {
    // Get the best display photo (first image or placeholder)
    const displayPhoto = item.vehicleImagesUrl && item.vehicleImagesUrl.length > 0 
      ? item.vehicleImagesUrl[0] 
      : null;

    // Get important features for driver assignment
    const features = [];
    if (item.refrigerated) features.push('Refrigerated');
    if (item.humidityControl) features.push('Humidity Control');
    if (item.specialCargo) features.push('Special Cargo');
    if (item.driveType === '4WD') features.push('4WD');
    if (item.bodyType === 'open') features.push('Open Body');

    return (
      <View style={styles.vehicleCard}>
        {/* Enhanced Vehicle Header with Photo */}
        <View style={styles.vehicleHeaderContainer}>
          <View style={styles.vehicleImageContainer}>
            {displayPhoto ? (
              <Image 
                source={{ uri: displayPhoto }} 
                style={styles.vehicleImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.vehicleImagePlaceholder}>
                <MaterialCommunityIcons name="truck" size={32} color={colors.text.secondary} />
              </View>
            )}
            <View style={[
              styles.statusIndicator,
              { backgroundColor: item.status === 'approved' ? colors.success : 
                               item.status === 'rejected' ? colors.error : colors.warning }
            ]} />
          </View>
          
          <View style={styles.vehicleHeaderInfo}>
            <View style={styles.vehicleTitleRow}>
              <Text style={styles.vehicleTitle}>
                {item.vehicleMake || item.make} {item.vehicleModel || item.model}
              </Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: item.status === 'approved' ? colors.success : 
                                 item.status === 'rejected' ? colors.error : colors.warning }
              ]}>
                <Text style={styles.statusText}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
            </View>
            <Text style={styles.vehicleSubtitle}>
              {item.vehicleType || item.type} • {item.vehicleRegistration || item.registration} • {item.vehicleYear || item.year}
            </Text>
          </View>
        </View>

        {/* Compact Specifications Grid */}
        <View style={styles.specsGrid}>
          <View style={styles.specItem}>
            <MaterialCommunityIcons name="palette" size={16} color={colors.text.secondary} />
            <Text style={styles.specLabel}>Color</Text>
            <Text style={styles.specValue}>{item.vehicleColor || item.color || 'N/A'}</Text>
          </View>
          <View style={styles.specItem}>
            <MaterialCommunityIcons name="weight" size={16} color={colors.text.secondary} />
            <Text style={styles.specLabel}>Capacity</Text>
            <Text style={styles.specValue}>{item.vehicleCapacity || item.capacity || 0}t</Text>
          </View>
          <View style={styles.specItem}>
            <MaterialCommunityIcons name="car" size={16} color={colors.text.secondary} />
            <Text style={styles.specLabel}>Body</Text>
            <Text style={styles.specValue}>{item.bodyType}</Text>
          </View>
          <View style={styles.specItem}>
            <MaterialCommunityIcons name="cog" size={16} color={colors.text.secondary} />
            <Text style={styles.specLabel}>Drive</Text>
            <Text style={styles.specValue}>{item.driveType}</Text>
          </View>
        </View>

        {/* Features Tags */}
        {features.length > 0 && (
          <View style={styles.featuresContainer}>
            <View style={styles.featuresTags}>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureTag}>
                  <Text style={styles.featureTagText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Status and Actions Row */}
        <View style={styles.vehicleFooter}>
          <View style={styles.vehicleStatus}>
            {item.insuranceUrl && (
              <View style={styles.insuranceStatus}>
                <MaterialCommunityIcons name="shield-check" size={14} color={colors.success} />
                <Text style={styles.insuranceText}>Insured</Text>
              </View>
            )}
            {item.assignedDriver && (
              <View style={styles.assignedDriverInfo}>
                <View style={styles.driverStatus}>
                  <MaterialCommunityIcons name="account-check" size={14} color={colors.success} />
                  <Text style={styles.driverText}>Assigned Driver</Text>
                </View>
                <Text style={styles.driverName}>
                  {item.assignedDriver.firstName && item.assignedDriver.lastName 
                    ? `${item.assignedDriver.firstName} ${item.assignedDriver.lastName}` 
                    : item.assignedDriver.name || 'Driver Name Not Available'
                  }
                </Text>
                <Text style={styles.driverPhone}>{item.assignedDriver.phone}</Text>
              </View>
            )}
          </View>
          
          <View style={[
            styles.vehicleActions,
            item.assignedDriver && styles.vehicleActionsWithDriver
          ]}>
            <TouchableOpacity
              style={[
                styles.editButton,
                item.assignedDriver && styles.editButtonWithDriver
              ]}
              onPress={() => {
                setVehicleEditIdx(vehicles.findIndex(v => v.id === item.id));
                setVehicleType(item.vehicleType || item.type || '');
                setVehicleMake(item.vehicleMake || item.make || '');
                setVehicleColor(item.vehicleColor || item.color || '');
                setVehicleReg(item.vehicleRegistration || item.registration || '');
                setVehicleYear((item.vehicleYear || item.year || 2020).toString());
                setVehicleCapacity((item.vehicleCapacity || item.capacity || 0).toString());
                setBodyType(item.bodyType || 'closed');
                setVehicleDriveType(item.driveType || '2WD');
                setRefrigeration(item.refrigerated || false);
                setHumidityControl(item.humidityControl || false);
                setSpecialCargo(item.specialCargo || false);
                setVehicleFeatures(item.features || '');
                setVehiclePhotos(item.vehicleImagesUrl?.map(url => ({ uri: url })) || []);
                setInsurance(item.insuranceUrl ? { uri: item.insuranceUrl } : null);
                setShowVehicleModal(true);
              }}
            >
              <MaterialCommunityIcons name="pencil" size={12} color={colors.primary} />
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.assignButton,
                item.assignedDriver && styles.reassignButton
              ]}
              onPress={() => {
                navigation.navigate('DriverAssignments', { 
                  vehicleId: item.id,
                  vehicleMake: item.vehicleMake || item.make,
                  vehicleModel: item.vehicleModel || item.model,
                  vehicleRegistration: item.vehicleRegistration || item.registration,
                  hasAssignedDriver: !!item.assignedDriver
                });
              }}
            >
              <MaterialCommunityIcons 
                name={item.assignedDriver ? "account-switch" : "account-plus"} 
                size={12} 
                color={colors.white} 
              />
              <Text style={styles.assignButtonText}>
                {item.assignedDriver ? 'Reassign' : 'Assign'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading vehicles...</Text>
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
            } catch {
              // Fallback navigation if goBack fails
              // Navigation fallback
            }
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fleet Management</Text>
        <TouchableOpacity
          style={[
            styles.addButton,
            (vehicleValidation && !vehicleValidation.canAdd) && styles.addButtonDisabled
          ]}
          onPress={() => {
            if (vehicleValidation?.canAdd || !vehicleValidation) {
              openAddVehicle();
            } else {
              // Show upgrade prompt
              Alert.alert(
                'Vehicle Limit Reached',
                vehicleValidation?.reason || 'You have reached your vehicle limit.',
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
            color={(vehicleValidation?.canAdd || !vehicleValidation) ? colors.white : colors.text.secondary} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{allVehicles.length}</Text>
            <Text style={styles.statLabel}>Total Vehicles</Text>
            {subscriptionStatus && vehicleValidation ? (
              <Text style={styles.statSubtext}>
                {vehicleValidation.currentCount} / {vehicleValidation.limit === -1 ? 'Unlimited' : vehicleValidation.limit}
              </Text>
            ) : (
              <Text style={styles.statSubtext}>
                {allVehicles.length} / 3 (Trial)
              </Text>
            )}
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{driverCount}</Text>
            <Text style={styles.statLabel}>Total Drivers</Text>
            {subscriptionStatus && driverValidation ? (
              <Text style={styles.statSubtext}>
                {driverValidation.currentCount} / {driverValidation.limit === -1 ? 'Unlimited' : driverValidation.limit}
              </Text>
            ) : (
              <Text style={styles.statSubtext}>
                {driverCount} / 3 (Trial)
              </Text>
            )}
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {allVehicles.filter(v => v.status === 'approved').length}
            </Text>
            <Text style={styles.statLabel}>Active Vehicles</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {allVehicles.filter(v => v.assignedDriver).length}
            </Text>
            <Text style={styles.statLabel}>Assigned</Text>
          </View>
        </View>


        {/* Search and Filter Section */}
        <View style={styles.searchFilterContainer}>
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.text.secondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search vehicles by make, model, registration..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.text.secondary}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <MaterialCommunityIcons name="filter" size={20} color={colors.primary} />
            <Text style={styles.filterButtonText}>Filters</Text>
            {(filterStatus !== 'all' || filterVehicleType !== 'all' || filterBodyType !== 'all' || filterDriveType !== 'all' || filterFeatures.length > 0) && (
              <View style={styles.filterBadge} />
            )}
          </TouchableOpacity>
        </View>

        {/* Filter Options */}
        {showFilters && (
          <View style={styles.filterOptions}>
            {/* Status Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.filterRow}>
                {['all', 'pending', 'approved', 'rejected'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterChip,
                      filterStatus === status && styles.filterChipActive
                    ]}
                    onPress={() => setFilterStatus(status as any)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      filterStatus === status && styles.filterChipTextActive
                    ]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Vehicle Type Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Vehicle Type</Text>
              <View style={styles.filterRow}>
                {['all', 'truck', 'van', 'pickup', 'trailer'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterChip,
                      filterVehicleType === type && styles.filterChipActive
                    ]}
                    onPress={() => setFilterVehicleType(type)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      filterVehicleType === type && styles.filterChipTextActive
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Body Type Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Body Type</Text>
              <View style={styles.filterRow}>
                {['all', 'closed', 'open', 'flatbed'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterChip,
                      filterBodyType === type && styles.filterChipActive
                    ]}
                    onPress={() => setFilterBodyType(type)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      filterBodyType === type && styles.filterChipTextActive
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Drive Type Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Drive Type</Text>
              <View style={styles.filterRow}>
                {['all', '2WD', '4WD'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterChip,
                      filterDriveType === type && styles.filterChipActive
                    ]}
                    onPress={() => setFilterDriveType(type)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      filterDriveType === type && styles.filterChipTextActive
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Features Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Features</Text>
              <View style={styles.filterRow}>
                {[
                  { key: 'refrigerated', label: 'Refrigerated' },
                  { key: 'humidityControl', label: 'Humidity Control' },
                  { key: 'specialCargo', label: 'Special Cargo' },
                  { key: '4WD', label: '4WD' },
                  { key: 'openBody', label: 'Open Body' }
                ].map((feature) => (
                  <TouchableOpacity
                    key={feature.key}
                    style={[
                      styles.filterChip,
                      filterFeatures.includes(feature.key) && styles.filterChipActive
                    ]}
                    onPress={() => {
                      if (filterFeatures.includes(feature.key)) {
                        setFilterFeatures(filterFeatures.filter(f => f !== feature.key));
                      } else {
                        setFilterFeatures([...filterFeatures, feature.key]);
                      }
                    }}
                  >
                    <Text style={[
                      styles.filterChipText,
                      filterFeatures.includes(feature.key) && styles.filterChipTextActive
                    ]}>
                      {feature.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Clear Filters */}
            <TouchableOpacity 
              style={styles.clearFiltersButton}
              onPress={() => {
                setFilterStatus('all');
                setFilterVehicleType('all');
                setFilterBodyType('all');
                setFilterDriveType('all');
                setFilterFeatures([]);
              }}
            >
              <Text style={styles.clearFiltersText}>Clear All Filters</Text>
            </TouchableOpacity>
          </View>
        )}

        {error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={48} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchVehicles}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : vehicles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="truck" size={64} color={colors.text.secondary} />
            <Text style={styles.emptyTitle}>No Vehicles Added</Text>
            <Text style={styles.emptySubtitle}>
              Start building your fleet by adding your first vehicle
            </Text>
            <TouchableOpacity
              style={[
                styles.addFirstButton,
                (vehicleValidation && !vehicleValidation.canAdd) && styles.addFirstButtonDisabled
              ]}
              onPress={() => {
                if (vehicleValidation?.canAdd || !vehicleValidation) {
                  openAddVehicle();
                } else {
                  // Show upgrade prompt
                  Alert.alert(
                    'Vehicle Limit Reached',
                    vehicleValidation?.reason || 'You have reached your vehicle limit.',
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
                color={(vehicleValidation?.canAdd || !vehicleValidation) ? colors.white : colors.text.secondary} 
              />
              <Text style={[
                styles.addFirstText,
                (vehicleValidation && !vehicleValidation.canAdd) && styles.addFirstTextDisabled
              ]}>
                Add First Vehicle
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={getFilteredVehicles()}
            renderItem={renderVehicle}
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

      {/* Vehicle Modal */}
      <Modal
        visible={showVehicleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVehicleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.vehicleModalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHandle} />
              <View style={styles.modalTitleContainer}>
                <Text style={styles.editTitle}>{vehicleEditIdx !== null ? 'Edit Vehicle' : 'Add Vehicle'}</Text>
                <Text style={styles.modalSubtitle}>Fill in your vehicle details</Text>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowVehicleModal(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            
            {/* Modal Content */}
            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {/* Vehicle Details Form */}
              <VehicleDetailsForm
                initial={{
                  vehicleType: vehicleType,
                  vehicleMake: vehicleMake,
                  vehicleColor: vehicleColor,
                  registration: vehicleReg,
                  maxCapacity: vehicleCapacity,
                  year: vehicleYear,
                  driveType: vehicleDriveType,
                  bodyType: bodyType,
                  humidityControl: humidityControl,
                  refrigeration: refrigeration,
                  specialCargo: specialCargo,
                  vehicleFeatures: vehicleFeatures
                }}
                onChange={(data) => {
                  setVehicleType(data.vehicleType);
                  setVehicleMake(data.vehicleMake);
                  setVehicleColor(data.vehicleColor);
                  setVehicleReg(data.registration);
                  setVehicleCapacity(data.maxCapacity);
                  setVehicleYear(data.year);
                  setVehicleDriveType(data.driveType);
                  setBodyType(data.bodyType);
                  setHumidityControl(data.humidityControl || false);
                  setRefrigeration(data.refrigeration || false);
                  setSpecialCargo(data.specialCargo || false);
                  setVehicleFeatures(data.vehicleFeatures || '');
                }}
                onPhotoAdd={pickVehiclePhotos}
                onPhotoRemove={removeVehiclePhoto}
                onFilePick={pickInsurance}
                vehiclePhotos={vehiclePhotos}
                error={error || undefined}
              />
              
              {/* Vehicle Insurance Section */}
              <View style={styles.section}>
                <Text style={styles.editLabel}>Vehicle Insurance Document (PDF or Image) *</Text>
                <TouchableOpacity style={styles.uploadBtn} onPress={pickInsurance}>
                  <MaterialCommunityIcons name="file-upload-outline" size={22} color={colors.primary} />
                  <Text style={styles.uploadBtnText}>{insurance ? 'Change File' : 'Upload Vehicle Insurance'}</Text>
                </TouchableOpacity>
                {insurance && <Text style={styles.fileName}>{insurance.fileName || insurance.uri?.split('/').pop()}</Text>}
              </View>

            </ScrollView>
            
            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowVehicleModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              {console.log('🚗 RENDERING SAVE VEHICLE BUTTON - isFormValid():', isFormValid(), 'loadingProfile:', loadingProfile)}
              <TouchableOpacity
                style={[
                  styles.saveBtn, 
                  (loadingProfile || !isFormValid()) && styles.disabledBtn
                ]}
                onPress={() => {
                  console.log('🚗 ===== SAVE VEHICLE BUTTON PRESSED =====');
                  console.log('🚗 Button press - loadingProfile:', loadingProfile);
                  console.log('🚗 Button press - isFormValid():', isFormValid());
                  console.log('🚗 Button press - disabled:', loadingProfile || !isFormValid());
                  
                  // Test if function call works
                  try {
                    console.log('🚗 About to call handleSaveVehicle...');
                    handleSaveVehicle();
                    console.log('🚗 handleSaveVehicle called successfully');
                  } catch (error) {
                    console.error('🚗 Error calling handleSaveVehicle:', error);
                  }
                }}
                disabled={loadingProfile || !isFormValid()}
              >
                {loadingProfile ? (
                  <View style={styles.buttonLoadingContainer}>
                    <ActivityIndicator size="small" color={colors.white} />
                    <Text style={[styles.saveBtnText, { marginLeft: 8 }]}>Saving...</Text>
                  </View>
                ) : (
                  <Text style={styles.saveBtnText}>
                    {vehicleEditIdx !== null ? 'Update Vehicle' : 'Save Vehicle'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Insurance Renewal Modal */}
      <Modal
        visible={showInsuranceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInsuranceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Renew Insurance</Text>
              <TouchableOpacity
                onPress={() => setShowInsuranceModal(false)}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.insuranceModalContent}>
              <Text style={styles.insuranceModalText}>
                Upload the new insurance document for this vehicle. The document will be reviewed by admin.
              </Text>

              <TouchableOpacity
                style={styles.documentUploadButton}
                onPress={async () => {
                  try {
                    const result = await DocumentPicker.getDocumentAsync({
                      type: ['application/pdf', 'image/*'],
                      copyToCacheDirectory: true,
                    });
                    if (!result.canceled && result.assets && result.assets.length > 0) {
                      setNewInsuranceDocument(result.assets[0]);
                    }
                  } catch (err) {
                    Alert.alert('Error', 'Failed to pick document');
                  }
                }}
              >
                <MaterialCommunityIcons name="upload" size={20} color={colors.primary} />
                <Text style={styles.uploadButtonText}>
                  {newInsuranceDocument ? 'Change Document' : 'Select Insurance Document'}
                </Text>
              </TouchableOpacity>

              {newInsuranceDocument && (
                <View style={styles.selectedDocument}>
                  <MaterialCommunityIcons name="file-document" size={16} color={colors.success} />
                  <Text style={styles.selectedDocumentText}>
                    {newInsuranceDocument.name}
                  </Text>
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowInsuranceModal(false);
                    setNewInsuranceDocument(null);
                    setSelectedVehicleId(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    !newInsuranceDocument && styles.saveButtonDisabled
                  ]}
                  onPress={async () => {
                    if (!newInsuranceDocument || !selectedVehicleId) return;
                    
                    try {
                      setLoading(true);
                      
                      // Get current user
                      const { getAuth } = require('firebase/auth');
                      const auth = getAuth();
                      const user = auth.currentUser;
                      if (!user) {
                        throw new Error('User not authenticated');
                      }
                      
                      // Update the vehicle with new insurance using FormData
                      const token = await user.getIdToken();
                      const formData = new FormData();
                      formData.append('insurance', {
                        uri: newInsuranceDocument.uri,
                        type: newInsuranceDocument.type || 'application/pdf',
                        name: newInsuranceDocument.fileName || 'insurance.pdf'
                      } as any);
                      
                      const response = await fetch(`${API_ENDPOINTS.COMPANIES}/${companyProfile?.id || companyProfile?.companyId}/vehicles/${selectedVehicleId}/insurance`, {
                        method: 'PUT',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          // Don't set Content-Type for FormData
                        },
                        body: formData
                      });

                        if (response.ok) {
                          Alert.alert(
                            'Insurance Updated',
                            'New insurance document uploaded successfully. It will be reviewed by admin.',
                            [{ text: 'OK', onPress: () => {
                              setShowInsuranceModal(false);
                              setNewInsuranceDocument(null);
                              setSelectedVehicleId(null);
                              fetchVehicles(); // Refresh the vehicles list
                            }}]
                          );
                        } else {
                          throw new Error('Failed to update insurance');
                        }
                    } catch (error) {
                      console.error('Error updating insurance:', error);
                      Alert.alert('Error', 'Failed to update insurance document');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={!newInsuranceDocument}
                >
                  <Text style={styles.saveButtonText}>Update Insurance</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  addButton: {
    padding: 8,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
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
  vehicleCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 4, // Add horizontal margin to prevent overflow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Enhanced Vehicle Header
  vehicleHeaderContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  vehicleImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  vehicleImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  vehicleImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  statusIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.white,
  },
  vehicleHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  vehicleTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  vehicleTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  vehicleSubtitle: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  // Compact Specifications Grid
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: '22%',
    flex: 1,
  },
  specLabel: {
    fontSize: 11,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginLeft: 4,
    marginRight: 4,
  },
  specValue: {
    fontSize: 12,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  // Features Tags
  featuresContainer: {
    marginBottom: 12,
  },
  featuresTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  featureTag: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  featureTagText: {
    fontSize: 11,
    fontFamily: fonts.family.medium,
    color: colors.primary,
  },
  // Vehicle Footer
  vehicleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  vehicleStatus: {
    flexDirection: 'row',
    gap: 12,
  },
  insuranceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  insuranceText: {
    fontSize: 11,
    fontFamily: fonts.family.medium,
    color: colors.success,
    marginLeft: 4,
  },
  driverStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  driverText: {
    fontSize: 11,
    fontFamily: fonts.family.medium,
    color: colors.primary,
    marginLeft: 4,
  },
  vehicleActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: fonts.family.semiBold,
    color: colors.primary,
    marginLeft: 6,
  },
  assignButtonText: {
    fontSize: 12,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: 6,
  },
  reassignButton: {
    backgroundColor: colors.warning,
  },
  // Specific styles for vehicles with assigned drivers
  vehicleActionsWithDriver: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  editButtonWithDriver: {
    flexShrink: 1,
    minWidth: 0,
  },
  assignedDriverInfo: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  driverName: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginTop: 4,
  },
  driverPhone: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginTop: 2,
  },
  vehiclePhotoContainer: {
    marginBottom: 12,
  },
  vehiclePhoto: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    resizeMode: 'contain',
  },
  vehiclePhotoPlaceholder: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.text.light,
    borderStyle: 'dashed',
  },
  featuresContainer: {
    marginTop: 12,
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  featuresTitle: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 6,
  },
  featuresText: {
    fontSize: 13,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  insuranceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  insuranceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insuranceText: {
    fontSize: 13,
    fontFamily: fonts.family.medium,
    color: colors.success,
    marginLeft: 6,
  },
  renewInsuranceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  renewInsuranceText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.primary,
    marginLeft: 4,
  },
  vehicleSpecs: {
    marginTop: 12,
    marginBottom: 8,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  specItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginHorizontal: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
    borderWidth: 1,
    borderColor: colors.text.light + '20',
  },
  specLabel: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginTop: 6,
    marginBottom: 3,
    textAlign: 'center',
  },
  specValue: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 16,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 6,
    lineHeight: 22,
  },
  vehicleSubtitle: {
    fontSize: 15,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusText: {
    fontSize: 13,
    fontFamily: fonts.family.bold,
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vehicleDetails: {
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
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  driverText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.primary,
    marginLeft: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 120,
  },
  actionText: {
    fontSize: 15,
    fontFamily: fonts.family.bold,
    color: colors.primary,
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: 40,
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
    paddingBottom: 100, // Extra padding to prevent overlap with bottom nav
    paddingHorizontal: 0, // Remove horizontal padding to prevent overflow
  },
  // Insurance renewal modal styles
  insuranceModalContent: {
    padding: 20,
  },
  insuranceModalText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  documentUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary + '30',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  uploadButtonText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.primary,
    marginLeft: 8,
  },
  selectedDocument: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.successLight,
    borderRadius: 8,
    marginBottom: 20,
  },
  selectedDocumentText: {
    fontSize: 13,
    fontFamily: fonts.family.medium,
    color: colors.success,
    marginLeft: 8,
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.text.light,
  },
  saveButtonText: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  vehicleModalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 0,
    width: '100%',
    maxHeight: '85%',
    minHeight: 500, // Ensure minimum height for content
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  // Modal Header Styles
  modalHeader: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.text.light,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  editTitle: {
    fontSize: 22,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
  },
  modalCloseButton: {
    position: 'absolute',
    right: 20,
    top: 16,
    padding: 4,
  },
  // Modal Content Styles
  modalContent: {
    backgroundColor: colors.background,
    minHeight: 400, // Ensure minimum height
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 100, // Extra space for footer
    flexGrow: 1, // Allow content to grow
  },
  // Modal Footer Styles
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  section: {
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginBottom: 8,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderStyle: 'dashed',
  },
  uploadBtnText: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.primary,
    marginLeft: 8,
  },
  fileName: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.text.light,
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: colors.white,
  },
  cancelBtnText: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.secondary,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  disabledBtn: {
    backgroundColor: colors.text.light,
  },
  buttonLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Search and Filter Styles
  searchFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginLeft: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  filterButtonText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.primary,
    marginLeft: 6,
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  filterOptions: {
    backgroundColor: colors.white,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  clearFiltersButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearFiltersText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
});

export default VehicleManagementScreen;
