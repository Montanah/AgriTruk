import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Switch
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import colors from '../constants/colors';
import fonts from '../constants/fonts';
import { API_ENDPOINTS } from '../constants/api';
import { PLACEHOLDER_IMAGES } from '../constants/images';
import OfflineInstructionsCard from '../components/TransporterService/OfflineInstructionsCard';

interface DriverProfile {
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
    type: string;
    capacity: string;
  };
  company: {
    id: string;
    name: string;
  };
  documents?: {
    driverLicense?: {
      url: string;
      expiryDate: string;
      status: 'pending' | 'approved' | 'rejected';
    };
    idDocument?: {
      url: string;
      expiryDate: string;
      status: 'pending' | 'approved' | 'rejected';
    };
  };
}

const DriverProfileScreen = () => {
  const navigation = useNavigation();
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<'driverLicense' | 'idDocument' | null>(null);
  const [acceptingBooking, setAcceptingBooking] = useState(false);
  const [updatingBookingStatus, setUpdatingBookingStatus] = useState(false);

  // Helper to convert Firestore timestamp to Date or string
  const parseTimestamp = (ts: any): Date | null => {
    if (!ts) return null;
    if (ts instanceof Date) return ts;
    if (typeof ts === 'string') {
      const parsed = new Date(ts);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    if (ts._seconds) {
      return new Date(ts._seconds * 1000);
    }
    if (ts.toDate && typeof ts.toDate === 'function') {
      return ts.toDate();
    }
    return null;
  };

  useEffect(() => {
    fetchDriverProfile();
  }, []);

  const fetchDriverProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.DRIVERS}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDriverProfile(data.driver);
        setAcceptingBooking(data.driver?.availability || false);
      } else {
        const statusCode = response.status;
        if (statusCode === 403) {
          throw new Error('Insufficient permissions. Please contact your company administrator.');
        } else if (statusCode === 401) {
          throw new Error('Authentication failed. Please log out and log back in.');
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to fetch driver profile: ${statusCode}`);
        }
      }
    } catch (err: any) {
      console.error('Error fetching driver profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDriverProfile();
    setRefreshing(false);
  };

  const updateAcceptingBookingStatus = async (newStatus: boolean) => {
    try {
      setUpdatingBookingStatus(true);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      
      // Use the same endpoint as transporters: /toggle-availability with POST method
      // Backend expects: { availability: boolean }
      const response = await fetch(`${API_ENDPOINTS.DRIVERS}/toggle-availability`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          availability: newStatus,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAcceptingBooking(newStatus);
        setDriverProfile((prev: any) => ({ ...prev, availability: newStatus }));
        Alert.alert(
          'Status Updated',
          `You are now ${newStatus ? 'accepting' : 'not accepting'} new job requests.`
        );
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update status');
      }
    } catch (err: any) {
      console.error('Error updating accepting booking status:', err);
      Alert.alert('Error', err.message || 'Failed to update status. Please try again.');
    } finally {
      setUpdatingBookingStatus(false);
    }
  };

  const handleDocumentUpload = (documentType: 'driverLicense' | 'idDocument') => {
    setSelectedDocument(documentType);
    setShowDocumentModal(true);
  };

  const pickDocument = async (source: 'camera' | 'gallery' | 'pdf') => {
    try {
      setUploading(true);
      let result;

      if (source === 'pdf') {
        result = await DocumentPicker.getDocumentAsync({
          type: 'application/pdf',
          copyToCacheDirectory: true,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Please grant permission to access your media library.');
          return;
        }

        if (source === 'camera') {
          const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
          if (!cameraPermission.granted) {
            Alert.alert('Permission Required', 'Please grant permission to access your camera.');
            return;
          }
          result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          });
        } else {
          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          });
        }
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadDocument(selectedDocument!, result.assets[0]);
      }
    } catch (err) {
      console.error('Error picking document:', err);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    } finally {
      setUploading(false);
      setShowDocumentModal(false);
      setSelectedDocument(null);
    }
  };

  const uploadDocument = async (documentType: 'driverLicense' | 'idDocument', asset: any) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const formData = new FormData();
      
      formData.append('document', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || `${documentType}.jpg`,
      } as any);
      formData.append('documentType', documentType);

      const response = await fetch(`${API_ENDPOINTS.DRIVERS}/upload-document`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (response.ok) {
        Alert.alert('Success', 'Document uploaded successfully. It will be reviewed by your company.');
        fetchDriverProfile();
      } else {
        throw new Error('Failed to upload document');
      }
    } catch (err: any) {
      console.error('Error uploading document:', err);
      Alert.alert('Error', err.message || 'Failed to upload document');
    }
  };

  const getDocumentStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return colors.success;
      case 'pending': return colors.warning;
      case 'rejected': return colors.error;
      default: return colors.text.secondary;
    }
  };

  const getDocumentStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return 'check-circle';
      case 'pending': return 'clock-outline';
      case 'rejected': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const isDocumentExpiring = (expiryDate: any) => {
    if (!expiryDate) return false;
    const expiry = parseTimestamp(expiryDate);
    if (!expiry) return false;
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isDocumentExpired = (expiryDate: any) => {
    if (!expiryDate) return false;
    const expiry = parseTimestamp(expiryDate);
    if (!expiry) return false;
    const now = new Date();
    return expiry.getTime() < now.getTime();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error || !driverProfile) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={64} color={colors.error} />
        <Text style={styles.errorText}>{error || 'Failed to load profile'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDriverProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Image 
            source={{ 
              uri: driverProfile.profileImage || PLACEHOLDER_IMAGES.USER 
            }} 
            style={styles.avatar} 
          />
        </View>
        <Text style={styles.driverName}>
          {driverProfile.firstName} {driverProfile.lastName}
        </Text>
        <Text style={styles.driverEmail}>{driverProfile.email}</Text>
        <Text style={styles.driverPhone}>{driverProfile.phone}</Text>
        
        <View style={[styles.statusBadge, { backgroundColor: getDocumentStatusColor(driverProfile.status) + '20' }]}>
          <MaterialCommunityIcons 
            name={getDocumentStatusIcon(driverProfile.status)} 
            size={16} 
            color={getDocumentStatusColor(driverProfile.status)} 
          />
          <Text style={[styles.statusText, { color: getDocumentStatusColor(driverProfile.status) }]}>
            {driverProfile.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Offline Instructions Card - Show when not accepting requests */}
      {!acceptingBooking && (
        <OfflineInstructionsCard
          onToggleAccepting={() => {
            // Scroll to the job availability section
            // The toggle is already visible in the same screen
          }}
          isFirstTime={false}
        />
      )}

      {/* Company Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Company Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="office-building" size={20} color={colors.primary} />
            <Text style={styles.infoLabel}>Company:</Text>
            <Text style={styles.infoValue}>{driverProfile.company.name}</Text>
          </View>
          {driverProfile.assignedVehicle && (
            <>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="truck" size={20} color={colors.secondary} />
                <Text style={styles.infoLabel}>Vehicle:</Text>
                <Text style={styles.infoValue}>
                  {driverProfile.assignedVehicle.make} {driverProfile.assignedVehicle.model}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="identifier" size={20} color={colors.tertiary} />
                <Text style={styles.infoLabel}>Registration:</Text>
                <Text style={styles.infoValue}>{driverProfile.assignedVehicle.registration}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Document Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Document Management</Text>
        <Text style={styles.sectionSubtitle}>
          Manage your personal documents. Vehicle management is handled by your company.
        </Text>

        {/* Driver License */}
        <View style={styles.documentCard}>
          <View style={styles.documentHeader}>
            <MaterialCommunityIcons name="card-account-details" size={24} color={colors.primary} />
            <Text style={styles.documentTitle}>Driver License</Text>
            {driverProfile.documents?.driverLicense && (
              <View style={[styles.documentStatus, { backgroundColor: getDocumentStatusColor(driverProfile.documents.driverLicense.status) + '20' }]}>
                <MaterialCommunityIcons 
                  name={getDocumentStatusIcon(driverProfile.documents.driverLicense.status)} 
                  size={16} 
                  color={getDocumentStatusColor(driverProfile.documents.driverLicense.status)} 
                />
                <Text style={[styles.documentStatusText, { color: getDocumentStatusColor(driverProfile.documents.driverLicense.status) }]}>
                  {driverProfile.documents.driverLicense.status.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.documentInfo}>
            <Text style={styles.documentNumber}>License: {driverProfile.driverLicense}</Text>
            <Text style={styles.documentExpiry}>
              Expires: {(() => {
                if (!driverProfile.driverLicenseExpiryDate) return 'N/A';
                const date = parseTimestamp(driverProfile.driverLicenseExpiryDate);
                return date ? date.toLocaleDateString() : 'N/A';
              })()}
            </Text>
            {(isDocumentExpiring(driverProfile.driverLicenseExpiryDate) || isDocumentExpired(driverProfile.driverLicenseExpiryDate)) && (
              <Text style={[styles.expiryWarning, { 
                color: isDocumentExpired(driverProfile.driverLicenseExpiryDate) ? colors.error : colors.warning 
              }]}>
                {isDocumentExpired(driverProfile.driverLicenseExpiryDate) ? 'EXPIRED' : 'EXPIRING SOON'}
              </Text>
            )}
          </View>

          <TouchableOpacity 
            style={styles.uploadButton}
            onPress={() => handleDocumentUpload('driverLicense')}
          >
            <MaterialCommunityIcons name="upload" size={20} color={colors.primary} />
            <Text style={styles.uploadButtonText}>Upload/Update License</Text>
          </TouchableOpacity>
        </View>

        {/* ID Document */}
        <View style={styles.documentCard}>
          <View style={styles.documentHeader}>
            <MaterialCommunityIcons name="card-account-details-outline" size={24} color={colors.secondary} />
            <Text style={styles.documentTitle}>ID Document</Text>
            {driverProfile.documents?.idDocument && (
              <View style={[styles.documentStatus, { backgroundColor: getDocumentStatusColor(driverProfile.documents.idDocument.status) + '20' }]}>
                <MaterialCommunityIcons 
                  name={getDocumentStatusIcon(driverProfile.documents.idDocument.status)} 
                  size={16} 
                  color={getDocumentStatusColor(driverProfile.documents.idDocument.status)} 
                />
                <Text style={[styles.documentStatusText, { color: getDocumentStatusColor(driverProfile.documents.idDocument.status) }]}>
                  {driverProfile.documents.idDocument.status.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.documentInfo}>
            <Text style={styles.documentNumber}>ID: {driverProfile.idNumber || 'Not provided'}</Text>
            <Text style={styles.documentExpiry}>
              Expires: {(() => {
                if (!driverProfile.idExpiryDate) return 'N/A';
                const date = parseTimestamp(driverProfile.idExpiryDate);
                return date ? date.toLocaleDateString() : 'N/A';
              })()}
            </Text>
            {(isDocumentExpiring(driverProfile.idExpiryDate) || isDocumentExpired(driverProfile.idExpiryDate)) && (
              <Text style={[styles.expiryWarning, { 
                color: isDocumentExpired(driverProfile.idExpiryDate) ? colors.error : colors.warning 
              }]}>
                {isDocumentExpired(driverProfile.idExpiryDate) ? 'EXPIRED' : 'EXPIRING SOON'}
              </Text>
            )}
          </View>

          <TouchableOpacity 
            style={styles.uploadButton}
            onPress={() => handleDocumentUpload('idDocument')}
          >
            <MaterialCommunityIcons name="upload" size={20} color={colors.secondary} />
            <Text style={styles.uploadButtonText}>Upload/Update ID</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Subscription Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        <View style={styles.subscriptionCard}>
          <MaterialCommunityIcons name="crown" size={24} color={colors.warning} />
          <View style={styles.subscriptionInfo}>
            <Text style={styles.subscriptionTitle}>Company Managed</Text>
            <Text style={styles.subscriptionText}>
              Your subscription is managed by {driverProfile.company.name}. 
              Contact your company administrator for subscription changes.
            </Text>
          </View>
        </View>
      </View>

      {/* Job Availability */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Job Availability</Text>
        <View style={styles.availabilityCard}>
          <View style={styles.availabilityHeader}>
            <MaterialCommunityIcons name="briefcase" size={24} color={colors.primary} />
            <Text style={styles.availabilityTitle}>Accepting New Jobs</Text>
          </View>
          
          <View style={styles.toggleContainer}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Job Requests</Text>
              <Text style={styles.toggleDescription}>
                {acceptingBooking 
                  ? 'You are currently accepting new job requests' 
                  : 'You are not accepting new job requests'
                }
              </Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={acceptingBooking}
                onValueChange={updateAcceptingBookingStatus}
                disabled={updatingBookingStatus}
                trackColor={{ false: colors.text.light, true: colors.primary + '40' }}
                thumbColor={acceptingBooking ? colors.primary : colors.text.light}
                ios_backgroundColor={colors.text.light}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Bottom padding to prevent cut-off */}
      <View style={styles.bottomPadding} />

      {/* Document Upload Modal */}
      <Modal visible={showDocumentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Upload {selectedDocument === 'driverLicense' ? 'Driver License' : 'ID Document'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Choose how you want to upload the document:
            </Text>
            
            <View style={styles.uploadOptions}>
              <TouchableOpacity 
                style={styles.uploadOption}
                onPress={() => pickDocument('camera')}
                disabled={uploading}
              >
                <MaterialCommunityIcons name="camera" size={32} color={colors.primary} />
                <Text style={styles.uploadOptionText}>Take Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.uploadOption}
                onPress={() => pickDocument('gallery')}
                disabled={uploading}
              >
                <MaterialCommunityIcons name="image" size={32} color={colors.secondary} />
                <Text style={styles.uploadOptionText}>Choose from Gallery</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.uploadOption}
                onPress={() => pickDocument('pdf')}
                disabled={uploading}
              >
                <MaterialCommunityIcons name="file-pdf-box" size={32} color={colors.tertiary} />
                <Text style={styles.uploadOptionText}>Upload PDF</Text>
              </TouchableOpacity>
            </View>

            {uploading && (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.uploadingText}>Uploading document...</Text>
              </View>
            )}

            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowDocumentModal(false)}
              disabled={uploading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  profileHeader: {
    backgroundColor: colors.white,
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  driverName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  driverEmail: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  driverPhone: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  infoCard: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 8,
    minWidth: 80,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text.primary,
    flex: 1,
  },
  documentCard: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  documentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  documentStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  documentInfo: {
    marginBottom: 12,
  },
  documentNumber: {
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 4,
  },
  documentExpiry: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  expiryWarning: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  uploadButtonText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  subscriptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  subscriptionText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  uploadOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  uploadOption: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: colors.background,
    minWidth: 80,
  },
  uploadOptionText: {
    fontSize: 12,
    color: colors.text.primary,
    marginTop: 8,
    textAlign: 'center',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadingText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: colors.background,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: 'bold',
  },
  availabilityCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  availabilityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    lineHeight: 20,
  },
  switchContainer: {
    padding: 8,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomPadding: {
    height: 100,
  },
});

export default DriverProfileScreen;