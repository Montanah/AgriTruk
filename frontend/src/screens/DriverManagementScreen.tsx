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
  assignedVehicle?: {
    id: string;
    make: string;
    model: string;
    registration: string;
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
  const [recruitPhoto, setRecruitPhoto] = useState<any>(null);
  const [recruitIdDoc, setRecruitIdDoc] = useState<any>(null);
  const [recruitLicense, setRecruitLicense] = useState<any>(null);
  const [recruiting, setRecruiting] = useState(false);

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
          const data = await apiRequest(`/companies/${company.id}/drivers`);
          setDrivers(data.drivers || []);
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
    try {
      // TODO: Implement actual driver recruitment API call
      console.log('Recruiting driver:', {
        name: recruitName,
        email: recruitEmail,
        phone: recruitPhone,
        photo: recruitPhoto,
        idDoc: recruitIdDoc,
        license: recruitLicense
      });

      // For now, just show success and close modal
      Alert.alert('Success', 'Driver recruitment request submitted successfully!');
      setRecruitModal(false);
      resetRecruitForm();
      await fetchDrivers(); // Refresh the list
    } catch (error) {
      console.error('Error recruiting driver:', error);
      Alert.alert('Error', 'Failed to recruit driver. Please try again.');
    } finally {
      setRecruiting(false);
    }
  };

  const resetRecruitForm = () => {
    setRecruitName('');
    setRecruitEmail('');
    setRecruitPhone('');
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
      const response = await fetch(`${API_ENDPOINTS.COMPANIES}/drivers/${driverId}/${action}`, {
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
    fetchDrivers();
  }, []);

  const renderDriver = ({ item }: { item: Driver }) => (
    <View style={styles.driverCard}>
      <View style={styles.driverHeader}>
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
          <MaterialCommunityIcons name="truck" size={16} color={colors.primary} />
          <Text style={styles.vehicleText}>
            Assigned to: {item.assignedVehicle.make} {item.assignedVehicle.model} ({item.assignedVehicle.registration})
          </Text>
        </View>
      )}

      <View style={styles.driverActions}>
        {item.status === 'pending' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleDriverAction(item.id, 'approve')}
            >
              <MaterialCommunityIcons name="check" size={16} color={colors.white} />
              <Text style={styles.actionText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleDriverAction(item.id, 'reject')}
            >
              <MaterialCommunityIcons name="close" size={16} color={colors.white} />
              <Text style={styles.actionText}>Reject</Text>
            </TouchableOpacity>
          </>
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
          onPress={() => navigation.goBack()}
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
          style={styles.addButton}
          onPress={() => setRecruitModal(true)}
        >
          <MaterialCommunityIcons name="plus" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{drivers.length}</Text>
            <Text style={styles.statLabel}>Total Drivers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {drivers.filter(d => d.status === 'active').length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
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
              style={styles.addFirstButton}
              onPress={() => setRecruitModal(true)}
            >
              <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
              <Text style={styles.addFirstText}>Recruit First Driver</Text>
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
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.recruitText}>Recruit</Text>
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
});

export default DriverManagementScreen;
