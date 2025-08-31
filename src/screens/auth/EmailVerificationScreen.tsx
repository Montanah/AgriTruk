import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, spacing } from '../../constants';
import colors from '../../constants/colors';
import { apiRequest } from '../../utils/api';

const { width } = Dimensions.get('window');

const EmailVerificationScreen = ({ navigation, route }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verified, setVerified] = useState(false);
  const { email, phone, role, password } = route.params || {};

  // Animation refs
  const logoAnim = useRef(new Animated.Value(0)).current;
  const inputAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(1)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  // Start countdown for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

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
    if (code.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('jwt');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Use the new API structure with action
      await apiRequest('/auth', {
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

      // Success - user is now verified
      console.log('Email verification successful');
      setVerified(true);

      // Navigate after a short delay to show success animation
      setTimeout(async () => {
        // Wait a moment for backend to update isVerified field
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Sign out and sign back in to refresh auth state with correct role
        const auth = getAuth();

        // Get the password from route params for re-authentication
        const { password } = route.params || {};

        if (password) {
          try {
            // Sign out current user
            await signOut(auth);

            // Sign back in with email and password to refresh auth state
            await signInWithEmailAndPassword(auth, email, password);

            // Navigation will be handled automatically by App.tsx auth state listener
            // based on the updated user role and verification status
          } catch (error) {
            console.error('Re-authentication error:', error);
            // Let the auth state listener handle navigation
            // No manual navigation needed
          }
        } else {
          // Let the auth state listener handle navigation
          // No manual navigation needed
        }
      }, 2000);

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
      const token = await AsyncStorage.getItem('jwt');
      if (!token) {
        throw new Error('Authentication token not found');
      }

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
      setError('Failed to resend code. Please try again.');
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
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
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
                  onChangeText={(val) => {
                    const newCode = code.split('');
                    newCode[i] = val.replace(/[^0-9]/g, '');
                    setCode(newCode.join(''));
                    // Auto-focus next input
                    if (val && i < 5) {
                      // Find next input and focus it
                      const nextInput = document.querySelector(`input[data-index="${i + 1}"]`);
                      if (nextInput) nextInput.focus();
                    }
                  }}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === 'Backspace' && !code[i] && i > 0) {
                      // Find previous input and focus it
                      const prevInput = document.querySelector(`input[data-index="${i - 1}"]`);
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
        </Animated.View>
      </View>
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
});

export default EmailVerificationScreen;
