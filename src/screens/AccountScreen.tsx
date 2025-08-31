import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { sendEmailVerification, signOut, updatePassword } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import spacing from '../constants/spacing';
import { auth, db } from '../firebaseConfig';

const { width } = Dimensions.get('window');

interface ShipperProfileData {
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  businessType?: string;
  address: string;
  city: string;
  country: string;
  profilePhotoUrl: string;
  role: string;
  preferredVerificationMethod: 'phone' | 'email';
  phoneVerified: boolean;
  emailVerified: boolean;
  memberSince: string;
  totalShipments: number;
  completedShipments: number;
  activeShipments: number;
  rating: number;
  preferences: {
    preferredTransporterTypes: string[];
    preferredRoutes: string[];
    notificationSettings: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    receiveReceipts: boolean;
  };
}

const AccountScreen = ({ navigation }) => {
  const user = auth.currentUser;
  const [profile, setProfile] = useState<ShipperProfileData | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [changePwd, setChangePwd] = useState(false);
  const [complaint, setComplaint] = useState('');
  const [complaintSent, setComplaintSent] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  // Password change fields
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // Edit form data
  const [editData, setEditData] = useState<Partial<ShipperProfileData>>({});

  useEffect(() => {
    let didCancel = false;
    let timeout: any;

    if (user?.uid) {
      // Fetch user profile
      timeout = setTimeout(() => {
        if (!didCancel) setProfile(null);
      }, 8000);

      getDoc(doc(db, 'users', user.uid)).then((snap) => {
        if (didCancel) return;
        clearTimeout(timeout);

        if (snap.exists()) {
          const data = snap.data();
          const profileData: ShipperProfileData = {
            name: data.name || user.displayName || '',
            email: data.email || user.email || '',
            phone: data.phone || '',
            companyName: data.companyName || '',
            businessType: data.businessType || '',
            address: data.address || '',
            city: data.city || '',
            country: data.country || 'Kenya',
            profilePhotoUrl: data.profilePhotoUrl || '',
            role: data.role || 'shipper',
            preferredVerificationMethod: data.preferredVerificationMethod || 'phone',
            phoneVerified: data.phoneVerified || false,
            emailVerified: data.emailVerified || false,
            memberSince: data.memberSince || new Date().toISOString(),
            totalShipments: data.totalShipments || 0,
            completedShipments: data.completedShipments || 0,
            activeShipments: data.activeShipments || 0,
            rating: data.rating || 0,
            preferences: data.preferences || {
              preferredTransporterTypes: [],
              preferredRoutes: [],
              notificationSettings: {
                email: true,
                push: true,
                sms: false,
              },
              receiveReceipts: true,
            },
          };
          setProfile(profileData);
          setEditData(profileData);
        } else {
          setProfile(null);
        }
      }).catch((e) => {
        if (!didCancel) {
          console.error('Error fetching profile:', e);
          setProfile(null);
        }
      });
    }

    return () => {
      didCancel = true;
      clearTimeout(timeout);
    };
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Re-fetch profile data
    if (user?.uid) {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          const profileData: ShipperProfileData = {
            name: data.name || user.displayName || '',
            email: data.email || user.email || '',
            phone: data.phone || '',
            companyName: data.companyName || '',
            businessType: data.businessType || '',
            address: data.address || '',
            city: data.city || '',
            country: data.country || 'Kenya',
            profilePhotoUrl: data.profilePhotoUrl || '',
            role: data.role || 'shipper',
            preferredVerificationMethod: data.preferredVerificationMethod || 'phone',
            phoneVerified: data.phoneVerified || false,
            emailVerified: data.emailVerified || false,
            memberSince: data.memberSince || new Date().toISOString(),
            totalShipments: data.totalShipments || 0,
            completedShipments: data.completedShipments || 0,
            activeShipments: data.activeShipments || 0,
            rating: data.rating || 0,
            preferences: data.preferences || {
              preferredTransporterTypes: [],
              preferredRoutes: [],
              notificationSettings: {
                email: true,
                push: true,
                sms: false,
              },
              receiveReceipts: true,
            },
          };
          setProfile(profileData);
          setEditData(profileData);
        }
      } catch (error) {
        console.error('Error refreshing profile:', error);
      }
    }
    setRefreshing(false);
  };

  const handleSave = async () => {
    if (!editData.name?.trim() || !editData.email?.trim()) {
      setError('Name and email are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (user?.uid) {
        await updateDoc(doc(db, 'users', user.uid), {
          name: editData.name,
          email: editData.email,
          phone: editData.phone,
          companyName: editData.companyName,
          businessType: editData.businessType,
          address: editData.address,
          city: editData.city,
          country: editData.country,
          updatedAt: new Date().toISOString(),
        });

        setProfile(prev => prev ? { ...prev, ...editData } : null);
        setEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      }
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
    if (!user) return;

    setVerifyingEmail(true);
    try {
      await sendEmailVerification(user);
      Alert.alert(
        'Verification Email Sent',
        'Please check your email and click the verification link. You may need to refresh this page after verification.',
        [{ text: 'OK' }]
      );

      // Navigate to email verification screen to enter the code
      navigation.navigate('EmailVerification', {
        email: user.email,
        phone: profile?.phone,
        role: profile?.role || 'shipper',
        password: null // We don't have the password here
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send verification email');
    } finally {
      setVerifyingEmail(false);
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

  const handleComplaint = () => {
    setComplaintSent(true);
    setComplaint('');
  };

  const handleChangePassword = async () => {
    if (newPwd !== confirmPwd) {
      setError('New passwords do not match');
      return;
    }

    if (newPwd.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (user && newPwd) {
        await updatePassword(user, newPwd);
        setChangePwd(false);
        setNewPwd('');
        setConfirmPwd('');
        setOldPwd('');
        Alert.alert('Success', 'Password changed successfully');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const getVerificationColor = (status: boolean) => {
    return status ? colors.success : colors.warning;
  };

  const getVerificationIcon = (status: boolean) => {
    return status ? 'check-circle' : 'clock';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>
            {user?.uid ? 'Loading your profile...' : 'No user found. Please log in.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Shipper Profile</Text>
          <TouchableOpacity
            onPress={() => setEditing(!editing)}
            style={styles.editButton}
          >
            <MaterialCommunityIcons
              name={editing ? "close" : "pencil"}
              size={24}
              color={colors.white}
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Header Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.profilePhotoContainer}>
            <TouchableOpacity
              style={styles.profilePhoto}
              onPress={editing ? handlePhotoPick : undefined}
              disabled={!editing}
            >
              {editData.profilePhotoUrl ? (
                <Image
                  source={{ uri: editData.profilePhotoUrl }}
                  style={styles.profileImage}
                />
              ) : (
                <MaterialCommunityIcons
                  name="account-circle"
                  size={80}
                  color={colors.primary}
                />
              )}
              {editing && (
                <View style={styles.editPhotoOverlay}>
                  <MaterialCommunityIcons
                    name="camera"
                    size={24}
                    color={colors.white}
                  />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {editing ? editData.name : profile.name}
              </Text>
              <Text style={styles.profileEmail}>
                {editing ? editData.email : profile.email}
              </Text>
              <View style={styles.verificationBadge}>
                <MaterialCommunityIcons
                  name="shield-check"
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.verificationText}>
                  {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          {editing && (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <MaterialCommunityIcons name="check" size={20} color={colors.white} />
                )}
                <Text style={styles.actionButtonText}>Save</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => {
                  setEditData(profile);
                  setEditing(false);
                }}
              >
                <MaterialCommunityIcons name="close" size={20} color={colors.error} />
                <Text style={[styles.actionButtonText, { color: colors.error }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Verification Status Card */}
        <View style={styles.verificationCard}>
          <Text style={styles.sectionTitle}>Verification Status</Text>
          <Text style={styles.sectionDescription}>
            Verify your contact methods to unlock additional features like email receipts and notifications.
          </Text>

          <View style={styles.verificationMethods}>
            <View style={styles.verificationMethod}>
              <View style={styles.verificationHeader}>
                <MaterialCommunityIcons
                  name="phone"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.verificationMethodTitle}>Phone Number</Text>
                <View style={[
                  styles.verificationStatus,
                  { backgroundColor: getVerificationColor(profile.phoneVerified) + '20' }
                ]}>
                  <MaterialCommunityIcons
                    name={getVerificationIcon(profile.phoneVerified)}
                    size={16}
                    color={getVerificationColor(profile.phoneVerified)}
                  />
                  <Text style={[
                    styles.verificationStatusText,
                    { color: getVerificationColor(profile.phoneVerified) }
                  ]}>
                    {profile.phoneVerified ? 'Verified' : 'Pending'}
                  </Text>
                </View>
              </View>
              <Text style={styles.verificationMethodText}>
                {profile.phoneVerified ?
                  '✓ SMS notifications enabled' :
                  'Verify to receive SMS notifications'
                }
              </Text>
            </View>

            <View style={styles.verificationMethod}>
              <View style={styles.verificationHeader}>
                <MaterialCommunityIcons
                  name="email"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.verificationMethodTitle}>Email Address</Text>
                <View style={[
                  styles.verificationStatus,
                  { backgroundColor: getVerificationColor(profile.emailVerified) + '20' }
                ]}>
                  <MaterialCommunityIcons
                    name={getVerificationIcon(profile.emailVerified)}
                    size={16}
                    color={getVerificationColor(profile.emailVerified)}
                  />
                  <Text style={[
                    styles.verificationStatusText,
                    { color: getVerificationColor(profile.emailVerified) }
                  ]}>
                    {profile.emailVerified ? 'Verified' : 'Pending'}
                  </Text>
                </View>
              </View>
              <Text style={styles.verificationMethodText}>
                {profile.emailVerified ?
                  '✓ Email receipts and notifications enabled' :
                  'Verify to receive email receipts and notifications'
                }
              </Text>

              {!profile.emailVerified && (
                <TouchableOpacity
                  style={styles.verifyButton}
                  onPress={handleVerifyEmail}
                  disabled={verifyingEmail}
                >
                  {verifyingEmail ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <MaterialCommunityIcons name="email-send" size={16} color={colors.white} />
                  )}
                  <Text style={styles.verifyButtonText}>
                    {verifyingEmail ? 'Sending...' : 'Verify Email'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statsCard}
            onPress={() => setShowStatsModal(true)}
          >
            <View style={styles.statsHeader}>
              <MaterialCommunityIcons name="truck-delivery" size={24} color={colors.primary} />
              <Text style={styles.statsTitle}>Shipment Overview</Text>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{profile.totalShipments}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{profile.completedShipments}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{profile.activeShipments}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
            </View>
            <View style={styles.ratingContainer}>
              <MaterialCommunityIcons name="star" size={16} color={colors.warning} />
              <Text style={styles.ratingText}>{profile.rating.toFixed(1)}</Text>
              <Text style={styles.ratingLabel}>Rating</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Profile Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Profile Details</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={editData.name}
                onChangeText={(text) => setEditData({ ...editData, name: text })}
                placeholder="Enter your full name"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile.name}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={editData.email}
                onChangeText={(text) => setEditData({ ...editData, email: text })}
                placeholder="Enter your email"
                keyboardType="email-address"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile.email}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={editData.phone}
                onChangeText={(text) => setEditData({ ...editData, phone: text })}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile.phone || 'Not provided'}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Company Name (Optional)</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={editData.companyName}
                onChangeText={(text) => setEditData({ ...editData, companyName: text })}
                placeholder="Enter company name"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile.companyName || 'Not provided'}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Business Type</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={editData.businessType}
                onChangeText={(text) => setEditData({ ...editData, businessType: text })}
                placeholder="e.g., Agriculture, Manufacturing, Retail"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile.businessType || 'Not specified'}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Address</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={editData.address}
                onChangeText={(text) => setEditData({ ...editData, address: text })}
                placeholder="Enter your address"
                multiline
              />
            ) : (
              <Text style={styles.fieldValue}>{profile.address || 'Not provided'}</Text>
            )}
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1, marginRight: spacing.sm }]}>
              <Text style={styles.fieldLabel}>City</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={editData.city}
                  onChangeText={(text) => setEditData({ ...editData, city: text })}
                  placeholder="Enter city"
                />
              ) : (
                <Text style={styles.fieldValue}>{profile.city || 'Not provided'}</Text>
              )}
            </View>

            <View style={[styles.fieldGroup, { flex: 1, marginLeft: spacing.sm }]}>
              <Text style={styles.fieldLabel}>Country</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={editData.country}
                  onChangeText={(text) => setEditData({ ...editData, country: text })}
                  placeholder="Enter country"
                />
              ) : (
                <Text style={styles.fieldValue}>{profile.country}</Text>
              )}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Member Since</Text>
            <Text style={styles.fieldValue}>
              {formatDate(profile.memberSince)}
            </Text>
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.preferencesCard}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <View style={styles.preferenceSection}>
            <Text style={styles.preferenceLabel}>Preferred Transporter Types</Text>
            <View style={styles.preferenceChips}>
              {profile.preferences.preferredTransporterTypes.length > 0 ? (
                profile.preferences.preferredTransporterTypes.map((type, index) => (
                  <View key={index} style={styles.preferenceChip}>
                    <Text style={styles.preferenceChipText}>{type}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noPreferencesText}>No preferences set</Text>
              )}
            </View>
          </View>

          <View style={styles.preferenceSection}>
            <Text style={styles.preferenceLabel}>Preferred Routes</Text>
            <View style={styles.preferenceChips}>
              {profile.preferences.preferredRoutes.length > 0 ? (
                profile.preferences.preferredRoutes.map((route, index) => (
                  <View key={index} style={styles.preferenceChip}>
                    <Text style={styles.preferenceChipText}>{route}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noPreferencesText}>No routes specified</Text>
              )}
            </View>
          </View>

          <View style={styles.preferenceSection}>
            <Text style={styles.preferenceLabel}>Notification Settings</Text>
            <View style={styles.notificationSettings}>
              <View style={styles.notificationRow}>
                <Text style={styles.notificationLabel}>Email Notifications</Text>
                <View style={[
                  styles.notificationToggle,
                  profile.preferences.notificationSettings.email && styles.notificationActive
                ]}>
                  <MaterialCommunityIcons
                    name={profile.preferences.notificationSettings.email ? "check" : "close"}
                    size={16}
                    color={profile.preferences.notificationSettings.email ? colors.success : colors.error}
                  />
                </View>
              </View>
              <View style={styles.notificationRow}>
                <Text style={styles.notificationLabel}>Push Notifications</Text>
                <View style={[
                  styles.notificationToggle,
                  profile.preferences.notificationSettings.push && styles.notificationActive
                ]}>
                  <MaterialCommunityIcons
                    name={profile.preferences.notificationSettings.push ? "check" : "close"}
                    size={16}
                    color={profile.preferences.notificationSettings.push ? colors.success : colors.error}
                  />
                </View>
              </View>
              <View style={styles.notificationRow}>
                <Text style={styles.notificationLabel}>SMS Notifications</Text>
                <View style={[
                  styles.notificationToggle,
                  profile.preferences.notificationSettings.sms && styles.notificationActive
                ]}>
                  <MaterialCommunityIcons
                    name={profile.preferences.notificationSettings.sms ? "check" : "close"}
                    size={16}
                    color={profile.preferences.notificationSettings.sms ? colors.success : colors.error}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons - Simplified and Proper */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={() => {
              // Navigate to service request
              console.log('Navigate to service request');
            }}
          >
            <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
            <Text style={styles.primaryActionButtonText}>New Transport Request</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={() => {
              // Navigate to booking list
              console.log('Navigate to booking list');
            }}
          >
            <MaterialCommunityIcons name="format-list-bulleted" size={20} color={colors.secondary} />
            <Text style={styles.secondaryActionButtonText}>View My Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.utilityButton}
            onPress={() => setChangePwd(true)}
          >
            <MaterialCommunityIcons name="lock-reset" size={20} color={colors.primary} />
            <Text style={styles.utilityButtonText}>Change Password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <MaterialCommunityIcons name="logout" size={20} color={colors.error} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Conflict Resolution Card */}
        <View style={styles.conflictCard}>
          <View style={styles.conflictHeader}>
            <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.secondary} />
            <Text style={styles.sectionTitle}>Conflict Resolution</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Submit a complaint for admin mediation. You will be contacted via email and in-app.
          </Text>
          <TextInput
            style={styles.complaintInput}
            value={complaint}
            onChangeText={setComplaint}
            placeholder="Describe your issue..."
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity
            style={styles.complainBtn}
            onPress={handleComplaint}
            disabled={!complaint.trim()}
          >
            <Text style={styles.complainText}>Send Complaint</Text>
          </TouchableOpacity>
          {complaintSent && (
            <Text style={styles.complaintSent}>Complaint sent! Admin will contact you soon.</Text>
          )}
        </View>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}
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
            <Text style={styles.sectionTitle}>Change Password</Text>

            <View style={styles.editFieldWrapRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.editLabel}>Current Password</Text>
                <TextInput
                  style={styles.inputPwd}
                  value={oldPwd}
                  onChangeText={setOldPwd}
                  placeholder="Current Password"
                  secureTextEntry={!showOldPwd}
                  autoCapitalize="none"
                />
              </View>
              <TouchableOpacity
                style={styles.pwdEyeIconCenter}
                onPress={() => setShowOldPwd((v) => !v)}
              >
                <Ionicons
                  name={showOldPwd ? 'eye-off' : 'eye'}
                  size={20}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.editDivider} />

            <View style={styles.editFieldWrapRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.editLabel}>New Password</Text>
                <TextInput
                  style={styles.inputPwd}
                  value={newPwd}
                  onChangeText={setNewPwd}
                  placeholder="New Password"
                  secureTextEntry={!showNewPwd}
                  autoCapitalize="none"
                />
              </View>
              <TouchableOpacity
                style={styles.pwdEyeIconCenter}
                onPress={() => setShowNewPwd((v) => !v)}
              >
                <Ionicons
                  name={showNewPwd ? 'eye-off' : 'eye'}
                  size={20}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.editDivider} />

            <View style={styles.editFieldWrapRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.editLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.inputPwd}
                  value={confirmPwd}
                  onChangeText={setConfirmPwd}
                  placeholder="Confirm New Password"
                  secureTextEntry={!showConfirmPwd}
                  autoCapitalize="none"
                />
              </View>
              <TouchableOpacity
                style={styles.pwdEyeIconCenter}
                onPress={() => setShowConfirmPwd((v) => !v)}
              >
                <Ionicons
                  name={showConfirmPwd ? 'eye-off' : 'eye'}
                  size={20}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.editActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setChangePwd(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleChangePassword}
                disabled={loading}
              >
                <Text style={styles.saveText}>
                  {loading ? 'Changing...' : 'Change Password'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Stats Modal */}
      <Modal
        visible={showStatsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStatsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detailed Statistics</Text>
              <TouchableOpacity
                onPress={() => setShowStatsModal(false)}
                style={styles.modalCloseButton}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.detailedStats}>
                <View style={styles.detailedStatItem}>
                  <Text style={styles.detailedStatNumber}>{profile.totalShipments}</Text>
                  <Text style={styles.detailedStatLabel}>Total Shipments</Text>
                  <Text style={styles.detailedStatDescription}>
                    All time shipments created
                  </Text>
                </View>

                <View style={styles.detailedStatItem}>
                  <Text style={styles.detailedStatNumber}>{profile.completedShipments}</Text>
                  <Text style={styles.detailedStatLabel}>Completed</Text>
                  <Text style={styles.detailedStatDescription}>
                    Successfully delivered shipments
                  </Text>
                </View>

                <View style={styles.detailedStatItem}>
                  <Text style={styles.detailedStatNumber}>{profile.activeShipments}</Text>
                  <Text style={styles.detailedStatLabel}>Active</Text>
                  <Text style={styles.detailedStatDescription}>
                    Currently in progress
                  </Text>
                </View>

                <View style={styles.detailedStatItem}>
                  <Text style={styles.detailedStatNumber}>
                    {profile.totalShipments > 0
                      ? ((profile.completedShipments / profile.totalShipments) * 100).toFixed(1)
                      : '0'}%
                  </Text>
                  <Text style={styles.detailedStatLabel}>Success Rate</Text>
                  <Text style={styles.detailedStatDescription}>
                    Completion percentage
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: spacing.md,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  scrollContent: {
    paddingBottom: spacing.lg, // Add padding to the bottom of the scroll view content
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
    fontSize: 13,
    marginLeft: spacing.xs,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginBottom: spacing.sm,
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
  complaintInput: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.background,
    marginBottom: spacing.sm,
    minHeight: 100,
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
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primaryDark,
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
    borderRadius: 10,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  verificationStatusText: {
    fontSize: 13,
    marginLeft: spacing.xs,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  verifyButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: spacing.xs,
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
});

export default AccountScreen;
