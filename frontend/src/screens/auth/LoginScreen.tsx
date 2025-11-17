import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FormKeyboardWrapper from '../../components/common/FormKeyboardWrapper';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Spacer from '../../components/common/Spacer';
import { colors, fonts, spacing } from '../../constants';

import { GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { useSafeGoogleAuth } from '../../hooks/useSafeGoogleAuth';

// Conditionally import WebBrowser
let WebBrowser: any = null;
try {
  WebBrowser = require('expo-web-browser');
  if (WebBrowser && WebBrowser.maybeCompleteAuthSession) {
    WebBrowser.maybeCompleteAuthSession();
  }
} catch (error) {
  // WebBrowser not critical - app will continue to work
}

const LoginScreen = ({ navigation }: any) => {
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+254');
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const normalizePhone = (country: string, input: string) => {
    // Accept inputs like +254712345678, +2540712345678, 0712345678, 712345678, 1876543210 (for +2541...)
    const cc = country.startsWith('+') ? country : `+${country}`;
    const ccDigits = cc.replace(/\D/g, '');
    let raw = (input || '').replace(/\s|-/g, '');
    // If starts with +, keep as-is then fix possible +2540 prefix
    if (raw.startsWith('+')) {
      // Collapse +2540X... -> +254X...
      const fixed = raw.replace(new RegExp(`^\\+${ccDigits}0`), `+${ccDigits}`);
      return fixed;
    }
    // Strip all non-digits
    raw = raw.replace(/\D/g, '');
    // Remove leading zero (e.g., 07.. -> 7..)
    if (raw.startsWith('0')) raw = raw.slice(1);
    // Prepend country code
    return `+${ccDigits}${raw}`;
  };

  const countryOptions = [
    { code: '+255', flag: '🇹🇿' },
    { code: '+250', flag: '🇷🇼' },
    { code: '+256', flag: '🇺🇬' },
    { code: '+254', flag: '🇰🇪' },
  ];

  // Google Auth - Safe initialization that won't crash if expo-crypto is not available
  const { request, response, promptAsync, isAvailable: googleAuthAvailable } = useSafeGoogleAuth();

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        const credential = GoogleAuthProvider.credential(id_token);
        setLoading(true);
        signInWithCredential(auth, credential)
          .then(() => {
            // User is signed in, navigation will update via App.tsx
          })
          .catch((error) => {
            console.error('Google sign-in error:', error);
            setError('Google sign-in failed. Please try again.');
          })
          .finally(() => setLoading(false));
      }
    } else if (response?.type === 'error') {
      console.error('Google auth error:', response.error);
      setError('Google authentication is not properly configured. Please use email/password login.');
    }
  }, [response]);



  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[colors.primary, colors.primaryDark, colors.secondary, '#222']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <FormKeyboardWrapper
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardVerticalOffset={0}
      >
        <View style={styles.container}>
          <View style={styles.formCard}>
            {/* Google button disabled - hidden for now */}
            {/* <TouchableOpacity
              style={styles.googleBtn}
              onPress={() => promptAsync()}
              activeOpacity={0.85}
              disabled={!request}
            >
              <Image source={require('../../../assets/images/google_g.png')} style={styles.googleIcon} />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity> */}

            <Text style={styles.title}>Sign In</Text>

            <View style={styles.switchRow}>
              <TouchableOpacity
                style={[styles.switchBtn, loginMode === 'email' && styles.switchBtnActive]}
                onPress={() => setLoginMode('email')}
              >
                <Text style={[styles.switchBtnText, loginMode === 'email' && styles.switchBtnTextActive]}>Email</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.switchBtn, loginMode === 'phone' && styles.switchBtnActive]}
                onPress={() => setLoginMode('phone')}
              >
                <Text style={[styles.switchBtnText, loginMode === 'phone' && styles.switchBtnTextActive]}>Phone</Text>
              </TouchableOpacity>
            </View>

            {loginMode === 'email' ? (
              <TextInput
                style={styles.inputSignup}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.text.secondary}
                value={email}
                onChangeText={setEmail}
              />
            ) : (
              <View style={styles.phoneRow}>
                <TouchableOpacity
                  style={styles.countryCodeBtn}
                  activeOpacity={0.8}
                  onPress={() => setCountryModalVisible(true)}
                >
                  <Text style={styles.countryCodeText}>
                    {countryOptions.find(c => c.code === countryCode)?.flag} {countryCode}
                  </Text>
                  <Text style={styles.countryDropdownArrow}>▼</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.phoneInputSignup}
                  placeholder="712 345 678"
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  placeholderTextColor={colors.text.secondary}
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            )}

            <View style={styles.passwordInputWrap}>
              <TextInput
                style={[styles.inputFull, styles.passwordInput]}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor={colors.text.secondary}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword((prev) => !prev)}
                activeOpacity={0.7}
              >
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={showPassword ? colors.primary : colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Spacer size={spacing.md} />
            <Button
              title={loading ? 'Signing In...' : 'Sign In'}
              onPress={async () => {
                setLoading(true);
                setError('');
                // Validation
                if ((loginMode === 'email' && !email) || (loginMode === 'phone' && !phone) || !password) {
                  setLoading(false);
                  setError('Please enter all required fields.');
                  return;
                }

                // Email format validation
                if (loginMode === 'email') {
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (!emailRegex.test(email)) {
                    setLoading(false);
                    setError('Please enter a valid email address (e.g., user@example.com).');
                    return;
                  }
                }
                try {
                  if (loginMode === 'email') {
                    // Email login request for backend engineer
                    // Request details

                    // Use the imported auth instance directly
                    const userCredential = await signInWithEmailAndPassword(auth, email, password);

                    // Check if this is a company driver after successful login
                    try {
                      const token = await userCredential.user.getIdToken();
                      const driverResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://agritruk.onrender.com'}/api/companies/driver/${userCredential.user.uid}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                      });
                      
                      if (driverResponse.ok) {
                        const driverData = await driverResponse.json();
                        if (driverData.success && driverData.driver) {
                          // This is a company driver - they should go to driver-specific screens
                          console.log('Company driver logged in:', driverData.driver);
                          // The App.tsx will handle routing based on role detection
                        }
                      }
                    } catch (driverCheckError) {
                      console.log('Not a company driver, proceeding with normal flow');
                    }

                    // Login response details
                    // User details
                  } else {
                      // Phone login: Use backend API to get email by phone
                      const fullPhone = normalizePhone(countryCode, phone);
                      console.log('Attempting phone login with:', fullPhone);

                      try {
                        // Call backend API to get user by phone number
                        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://agritruk.onrender.com'}/api/auth/get-user-by-phone`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ phone: fullPhone })
                        });

                        if (!response.ok) {
                          setLoading(false);
                          if (response.status === 404) {
                            setError('No account found with this phone number. Please sign up.');
                          } else {
                            setError('Unable to verify phone number. Please try again.');
                          }
                          return;
                        }

                        const userData = await response.json();
                        console.log('User data from backend:', userData);

                        if (!userData.email) {
                          setLoading(false);
                          setError('This phone number is not associated with an email. Please contact support.');
                          return;
                        }

                        // Check if phone is verified
                        if (!userData.phoneVerified) {
                          setLoading(false);
                          setError('This phone number is not verified. Please verify your phone number first.');
                          return;
                        }

                        // Use the found email to sign in with Firebase Auth
                        console.log('Attempting Firebase Auth with email:', userData.email);
                        const userCredential = await signInWithEmailAndPassword(auth, userData.email, password);
                        console.log('Phone login successful');
                        // Success - loading will be set to false after try-catch
                      } catch (apiError: any) {
                        console.error('API error:', apiError);
                        setLoading(false);
                        let apiErrorMessage = 'Unable to verify phone number. Please try again or use email login.';
                        
                        if (apiError.code === 'auth/user-not-found') {
                          apiErrorMessage = 'No account found with this phone number. Please sign up.';
                        } else if (apiError.code === 'auth/wrong-password') {
                          apiErrorMessage = 'Incorrect password. Please try again.';
                        } else if (apiError.code === 'auth/invalid-credential') {
                          apiErrorMessage = 'Invalid credentials. Please check your password and try again.';
                        }
                        
                        setError(apiErrorMessage);
                        return;
                      }
                    }
                    // Login successful - set loading to false
                    setLoading(false);
                  } catch (e: any) {
                  // Email login error for backend engineer
                  // Error details

                  console.error('Login error:', e);
                  let errorMessage = 'Login failed. Please try again.';

                  if (e.code === 'auth/user-not-found') {
                    errorMessage = 'No account found with this email. Please sign up.';
                  } else if (e.code === 'auth/wrong-password') {
                    errorMessage = 'Incorrect password. Please try again.';
                  } else if (e.code === 'auth/invalid-email') {
                    errorMessage = 'Please enter a valid email address.';
                  } else if (e.code === 'auth/invalid-credential') {
                    errorMessage = 'Invalid email or password. Please check your credentials and try again.';
                  } else if (e.code === 'auth/too-many-requests') {
                    errorMessage = 'Too many failed attempts. Please try again later.';
                  } else if (e.code === 'auth/network-request-failed') {
                    errorMessage = 'Network error. Please check your connection.';
                  } else if (e.code === 'auth/user-disabled') {
                    errorMessage = 'This account has been disabled. Please contact support.';
                  } else if (e.code === 'auth/operation-not-allowed') {
                    errorMessage = 'Email/password sign-in is not enabled. Please contact support.';
                  } else if (e.message) {
                    // For any other Firebase errors, show a generic but helpful message
                    errorMessage = 'Login failed. Please check your email and password, then try again.';
                  }

                  setError(errorMessage);
                }
                setLoading(false);
              }}
              disabled={loading}
            />
            {error ? <Text style={{ color: colors.error, marginTop: 12, textAlign: 'center', fontWeight: '600' }}>{error}</Text> : null}
            
            {/* Forgot Password Link */}
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => navigation.navigate('PasswordResetScreen')}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
            
            <Spacer size={spacing.md} />
            <Text style={styles.signupText}>
              Don't have an account?{' '}
              <Text
                style={styles.signupLink}
                onPress={() => navigation.navigate('SignupSelection')}
              >
                Sign Up
              </Text>
            </Text>
          </View>
        </View>
      </FormKeyboardWrapper>

      {countryModalVisible && (
        <TouchableWithoutFeedback onPress={() => setCountryModalVisible(false)}>
          <View style={styles.countryModalOverlay}>
            <View style={styles.countryModal}>
              {countryOptions.map((item) => (
                <TouchableOpacity
                  key={item.code}
                  style={styles.countryItem}
                  onPress={() => {
                    setCountryCode(item.code);
                    setCountryModalVisible(false);
                  }}
                >
                  <Text style={styles.countryItemText}>
                    {item.flag} {item.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableWithoutFeedback>
      )}

      <LoadingSpinner
        visible={loading}
        message="Signing In..."
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
    backgroundColor: 'transparent',
    padding: spacing.xl,
    justifyContent: 'center',
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 8,
    alignItems: 'stretch',
    position: 'relative',
  },
  passwordInputWrap: {
    position: 'relative',
    width: '100%',
    marginBottom: spacing.md,
    justifyContent: 'center',
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    padding: 4,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  passwordInput: {
    height: 44,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.text.light,
    borderRadius: 10,
    fontSize: fonts.size.md,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingRight: 44,
    marginBottom: 0,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.text.light,
    borderRadius: 10,
    backgroundColor: colors.background,
    height: 44,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  countryCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: colors.text.light,
  },
  countryCodeText: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
  },
  countryDropdownArrow: {
    marginLeft: 4,
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  phoneInputSignup: {
    flex: 1,
    paddingHorizontal: spacing.md,
    fontSize: fonts.size.md,
    color: colors.text.primary,
    height: '100%',
  },
  inputSignup: {
    borderWidth: 1,
    borderColor: colors.text.light,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: fonts.size.md,
    backgroundColor: colors.background,
    color: colors.text.primary,
    height: 44,
    marginBottom: spacing.md,
    width: '100%',
  },
  inputFull: {
    width: '100%',
    minWidth: 200,
    alignSelf: 'stretch',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  switchBtn: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: colors.surface,
    marginHorizontal: 6,
  },
  switchBtnActive: {
    backgroundColor: colors.primary,
  },
  switchBtnText: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  switchBtnTextActive: {
    color: colors.white,
  },
  title: {
    fontSize: fonts.size.xl,
    fontWeight: fonts.weight.bold as any,
    color: colors.primary,
    textAlign: 'center',
    fontFamily: fonts.family.bold,
    marginBottom: spacing.lg,
    marginTop: spacing.lg,
    textShadowColor: '#000a',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  googleBtn: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.text.light,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    width: '100%',
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  googleIcon: {
    width: 22,
    height: 22,
    marginRight: spacing.sm,
    resizeMode: 'contain',
  },
  googleBtnText: {
    fontSize: fonts.size.md + 1,
    color: '#222',
    fontWeight: '700',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  signupText: {
    color: colors.text.secondary,
    fontSize: fonts.size.md,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  signupLink: {
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  countryModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0006',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  countryModal: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    width: 220,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  countryItem: {
    paddingVertical: spacing.sm,
  },
  countryItemText: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  forgotPasswordText: {
    fontSize: fonts.size.sm,
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

});

export default LoginScreen;