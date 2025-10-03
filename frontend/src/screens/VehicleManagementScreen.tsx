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
import VehicleDetailsForm from '../components/VehicleDetailsForm';

interface Vehicle {
  id: string;
  vehicleType: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleColor: string;
  vehicleRegistration: string;
  vehicleCapacity: number;
  bodyType: string;
  driveType: string;
  vehicleImagesUrl: string[];
  insuranceUrl: string;
  insuranceExpiryDate: string;
  status: 'pending' | 'approved' | 'rejected';
  assignedDriver?: {
    id: string;
    name: string;
    phone: string;
  };
  createdAt: string;
  updatedAt: string;
}

const VehicleManagementScreen = () => {
  const navigation = useNavigation();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Vehicle modal state
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleEditIdx, setVehicleEditIdx] = useState<number | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  
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

  const fetchVehicles = async () => {
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
          const data = await apiRequest(`/companies/${company.id}/vehicles`);
          setVehicles(data.vehicles || []);
        } else {
          setVehicles([]);
        }
      } else {
        setVehicles([]);
      }
    } catch (err: any) {
      console.error('Error fetching vehicles:', err);
      setError(err.message || 'Failed to fetch vehicles');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVehicles();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchVehicles();
    fetchCompanyProfile();
  }, []);

  // Check if we should show the vehicle modal from route params
  useEffect(() => {
    const showModal = navigation.getState()?.routes?.find(route => 
      route.name === 'VehicleManagement'
    )?.params?.showVehicleModal;
    
    if (showModal) {
      setShowVehicleModal(true);
    }
  }, [navigation]);

  const fetchCompanyProfile = async () => {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.COMPANIES}/transporter/${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCompanyProfile(data[0] || data);
      }
    } catch (error) {
      console.error('Error fetching company profile:', error);
    }
  };

  const openAddVehicle = () => {
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

  const pickInsurance = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        const asset = result.assets[0];
        setInsurance({
          uri: asset.uri,
          type: asset.mimeType || 'application/pdf',
          fileName: asset.name,
        });
      }
    } catch (error) {
      console.error('Error picking insurance document:', error);
      Alert.alert('Error', 'Failed to pick insurance document');
    }
  };

  const handleSaveVehicle = async () => {
    
    if (!vehicleType || !vehicleReg || !insurance || vehiclePhotos.length < 1) {
      const missingFields = [];
      if (!vehicleType) missingFields.push('Vehicle Type');
      if (!vehicleReg) missingFields.push('Registration Number');
      if (!insurance) missingFields.push('Vehicle Insurance Document');
      if (vehiclePhotos.length < 1) missingFields.push('At least 1 photo');
      
      Alert.alert('Missing Info', `Please provide: ${missingFields.join(', ')}`);
      return;
    }

    try {
      setLoadingProfile(true);
      
      // Create FormData for multipart upload
      const formData = new FormData();
      
      // Add vehicle data fields
      formData.append('companyId', companyProfile?.companyId || '');
      formData.append('vehicleType', vehicleType);
      formData.append('vehicleMake', vehicleMake);
      formData.append('vehicleModel', vehicleMake); // Use vehicleMake as model
      formData.append('vehicleColor', vehicleColor);
      formData.append('vehicleYear', vehicleYear);
      formData.append('vehicleRegistration', vehicleReg);
      formData.append('vehicleCapacity', vehicleCapacity);
      formData.append('bodyType', bodyType);
      formData.append('driveType', vehicleDriveType);
      
      // Add special features
      formData.append('refrigeration', refrigeration.toString());
      formData.append('humidityControl', humidityControl.toString());
      formData.append('specialCargo', specialCargo.toString());
      formData.append('features', vehicleFeatures);
      
      // Add insurance document
      if (insurance) {
        formData.append('insurance', {
          uri: insurance.uri,
          type: insurance.type || 'application/pdf',
          name: insurance.fileName || 'insurance.pdf'
        } as any);
      }
      
      // Add vehicle photos
      vehiclePhotos.forEach((photo, index) => {
        formData.append('vehicleImages', {
          uri: photo.uri,
          type: photo.type || 'image/jpeg',
          name: photo.fileName || `vehicle_${index}.jpg`
        } as any);
      });

      
      // Get auth token
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const token = await user.getIdToken();
      
      // Create vehicle via API with FormData
      const response = await fetch(`${API_ENDPOINTS.COMPANIES}/${companyProfile?.companyId}/vehicles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData - let React Native set it automatically
        },
        body: formData
      });

      const responseData = await response.json();

      if (response.ok && responseData.message) {
        
        // Update local state
        const newVehicle = {
          id: responseData.vehicle?.id || Date.now().toString(),
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
          status: 'pending' // Show pending status
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
        
        Alert.alert(
          'Success', 
          'Vehicle added successfully! It will be reviewed by admin before approval.',
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(responseData.message || 'Failed to create vehicle');
      }
    } catch (error) {
      console.error('❌ Error creating vehicle:', error);
      Alert.alert('Error', `Failed to create vehicle: ${error.message}`);
    } finally {
      setLoadingProfile(false);
    }
  };

  const renderVehicle = ({ item }: { item: Vehicle }) => (
    <View style={styles.vehicleCard}>
      <View style={styles.vehicleHeader}>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleTitle}>
            {item.vehicleMake} {item.vehicleModel} ({item.vehicleYear})
          </Text>
          <Text style={styles.vehicleSubtitle}>
            {item.vehicleType} • {item.vehicleRegistration}
          </Text>
        </View>
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

      <View style={styles.vehicleDetails}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="palette" size={16} color={colors.text.secondary} />
          <Text style={styles.detailText}>{item.vehicleColor}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="weight" size={16} color={colors.text.secondary} />
          <Text style={styles.detailText}>{item.vehicleCapacity} tons</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="car" size={16} color={colors.text.secondary} />
          <Text style={styles.detailText}>{item.bodyType}</Text>
        </View>
      </View>

      {item.assignedDriver && (
        <View style={styles.driverInfo}>
          <MaterialCommunityIcons name="account" size={16} color={colors.primary} />
          <Text style={styles.driverText}>
            Assigned to: {item.assignedDriver.name} ({item.assignedDriver.phone})
          </Text>
        </View>
      )}

      <View style={styles.vehicleActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('EditVehicle', { vehicleId: item.id })}
        >
          <MaterialCommunityIcons name="pencil" size={16} color={colors.primary} />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AssignDriver', { vehicleId: item.id })}
        >
          <MaterialCommunityIcons name="account-plus" size={16} color={colors.primary} />
          <Text style={styles.actionText}>Assign Driver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
            } catch (error) {
              // Fallback navigation if goBack fails
              navigation.navigate('FleetManagement');
            }
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fleet Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openAddVehicle}
        >
          <MaterialCommunityIcons name="plus" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{vehicles.length}</Text>
            <Text style={styles.statLabel}>Total Vehicles</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {vehicles.filter(v => v.status === 'approved').length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {vehicles.filter(v => v.assignedDriver).length}
            </Text>
            <Text style={styles.statLabel}>Assigned</Text>
          </View>
        </View>

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
              style={styles.addFirstButton}
              onPress={openAddVehicle}
            >
              <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
              <Text style={styles.addFirstText}>Add First Vehicle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={vehicles}
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
                  setHumidityControl(data.humidityControl);
                  setRefrigeration(data.refrigeration);
                  setVehicleFeatures(data.vehicleFeatures);
                }}
                onPhotoAdd={pickVehiclePhotos}
                onPhotoRemove={removeVehiclePhoto}
                onFilePick={pickInsurance}
                vehiclePhotos={vehiclePhotos}
                error={error}
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
              <TouchableOpacity
                style={[styles.saveBtn, loadingProfile && styles.disabledBtn]}
                onPress={handleSaveVehicle}
                disabled={loadingProfile}
              >
                {loadingProfile ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.saveBtnText}>Save Vehicle</Text>
                )}
              </TouchableOpacity>
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
  vehicleCard: {
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
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  vehicleSubtitle: {
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
  vehicleActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.primary,
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
  listContainer: {
    paddingBottom: 20,
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
    fontFamily: fonts.family.semiBold,
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
    fontFamily: fonts.family.semiBold,
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
    fontFamily: fonts.family.semiBold,
    color: colors.white,
  },
  disabledBtn: {
    backgroundColor: colors.text.light,
  },
});

export default VehicleManagementScreen;
