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
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getAuth, signOut } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { API_ENDPOINTS } from '../constants/api';
import { PLACEHOLDER_IMAGES } from '../constants/images';
import OfflineInstructionsCard from '../components/TransporterService/OfflineInstructionsCard';
import LogoutConfirmationDialog from '../components/common/LogoutConfirmationDialog';
import { apiRequest, uploadFile } from '../utils/api';
import ImagePickerModal from '../components/common/ImagePickerModal';

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
  
  // Profile editing states
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<DriverProfile>>({});
  const [imagePickerVisible, setImagePickerVisible] = useState(false);

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
      const user = auth?.currentUser;
      if (!user?.uid) {
        setError('User not authenticated. Please log in again.');
        setLoading(false);
        return;
      }

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const token = await user.getIdToken();
        const response = await fetch(`${API_ENDPOINTS.DRIVERS}/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const driver = data.driver || data;
          
          if (!driver) {
            throw new Error('Driver data not found in response');
          }

          // Helper to convert Firestore timestamp to string
          const formatTimestamp = (ts: any): string => {
            if (!ts) return '';
            if (typeof ts === 'string') return ts;
            if (ts._seconds) {
              return new Date(ts._seconds * 1000).toISOString();
            }
            if (ts.toDate) {
              return ts.toDate().toISOString();
            }
            return ts.toString();
          };

          // Map driver data to expected format
          // CRITICAL: Store the actual Firestore document ID for updates
          // The driver document might be identified by driverId field or userId
          const profileData: DriverProfile = {
            id: driver.id || driver.driverId || driver._id || '',
            firstName: driver.firstName || '',
            lastName: driver.lastName || '',
            email: driver.email || '',
            phone: driver.phone || '',
            driverLicense: driver.driverLicense || '',
            driverLicenseExpiryDate: formatTimestamp(driver.driverLicenseExpiryDate),
            idNumber: driver.idNumber || '',
            idExpiryDate: formatTimestamp(driver.idExpiryDate),
            profileImage: driver.profileImage || '',
            status: driver.status || 'pending',
            assignedVehicle: driver.assignedVehicle || driver.assignedVehicleDetails,
            company: driver.company || { id: driver.companyId || '', name: driver.companyName || 'Unknown Company' },
            documents: driver.documents,
          };
          
          // Store userId if available for Firestore lookups
          if (driver.userId) {
            (profileData as any).userId = driver.userId;
          }
          if (driver.driverId) {
            (profileData as any).driverId = driver.driverId;
          }

          setDriverProfile(profileData);
          setAcceptingBooking(driver.availability || driver.acceptingBooking || false);
        } else {
          const statusCode = response.status;
          if (statusCode === 403) {
            throw new Error('Insufficient permissions. Please contact your company administrator.');
          } else if (statusCode === 401) {
            throw new Error('Authentication failed. Please log out and log back in.');
          } else if (statusCode === 404) {
            // If 404, try Firestore fallback
            console.log('⚠️ Driver profile endpoint returned 404, trying Firestore fallback...');
            await fetchDriverProfileFromFirestore(user.uid);
            return;
          } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to fetch driver profile: ${statusCode}`);
          }
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // If network error or abort, try Firestore fallback
        if (fetchError.name === 'AbortError' || fetchError.message?.includes('Network request failed') || fetchError.message?.includes('fetch')) {
          console.warn('⚠️ Network error fetching driver profile, trying Firestore fallback...', fetchError.message);
          try {
            await fetchDriverProfileFromFirestore(user.uid);
            return;
          } catch (firestoreError: any) {
            throw new Error('Network error: Unable to connect to server. Please check your internet connection and try again.');
          }
        }
        throw fetchError;
      }
    } catch (err: any) {
      console.error('Error fetching driver profile:', err);
      setError(err.message || 'Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fallback to Firestore if API fails
  const fetchDriverProfileFromFirestore = async (userId: string) => {
    try {
      const { db } = require('../firebaseConfig');
      const { doc, getDoc } = require('firebase/firestore');
      
      // Try to find driver by userId
      const driverDoc = await getDoc(doc(db, 'drivers', userId));
      
      if (driverDoc.exists()) {
        const driverData = driverDoc.data();
        const profileData: DriverProfile = {
          id: driverDoc.id,
          firstName: driverData.firstName || '',
          lastName: driverData.lastName || '',
          email: driverData.email || '',
          phone: driverData.phone || '',
          driverLicense: driverData.driverLicense || '',
          driverLicenseExpiryDate: driverData.driverLicenseExpiryDate?.toDate?.()?.toISOString() || driverData.driverLicenseExpiryDate || '',
          idNumber: driverData.idNumber || '',
          idExpiryDate: driverData.idExpiryDate?.toDate?.()?.toISOString() || driverData.idExpiryDate || '',
          profileImage: driverData.profileImage || '',
          status: driverData.status || 'pending',
          assignedVehicle: driverData.assignedVehicle || driverData.assignedVehicleDetails,
          company: driverData.company || { id: driverData.companyId || '', name: driverData.companyName || 'Unknown Company' },
          documents: driverData.documents,
        };
        setDriverProfile(profileData);
        setAcceptingBooking(driverData.availability || driverData.acceptingBooking || false);
        console.log('✅ Driver profile loaded from Firestore fallback');
      } else {
        // Try to find driver by driverId field
        const driversQuery = await require('firebase/firestore').query(
          require('firebase/firestore').collection(db, 'drivers'),
          require('firebase/firestore').where('userId', '==', userId),
          require('firebase/firestore').limit(1)
        );
        const driversSnapshot = await require('firebase/firestore').getDocs(driversQuery);
        
        if (!driversSnapshot.empty) {
          const driverDoc2 = driversSnapshot.docs[0];
          const driverData = driverDoc2.data();
          const profileData: DriverProfile = {
            id: driverDoc2.id,
            firstName: driverData.firstName || '',
            lastName: driverData.lastName || '',
            email: driverData.email || '',
            phone: driverData.phone || '',
            driverLicense: driverData.driverLicense || '',
            driverLicenseExpiryDate: driverData.driverLicenseExpiryDate?.toDate?.()?.toISOString() || driverData.driverLicenseExpiryDate || '',
            idNumber: driverData.idNumber || '',
            idExpiryDate: driverData.idExpiryDate?.toDate?.()?.toISOString() || driverData.idExpiryDate || '',
            profileImage: driverData.profileImage || '',
            status: driverData.status || 'pending',
            assignedVehicle: driverData.assignedVehicle || driverData.assignedVehicleDetails,
            company: driverData.company || { id: driverData.companyId || '', name: driverData.companyName || 'Unknown Company' },
            documents: driverData.documents,
          };
          setDriverProfile(profileData);
          setAcceptingBooking(driverData.availability || driverData.acceptingBooking || false);
          console.log('✅ Driver profile loaded from Firestore fallback (by userId)');
        } else {
          throw new Error('Driver profile not found. Please contact your company administrator.');
        }
      }
    } catch (firestoreError: any) {
      console.error('Firestore fallback error:', firestoreError);
      throw new Error('Unable to load driver profile. Please check your internet connection and try again.');
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
      const user = auth?.currentUser;
      if (!user?.uid) return;

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
      const user = auth?.currentUser;
      if (!user?.uid) return;

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

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      setShowLogoutDialog(false);
      // Navigate to Welcome screen after logout
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      setShowLogoutDialog(false);
      Alert.alert('Logout Error', 'Failed to logout. Please try again.');
    }
  };

  // Profile editing functions
  const handleEdit = () => {
    if (driverProfile) {
      setEditData({
        firstName: driverProfile.firstName,
        lastName: driverProfile.lastName,
        email: driverProfile.email,
        phone: driverProfile.phone,
        profileImage: driverProfile.profileImage,
      });
      setEditing(true);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user || !driverProfile) {
        Alert.alert('Error', 'User not authenticated');
        setLoading(false);
        return;
      }

      const token = await user.getIdToken();

      // Upload profile image if changed
      let profilePhotoUrl = editData.profileImage;
      if (editData.profileImage && typeof editData.profileImage === 'object' && (editData.profileImage as any).uri) {
        const image = editData.profileImage as any;
        if (!image.uri.startsWith('http')) {
          // Upload new image
          console.log('📤 Uploading profile image...');
          profilePhotoUrl = await uploadFile(image.uri, 'profile', user.uid);
          console.log('✅ Profile image uploaded:', profilePhotoUrl);
        } else {
          profilePhotoUrl = image.uri;
        }
      }

      // Prepare update data for driver profile endpoint
      // Update both users collection (via /auth/update) and drivers collection
      const userUpdatePayload: any = {
        name: `${editData.firstName || driverProfile.firstName} ${editData.lastName || driverProfile.lastName}`,
        phone: editData.phone || driverProfile.phone,
        email: editData.email || driverProfile.email,
      };

      if (profilePhotoUrl) {
        userUpdatePayload.profilePhotoUrl = profilePhotoUrl;
      }

      // Update users collection via /auth/update
      console.log('📝 Updating users collection...');
      try {
        await apiRequest('/auth/update', {
          method: 'PUT',
          body: JSON.stringify(userUpdatePayload),
        });
        console.log('✅ Users collection updated');
      } catch (userUpdateError: any) {
        console.error('❌ Users collection update failed:', userUpdateError);
        // Continue - try drivers collection anyway
      }

      // Update drivers collection
      const driverUpdatePayload: any = {
        firstName: editData.firstName || driverProfile.firstName,
        lastName: editData.lastName || driverProfile.lastName,
        phone: editData.phone || driverProfile.phone,
        email: editData.email || driverProfile.email,
      };

      if (profilePhotoUrl) {
        driverUpdatePayload.profileImage = profilePhotoUrl;
      }

      console.log('📝 Updating drivers collection...', driverUpdatePayload);

      // Use driverId from profile data directly (no Firestore query needed)
      // The driverId is available from the API response: driverId: "3jGP4DmjIbYIHd6lINyI"
      let driverDocId = (driverProfile as any).driverId || driverProfile.id;
      
      if (!driverDocId) {
        console.warn('⚠️ No driverId available, cannot update driver profile via API');
        Alert.alert('Error', 'Unable to determine driver ID. Please try refreshing your profile.');
        return;
      }

      console.log('✅ Using driverId from profile:', driverDocId);

      // Update the drivers collection via backend API
      // The backend will handle Firestore updates (frontend can't update Firestore directly due to security rules)
      let driverUpdateSuccess = false;
      try {
        // Try PUT /drivers/profile endpoint first
        const driverResponse = await fetch(`${API_ENDPOINTS.DRIVERS}/profile`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(driverUpdatePayload),
        });

        if (driverResponse.ok) {
          console.log('✅ Driver profile updated via PUT /drivers/profile');
          driverUpdateSuccess = true;
        } else if (driverResponse.status === 404 || driverResponse.status === 405) {
          // If PUT /profile doesn't exist, try PATCH /drivers/:id
          console.log('⚠️ PUT /drivers/profile not available, trying PATCH /drivers/:id');
          const patchResponse = await fetch(`${API_ENDPOINTS.DRIVERS}/${driverDocId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(driverUpdatePayload),
          });

          if (patchResponse.ok) {
            console.log('✅ Driver profile updated via PATCH /drivers/:id');
            driverUpdateSuccess = true;
          } else {
            const errorText = await patchResponse.text();
            console.warn('⚠️ PATCH also failed:', patchResponse.status, errorText);
            throw new Error(`Driver profile update failed: ${patchResponse.status}`);
          }
        } else {
          const errorText = await driverResponse.text();
          console.warn('⚠️ PUT failed with status:', driverResponse.status, errorText);
          throw new Error(`Driver profile update failed: ${driverResponse.status}`);
        }
      } catch (driverApiError: any) {
        console.error('❌ Driver API update error:', driverApiError.message);
        // Don't throw - we'll show a warning but the users collection update already succeeded
        console.warn('⚠️ Driver profile may not have been updated, but user profile was updated successfully');
      }

      // Refresh driver profile from backend to get latest data
      console.log('🔄 Refreshing driver profile...');
      await fetchDriverProfile();

      setEditing(false);
      
      if (!driverUpdateSuccess) {
        Alert.alert(
          'Partial Success',
          'Your user profile was updated successfully, but the driver profile update failed. Please contact support if this persists.'
        );
      } else {
        Alert.alert('Success', 'Profile updated successfully');
      }
    } catch (error: any) {
      console.error('❌ Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setEditData({});
  };

  const handleImageSelected = (image: any) => {
    setEditData({ ...editData, profileImage: image });
    setImagePickerVisible(false);
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
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark, colors.secondary]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Driver Profile</Text>
          <TouchableOpacity 
            onPress={handleLogout} 
            style={styles.logoutButton}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="log-out-outline" size={15} color={colors.white} style={{ marginRight: 2 }} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity 
              onPress={editing ? () => setImagePickerVisible(true) : undefined}
              disabled={!editing}
            >
              <Image 
                source={{ 
                  uri: editing && editData.profileImage 
                    ? (typeof editData.profileImage === 'string' ? editData.profileImage : (editData.profileImage as any).uri || PLACEHOLDER_IMAGES.USER)
                    : (driverProfile.profileImage || PLACEHOLDER_IMAGES.USER)
                }} 
                style={styles.avatar} 
              />
              {editing && (
                <View style={styles.editOverlay}>
                  <Ionicons name="camera" size={20} color={colors.white} />
                </View>
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.actionRow}>
            {!editing ? (
              <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                <Ionicons name="create-outline" size={16} color={colors.white} />
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={16} color={colors.white} />
                      <Text style={styles.saveButtonText}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                  <Ionicons name="close" size={16} color={colors.text.secondary} />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Driver Name */}
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Name</Text>
              {editing ? (
                <View style={styles.nameRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginRight: spacing.xs }]}
                    value={editData.firstName || driverProfile.firstName}
                    onChangeText={(text) => setEditData({ ...editData, firstName: text })}
                    placeholder="First Name"
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={editData.lastName || driverProfile.lastName}
                    onChangeText={(text) => setEditData({ ...editData, lastName: text })}
                    placeholder="Last Name"
                  />
                </View>
              ) : (
                <Text style={styles.infoValue}>
                  {driverProfile.firstName} {driverProfile.lastName}
                </Text>
              )}
            </View>
          </View>

          {/* Email */}
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="email" size={20} color={colors.secondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={editData.email || driverProfile.email}
                  onChangeText={(text) => setEditData({ ...editData, email: text })}
                  placeholder="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <Text style={styles.infoValue}>{driverProfile.email}</Text>
              )}
            </View>
          </View>

          {/* Phone */}
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="phone" size={20} color={colors.tertiary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={editData.phone || driverProfile.phone}
                  onChangeText={(text) => setEditData({ ...editData, phone: text })}
                  placeholder="Phone"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.infoValue}>{driverProfile.phone}</Text>
              )}
            </View>
          </View>

          {/* Status Badge */}
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

      {/* Logout Section (optional duplicate can be removed if desired) */}

      {/* Conflict Resolution Section */}
      <View style={styles.conflictSection}>
        <Text style={styles.sectionTitle}>Conflict Resolution</Text>
        <Text style={styles.sectionDescription}>
          Submit a complaint for admin mediation. You will be contacted via email and in-app.
        </Text>

        <TouchableOpacity
          style={styles.complaintButton}
          onPress={() => navigation.navigate('DisputeList' as never)}
        >
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.white} />
          <Text style={styles.complaintButtonText}>View Disputes</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom padding to prevent cut-off */}
      <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Image Picker Modal */}
      
      <LogoutConfirmationDialog
        visible={showLogoutDialog}
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />
      <ImagePickerModal
        visible={imagePickerVisible}
        onClose={() => setImagePickerVisible(false)}
        onImageSelected={handleImageSelected}
        title="Select Profile Photo"
        allowsEditing={true}
        quality={0.8}
      />

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
              style={styles.modalCancelButton}
              onPress={() => setShowDocumentModal(false)}
              disabled={uploading}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: colors.white,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    gap: 4,
    minWidth: 'auto',
  },
  logoutButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 0,
  },
  content: {
    flex: 1,
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
    borderRadius: 16,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    marginTop: -20,
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  editOverlay: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: colors.primary,
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    gap: spacing.xs,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  editButtonText: {
    color: colors.white,
    fontSize: fonts.size.sm,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    justifyContent: 'space-between',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    gap: spacing.xs,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    minHeight: 44,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: fonts.size.sm,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.text.light,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    gap: spacing.xs,
    minHeight: 44,
  },
  cancelButtonText: {
    color: colors.text.secondary,
    fontSize: fonts.size.sm,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '20',
  },
  infoContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  infoLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: '600',
    lineHeight: 22,
  },
  nameRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.primary + '40',
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fonts.size.md,
    color: colors.text.primary,
    backgroundColor: colors.white,
    minHeight: 44,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.primary + '20',
    backgroundColor: colors.surface,
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
  modalCancelButton: {
    backgroundColor: colors.background,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
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
  conflictSection: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionDescription: {
    fontSize: 15,
    color: colors.text.light,
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  complaintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  complaintButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: spacing.sm,
  },
});

export default DriverProfileScreen;