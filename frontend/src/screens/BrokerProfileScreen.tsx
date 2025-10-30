import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import FormKeyboardWrapper from '../components/common/FormKeyboardWrapper';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../constants/colors';
import spacing from '../constants/spacing';
// import { API_ENDPOINTS } from '../constants/api';
import { auth, db } from '../firebaseConfig';
import { apiRequest, uploadFile } from '../utils/api';
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';
import { BROKER_PLANS, type SubscriptionPlan } from '../constants/subscriptionPlans';

// Using SubscriptionPlan definition from constants

interface PaymentMethod {
  id: string;
  type: 'mpesa' | 'card';
  name: string;
  details: string;
  isDefault: boolean;
}

const subscriptionPlans: SubscriptionPlan[] = BROKER_PLANS;

// Removed mockPaymentMethods - now using dynamic data from user profile

export default function BrokerProfileScreen() {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [profilePhoto, setProfilePhoto] = useState<any>(null);
  const [clientSince, setClientSince] = useState('');

  // Verification states
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);

  // Use the centralized subscription hook
  const { subscriptionStatus } = useSubscriptionStatus();

  const showPhotoOptions = () => {
    Alert.alert(
      'Select Photo',
      'Choose how you want to add a profile photo',
      [
        { text: 'Camera', onPress: pickProfilePhotoCamera },
        { text: 'Gallery', onPress: pickProfilePhoto },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const pickProfilePhotoCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Permission to access camera is required!');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        // No aspect ratio constraint - allows flexible cropping for profile photos
        quality: 0.8
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        const asset = result.assets[0];
        setProfilePhoto(asset);
        
        // Upload the photo
        try {
          setLoading(true);
          const user = auth.currentUser;
          if (user) {
            const uploadedUrl = await uploadFile(asset.uri, 'profile', user.uid);
            
            // Update the profile photo in Firestore
            await updateDoc(doc(db, 'users', user.uid), {
              profilePhotoUrl: uploadedUrl,
              updatedAt: new Date().toISOString(),
            });
            
            Alert.alert('Success', 'Profile photo updated successfully');
          }
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
          Alert.alert('Upload Error', 'Failed to upload profile photo. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickProfilePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Permission to access media library is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        // No aspect ratio constraint - allows flexible cropping for profile photos
        quality: 0.8
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        const asset = result.assets[0];
        setProfilePhoto(asset);
        
        // Upload the photo
        try {
          setLoading(true);
          const user = auth.currentUser;
          if (user) {
            const uploadedUrl = await uploadFile(asset.uri, 'profile', user.uid);
            
            // Update the profile photo in Firestore
            await updateDoc(doc(db, 'users', user.uid), {
              profilePhotoUrl: uploadedUrl,
              updatedAt: new Date().toISOString(),
            });
            
            Alert.alert('Success', 'Profile photo updated successfully');
          }
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
          Alert.alert('Upload Error', 'Failed to upload profile photo. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (user) {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            const data = snap.data();
            setName(data.name || '');
            setEmail(data.email || user.email || '');
            setPhone(data.phone || '');
            setCompany(data.company || '');
            setLocation(data.location || '');
            setBio(data.bio || '');

            // Set verification status
            setEmailVerified(data.emailVerified || false);
            setPhoneVerified(data.phoneVerified || false);

            // Load payment methods from user data only
            if (data.paymentMethods && Array.isArray(data.paymentMethods)) {
              setPaymentMethods(data.paymentMethods);
            } else {
              // No mock data - use empty array until real data is available
              setPaymentMethods([]);
            }

            if (data.createdAt) {
              setClientSince(new Date(data.createdAt.toDate()).toLocaleDateString());
            } else {
              setClientSince(new Date().toLocaleDateString());
            }
          } else {
            setName(user.displayName || '');
            setEmail(user.email || '');
            setPhone('');
            setCompany('');
            setLocation('');
            setBio('');
            setClientSince(new Date().toLocaleDateString());

            // Set default payment method with user's phone if available
            const defaultMpesaNumber = user.phoneNumber || '+254 712 345 678';
            setPaymentMethods([
              {
                id: 'mpesa-1',
                type: 'mpesa',
                name: 'MPESA',
                details: defaultMpesaNumber,
                isDefault: true
              }
            ]);
          }
        }
      } catch (e) {
        console.error('Error fetching profile:', e);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

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
              await signOut(auth);
              // After sign out, App.tsx auth listener will render the Welcome flow.
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Logout Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSaveProfile = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          name,
          email,
          phone,
          company,
          location,
          bio,
          updatedAt: new Date()
        });
        Alert.alert('Profile Updated', 'Your profile details have been updated successfully.');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Update Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleAddPaymentMethod = () => {
    setShowPaymentModal(true);
  };

  const handleEditPaymentMethod = (method: PaymentMethod) => {
    Alert.alert(
      'Edit Payment Method',
      `Edit ${method.name} payment method?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Edit', 
          onPress: () => {
            // TODO: Implement edit payment method functionality
            Alert.alert('Coming Soon', 'Edit payment method functionality will be available soon!');
          }
        }
      ]
    );
  };

  const handleDeletePaymentMethod = async (methodId: string) => {
    Alert.alert(
      'Delete Payment Method',
      'Are you sure you want to delete this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from local state
              setPaymentMethods(prev => prev.filter(method => method.id !== methodId));
              
              // If it was the default, set another as default
              const remainingMethods = paymentMethods.filter(method => method.id !== methodId);
              if (remainingMethods.length > 0) {
                const newDefault = remainingMethods[0];
                setPaymentMethods(prev => 
                  prev.map(method => 
                    method.id === newDefault.id 
                      ? { ...method, isDefault: true }
                      : method
                  )
                );
              }
              
              Alert.alert('Success', 'Payment method deleted successfully');
            } catch (error) {
              console.error('Error deleting payment method:', error);
              Alert.alert('Error', 'Failed to delete payment method');
            }
          }
        }
      ]
    );
  };

  const handleAddMpesaPayment = () => {
    Alert.prompt(
      'Add M-PESA Payment Method',
      'Enter your M-PESA phone number:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Add', 
          onPress: (phoneNumber) => {
            if (phoneNumber && phoneNumber.trim()) {
              const newMethod: PaymentMethod = {
                id: `mpesa-${Date.now()}`,
                type: 'mpesa',
                name: 'M-PESA',
                details: phoneNumber.trim(),
                isDefault: paymentMethods.length === 0
              };
              
              setPaymentMethods(prev => [...prev, newMethod]);
              Alert.alert('Success', 'M-PESA payment method added successfully');
            }
          }
        }
      ],
      'plain-text',
      phone || '+254'
    );
  };

  const handleAddCardPayment = () => {
    Alert.alert(
      'Add Card Payment',
      'Card payment functionality will be available soon! For now, you can use M-PESA for payments.',
      [
        { text: 'OK', onPress: () => handleAddMpesaPayment() }
      ]
    );
  };

  const handleSubscribe = (plan: SubscriptionPlan) => {
    setCurrentPlan(plan);
    setShowSubscriptionModal(true);
  };

  // Verification functions
  const handleVerifyEmail = async () => {
    if (!auth.currentUser?.email) {
      Alert.alert('Error', 'No email address found.');
      return;
    }
    if (emailVerified) {
      Alert.alert('Already Verified', 'Your email is already verified. You can use it to log in.');
      return;
    }
    try {
      setVerifyingEmail(true);

      // Use backend API for email verification - same pattern as EmailVerificationScreen
      await apiRequest('/auth', {
        method: 'POST',
        body: JSON.stringify({
          action: 'resend-email-code',
          email: auth.currentUser.email
        }),
      });

      Alert.alert(
        'Verification Email Sent',
        'Please check your email for the verification code. You can then use your email to log in.',
        [
          { text: 'OK' },
          {
            text: 'Go to Verification',
            onPress: () => navigation.navigate('EmailVerification')
          }
        ]
      );
    } catch (e: any) {
      console.error('Email verification error:', e);
      Alert.alert(
        'Verification Failed',
        e.message || 'Unable to send verification email. Please check your internet connection and try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!phone) {
      Alert.alert('Error', 'No phone number found.');
      return;
    }
    if (phoneVerified) {
      Alert.alert('Already Verified', 'Your phone is already verified. You can use it to log in.');
      return;
    }
    try {
      setVerifyingPhone(true);

      // Use backend API for phone verification - same pattern as auth flow
      await apiRequest('/auth', {
        method: 'POST',
        body: JSON.stringify({
          action: 'resend-phone-code',
          phoneNumber: phone
        }),
      });

      Alert.alert(
        'Verification SMS Sent',
        'Please check your phone for the verification code. You can then use your phone to log in.',
        [
          { text: 'OK' },
          {
            text: 'Go to Verification',
            onPress: () => navigation.navigate('PhoneOTPScreen')
          }
        ]
      );
    } catch (e: any) {
      console.error('Phone verification error:', e);
      Alert.alert(
        'Verification Failed',
        e.message || 'Unable to send verification SMS. Please check your internet connection and try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setVerifyingPhone(false);
    }
  };

  const renderProfileHeader = () => (
    <View style={styles.profileHeaderModern}>
      <TouchableOpacity style={styles.profilePhotoContainerModern} onPress={showPhotoOptions}>
        {profilePhoto ? (
          <Image source={{ uri: profilePhoto.uri }} style={styles.profilePhotoModern} />
        ) : (
          <View style={styles.profilePhotoPlaceholderModern}>
            <MaterialCommunityIcons name="account" size={36} color={colors.primary} />
          </View>
        )}
        <View style={styles.editPhotoButtonModern}>
          <MaterialCommunityIcons name="camera" size={14} color={colors.white} />
        </View>
      </TouchableOpacity>
      <View style={styles.profileInfoModern}>
        <Text style={styles.profileNameModern}>{name || email || 'Broker Name'}</Text>
        <Text style={styles.profileEmailModern} numberOfLines={1} ellipsizeMode="tail">{email}</Text>
        <View style={styles.verifiedBrokerBadgeModern}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={styles.verifiedBrokerTextModern}>Verified Broker</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.editButtonModern}
        onPress={() => setShowProfileModal(true)}
      >
        <MaterialCommunityIcons name="pencil" size={18} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );



  const renderQuickActions = () => (
    <View style={styles.quickActionsSection}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => navigation.navigate('SubscriptionManagement', { userType: 'broker' })}
        >
          <MaterialCommunityIcons name="star-circle" size={32} color={colors.primary} />
          <Text style={styles.quickActionTitle}>Subscription</Text>
          <Text style={styles.quickActionSubtitle}>Manage plans</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => setShowPaymentModal(true)}
        >
          <MaterialCommunityIcons name="credit-card" size={32} color={colors.secondary} />
          <Text style={styles.quickActionTitle}>Payments</Text>
          <Text style={styles.quickActionSubtitle}>Manage methods</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => setShowProfileModal(true)}
        >
          <MaterialCommunityIcons name="shield-check" size={32} color={colors.tertiary} />
          <Text style={styles.quickActionTitle}>Security</Text>
          <Text style={styles.quickActionSubtitle}>Password & 2FA</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => navigation.navigate('BrokerManagementScreen', { activeTab: 'requests' })}
        >
          <MaterialCommunityIcons name="clipboard-list" size={32} color={colors.warning} />
          <Text style={styles.quickActionTitle}>Requests</Text>
          <Text style={styles.quickActionSubtitle}>Manage requests</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProfileDetails = () => (
    <View style={styles.profileDetailsSection}>
      <Text style={styles.sectionTitle}>Profile Details</Text>

      <View style={styles.detailCard}>
        <View style={styles.detailRowNeat}>
          <MaterialCommunityIcons name="account" size={20} color={colors.primary} />
          <Text style={styles.detailValueNeat}>{name || 'Not set'}</Text>
        </View>

        <View style={styles.detailRowNeat}>
          <MaterialCommunityIcons name="email" size={20} color={colors.secondary} />
          <Text style={styles.detailValueNeat}>{email || 'Not set'}
            {<View style={[styles.inlineBadge, emailVerified ? styles.verifiedBadge : styles.unverifiedBadge]}> 
            <Ionicons
              name={emailVerified ? "checkmark-circle" : "close-circle"}
              size={12}
              color={emailVerified ? colors.success : colors.warning}
            />
            <Text style={[styles.verificationBadgeText, emailVerified ? styles.verifiedText : styles.unverifiedText]}>
              {emailVerified ? ' Verified' : ' Unverified'}
            </Text>
          </View>}
          </Text>
        </View>

        <View style={styles.detailRowNeat}>
          <MaterialCommunityIcons name="phone" size={20} color={colors.tertiary} />
          <Text style={styles.detailValueNeat}>{phone || 'Not set'}
            {<View style={[styles.inlineBadge, phoneVerified ? styles.verifiedBadge : styles.unverifiedBadge]}> 
            <Ionicons
              name={phoneVerified ? "checkmark-circle" : "close-circle"}
              size={12}
              color={phoneVerified ? colors.success : colors.warning}
            />
            <Text style={[styles.verificationBadgeText, phoneVerified ? styles.verifiedText : styles.unverifiedText]}>
              {phoneVerified ? ' Verified' : ' Unverified'}
            </Text>
          </View>}
          </Text>
        </View>

        <View style={styles.detailRowNeat}>
          <MaterialCommunityIcons name="office-building" size={20} color={colors.warning} />
          <Text style={styles.detailValueNeat}>{company || 'Not set'}</Text>
        </View>

        <View style={styles.detailRowNeat}>
          <MaterialCommunityIcons name="map-marker" size={20} color={colors.error} />
          <Text style={styles.detailValueNeat}>{location || 'Not set'}</Text>
        </View>

        <View style={styles.detailRowNeat}>
          <MaterialCommunityIcons name="calendar" size={20} color={colors.success} />
          <Text style={styles.detailValueNeat}>{clientSince}</Text>
        </View>
      </View>

      {/* Verification Actions */}
      <View style={styles.verificationActions}>
        {!emailVerified && (
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

        {!phoneVerified && (
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

        {emailVerified && phoneVerified && (
          <View style={styles.allVerified}>
            <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
            <Text style={styles.allVerifiedText}>All contact methods verified!</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderPaymentMethods = () => (
    <View style={styles.paymentMethodsSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        <TouchableOpacity onPress={handleAddPaymentMethod}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {paymentMethods.map((method) => (
        <View key={method.id} style={styles.paymentMethodCard}>
          <View style={styles.paymentMethodInfo}>
            <MaterialCommunityIcons
              name={method.type === 'mpesa' ? 'cellphone' : 'credit-card'}
              size={24}
              color={colors.primary}
            />
            <View style={styles.paymentMethodDetails}>
              <Text style={styles.paymentMethodName}>{method.name}</Text>
              <Text style={styles.paymentMethodDetails}>{method.details}</Text>
            </View>
          </View>

          <View style={styles.paymentMethodActions}>
            {method.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editPaymentButton}>
              <MaterialCommunityIcons name="pencil" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile & Account</Text>
        <TouchableOpacity onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={24} color={colors.error} />
        </TouchableOpacity>
      </View>

      <FormKeyboardWrapper
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardVerticalOffset={0}
      >
        {renderProfileHeader()}
        {renderQuickActions()}
        {renderProfileDetails()}
        {renderPaymentMethods()}
      </FormKeyboardWrapper>

      {/* Profile Edit Modal */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Corporate Name</Text>
              <TextInput
                style={styles.textInput}
                value={company}
                onChangeText={setCompany}
                placeholder="Enter company name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Location</Text>
              <TextInput
                style={styles.textInput}
                value={location}
                onChangeText={setLocation}
                placeholder="Enter your location"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bio</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowProfileModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Subscription Modal */}
      <Modal
        visible={showSubscriptionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSubscriptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.subscriptionModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Your Plan</Text>
              <TouchableOpacity onPress={() => setShowSubscriptionModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {subscriptionPlans.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    plan.isPopular && styles.popularPlanCard
                  ]}
                  onPress={() => handleSubscribe(plan)}
                >
                  {plan.isPopular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>Most Popular</Text>
                    </View>
                  )}

                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planPrice}>KES {plan.price}</Text>
                    <Text style={styles.planPeriod}>/{plan.billingPeriod}</Text>
                  </View>

                  <View style={styles.planFeatures}>
                    {plan.features.map((feature, index) => (
                      <View key={index} style={styles.featureRow}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.subscribeButton,
                      plan.isPopular && styles.popularSubscribeButton
                    ]}
                    onPress={() => handleSubscribe(plan)}
                  >
                    <Text style={styles.subscribeButtonText}>
                      {currentPlan?.id === plan.id ? 'Current Plan' : 'Subscribe'}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Enhanced Payment Methods Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Methods</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.paymentMethodsList} showsVerticalScrollIndicator={false}>
              {paymentMethods.length > 0 ? (
                paymentMethods.map((method) => (
                  <View key={method.id} style={styles.paymentMethodItem}>
                    <View style={styles.paymentMethodInfo}>
                      <MaterialCommunityIcons
                        name={method.type === 'mpesa' ? 'cellphone' : 'credit-card'}
                        size={24}
                        color={colors.primary}
                      />
                      <View style={styles.paymentMethodDetails}>
                        <Text style={styles.paymentMethodName}>{method.name}</Text>
                        <Text style={styles.paymentMethodDetails}>{method.details}</Text>
                      </View>
                    </View>
                    <View style={styles.paymentMethodActions}>
                      {method.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>Default</Text>
                        </View>
                      )}
                      <TouchableOpacity 
                        style={styles.editPaymentButton}
                        onPress={() => handleEditPaymentMethod(method)}
                      >
                        <MaterialCommunityIcons name="pencil" size={16} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.deletePaymentButton}
                        onPress={() => handleDeletePaymentMethod(method.id)}
                      >
                        <MaterialCommunityIcons name="delete" size={16} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="credit-card-off" size={48} color={colors.text.light} />
                  <Text style={styles.emptyStateTitle}>No Payment Methods</Text>
                  <Text style={styles.emptyStateSubtitle}>Add a payment method to get started</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.paymentOptions}>
              <TouchableOpacity 
                style={styles.addPaymentOption}
                onPress={() => handleAddMpesaPayment()}
              >
                <MaterialCommunityIcons name="cellphone-plus" size={24} color={colors.primary} />
                <Text style={styles.addPaymentOptionText}>Add M-PESA</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.addPaymentOption}
                onPress={() => handleAddCardPayment()}
              >
                <MaterialCommunityIcons name="credit-card-plus" size={24} color={colors.secondary} />
                <Text style={styles.addPaymentOptionText}>Add Card</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primaryDark,
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2, // Extra padding to prevent content from being hidden by navigation tabs
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profilePhotoContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
  },
  profilePhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginBottom: spacing.xs,
  },
  profileCompany: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  profileLocation: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  verifiedBrokerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    borderRadius: 8,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignSelf: 'flex-start',
  },
  verifiedBrokerText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: spacing.sm,
  },
  verificationText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  editButton: {
    padding: spacing.sm,
  },
  subscriptionCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  subscriptionInfo: {
    marginLeft: spacing.sm,
  },
  subscriptionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginBottom: spacing.xs,
  },
  subscriptionStatus: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  subscriptionActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.sm,
  },
  manageButton: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flex: 1,
    marginRight: spacing.xs,
  },
  manageButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flex: 1,
    marginLeft: spacing.xs,
  },
  upgradeButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  quickActionsSection: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginBottom: spacing.sm,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  quickActionCard: {
    width: '45%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginVertical: spacing.sm,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  profileDetailsSection: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontSize: 15,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
    width: 100,
  },
  detailValue: {
    fontSize: 15,
    color: colors.primaryDark,
    flex: 1,
  },
  detailValueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentMethodsSection: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  paymentMethodCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginLeft: spacing.sm,
  },
  paymentMethodDetails: {
    fontSize: 13,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  paymentMethodActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editPaymentButton: {
    padding: spacing.sm,
  },
  defaultBadge: {
    backgroundColor: colors.success + '20',
    borderRadius: 8,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.sm,
  },
  defaultBadgeText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    width: '90%',
    maxWidth: 450,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primaryDark,
  },
  inputGroup: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.sm,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 80,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  planCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  popularPlanCard: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  popularBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primaryDark,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  planPeriod: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  planFeatures: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  featureText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  subscribeButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  popularSubscribeButton: {
    backgroundColor: colors.primary,
  },
  subscribeButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  subscriptionModalContent: {
    maxHeight: '80%',
  },
  paymentOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
  },
  paymentOption: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    minWidth: 120,
  },
  paymentOptionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginTop: spacing.sm,
  },
  paymentOptionSubtext: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  successLight: {
    backgroundColor: colors.success + '20',
  },
  primaryLight: {
    backgroundColor: colors.primary + '20',
  },
  verificationActions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  verifyButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  verifyButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
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
  // Enhanced Payment Methods Modal Styles
  paymentMethodsList: {
    maxHeight: 300,
    marginBottom: spacing.md,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.text.light,
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodDetails: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  paymentMethodActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editPaymentButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
  deletePaymentButton: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: colors.text.light,
    textAlign: 'center',
  },
  addPaymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.text.light,
    borderStyle: 'dashed',
  },
  addPaymentOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  detailRowNeat: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailValueNeat: {
    fontSize: 15,
    marginLeft: 16,
    color: colors.primaryDark,
    flex: 1,
    flexWrap: 'wrap',
  },
  inlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  profileHeaderModern: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profilePhotoContainerModern: {
    position: 'relative',
    marginRight: spacing.md,
  },
  profilePhotoModern: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.surface,
  },
  profilePhotoPlaceholderModern: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPhotoButtonModern: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 11,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.white,
  },
  profileInfoModern: {
    flex: 1,
    justifyContent: 'center',
  },
  profileNameModern: {
    fontSize: 19,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginBottom: 1,
    flexShrink: 1,
  },
  profileEmailModern: {
    fontSize: 15,
    color: colors.text.secondary,
    marginBottom: 2,
    flexShrink: 1,
  },
  verifiedBrokerBadgeModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '1f',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  verifiedBrokerTextModern: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  editButtonModern: {
    padding: spacing.xs,
    marginLeft: spacing.md,
  },
});
