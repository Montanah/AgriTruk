import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { notificationService } from '../../services/notificationService';

const VerifyIdentificationDocumentScreen = ({ navigation, route }) => {
  const { broker } = route.params || {};
  const [idType, setIdType] = useState('national');
  const [idDoc, setIdDoc] = useState(null);
  const [status, setStatus] = useState('not_uploaded'); // 'not_uploaded', 'pending', 'verified', 'rejected'

  const handlePickIdDoc = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
    if (!result.canceled && result.assets && result.assets[0]) {
      setIdDoc(result.assets[0]);
      setStatus('pending');
      // Notify admin for verification
      notificationService.sendInApp(
        'ADMIN',
        `Broker ${broker?.name || broker?.email || 'New Broker'} uploaded ID for verification.`,
        'admin',
        'admin_alert',
        { broker, idType, idDoc: result.assets[0] }
      );
      notificationService.sendEmail(
        broker?.email,
        'ID Document Submitted',
        'Your ID document has been submitted and is pending verification.',
        'broker',
        'admin_alert',
        { broker, idType, idDoc: result.assets[0] }
      );
      notificationService.sendSMS(
        broker?.phone,
        'Your ID document has been submitted and is pending verification.',
        'broker',
        'admin_alert',
        { broker, idType, idDoc: result.assets[0] }
      );
    }
  };

  // Simulate admin verification (for demo)
  const handleAdminApprove = () => {
    setStatus('verified');
    notificationService.sendEmail(broker?.email, 'Broker Verified', 'Your broker account has been verified. You can now access the dashboard.', 'broker', 'admin_alert');
    notificationService.sendSMS(broker?.phone, 'Your broker account is verified. You can now access the dashboard.', 'broker', 'admin_alert');
    notificationService.sendInApp(broker?.email, 'Your broker account is verified. You can now access the dashboard.', 'broker', 'admin_alert');
    Alert.alert('Verified', 'Broker account is now verified.');
  };
  const handleAdminReject = () => {
    setStatus('rejected');
    notificationService.sendEmail(broker?.email, 'Broker Registration Rejected', 'Your broker registration was rejected. Please contact support.', 'broker', 'admin_alert');
    notificationService.sendSMS(broker?.phone, 'Your broker registration was rejected. Please contact support.', 'broker', 'admin_alert');
    notificationService.sendInApp(broker?.email, 'Your broker registration was rejected. Please contact support.', 'broker', 'admin_alert');
    Alert.alert('Rejected', 'Broker registration rejected.');
  };

  return (
    <View style={styles.bg}>
      <View style={styles.card}>
        <MaterialCommunityIcons name="account-check-outline" size={38} color={colors.primary} style={{ alignSelf: 'center', marginBottom: 8 }} />
        <Text style={styles.title}>Verify Your ID</Text>
        <Text style={styles.infoMsg}>
          For your security and to maintain trust on the TRUKAPP platform, we require brokers to provide a valid identification document. This helps us comply with regulations and ensures a safe experience for all users.
        </Text>
        <Text style={styles.subtitle}>Upload your identification document to complete your registration. Only National ID, Passport, or Military ID are accepted.</Text>
        <Text style={styles.label}>ID Type</Text>
        <View style={styles.idTypeRow}>
          <TouchableOpacity style={[styles.idTypeBtn, idType === 'national' && styles.idTypeBtnActive]} onPress={() => setIdType('national')}><Text style={idType === 'national' ? styles.idTypeTextActive : styles.idTypeText}>National ID</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.idTypeBtn, idType === 'passport' && styles.idTypeBtnActive]} onPress={() => setIdType('passport')}><Text style={idType === 'passport' ? styles.idTypeTextActive : styles.idTypeText}>Passport</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.idTypeBtn, idType === 'military' && styles.idTypeBtnActive]} onPress={() => setIdType('military')}><Text style={idType === 'military' ? styles.idTypeTextActive : styles.idTypeText}>Military ID</Text></TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.uploadBtn} onPress={handlePickIdDoc}>
          <Ionicons name="cloud-upload-outline" size={22} color={colors.primary} />
          <Text style={styles.uploadBtnText}>{idDoc ? 'Change ID Document' : 'Upload ID Document'}</Text>
        </TouchableOpacity>
        {idDoc && <Text style={styles.fileName}>{idDoc.name || idDoc.uri?.split('/').pop()}</Text>}
        {/* Demo: Show Status Section Button */}
        {status === 'not_uploaded' && (
          <TouchableOpacity style={styles.goDashboardBtn} onPress={() => setStatus('pending')}>
            <Text style={styles.goDashboardBtnText}>Show Status Section (Demo)</Text>
          </TouchableOpacity>
        )}
        {/* Status Section */}
        {status === 'pending' && (
          <View style={styles.statusSectionPending}>
            <MaterialCommunityIcons name="clock-outline" size={28} color={colors.warning} />
            <Text style={styles.statusTextPending}>ID Verification Pending</Text>
            <Text style={styles.statusSubText}>Your ID document is under review. You will be notified once verified.</Text>
            <TouchableOpacity style={styles.goDashboardBtn} onPress={() => navigation.replace('BrokerTabs')}>
              <Text style={styles.goDashboardBtnText}>Go to Dashboard (Temporary)</Text>
            </TouchableOpacity>
            {/* For demo: admin actions */}
            <TouchableOpacity style={styles.adminBtn} onPress={handleAdminApprove}><Text style={styles.adminBtnText}>Admin: Approve</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.adminBtn, { backgroundColor: colors.error }]} onPress={handleAdminReject}><Text style={styles.adminBtnText}>Admin: Reject</Text></TouchableOpacity>
          </View>
        )}
        {status === 'verified' && (
          <View style={styles.statusSectionVerified}>
            <MaterialCommunityIcons name="check-circle-outline" size={28} color={colors.success} />
            <Text style={styles.statusTextVerified}>ID Verified</Text>
            <Text style={styles.statusSubText}>Your ID is verified. You can now access the dashboard.</Text>
            <TouchableOpacity style={styles.goDashboardBtn} onPress={() => navigation.replace('BrokerTabs')}>
              <Text style={styles.goDashboardBtnText}>Go to Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}
        {status === 'rejected' && (
          <View style={styles.statusSectionRejected}>
            <MaterialCommunityIcons name="close-circle-outline" size={28} color={colors.error} />
            <Text style={styles.statusTextRejected}>Verification Rejected</Text>
            <Text style={styles.statusSubText}>Your ID verification was rejected. Please contact support or try again.</Text>
            <TouchableOpacity style={styles.goDashboardBtn} onPress={() => setStatus('not_uploaded')}>
              <Text style={styles.goDashboardBtnText}>Try Again</Text>
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
  adminBtn: { backgroundColor: colors.secondary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 18, marginTop: 10 },
  adminBtnText: { color: colors.white, fontWeight: 'bold', fontSize: 14 },
  infoMsg: { color: colors.text.secondary, fontSize: 15, marginBottom: 10, textAlign: 'center', fontStyle: 'italic' },
});

export default VerifyIdentificationDocumentScreen;
