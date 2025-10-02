import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { getAuth } from 'firebase/auth';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, PermissionsAndroid, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import KeyboardAwareScrollView from '../../components/common/KeyboardAwareScrollView';
import { fonts, spacing } from '../../constants';
import colors from '../../constants/colors';
import { apiRequest } from '../../utils/api';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { handleVerificationBackNavigation } from '../../utils/navigationUtils';


// Note: SMS auto-read functionality requires native modules not available in Expo managed workflow
// For production, consider using Expo dev client or bare workflow for SMS auto-read

const PhoneOTPScreen = ({ navigation, route }: { navigation: any; route: any }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verified, setVerified] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const { phone: routePhone, role: routeRole, userId: routeUserId } = (route.params as any) || {};
  
  // Get user data from route params or fetch from Firestore
  const phone = routePhone || userData?.phone;
  const role = routeRole || userData?.role;
  const userId = routeUserId;

  // Animation refs
  const logoAnim = useRef(new Animated.Value(0)).current;
  const inputAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(1)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  // Note: SMS auto-read would be implemented here in a bare React Native or Expo dev client setup
  // For now, users will need to manually enter the OTP code

  // Fetch user data if not provided via route params
  useEffect(() => {
    const fetchUserData = async () => {
      if (!routePhone) {
        try {
          const auth = getAuth();
          const user = auth.currentUser;
          if (user) {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setUserData(userData as any);
              
              // Check if user is already verified
              if (userData.isVerified) {
                // User is already verified, redirecting
                // User is already verified, let App.tsx handle navigation
                return;
              }
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };
    
    fetchUserData();
  }, [routePhone]);

  // Start countdown for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Success animation
  useEffect(() => {
    if (verified) {
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [verified]);

  // Animation on mount
  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(inputAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [logoAnim, inputAnim]);

  const handleVerify = async () => {
    if (!otp || otp.length < 4) {
      setError('Please enter a valid 6-digit code.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Get fresh token from Firebase Auth
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated. Please sign in again.');
      }

      const token = await user.getIdToken();
      console.log('Phone verification - using fresh Firebase token');

      // Use the proper phone verification endpoint
      await apiRequest('/auth', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'verify-phone',
          code: otp,
          userId: userId,
        }),
      });

      // Success - user is now verified
      // Phone verification successful
      setVerified(true);

      // Send phone verification success notification
      try {
        const { NotificationHelper } = require('../../services/notificationHelper');
        await NotificationHelper.sendAuthNotification('verification', {
          userId,
          role,
          verificationType: 'phone'
        });
      } catch (notificationError) {
        console.warn('Failed to send phone verification notification:', notificationError);
      }

      // Show success animation briefly, then navigate directly
      setTimeout(() => {
        // Phone verification complete - navigating to appropriate screen for role
        
        // Navigate directly based on role
        if (role === 'shipper') {
          // Navigating shipper to MainTabs
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }]
          });
        } else if (role === 'business') {
          // Navigating business to BusinessStack
          navigation.reset({
            index: 0,
            routes: [{ name: 'BusinessStack' }]
          });
        } else if (role === 'broker') {
          // Navigating broker to VerifyIdentificationDocument
          navigation.reset({
            index: 0,
            routes: [{ name: 'VerifyIdentificationDocument' }]
          });
        } else if (role === 'transporter') {
          // For transporters, we need to check if they are individual or company type
          // This will be handled by the TransporterCompletionScreen itself
          console.log('Phone verification complete - navigating transporter to TransporterCompletionScreen');
          navigation.reset({
            index: 0,
            routes: [{ name: 'TransporterCompletionScreen' }]
          });
        } else {
          // Navigating unknown role to MainTabs
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }]
          });
        }
      }, 2000);
    } catch (err: any) {
      console.error('Phone verification error:', err);
      let errorMessage = 'Verification failed. Please try again.';

      if (err.message?.includes('Invalid code')) {
        errorMessage = 'Invalid verification code. Please check and try again.';
      } else if (err.message?.includes('expired')) {
        errorMessage = 'Verification code has expired. Please request a new one.';
      } else if (err.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resendLoading) return;

    setError('');
    setResendLoading(true);

    try {
      // Get fresh token from Firebase Auth
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated. Please sign in again.');
      }

      const token = await user.getIdToken();
      console.log('Phone resend - using fresh Firebase token');

      // Use the new API structure with action
      await apiRequest('/auth', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'resend-phone-code',
          userId: userId,
        }),
      });

      setCountdown(60); // Start 60 second countdown
      setError(''); // Clear any previous errors
    } catch (err: any) {
      console.error('Resend error:', err);
      let errorMessage = 'Failed to resend code. Please try again.';
      
      if (err.message?.includes('network') || err.message?.includes('Network request failed')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message?.includes('already verified')) {
        errorMessage = 'Your phone is already verified. You can proceed to the app.';
      } else if (err.message?.includes('rate limit') || err.message?.includes('too many')) {
        errorMessage = 'Too many requests. Please wait a moment before trying again.';
      } else if (err.message?.includes('invalid phone') || err.message?.includes('phone number')) {
        errorMessage = 'Invalid phone number. Please check your number and try again.';
      }
      
      setError(errorMessage);
    } finally {
      setResendLoading(false);
    }
  };

  const formatPhone = (phoneNumber: any) => {
    if (!phoneNumber) return '';
    // Format phone number for display (e.g., +254 712 345 678)
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 12 && cleaned.startsWith('254')) {
      return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
    }
    return phoneNumber;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[colors.primary, colors.primaryDark, colors.secondary, colors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={50}
      >
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => handleVerificationBackNavigation(navigation, {
            email: route.params?.email,
            phone: route.params?.phone,
            role: route.params?.role,
            password: route.params?.password
          })}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoAnim,
              transform: [{
                translateY: logoAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              }],
            },
          ]}
        >
          <View style={styles.logoCircle}>
            <Ionicons name="call" size={40} color={colors.primary} />
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.contentContainer,
            {
              opacity: inputAnim,
              transform: [{
                translateY: inputAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              }],
            },
          ]}
        >
          <Text style={styles.title}>Verify Your Phone</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={styles.phoneHighlight}>{formatPhone(phone)}</Text>
          </Text>

          <View style={styles.codeContainer}>
            <TextInput
              style={styles.codeInput}
              placeholder="Enter 6-digit code"
              value={otp}
              onChangeText={(text) => {
                const cleaned = text.replace(/\D/g, '');
                setOtp(cleaned.slice(0, 6));
              }}
              keyboardType="number-pad"
              autoCapitalize="none"
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
              maxLength={6}
              placeholderTextColor={colors.text.light}
            />
            {Platform.OS === 'android' && (
              <Text style={styles.autoFillNote}>
                Code will be auto-filled if you allow SMS permissions
              </Text>
            )}
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.verifyBtn,
              { opacity: loading ? 0.7 : 1 },
            ]}
            onPress={handleVerify}
            disabled={loading || !otp || otp.length < 6}
            activeOpacity={0.9}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <Animated.View
                  style={[
                    styles.loadingSpinner,
                    {
                      transform: [{
                        rotate: buttonAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      }],
                    },
                  ]}
                />
                <Text style={styles.verifyBtnText}>Verifying...</Text>
              </View>
            ) : (
              <Text style={styles.verifyBtnText}>Verify Phone</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.resendBtn,
              { opacity: (countdown > 0 || resendLoading) ? 0.5 : 1 }
            ]}
            onPress={handleResend}
            disabled={countdown > 0 || resendLoading}
          >
            {resendLoading ? (
              <Text style={styles.resendBtnText}>Sending...</Text>
            ) : countdown > 0 ? (
              <Text style={styles.resendBtnText}>Resend in {countdown}s</Text>
            ) : (
              <Text style={styles.resendBtnText}>Resend Code</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Success Animation Overlay */}
        {verified && (
          <Animated.View
            style={[
              styles.successContainer,
              {
                opacity: successAnim,
                transform: [{
                  scale: successAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                }],
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={60} color={colors.success} />
            <Text style={styles.successText}>Phone Verified!</Text>
            <Text style={styles.successSubtext}>Redirecting you...</Text>
          </Animated.View>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 36 : 48,
    left: 24,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: fonts.size.xl + 4,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: spacing.md,
    fontFamily: fonts.family.bold,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fonts.size.md,
    color: colors.white,
    marginBottom: spacing.xl,
    textAlign: 'center',
    lineHeight: 24,
  },
  phoneHighlight: {
    fontWeight: 'bold',
    color: colors.white,
  },
  codeContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  codeInput: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 16,
    padding: 18,
    fontSize: fonts.size.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: colors.white,
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  autoFillNote: {
    fontSize: fonts.size.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  errorText: {
    color: colors.error,
    marginLeft: 8,
    fontSize: fonts.size.md,
    flex: 1,
  },
  verifyBtn: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
    width: '100%',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingSpinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    borderTopColor: 'transparent',
    marginRight: 8,
  },
  verifyBtnText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: fonts.size.md + 2,
    letterSpacing: 0.5,
  },
  resendBtn: {
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  resendBtnText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: fonts.size.md,
    textDecorationLine: 'underline',
  },
  successContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  successText: {
    color: colors.white,
    fontSize: fonts.size.lg + 4,
    fontWeight: 'bold',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  successSubtext: {
    color: colors.text.light,
    fontSize: fonts.size.md,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

export default PhoneOTPScreen;
