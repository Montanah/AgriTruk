import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { auth, db } from '../firebaseConfig';

interface ShipperProfileData {
  name: string;
  email: string;
  phone: string;
  address: string;
  profilePhotoUrl?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  role: string;
  createdAt: string;
  preferences: {
    notificationSettings: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    preferredVerificationMethod: 'email' | 'phone';
  };
}

type NavigationProp = {
  navigate: (screen: string, params?: any) => void;
};

const AccountScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [profile, setProfile] = useState<ShipperProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<ShipperProfileData>>({});
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [changePwd, setChangePwd] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [complaintText, setComplaintText] = useState('');
  const [verifyingPhone, setVerifyingPhone] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();

        // Get the actual user creation date from Firebase Auth metadata
        const userCreationDate = user.metadata?.creationTime || userData.createdAt || new Date().toISOString();

        const profileData: ShipperProfileData = {
          name: userData.name || '',
          email: userData.email || user.email || '',
          phone: userData.phone || '',
          address: userData.address || '',
          profilePhotoUrl: userData.profilePhotoUrl,
          emailVerified: userData.emailVerified || false,
          phoneVerified: userData.phoneVerified || false,
          role: userData.role || 'shipper',
          createdAt: userCreationDate,
          preferences: {
            notificationSettings: {
              email: userData.preferences?.notificationSettings?.email ?? true,
              push: userData.preferences?.notificationSettings?.push ?? true,
              sms: userData.preferences?.notificationSettings?.sms ?? false,
            },
            preferredVerificationMethod: userData.preferences?.preferredVerificationMethod || 'email',
          },
        };

        setProfile(profileData);
        setEditData(profileData);
      }
    } catch (e: any) {
      console.error('Profile loading error:', e);
      setError(e.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleSave = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      await updateDoc(doc(db, 'users', user.uid), {
        name: editData.name,
        email: editData.email,
        phone: editData.phone,
        address: editData.address,
        updatedAt: new Date().toISOString(),
      });

      setProfile(prev => prev ? { ...prev, ...editData } : null);
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (e: any) {
      setError(e.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoPick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Permission to access media library is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      const newUri = result.assets[0].uri;
      setEditData(prev => ({ ...prev, profilePhotoUrl: newUri }));
      setLoading(true);
      setError('');

      try {
        if (user?.uid) {
          await updateDoc(doc(db, 'users', user.uid), {
            profilePhotoUrl: newUri,
          });
          setProfile(prev => prev ? { ...prev, profilePhotoUrl: newUri } : null);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to update profile photo.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleVerifyEmail = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'No email address found.');
      return;
    }
    if (profile?.emailVerified) {
      Alert.alert('Already Verified', 'Your email is already verified. You can use it to log in.');
      return;
    }
    try {
      setVerifyingEmail(true);

      // Try Firebase directly since backend is missing resendCode function
      try {
        const { sendEmailVerification } = await import('firebase/auth');
        await sendEmailVerification(user);
        Alert.alert(
          'Verification Email Sent',
          'Please check your email and click the verification link. You can then use your email to log in.',
          [
            { text: 'OK' },
            {
              text: 'Go to Verification',
              onPress: () => navigation.navigate('EmailVerification')
            }
          ]
        );
        return;
      } catch (firebaseError: any) {
        console.error('Firebase failed:', firebaseError);
        Alert.alert(
          'Verification Failed',
          'Unable to send verification email. Please try again later or contact support.',
          [{ text: 'OK' }]
        );
      }
    } catch (e: any) {
      console.error('Email verification error:', e);
      Alert.alert(
        'Verification Failed',
        'Unable to send verification email. Please check your internet connection and try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!user?.phoneNumber) {
      Alert.alert('Error', 'No phone number found.');
      return;
    }
    if (profile?.phoneVerified) {
      Alert.alert('Already Verified', 'Your phone is already verified. You can use it to log in.');
      return;
    }
    try {
      setVerifyingPhone(true);

      // Try Firebase directly since backend is missing resendPhoneCode function
      try {
        // For phone verification, we need to use Firebase Phone Auth
        // This requires additional setup, so for now we'll show a message
        Alert.alert(
          'Phone Verification',
          'Phone verification requires additional setup. Please contact support or use email verification for now.',
          [{ text: 'OK' }]
        );
        return;
      } catch (firebaseError: any) {
        console.error('Firebase failed:', firebaseError);
        Alert.alert(
          'Verification Failed',
          'Unable to send phone verification. Please try again later or contact support.',
          [{ text: 'OK' }]
        );
      }
    } catch (e: any) {
      console.error('Phone verification error:', e);
      Alert.alert(
        'Verification Failed',
        'Unable to send phone verification. Please check your internet connection and try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setVerifyingPhone(false);
    }
  };

  const handleLogout = async () => {
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
            } catch (e: any) {
              setError(e.message || 'Logout failed.');
            }
          },
        },
      ]
    );
  };

  const handleSubmitComplaint = async () => {
    if (!user?.uid || !complaintText.trim()) {
      Alert.alert('Error', 'Please enter a complaint message.');
      return;
    }

    try {
      setLoading(true);
      await updateDoc(doc(db, 'users', user.uid), {
        complaint: complaintText,
        complaintSubmittedAt: new Date().toISOString(),
      });
      Alert.alert('Complaint Submitted', 'Your complaint has been submitted for admin mediation.');
      setShowConflictModal(false);
      setComplaintText('');
    } catch (e: any) {
      setError(e.message || 'Failed to submit complaint.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <MaterialCommunityIcons name="account-alert" size={64} color={colors.error} />
        <Text style={styles.errorText}>Failed to load profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shipper Profile</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setEditing(!editing)}
        >
          <MaterialCommunityIcons
            name={editing ? "close" : "pencil"}
            size={24}
            color={editing ? colors.error : colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Summary */}
        <View style={styles.profileSummary}>
          <View style={styles.profilePhotoSection}>
            <TouchableOpacity
              style={styles.profilePhotoContainer}
              onPress={editing ? handlePhotoPick : undefined}
              disabled={!editing}
            >
              {profile?.profilePhotoUrl ? (
                <Image source={{ uri: profile.profilePhotoUrl }} style={styles.profilePhoto} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <MaterialCommunityIcons name="camera" size={32} color={colors.text.light} />
                  {editing && <Text style={styles.photoPlaceholderText}>Tap to add photo</Text>}
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.name || 'Your Name'}</Text>
            <Text style={styles.profileRole}>{profile?.role || 'Shipper'}</Text>
            <Text style={styles.clientSince}>
              Client since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'Recently'}
            </Text>
          </View>
        </View>

        {/* Verification Status */}
        <View style={styles.verificationSection}>
          <Text style={styles.sectionTitle}>Verification Status</Text>

          {/* Show preferred verification method */}
          <View style={styles.preferredMethod}>
            <Text style={styles.preferredMethodText}>
              Primary Contact: {profile.preferences?.preferredVerificationMethod === 'phone' ? 'Phone' : 'Email'}
            </Text>
          </View>

          <View style={styles.verificationRow}>
            <View style={styles.verificationItem}>
              <MaterialCommunityIcons
                name="email"
                size={20}
                color={profile.emailVerified ? colors.success : colors.warning}
              />
              <Text style={styles.verificationLabel}>Email</Text>
              <View style={[
                styles.verificationBadge,
                profile.emailVerified ? styles.verifiedBadge : styles.unverifiedBadge
              ]}>
                <Text style={styles.verificationBadgeText}>
                  {profile.emailVerified ? 'Verified' : 'Unverified'}
                </Text>
              </View>
            </View>

            <View style={styles.verificationItem}>
              <MaterialCommunityIcons
                name="phone"
                size={20}
                color={profile.phoneVerified ? colors.success : colors.warning}
              />
              <Text style={styles.verificationLabel}>Phone</Text>
              <View style={[
                styles.verificationBadge,
                profile.phoneVerified ? styles.verifiedBadge : styles.unverifiedBadge
              ]}>
                <Text style={styles.verificationBadgeText}>
                  {profile.phoneVerified ? 'Verified' : 'Unverified'}
                </Text>
              </View>
            </View>
          </View>

          {/* Show verification buttons only for unverified methods */}
          {!profile.emailVerified && (
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

          {!profile.phoneVerified && (
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

          {/* Show message if both are verified */}
          {profile.emailVerified && profile.phoneVerified && (
            <View style={styles.allVerified}>
              <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
              <Text style={styles.allVerifiedText}>All contact methods verified!</Text>
            </View>
          )}
        </View>

        {/* Profile Details - Only show in edit mode */}
        {editing && (
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Profile Details</Text>

            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="account" size={20} color={colors.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Full Name</Text>
                <TextInput
                  style={styles.editInput}
                  value={editData.name}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, name: text }))}
                  placeholder="Enter your full name"
                />
              </View>
            </View>

            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="email" size={20} color={colors.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Email Address</Text>
                <TextInput
                  style={styles.editInput}
                  value={editData.email}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, email: text }))}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View style={styles.verificationStatus}>
                  <Text style={[
                    styles.verificationText,
                    editData.emailVerified ? styles.verifiedText : styles.unverifiedText
                  ]}>
                    {editData.emailVerified ? '✓ Verified' : '✗ Unverified'}
                  </Text>
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
                </View>
              </View>
            </View>

            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="phone" size={20} color={colors.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Phone Number</Text>
                <TextInput
                  style={styles.editInput}
                  value={editData.phone}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, phone: text }))}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                />
                <View style={styles.verificationStatus}>
                  <Text style={[
                    styles.verificationText,
                    editData.phoneVerified ? styles.verifiedText : styles.unverifiedText
                  ]}>
                    {editData.phoneVerified ? '✓ Verified' : '✗ Unverified'}
                  </Text>
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
                </View>
              </View>
            </View>

            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="map-marker" size={20} color={colors.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Address</Text>
                <TextInput
                  style={styles.editInput}
                  value={editData.address}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, address: text }))}
                  placeholder="Enter your address"
                />
              </View>
            </View>
          </View>
        )}

        {/* Notification Preferences */}
        <View style={styles.preferencesSection}>
          <Text style={styles.sectionTitle}>Notification Preferences</Text>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceInfo}>
              <MaterialCommunityIcons name="email-outline" size={20} color={colors.primary} />
              <Text style={styles.preferenceLabel}>Email Notifications</Text>
            </View>
            <View style={[
              styles.preferenceToggle,
              profile.preferences.notificationSettings.email && styles.preferenceActive
            ]}>
              <MaterialCommunityIcons
                name={profile.preferences.notificationSettings.email ? "check" : "close"}
                size={16}
                color={profile.preferences.notificationSettings.email ? colors.success : colors.error}
              />
            </View>
          </View>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceInfo}>
              <MaterialCommunityIcons name="bell-outline" size={20} color={colors.primary} />
              <Text style={styles.preferenceLabel}>Push Notifications</Text>
            </View>
            <View style={[
              styles.preferenceToggle,
              profile.preferences.notificationSettings.push && styles.preferenceActive
            ]}>
              <MaterialCommunityIcons
                name={profile.preferences.notificationSettings.push ? "check" : "close"}
                size={16}
                color={profile.preferences.notificationSettings.push ? colors.success : colors.error}
              />
            </View>
          </View>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceInfo}>
              <MaterialCommunityIcons name="message-text-outline" size={20} color={colors.primary} />
              <Text style={styles.preferenceLabel}>SMS Notifications</Text>
            </View>
            <View style={[
              styles.preferenceToggle,
              profile.preferences.notificationSettings.sms && styles.preferenceActive
            ]}>
              <MaterialCommunityIcons
                name={profile.preferences.notificationSettings.sms ? "check" : "close"}
                size={16}
                color={profile.preferences.notificationSettings.sms ? colors.success : colors.error}
              />
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={() => navigation.navigate('ServiceRequest')}
          >
            <MaterialCommunityIcons name="plus" size={24} color={colors.white} />
            <Text style={styles.primaryActionButtonText}>New Transport Request</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={() => {
              // Navigate to Activity tab (index 1) instead of separate screen
              navigation.navigate('MainTabs', { screen: 'Activity' });
            }}
          >
            <MaterialCommunityIcons name="format-list-bulleted" size={24} color={colors.primary} />
            <Text style={styles.secondaryActionButtonText}>View My Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.utilityButton}
            onPress={() => setChangePwd(true)}
          >
            <MaterialCommunityIcons name="lock" size={24} color={colors.primary} />
            <Text style={styles.utilityButtonText}>Change Password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <MaterialCommunityIcons name="logout" size={24} color={colors.white} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Edit Mode Actions */}
        {editing && (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <MaterialCommunityIcons name="content-save" size={20} color={colors.white} />
              )}
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Conflict Resolution Section */}
        <View style={styles.conflictSection}>
          <Text style={styles.sectionTitle}>Conflict Resolution</Text>
          <Text style={styles.sectionDescription}>
            Submit a complaint for admin mediation. You will be contacted via email and in-app.
          </Text>

          <TouchableOpacity
            style={styles.complaintButton}
            onPress={() => setShowConflictModal(true)}
          >
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.white} />
            <Text style={styles.complaintButtonText}>Submit Complaint</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Password Change Modal */}
      <Modal
        visible={changePwd}
        animationType="slide"
        transparent
        onRequestClose={() => setChangePwd(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pwdModal}>
            <Text style={styles.modalTitle}>Change Password</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setChangePwd(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={() => {
                  // TODO: Implement password change
                  Alert.alert('Info', 'Password change functionality will be implemented soon');
                  setChangePwd(false);
                }}
              >
                <Text style={styles.modalConfirmButtonText}>Change Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Conflict Resolution Modal */}
      <Modal
        visible={showConflictModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowConflictModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit Complaint</Text>
              <TouchableOpacity onPress={() => setShowConflictModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalInput}>
                Please describe the issue or conflict you are experiencing.
                This will help us better understand and resolve the situation.
              </Text>
              <TextInput
                style={styles.complaintInput}
                value={complaintText}
                onChangeText={setComplaintText}
                multiline
                numberOfLines={5}
                placeholder="Enter your complaint here..."
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowConflictModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleSubmitComplaint}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Submit Complaint</Text>
                )}
              </TouchableOpacity>
            </View>
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
  header: {
    paddingTop: 0, // Remove all top padding to extend to top
    paddingBottom: 20,
    paddingHorizontal: spacing.md,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: spacing.md,
    marginTop: 0, // Ensure no top margin
    // Extend to top of screen
    position: 'relative',
    top: 0,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20, // Add padding to header content instead
  },
  headerTitle: {
    color: colors.white,
    fontSize: 28,
    fontWeight: 'bold',
    flex: 1,
    marginRight: spacing.sm,
  },
  editButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl * 3, // Add extra padding at bottom for navigation
    paddingHorizontal: spacing.lg,
  },
  profileHeaderCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  profilePhotoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: spacing.md,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  editPhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 6,
    borderWidth: 2,
    borderColor: colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginBottom: spacing.xs,
  },
  profileEmail: {
    fontSize: 16,
    color: colors.text.light,
    marginBottom: spacing.xs,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  verificationText: {
    fontSize: fonts.size.sm,
    fontWeight: '500',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.text.light,
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: spacing.xs,
  },
  statsContainer: {
    marginBottom: spacing.md,
  },
  statsCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginLeft: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  ratingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.warning,
    marginLeft: spacing.xs,
  },
  ratingLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginLeft: spacing.sm,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  fieldValue: {
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.background,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  preferencesCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  preferenceSection: {
    marginBottom: spacing.md,
  },
  preferenceLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginBottom: spacing.xs,
  },
  preferenceChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  preferenceChip: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  preferenceChipText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  noPreferencesText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  notificationSettings: {
    marginTop: spacing.md,
  },
  notificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  notificationLabel: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  notificationToggle: {
    width: 40,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.text.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  actionButtonsContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  primaryActionButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: spacing.sm,
  },
  secondaryActionButton: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionButtonText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: spacing.sm,
  },
  utilityButton: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.text.light,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  utilityButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 16,
    marginLeft: spacing.sm,
  },
  logoutButton: {
    backgroundColor: colors.error + '10',
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.error,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: colors.error,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: spacing.sm,
  },
  conflictCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    marginTop: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionDesc: {
    fontSize: 15,
    color: colors.text.light,
    marginBottom: spacing.sm,
  },
  complainBtn: {
    backgroundColor: colors.secondary,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  complainText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  complaintSent: {
    color: colors.success,
    marginTop: spacing.sm,
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: colors.error,
    marginTop: spacing.sm,
    textAlign: 'center',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.text.secondary,
    fontSize: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: spacing.lg,
    width: '90%',
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalCloseButton: {
    padding: spacing.sm,
  },
  modalBody: {
    alignItems: 'center',
  },
  detailedStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: spacing.md,
  },
  detailedStatItem: {
    alignItems: 'center',
  },
  detailedStatNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginBottom: spacing.xs,
  },
  detailedStatLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  detailedStatDescription: {
    fontSize: 12,
    color: colors.text.light,
  },
  verificationCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  sectionDescription: {
    fontSize: 15,
    color: colors.text.light,
    marginBottom: spacing.sm,
  },
  verificationMethods: {
    marginTop: spacing.md,
  },
  verificationMethod: {
    marginBottom: spacing.md,
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  verificationMethodTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginLeft: spacing.sm,
  },
  verificationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  verificationText: {
    fontSize: fonts.size.sm,
    fontWeight: '500',
  },
  verifyButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  verifyButtonText: {
    color: colors.white,
    fontSize: fonts.size.xs,
    fontWeight: '600',
  },
  editFieldWrapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    width: '100%',
  },
  editLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  inputPwd: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.text.light,
    width: '100%',
    color: colors.text.primary,
    paddingRight: 40,
  },
  pwdEyeIcon: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    zIndex: 10,
  },
  pwdEyeIconCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: spacing.sm,
  },
  editActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelBtn: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.text.light,
  },
  cancelText: {
    color: colors.error,
    fontWeight: 'bold',
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  saveText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  editDivider: {
    height: 1,
    backgroundColor: colors.text.light,
    marginVertical: spacing.md,
    opacity: 0.3,
  },
  verificationMethodText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  pwdModal: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: spacing.lg,
    width: '90%',
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  photoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: spacing.md,
    position: 'relative',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: colors.text.light,
    textAlign: 'center',
    marginTop: 4,
  },
  photoEditOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 6,
    borderWidth: 2,
    borderColor: colors.white,
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  profileRole: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  memberSince: {
    fontSize: 14,
    color: colors.text.light,
  },
  verificationSection: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  verificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  verificationItem: {
    alignItems: 'center',
    flex: 1,
  },
  verificationLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  verificationBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  verifiedBadge: {
    backgroundColor: colors.success,
  },
  unverifiedBadge: {
    backgroundColor: colors.warning,
  },
  verificationBadgeText: {
    fontSize: fonts.size.xs,
    color: colors.white,
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  verifyButtonText: {
    color: colors.white,
    fontSize: fonts.size.md,
    fontWeight: '600',
  },
  editFieldWrapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    width: '100%',
  },
  editLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  inputPwd: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.text.light,
    width: '100%',
    color: colors.text.primary,
    paddingRight: 40,
  },
  pwdEyeIcon: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    zIndex: 10,
  },
  pwdEyeIconCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: spacing.sm,
  },
  editActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelBtn: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.text.light,
  },
  cancelText: {
    color: colors.error,
    fontWeight: 'bold',
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  saveText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  editDivider: {
    height: 1,
    backgroundColor: colors.text.light,
    marginVertical: spacing.md,
    opacity: 0.3,
  },
  verificationMethodText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  pwdModal: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: spacing.lg,
    width: '90%',
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  photoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: spacing.md,
    position: 'relative',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: colors.text.light,
    textAlign: 'center',
    marginTop: 4,
  },
  photoEditOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 6,
    borderWidth: 2,
    borderColor: colors.white,
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  profileRole: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  memberSince: {
    fontSize: 14,
    color: colors.text.light,
  },
  verificationSection: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  verificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  verificationItem: {
    alignItems: 'center',
    flex: 1,
  },
  verificationLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  verificationBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  verifiedBadge: {
    backgroundColor: colors.success,
  },
  unverifiedBadge: {
    backgroundColor: colors.warning,
  },
  verificationBadgeText: {
    fontSize: fonts.size.xs,
    color: colors.white,
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  verifyButtonText: {
    color: colors.white,
    fontSize: fonts.size.md,
    fontWeight: '600',
  },
  detailsSection: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  detailValue: {
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  editInput: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.background,
    marginBottom: spacing.xs,
  },
  preferencesSection: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  preferenceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  preferenceLabel: {
    fontSize: 16,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  preferenceToggle: {
    width: 40,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.text.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  preferenceActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  modalInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.text.light,
    marginBottom: spacing.md,
    color: colors.text.primary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalCancelButton: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.text.light,
  },
  modalCancelButtonText: {
    color: colors.error,
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalConfirmButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  modalConfirmButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  conflictSection: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  conflictHeaderText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginLeft: spacing.sm,
  },
  complaintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  complaintButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: spacing.sm,
  },
  complaintInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: fonts.size.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 100,
    textAlignVertical: 'top',
    marginTop: spacing.sm,
  },
  verifiedText: {
    color: colors.success,
    fontWeight: '600',
  },
  unverifiedText: {
    color: colors.warning,
    fontWeight: '600',
  },
  profileSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  profilePhotoSection: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: spacing.md,
    position: 'relative',
  },
  profilePhotoContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientSince: {
    fontSize: 14,
    color: colors.text.light,
  },
  preferredMethod: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  preferredMethodText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  allVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    backgroundColor: colors.success + '10',
    borderRadius: 10,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  allVerifiedText: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
});

export default AccountScreen;
