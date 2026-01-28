import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import KeyboardAwareScrollView from '../../components/common/KeyboardAwareScrollView';
import { fonts, spacing } from '../../constants';
import colors from '../../constants/colors';
import { apiRequest } from '../../utils/api';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { handleVerificationBackNavigation } from '../../utils/navigationUtils';

const { width } = Dimensions.get('window');

const EmailVerificationScreen = ({ navigation, route }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verified, setVerified] = useState(false);
  const [userData, setUserData] = useState(null);
  const { email: routeEmail, phone: routePhone, role: routeRole, password: routePassword, userId: routeUserId, fromContactUpdate } = route.params || {};
  
  // Debug logging for role verification
  console.log('📧 EmailVerificationScreen received params:', { routeEmail, routePhone, routeRole, routeUserId, fromContactUpdate });
  
  // Get user data from route params or fetch from Firestore
  const email = routeEmail || userData?.email;
  const phone = routePhone || userData?.phone;
  const role = routeRole || userData?.role;
  const password = routePassword;
  const userId = routeUserId;
  
  console.log('📧 EmailVerificationScreen processed role:', role);
  console.log('📧 EmailVerificationScreen password available:', !!password);

  // Animation refs
  const logoAnim = useRef(new Animated.Value(0)).current;
  const inputAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(1)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  
  // Input refs for auto-focus
  const inputRefs = useRef(Array(6).fill(null));

  // Start countdown for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Fetch user data if not provided via route params
  useEffect(() => {
    const fetchUserData = async () => {
      if (!routeEmail && !routePhone) {
        try {
          const auth = getAuth();
          const user = auth.currentUser;
          if (user) {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setUserData(userData);
              
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
          // Don't show Firebase errors to user - just log them
          // The user can still proceed with verification using route params
        }
      }
    };
    
    fetchUserData();
  }, [routeEmail, routePhone]);

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
  }, []);

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

  const handleVerify = async () => {
    console.log('Verification attempt - code:', code, 'length:', code.length, 'type:', typeof code);
    if (code.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Get fresh token from Firebase Auth instead of AsyncStorage
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated. Please sign in again.');
      }

      const token = await user.getIdToken();
      console.log('Email verification - using fresh Firebase token');

      // Use the new API structure with action
      console.log('Sending verification code:', code, 'Type:', typeof code);
      const response = await apiRequest('/auth', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'verify-email',
          code: code,
        }),
      });

      console.log('Email verification response:', response);

      // Success - user is now verified
      // Email verification successful
      setVerified(true);
      
      // Wait for Firestore to update and verify the user is now verified
      console.log('Waiting for Firestore update...');
      
      // Wait a moment for the backend to update Firestore
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Verify that the user is now verified in Firestore - retry up to 3 times
      let retryCount = 0;
      const maxRetries = 3;
      let isVerifiedInFirestore = false;
      
      while (retryCount < maxRetries && !isVerifiedInFirestore) {
        try {
          const auth = getAuth();
          const currentUser = auth.currentUser;
          if (currentUser) {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              console.log(`User verification status check (attempt ${retryCount + 1}):`, {
                isVerified: userData.isVerified,
                emailVerified: userData.emailVerified,
                phoneVerified: userData.phoneVerified
              });
              
              if (userData.isVerified) {
                console.log('✅ User is now verified in Firestore - proceeding with navigation');
                isVerifiedInFirestore = true;
                break;
              } else {
                console.log(`⏳ User not yet verified in Firestore (attempt ${retryCount + 1}/${maxRetries}) - waiting...`);
                retryCount++;
                if (retryCount < maxRetries) {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              }
            }
          }
        } catch (verifyError) {
          console.error('Error verifying user status:', verifyError);
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      if (!isVerifiedInFirestore) {
        console.warn('⚠️ User verification status not confirmed in Firestore after retries - proceeding anyway');
      }

      // Send email verification success notification
      try {
        const { NotificationHelper } = require('../../services/notificationHelper');
        await NotificationHelper.sendAuthNotification('verification', {
          userId: user.uid,
          role,
          verificationType: 'email'
        });
      } catch (notificationError) {
        console.warn('Failed to send email verification notification:', notificationError);
      }

      // Show success animation briefly, then navigate directly
      // IMPORTANT: Wait for App.tsx to re-evaluate user status after Firestore update
      setTimeout(async () => {
        // Email verification complete - navigating to appropriate screen for role
        // Note: App.tsx will automatically re-route based on updated verification status via onAuthStateChanged
        
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
          // For brokers, sign out and sign in again to get correct navigation stack
          // App.tsx will automatically route to VerifyIdentificationDocument or SubscriptionTrial based on status
          console.log('Email verification complete - signing out broker to get correct navigation stack');
          
          // Check if we have the necessary credentials for re-authentication
          if (!email || !password) {
            console.log('Email available:', !!email, 'Password available:', !!password);
            
            // If we don't have credentials, navigate to VerifyIdentificationDocument directly
            // The user is already verified, so VerifyIdentificationDocument will check status and route accordingly
            console.log('No credentials for broker re-authentication - navigating to VerifyIdentificationDocument');
            navigation.reset({
              index: 0,
              routes: [{
                name: 'VerifyIdentificationDocument',
                params: {
                  userId: userId,
                  role: role
                }
              }]
            });
            return;
          }
          
          try {
            const { getAuth, signOut } = require('firebase/auth');
            const auth = getAuth();
            
            // Sign out current user
            await signOut(auth);
            console.log('Broker signed out successfully');
            
            // Sign in again to trigger correct role-based navigation
            const { signInWithEmailAndPassword } = require('firebase/auth');
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('Broker signed in again with correct role:', userCredential.user.uid);
            
            // App.tsx will automatically route to VerifyIdentificationDocument or SubscriptionTrial based on broker status
            // No manual navigation needed - the auth state change will trigger the correct routing
            
          } catch (signInError) {
            console.error('Error signing in broker after verification:', signInError);
            
            // If sign-in fails, navigate to VerifyIdentificationDocument as fallback
            // Since the user is verified, VerifyIdentificationDocument will check status and route accordingly
            console.log('Sign-in failed, navigating to VerifyIdentificationDocument as fallback');
            navigation.reset({
              index: 0,
              routes: [{
                name: 'VerifyIdentificationDocument',
                params: {
                  userId: userId,
                  role: role
                }
              }]
            });
          }
        } else if (role === 'transporter') {
          // Navigating transporter to completion screen for company profile setup
          console.log('Email verification complete - navigating transporter to completion screen');
          navigation.navigate('TransporterCompletionScreen', {
            userId: userId,
            phone: phone,
            role: role
          });
        } else if (role === 'driver' || role === 'job_seeker') {
          // Check if this is from contact update - navigate back to DriverRecruitmentStatusScreen
          if (fromContactUpdate) {
            console.log('Email verification complete from contact update - navigating back to DriverRecruitmentStatusScreen');
            navigation.navigate('DriverRecruitmentStatusScreen');
          } else {
            // For initial job seekers, navigate directly to completion screen after verification
            console.log('Email verification complete - navigating job seeker to completion screen');
            navigation.reset({
              index: 0,
              routes: [{ 
                name: 'JobSeekerCompletionScreen',
                params: {
                  userId: userId,
                  email: email,
                  phone: phone,
                  role: role
                }
              }]
            });
          }
        } else {
          // Unknown role - show error and redirect to signup
          console.error('Unknown role after verification:', role);
          Alert.alert(
            'Verification Error',
            'Unable to determine your account type. Please contact support.',
            [
              {
                text: 'Try Again',
                onPress: () => navigation.navigate('SignupSelectionScreen')
              }
            ]
          );
        }
      }, 1000);

    } catch (err) {
      console.error('Email verification error:', err);
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
      // Get fresh token from Firebase Auth instead of AsyncStorage
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated. Please sign in again.');
      }

      const token = await user.getIdToken();
      console.log('Email resend - using fresh Firebase token');

      // Use the new API structure with action
      await apiRequest('/auth', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'resend-email-code',
        }),
      });

      setCountdown(60); // Start 60 second countdown
      setError(''); // Clear any previous errors
    } catch (err) {
      console.error('Resend error:', err);
      let errorMessage = 'Failed to resend code. Please try again.';
      
      if (err.message?.includes('network') || err.message?.includes('Network request failed')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message?.includes('already verified')) {
        errorMessage = 'Your email is already verified. You can proceed to the app.';
      } else if (err.message?.includes('rate limit') || err.message?.includes('too many')) {
        errorMessage = 'Too many requests. Please wait a moment before trying again.';
      }
      
      setError(errorMessage);
    } finally {
      setResendLoading(false);
    }
  };

  const formatEmail = (emailAddress) => {
    if (!emailAddress) return '';
    // Mask email for privacy (e.g., j***@example.com)
    const [localPart, domain] = emailAddress.split('@');
    if (localPart && domain) {
      const maskedLocal = localPart.charAt(0) + '*'.repeat(localPart.length - 1);
      return `${maskedLocal}@${domain}`;
    }
    return emailAddress;
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
            email,
            phone,
            role,
            password
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
            <Ionicons name="mail" size={40} color={colors.primary} />
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
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={styles.emailHighlight}>{formatEmail(email)}</Text>
          </Text>

          <View style={styles.codeContainer}>
            <View style={styles.codeInputRow}>
              {Array.from({ length: 6 }).map((_, i) => (
                <TextInput
                  key={i}
                  style={[
                    styles.codeInput,
                    code[i] && styles.codeInputFilled,
                  ]}
                  maxLength={1}
                  keyboardType="number-pad"
                  value={code[i] || ''}
                  ref={(ref) => {
                    inputRefs.current[i] = ref;
                  }}
                  onChangeText={(val) => {
                    const newCode = code.split('');
                    newCode[i] = val.replace(/[^0-9]/g, '');
                    const finalCode = newCode.join('').trim();
                    console.log('Code input - raw:', val, 'cleaned:', newCode[i], 'final:', finalCode);
                    setCode(finalCode);
                    // Auto-focus next input
                    if (val && i < 5) {
                      // Focus next input using ref
                      const nextInput = inputRefs.current[i + 1];
                      if (nextInput) nextInput.focus();
                    }
                  }}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === 'Backspace' && !code[i] && i > 0) {
                      // Focus previous input using ref
                      const prevInput = inputRefs.current[i - 1];
                      if (prevInput) prevInput.focus();
                    }
                  }}
                  autoFocus={i === 0}
                  returnKeyType="next"
                  data-index={i}
                />
              ))}
            </View>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

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
              <Text style={styles.successText}>Email Verified!</Text>
              <Text style={styles.successSubtext}>Redirecting you...</Text>
            </Animated.View>
          )}

          <TouchableOpacity
            style={[
              styles.verifyBtn,
              { opacity: loading || verified ? 0.7 : 1 },
            ]}
            onPress={handleVerify}
            disabled={loading || code.length !== 6 || verified}
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
              <Text style={styles.verifyBtnText}>Verify Email</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.resendBtn,
              { opacity: (countdown > 0 || resendLoading || verified) ? 0.5 : 1 }
            ]}
            onPress={handleResend}
            disabled={countdown > 0 || resendLoading || verified}
          >
            {resendLoading ? (
              <Text style={styles.resendBtnText}>Sending...</Text>
            ) : countdown > 0 ? (
              <Text style={styles.resendBtnText}>Resend in {countdown}s</Text>
            ) : (
              <Text style={styles.resendBtnText}>Resend Code</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.correctDetailsBtn}
            onPress={() => handleVerificationBackNavigation(navigation, {
              email,
              phone,
              role,
              password
            })}
          >
            <Ionicons name="create-outline" size={16} color={colors.white} />
            <Text style={styles.correctDetailsBtnText}>Correct Details</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    minHeight: '100%',
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
  emailHighlight: {
    fontWeight: 'bold',
    color: colors.white,
  },
  codeContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  codeInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  codeInput: {
    width: 48,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    fontSize: 24,
    color: colors.white,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  codeInputFilled: {
    borderColor: colors.white,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
  successContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  successText: {
    color: colors.success,
    fontWeight: 'bold',
    fontSize: fonts.size.lg,
    marginTop: spacing.sm,
  },
  successSubtext: {
    color: colors.white,
    fontSize: fonts.size.md,
    marginTop: spacing.xs,
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
  correctDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  correctDetailsBtnText: {
    color: colors.white,
    fontWeight: '500',
    fontSize: fonts.size.sm,
    marginLeft: 8,
  },
});

export default EmailVerificationScreen;
