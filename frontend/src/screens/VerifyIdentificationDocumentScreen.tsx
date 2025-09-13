import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import colors from '../constants/colors';
import { API_ENDPOINTS } from '../constants/api';
import { notificationService } from '../../services/notificationService';

const VerifyIdentificationDocumentScreen = ({ navigation, route }) => {
  const { broker } = route.params || {};
  const [idType, setIdType] = useState('national');
  const [idDoc, setIdDoc] = useState(null);
  const [status, setStatus] = useState('not_uploaded'); // 'not_uploaded', 'pending', 'verified', 'rejected'
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check broker verification status on component mount
  useEffect(() => {
    checkBrokerStatus();
  }, []);

  const checkBrokerStatus = async () => {
    try {
      setCheckingStatus(true);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.BROKERS}/${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const brokerData = data.broker || data;
        
        // Check if broker has uploaded documents and their status
        if (brokerData.idDocument) {
          setIdDoc(brokerData.idDocument);
          setIdType(brokerData.idType || 'national');
          
          // Check verification status
          if (brokerData.verificationStatus === 'approved') {
            setStatus('verified');
            // Auto-navigate to broker tabs if already approved
            setTimeout(() => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'BrokerTabs' }]
              });
            }, 1000);
          } else if (brokerData.verificationStatus === 'rejected') {
            setStatus('rejected');
          } else if (brokerData.verificationStatus === 'pending') {
            setStatus('pending');
          }
        }
      }
    } catch (error) {
      console.error('Error checking broker status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handlePickIdDoc = async () => {
    try {
      setUploading(true);
      
      // Show action sheet for camera/gallery selection
      Alert.alert(
        'Select Document Source',
        'Choose how you want to upload your ID document',
        [
          { text: 'Camera', onPress: () => pickFromCamera() },
          { text: 'Gallery', onPress: () => pickFromGallery() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Error in handlePickIdDoc:', error);
      Alert.alert('Error', 'Failed to open document picker');
    } finally {
      setUploading(false);
    }
  };

  const pickFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Permission to access camera is required!');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadDocument(result.assets[0]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Permission to access media library is required!');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadDocument(result.assets[0]);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const uploadDocument = async (asset) => {
    try {
      setUploading(true);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('idDocument', {
        uri: asset.uri,
        type: 'image/jpeg',
        name: `id_document_${Date.now()}.jpg`,
      } as any);
      formData.append('idType', idType);
      formData.append('verificationStatus', 'pending');

      const response = await fetch(`${API_ENDPOINTS.BROKERS}/${user.uid}/upload-id`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setIdDoc(asset);
        setStatus('pending');
        
        Alert.alert(
          'Document Uploaded',
          'Your ID document has been submitted for verification. You will be notified once it\'s reviewed.',
          [{ text: 'OK' }]
        );
        
        // Notify admin for verification
        notificationService.sendInApp(
          'ADMIN',
          `Broker ${user.email} uploaded ID for verification.`,
          'admin',
          'admin_alert',
          { broker: { email: user.email, uid: user.uid }, idType, idDoc: asset }
        );
      } else {
        const errorData = await response.json();
        Alert.alert('Upload Failed', errorData.message || 'Failed to upload document. Please try again.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Error', 'Failed to upload document. Please check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRefreshStatus = async () => {
    await checkBrokerStatus();
  };

  if (checkingStatus) {
    return (
      <View style={styles.bg}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Checking verification status...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.bg}>
      <View style={styles.card}>
        <MaterialCommunityIcons name="account-check-outline" size={38} color={colors.primary} style={{ alignSelf: 'center', marginBottom: 8 }} />
        <Text style={styles.title}>Verify Your ID</Text>
        <Text style={styles.infoMsg}>
          For your security and to maintain trust on the TRUKAPP platform, we require brokers to provide a valid identification document. This helps us comply with regulations and ensures a safe experience for all users.
        </Text>
        <Text style={styles.subtitle}>Upload your identification document to complete your registration. Only National ID, Passport, or Military ID are accepted.</Text>
        
        {status === 'not_uploaded' && (
          <>
            <Text style={styles.label}>ID Type</Text>
            <View style={styles.idTypeRow}>
              <TouchableOpacity style={[styles.idTypeBtn, idType === 'national' && styles.idTypeBtnActive]} onPress={() => setIdType('national')}><Text style={idType === 'national' ? styles.idTypeTextActive : styles.idTypeText}>National ID</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.idTypeBtn, idType === 'passport' && styles.idTypeBtnActive]} onPress={() => setIdType('passport')}><Text style={idType === 'passport' ? styles.idTypeTextActive : styles.idTypeText}>Passport</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.idTypeBtn, idType === 'military' && styles.idTypeBtnActive]} onPress={() => setIdType('military')}><Text style={idType === 'military' ? styles.idTypeTextActive : styles.idTypeText}>Military ID</Text></TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]} 
              onPress={handlePickIdDoc}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="cloud-upload-outline" size={22} color={colors.primary} />
              )}
              <Text style={styles.uploadBtnText}>
                {uploading ? 'Uploading...' : (idDoc ? 'Change ID Document' : 'Upload ID Document')}
              </Text>
            </TouchableOpacity>
            {idDoc && <Text style={styles.fileName}>{idDoc.name || idDoc.uri?.split('/').pop()}</Text>}
          </>
        )}
        {/* Status Section */}
        {status === 'pending' && (
          <View style={styles.statusSectionPending}>
            <MaterialCommunityIcons name="clock-outline" size={28} color={colors.warning} />
            <Text style={styles.statusTextPending}>ID Verification Pending</Text>
            <Text style={styles.statusSubText}>Your ID document is under review. You will be notified once verified.</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={handleRefreshStatus}>
              <Ionicons name="refresh" size={20} color={colors.primary} />
              <Text style={styles.refreshBtnText}>Check Status</Text>
            </TouchableOpacity>
          </View>
        )}
        {status === 'verified' && (
          <View style={styles.statusSectionVerified}>
            <MaterialCommunityIcons name="check-circle-outline" size={28} color={colors.success} />
            <Text style={styles.statusTextVerified}>ID Verified</Text>
            <Text style={styles.statusSubText}>Your ID is verified. You can now access the broker dashboard.</Text>
            <TouchableOpacity style={styles.goDashboardBtn} onPress={() => navigation.reset({
              index: 0,
              routes: [{ name: 'BrokerTabs' }]
            })}>
              <Text style={styles.goDashboardBtnText}>Go to Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}
        {status === 'rejected' && (
          <View style={styles.statusSectionRejected}>
            <MaterialCommunityIcons name="close-circle-outline" size={28} color={colors.error} />
            <Text style={styles.statusTextRejected}>Verification Rejected</Text>
            <Text style={styles.statusSubText}>Your ID verification was rejected. Please contact support or upload a new document.</Text>
            <TouchableOpacity style={styles.goDashboardBtn} onPress={() => {
              setStatus('not_uploaded');
              setIdDoc(null);
            }}>
              <Text style={styles.goDashboardBtnText}>Upload New Document</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 18 },
  card: { backgroundColor: colors.white, borderRadius: 18, padding: 24, width: '100%', maxWidth: 420, shadowColor: colors.primary, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: colors.primaryDark, textAlign: 'center' },
  subtitle: { color: colors.text.secondary, fontSize: 15, marginBottom: 18, textAlign: 'center' },
  label: { fontWeight: 'bold', marginBottom: 6, color: colors.text.secondary, alignSelf: 'flex-start' },
  idTypeRow: { flexDirection: 'row', marginBottom: 12, width: '100%' },
  idTypeBtn: { flex: 1, borderWidth: 1, borderColor: colors.text.light, borderRadius: 8, padding: 10, marginHorizontal: 4, alignItems: 'center', backgroundColor: colors.surface },
  idTypeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  idTypeText: { color: colors.text.primary, fontWeight: 'bold' },
  idTypeTextActive: { color: colors.white, fontWeight: 'bold' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, padding: 12, marginTop: 8, marginBottom: 4, width: '100%', justifyContent: 'center' },
  uploadBtnText: { color: colors.primary, marginLeft: 8, fontWeight: 'bold', fontSize: 15 },
  fileName: { color: colors.text.secondary, fontSize: 13, marginTop: 2, marginBottom: 8 },
  statusSectionPending: { alignItems: 'center', marginTop: 18, backgroundColor: colors.warning + '11', borderRadius: 12, padding: 16, width: '100%' },
  statusSectionVerified: { alignItems: 'center', marginTop: 18, backgroundColor: colors.success + '11', borderRadius: 12, padding: 16, width: '100%' },
  statusSectionRejected: { alignItems: 'center', marginTop: 18, backgroundColor: colors.error + '11', borderRadius: 12, padding: 16, width: '100%' },
  statusTextPending: { color: colors.warning, fontWeight: 'bold', fontSize: 17, marginTop: 6 },
  statusTextVerified: { color: colors.success, fontWeight: 'bold', fontSize: 17, marginTop: 6 },
  statusTextRejected: { color: colors.error, fontWeight: 'bold', fontSize: 17, marginTop: 6 },
  statusSubText: { color: colors.text.secondary, fontSize: 14, marginTop: 4, textAlign: 'center' },
  goDashboardBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 22, marginTop: 14 },
  goDashboardBtnText: { color: colors.white, fontWeight: 'bold', fontSize: 15 },
  refreshBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.surface, 
    borderRadius: 8, 
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    marginTop: 12 
  },
  refreshBtnText: { color: colors.primary, marginLeft: 6, fontWeight: 'bold', fontSize: 14 },
  uploadBtnDisabled: { opacity: 0.6 },
  loadingText: { color: colors.text.secondary, fontSize: 16, marginTop: 12, textAlign: 'center' },
  infoMsg: { color: colors.text.secondary, fontSize: 15, marginBottom: 10, textAlign: 'center', fontStyle: 'italic' },
});

export default VerifyIdentificationDocumentScreen;
