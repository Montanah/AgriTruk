import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { getAuth, signOut } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';
import { API_ENDPOINTS } from '../../constants/api';



interface BusinessProfileData {
  businessName: string;
  registrationNumber: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  businessType: string;
  taxNumber: string;
  logo: any;
  documents: {
    id: string;
    name: string;
    type: string;
    uploadedAt: string;
    status: string;
  }[];
  status: 'pending' | 'approved' | 'rejected';
  memberSince: string;
  emailVerified: boolean;
  phoneVerified: boolean;
}

const BusinessProfileScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profileData, setProfileData] = useState<BusinessProfileData>({
    businessName: '',
    registrationNumber: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    businessType: '',
    taxNumber: '',
    logo: null,
    documents: [],
    status: 'pending',
    memberSince: '',
    emailVerified: false,
    phoneVerified: false,
  });

  const [editData, setEditData] = useState<BusinessProfileData>({ ...profileData });

  // Verification states
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);



  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../../firebaseConfig');

        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const businessData: BusinessProfileData = {
            businessName: userData.businessName || userData.name || '',
            registrationNumber: userData.registrationNumber || '',
            contactPerson: userData.contactPerson || userData.name || '',
            email: userData.email || user.email || '',
            phone: userData.phone || user.phoneNumber || '',
            address: userData.address || userData.location || '',
            businessType: userData.businessType || 'Logistics & Transportation',
            taxNumber: userData.taxNumber || '',
            logo: userData.logo || userData.profilePhotoUrl || null,
            documents: userData.documents || [],
            status: userData.status || 'pending',
            memberSince: userData.createdAt ? new Date(userData.createdAt.toDate()).toISOString() : new Date().toISOString(),
            emailVerified: userData.emailVerified || false,
            phoneVerified: userData.phoneVerified || false,
          };

          setProfileData(businessData);
          setEditData(businessData);


        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditData({ ...profileData });
    setEditing(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // TODO: Update backend
      // await apiRequest('/business/profile', { method: 'PUT', body: editData });
      setProfileData(editData);
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setEditData({ ...profileData });
  };

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setEditData({ ...editData, logo: result.assets[0] });
    }
  };

  const uploadDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets[0]) {
      setUploading(true);
      try {
        // TODO: Upload to backend
        const newDoc = {
          id: Date.now().toString(),
          name: result.assets[0].name,
          type: 'business_license',
          uploadedAt: new Date().toISOString(),
          status: 'pending',
        };
        setEditData({
          ...editData,
          documents: [...editData.documents, newDoc],
        });
        Alert.alert('Success', 'Document uploaded successfully');
      } catch (error) {
        Alert.alert('Error', 'Failed to upload document');
      } finally {
        setUploading(false);
      }
    }
  };

  // Verification functions
  const handleVerifyEmail = async () => {
    setVerifyingEmail(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(API_ENDPOINTS.AUTH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'resend-email-code' })
      });

      if (response.ok) {
        Alert.alert('Verification Code Sent', 'Please check your email for the verification code.');
      } else {
        Alert.alert('Error', 'Failed to send verification code. Please try again.');
      }
    } catch (error) {
      console.error('Email verification error:', error);
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleVerifyPhone = async () => {
    setVerifyingPhone(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(API_ENDPOINTS.AUTH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'resend-phone-code' })
      });

      if (response.ok) {
        Alert.alert('Verification Code Sent', 'Please check your phone for the verification code.');
      } else {
        Alert.alert('Error', 'Failed to send verification code. Please try again.');
      }
    } catch (error) {
      console.error('Phone verification error:', error);
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    } finally {
      setVerifyingPhone(false);
    }
  };



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
              const auth = getAuth();
              await signOut(auth);
              // Navigation will be handled by App.tsx auth state
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return colors.success;
      case 'pending': return colors.warning;
      case 'rejected': return colors.error;
      default: return colors.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return 'check-circle';
      case 'pending': return 'clock-outline';
      case 'rejected': return 'close-circle';
      default: return 'help-circle-outline';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner
          visible={true}
          message="Loading Profile..."
          size="large"
          type="pulse"
          logo={true}
        />
      </SafeAreaView>
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
          <Text style={styles.headerTitle}>Business Profile</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileTop}>
            <TouchableOpacity style={styles.logoContainer} onPress={editing ? pickLogo : undefined}>
              {editData.logo ? (
                <Image source={{ uri: editData.logo.uri }} style={styles.logo} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <MaterialCommunityIcons name="domain" size={40} color={colors.primary} />
                </View>
              )}
              {editing && (
                <View style={styles.editOverlay}>
                  <Ionicons name="camera" size={20} color={colors.white} />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.profileInfo}>
              <Text style={styles.businessName}>{editData.businessName || 'Business Name'}</Text>
              <View style={styles.statusContainer}>
                <MaterialCommunityIcons
                  name={getStatusIcon(editData.status)}
                  size={16}
                  color={getStatusColor(editData.status)}
                />
                <Text style={[styles.statusText, { color: getStatusColor(editData.status) }]}>
                  {editData.status.charAt(0).toUpperCase() + editData.status.slice(1)}
                </Text>
              </View>
              <Text style={styles.businessType}>{editData.businessType || 'Business Type'}</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            {!editing ? (
              <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                <Ionicons name="create-outline" size={20} color={colors.primary} />
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Ionicons name="checkmark" size={20} color={colors.white} />
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                  <Ionicons name="close" size={20} color={colors.error} />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Business Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Information</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="domain" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Business Name</Text>
                {editing ? (
                  <TextInput
                    style={styles.input}
                    value={editData.businessName}
                    onChangeText={(text) => setEditData({ ...editData, businessName: text })}
                    placeholder="Enter business name"
                  />
                ) : (
                  <Text style={styles.infoValue}>{editData.businessName}</Text>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="file-document" size={20} color={colors.secondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Registration Number</Text>
                {editing ? (
                  <TextInput
                    style={styles.input}
                    value={editData.registrationNumber}
                    onChangeText={(text) => setEditData({ ...editData, registrationNumber: text })}
                    placeholder="Enter registration number"
                  />
                ) : (
                  <Text style={styles.infoValue}>{editData.registrationNumber}</Text>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="account-tie" size={20} color={colors.tertiary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Contact Person</Text>
                {editing ? (
                  <TextInput
                    style={styles.input}
                    value={editData.contactPerson}
                    onChangeText={(text) => setEditData({ ...editData, contactPerson: text })}
                    placeholder="Enter contact person"
                  />
                ) : (
                  <Text style={styles.infoValue}>{editData.contactPerson}</Text>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="email" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <View style={styles.infoValueContainer}>
                  {editing ? (
                    <TextInput
                      style={styles.input}
                      value={editData.email}
                      onChangeText={(text) => setEditData({ ...editData, email: text })}
                      placeholder="Enter email"
                      keyboardType="email-address"
                    />
                  ) : (
                    <Text style={styles.infoValue}>{editData.email}</Text>
                  )}
                  <View style={[
                    styles.verificationBadge,
                    editData.emailVerified ? styles.verifiedBadge : styles.unverifiedBadge
                  ]}>
                    <Ionicons
                      name={editData.emailVerified ? "checkmark-circle" : "close-circle"}
                      size={12}
                      color={editData.emailVerified ? colors.success : colors.warning}
                    />
                    <Text style={[
                      styles.verificationBadgeText,
                      editData.emailVerified ? styles.verifiedText : styles.unverifiedText
                    ]}>
                      {editData.emailVerified ? 'Verified' : 'Unverified'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="phone" size={20} color={colors.secondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <View style={styles.infoValueContainer}>
                  {editing ? (
                    <TextInput
                      style={styles.input}
                      value={editData.phone}
                      onChangeText={(text) => setEditData({ ...editData, phone: text })}
                      placeholder="Enter phone number"
                      keyboardType="phone-pad"
                    />
                  ) : (
                    <Text style={styles.infoValue}>{editData.phone}</Text>
                  )}
                  <View style={[
                    styles.verificationBadge,
                    editData.phoneVerified ? styles.verifiedBadge : styles.unverifiedBadge
                  ]}>
                    <Ionicons
                      name={editData.phoneVerified ? "checkmark-circle" : "close-circle"}
                      size={12}
                      color={editData.phoneVerified ? colors.success : colors.warning}
                    />
                    <Text style={[
                      styles.verificationBadgeText,
                      editData.phoneVerified ? styles.verifiedText : styles.unverifiedText
                    ]}>
                      {editData.phoneVerified ? 'Verified' : 'Unverified'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="map-marker" size={20} color={colors.tertiary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Address</Text>
                {editing ? (
                  <TextInput
                    style={styles.input}
                    value={editData.address}
                    onChangeText={(text) => setEditData({ ...editData, address: text })}
                    placeholder="Enter address"
                  />
                ) : (
                  <Text style={styles.infoValue}>{editData.address}</Text>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="briefcase" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Business Type</Text>
                {editing ? (
                  <TextInput
                    style={styles.input}
                    value={editData.businessType}
                    onChangeText={(text) => setEditData({ ...editData, businessType: text })}
                    placeholder="Enter business type"
                  />
                ) : (
                  <Text style={styles.infoValue}>{editData.businessType}</Text>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="receipt" size={20} color={colors.secondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tax Number</Text>
                {editing ? (
                  <TextInput
                    style={styles.input}
                    value={editData.taxNumber}
                    onChangeText={(text) => setEditData({ ...editData, taxNumber: text })}
                    placeholder="Enter tax number"
                  />
                ) : (
                  <Text style={styles.infoValue}>{editData.taxNumber}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Verification Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Verification</Text>
          <View style={styles.card}>
            {!editData.emailVerified && (
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

            {!editData.phoneVerified && (
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

            {editData.emailVerified && editData.phoneVerified && (
              <View style={styles.allVerified}>
                <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                <Text style={styles.allVerifiedText}>All contact methods verified!</Text>
              </View>
            )}
          </View>
        </View>



        {/* Documents Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Business Documents</Text>
            {editing && (
              <TouchableOpacity style={styles.uploadButton} onPress={uploadDocument}>
                <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
                <Text style={styles.uploadButtonText}>Upload</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.card}>
            {editData.documents.length > 0 ? (
              editData.documents.map((doc) => (
                <View key={doc.id} style={styles.documentItem}>
                  <MaterialCommunityIcons name="file-document" size={24} color={colors.primary} />
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentName}>{doc.name}</Text>
                    <Text style={styles.documentDate}>
                      Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.documentStatus}>
                    <MaterialCommunityIcons
                      name={getStatusIcon(doc.status)}
                      size={16}
                      color={getStatusColor(doc.status)}
                    />
                    <Text style={[styles.documentStatusText, { color: getStatusColor(doc.status) }]}>
                      {doc.status}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyDocuments}>
                <MaterialCommunityIcons name="file-document-outline" size={48} color={colors.text.light} />
                <Text style={styles.emptyText}>No documents uploaded</Text>
                <Text style={styles.emptySubtext}>Upload business licenses and certificates</Text>
              </View>
            )}
          </View>
        </View>

        {/* Account Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Member Since</Text>
                <Text style={styles.infoValue}>
                  {new Date(editData.memberSince).toLocaleDateString()}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="shield-check" size={20} color={colors.success} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Account Status</Text>
                <Text style={[styles.infoValue, { color: colors.success, fontWeight: 'bold' }]}>
                  Active
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('BusinessManage')}>
              <MaterialCommunityIcons name="cube-send" size={28} color={colors.primary} />
              <Text style={styles.actionTitle}>Manage Requests</Text>
              <Text style={styles.actionSubtitle}>View and manage all requests</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Consolidation')}>
              <FontAwesome5 name="layer-group" size={28} color={colors.secondary} />
              <Text style={styles.actionTitle}>Consolidations</Text>
              <Text style={styles.actionSubtitle}>Manage consolidated shipments</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('TrackingManagement')}>
              <MaterialCommunityIcons name="truck-delivery" size={28} color={colors.tertiary} />
              <Text style={styles.actionTitle}>Track Shipments</Text>
              <Text style={styles.actionSubtitle}>Real-time tracking</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={() => Alert.alert('Coming Soon', 'Analytics dashboard will be available soon')}>
              <MaterialCommunityIcons name="chart-line" size={28} color={colors.success} />
              <Text style={styles.actionTitle}>Analytics</Text>
              <Text style={styles.actionSubtitle}>View business insights</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>



      <LoadingSpinner
        visible={uploading}
        message="Uploading Document..."
        size="large"
        type="pulse"
        logo={true}
      />
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
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  profileHeader: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginTop: -20,
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  logoContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  editOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusText: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
    marginLeft: 4,
  },
  businessType: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  editButtonText: {
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  saveButton: {
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  cancelButton: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  cancelButtonText: {
    color: colors.error,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  infoLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.text.light,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: fonts.size.md,
    color: colors.text.primary,
    backgroundColor: colors.background,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  uploadButtonText: {
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '20',
  },
  documentInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  documentName: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  documentDate: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  documentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentStatusText: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyDocuments: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  emptySubtext: {
    fontSize: fonts.size.sm,
    color: colors.text.light,
    textAlign: 'center',
    marginTop: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  actionCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 120,
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 16,
  },
  infoValueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: spacing.sm,
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
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginBottom: spacing.sm,
  },
  verifyButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  allVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success + '10',
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  allVerifiedText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },

});

export default BusinessProfileScreen;
