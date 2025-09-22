import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FormKeyboardWrapper from '../../components/common/FormKeyboardWrapper';
import { fonts, spacing } from '../../constants';
import colors from '../../constants/colors';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PasswordStrengthIndicator from '../../components/common/PasswordStrengthIndicator';
import { auth } from '../../firebaseConfig';

WebBrowser.maybeCompleteAuthSession();

const countryOptions = [
  { code: '+255', name: 'Tanzania', flag: '🇹🇿' },
  { code: '+250', name: 'Rwanda', flag: '🇷🇼' },
  { code: '+256', name: 'Uganda', flag: '🇺🇬' },
  { code: '+254', name: 'Kenya', flag: '🇰🇪' },
];

const roleAccents = {
  shipper: colors.primary,
  broker: colors.tertiary,
  business: colors.secondary,
  transporter: '#FF8C00', // Unique bold orange for transporters
};

const roleLabels = {
  shipper: 'Shipper',
  broker: 'Broker',
  business: 'Business',
  transporter: 'Transporter',
};

const SignupScreen = () => {
  const navigation = useNavigation() as any;
  const route = useRoute();
  const { 
    role, 
    email: prefilledEmail, 
    phone: prefilledPhone, 
    password: prefilledPassword,
    isCorrection = false 
  } = route.params as { 
    role?: string; 
    email?: string; 
    phone?: string; 
    password?: string;
    isCorrection?: boolean;
  } || {};
  
  const accent = roleAccents[role as keyof typeof roleAccents] || colors.primary;
  const label = roleLabels[role as keyof typeof roleLabels] || 'User';

  const [name, setName] = useState('');
  const [email, setEmail] = useState(prefilledEmail || '');
  const [phone, setPhone] = useState(prefilledPhone || '');
  const [signupMethod, setSignupMethod] = useState<'phone' | 'email'>('phone');
  const [password, setPassword] = useState(prefilledPassword || '');
  const [confirmPassword, setConfirmPassword] = useState(prefilledPassword || '');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(countryOptions[3]); // Default Kenya
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Animation refs
  const formOpacity = useRef(new Animated.Value(1)).current;
  const inputAnim = useRef(new Animated.Value(0)).current;

  // Google Auth - Using proper client IDs
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID || '86814869135-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '86814869135-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '86814869135-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '86814869135-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com',
  });

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
      setError('Google authentication is not properly configured. Please use email/password signup.');
    }
  }, [response]);

  // Input animation on mount
  useEffect(() => {
    Animated.timing(inputAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [inputAnim]);



  const handleSignup = async () => {
    if (loading) return;

    setError('');

    // Validation
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (signupMethod === 'email' && !email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    // Email format validation
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError('Please enter a valid email address (e.g., user@example.com).');
        return;
      }
    }

    if (signupMethod === 'phone' && !phone.trim()) {
      setError('Please enter your phone number.');
      return;
    }

    // Always require both email and phone for backend
    if (!email.trim() && signupMethod === 'phone') {
      setError('Please provide an email address for account recovery.');
      return;
    }

    if (!phone.trim() && signupMethod === 'email') {
      setError('Please provide a phone number for account security.');
      return;
    }

    // Validate phone number format
    const fullPhoneNumber = selectedCountry.code + phone.trim();
    if (phone.trim() && !/^\+?[1-9]\d{1,14}$/.test(fullPhoneNumber)) {
      setError('Please enter a valid phone number.');
      return;
    }

    if (!password) {
      setError('Please enter a password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      // Map frontend role to backend role
      const backendRoleMap: Record<string, string> = {
        shipper: 'shipper',
        broker: 'broker',
        business: 'business',
        transporter: 'transporter',
      };

      // Use backend signup endpoint that creates both Firebase user and Firestore record
      console.log('Using backend signup to create Firebase user with both email and phone providers');
      console.log('SignupScreen - Received role from SignupSelectionScreen:', role);
      
      const userData = {
        name: name.trim(),
        email: email.trim(),
        phone: selectedCountry.code + phone.trim(),
        password: password,
        role: backendRoleMap[role || 'shipper'],
        preferredVerificationMethod: signupMethod,
        userType: role || 'shipper',
        languagePreference: 'en',
        location: null,
        profilePhotoUrl: null,
      };

      console.log('Registering user via backend signup with data:', userData);
      
      try {
        // Use the backend signup endpoint that creates Firebase user with both email and phone
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://agritruk.onrender.com'}/api/auth/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(userData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Backend signup successful:', result);
        
        // Store user data for later use
        await AsyncStorage.setItem('pendingUserData', JSON.stringify(userData));
        
        // Sign in the user with Firebase after successful backend registration
        console.log('Signing in user with Firebase after backend registration');
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Firebase sign-in successful:', userCredential.user.uid);
        
        // Store Firebase token for future requests
        const idToken = await userCredential.user.getIdToken();
        await AsyncStorage.setItem('jwt', idToken);
        
        // Backend registration complete - verification codes are automatically sent by backend
        console.log('User registered successfully, verification codes sent by backend');

        // Navigate to verification screen immediately based on preferred method
        if (signupMethod === 'phone') {
          navigation.navigate('PhoneOTPScreen', {
            email: email.trim(),
            phone: selectedCountry.code + phone.trim(),
            role: role || 'shipper',
            userId: userCredential.user.uid
          });
        } else {
          navigation.navigate('EmailVerification', {
            email: email.trim(),
            phone: selectedCountry.code + phone.trim(),
            role: role || 'shipper',
            userId: userCredential.user.uid
          });
        }
        
      } catch (backendError) {
        console.warn('Backend signup failed:', backendError);
        throw backendError;
      }
    } catch (err: any) {
      console.error('Signup error:', err);

      // Handle different types of errors
      let msg = 'Signup failed. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please sign in or use a different email.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Network error. Please check your connection.';
      } else if (err.message && err.message.includes('network')) {
        msg = 'Network error. Please check your connection and try again.';
      } else if (err.message && err.message.includes('Server error')) {
        msg = 'Backend server is temporarily unavailable. Your account has been created and will be synced when the server is back online.';
      } else if (err.message && err.message.includes('User already exists')) {
        msg = 'This email is already registered. Please sign in instead.';
      } else if (err.message && err.message.includes('Phone number is already registered')) {
        msg = 'This phone number is already registered. Please sign in or use a different phone number.';
      } else if (err.message && err.message.includes('Email is already registered')) {
        msg = 'This email is already registered. Please sign in or use a different email.';
      } else if (err.message && err.message.includes('already registered')) {
        msg = 'This account is already registered. Please sign in instead.';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      {/* Fixed Background */}
      <LinearGradient
        colors={[
          colors.primary,
          colors.primaryDark,
          colors.secondary,
          colors.background,
        ]}
        style={styles.backgroundGradient}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <FormKeyboardWrapper
        contentContainerStyle={styles.scrollContainer}
        keyboardVerticalOffset={0}
      >
          <View style={styles.container}>
            <LoadingSpinner
              visible={loading}
              message="Creating Your Account..."
              size="large"
              type="pulse"
              logo={true}
              overlay={true}
            />
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: colors.white }]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={accent} />
            </TouchableOpacity>

            <Animated.View
              style={[
                styles.formCard,
                {
                  opacity: formOpacity,
                  transform: [{
                    translateY: inputAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  }],
                },
              ]}
            >
              {/* Header Section */}
              <View style={styles.headerSection}>
                <View style={styles.logoContainer}>
                  <Image
                    source={require('../../../assets/images/TRUK Logo.png')}
                    style={styles.logo}
                  />
                </View>
                <Text style={styles.welcomeText}>
                  {isCorrection ? 'Correct Your Details' : 'Welcome to TRUK'}
                </Text>
                <Text style={styles.subtitleText}>
                  {isCorrection 
                    ? 'Update your information and try again' 
                    : 'Create your account to get started'
                  }
                </Text>
                {isCorrection && (
                  <View style={styles.correctionBanner}>
                    <Ionicons name="information-circle" size={16} color={colors.primary} />
                    <Text style={styles.correctionBannerText}>
                      You can update any field below and resubmit
                    </Text>
                  </View>
                )}
              </View>

              {/* Google Sign Up Button */}
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={() => promptAsync()}
                activeOpacity={0.85}
                disabled={!request || loading}
                accessibilityLabel="Continue with Google"
              >
                <Image
                  source={require('../../../assets/images/google_g.png')}
                  style={styles.googleIcon}
                />
                {loading ? (
                  <Text style={styles.googleBtnText}>Loading...</Text>
                ) : (
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                )}
              </TouchableOpacity>

              <View style={styles.orSeparatorWrap}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>or</Text>
                <View style={styles.orLine} />
              </View>

              {/* Name Input */}
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                placeholderTextColor={colors.text.light}
              />

              {/* Signup Method Switcher - Using LoginScreen pattern */}
              <View style={styles.switchRow}>
                <TouchableOpacity
                  style={[
                    styles.switchBtn,
                    signupMethod === 'phone' && { backgroundColor: accent }
                  ]}
                  onPress={() => setSignupMethod('phone')}
                >
                  <Ionicons
                    name="call"
                    size={18}
                    color={signupMethod === 'phone' ? colors.white : colors.text.secondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.switchBtnText, signupMethod === 'phone' && styles.switchBtnTextActive]}>
                    Phone
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.switchBtn,
                    signupMethod === 'email' && { backgroundColor: accent }
                  ]}
                  onPress={() => setSignupMethod('email')}
                >
                  <Ionicons
                    name="mail"
                    size={18}
                    color={signupMethod === 'email' ? colors.white : colors.text.secondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.switchBtnText, signupMethod === 'email' && styles.switchBtnTextActive]}>
                    Email
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Email Input - Always show but highlight based on method */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    signupMethod === 'email' && styles.inputActive,
                  ]}
                  placeholder="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor={colors.text.light}
                />
                {signupMethod === 'email' && (
                  <View style={[styles.inputBadge, { backgroundColor: accent }]}>
                    <Text style={styles.inputBadgeText}>Primary</Text>
                  </View>
                )}
              </View>

              {/* Phone Input - Always show but highlight based on method */}
              <View style={styles.inputContainer}>
                <View style={styles.phoneRow}>
                  <TouchableOpacity
                    style={styles.countryCodeBtn}
                    activeOpacity={0.8}
                    onPress={() => setShowCountryDropdown((v) => !v)}
                  >
                    <Text style={styles.countryCodeText}>
                      {selectedCountry.flag} {selectedCountry.code}
                    </Text>
                    <Ionicons
                      name={showCountryDropdown ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.text.secondary}
                      style={{ marginLeft: 4 }}
                    />
                  </TouchableOpacity>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        flex: 1,
                        marginBottom: 0,
                        borderTopLeftRadius: 0,
                        borderBottomLeftRadius: 0,
                        borderLeftWidth: 0,
                      },
                      signupMethod === 'phone' && styles.inputActive,
                    ]}
                    placeholder="Phone Number"
                    value={phone}
                    onChangeText={setPhone}
                    autoCapitalize="none"
                    keyboardType="phone-pad"
                    placeholderTextColor={colors.text.light}
                  />
                </View>
                {signupMethod === 'phone' && (
                  <View style={[styles.inputBadge, { backgroundColor: accent }]}>
                    <Text style={styles.inputBadgeText}>Primary</Text>
                  </View>
                )}
              </View>


              {/* Password Input */}
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholderTextColor={colors.text.light}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword((v) => !v)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={22}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholderTextColor={colors.text.light}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword((v) => !v)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={22}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Password Strength Indicator */}
              <PasswordStrengthIndicator
                password={password}
                confirmPassword={confirmPassword}
                showLabel={true}
                containerStyle={styles.passwordStrengthContainer}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.signupBtn, { backgroundColor: accent }]}
                onPress={handleSignup}
                disabled={loading}
                activeOpacity={0.9}
              >
                {loading ? (
                  <Text style={styles.signupBtnText}>Creating Account...</Text>
                ) : (
                  <Text style={styles.signupBtnText}>Create Account</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.roleNote}>
                You are signing up as{' '}
                <Text style={{ fontWeight: 'bold', color: accent }}>{label}</Text>
              </Text>

              <Text style={styles.signInText}>
                Already have an account?{' '}
                <Text
                  style={[styles.signInLink, { color: accent }]}
                  onPress={() => navigation.navigate('SignIn')}
                >
                  Sign In
                </Text>
              </Text>
            </Animated.View>
          </View>
      </FormKeyboardWrapper>

      {/* Country Dropdown - Outside ScrollView to prevent clipping */}
      {showCountryDropdown && (
        <>
          <TouchableWithoutFeedback onPress={() => setShowCountryDropdown(false)}>
            <View style={styles.dropdownOverlay} />
          </TouchableWithoutFeedback>
          <View style={styles.dropdownContainer}>
            {countryOptions.map((country) => (
              <TouchableOpacity
                key={country.code}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedCountry(country);
                  setShowCountryDropdown(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownFlag}>{country.flag}</Text>
                <Text style={styles.dropdownText}>
                  {country.name} ({country.code})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  backBtn: {
    position: 'absolute',
    top: 24,
    left: 24,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: 28,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 440,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 16,
    marginTop: 60,
    marginBottom: spacing.xl,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  welcomeText: {
    fontSize: fonts.size.xl + 6,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  title: {
    fontSize: fonts.size.xl + 4,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontFamily: fonts.family.bold,
    letterSpacing: 0.5,
    marginTop: spacing.lg,
  },
  googleBtn: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    width: '100%',
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.text.light + '20',
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: spacing.sm,
    resizeMode: 'contain',
  },
  googleBtnText: {
    fontSize: fonts.size.md + 2,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#222',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  orSeparatorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 20,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 12,
  },
  orText: {
    color: colors.text.secondary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: colors.surface,
    marginHorizontal: 6,
  },
  switchBtnActive: {
    backgroundColor: colors.primary, // Will be overridden with accent color in component
  },
  switchBtnText: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  switchBtnTextActive: {
    color: colors.white,
  },
  inputContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: spacing.md,
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.text.light,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: fonts.size.md,
    backgroundColor: colors.background,
    color: colors.text.primary,
  },
  inputActive: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  inputBadgeText: {
    color: colors.white,
    fontSize: fonts.size.sm,
    fontWeight: '600',
  },
  passwordContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: spacing.md,
  },
  passwordStrengthContainer: {
    marginBottom: spacing.md,
  },
  eyeIcon: {
    position: 'absolute',
    right: 18,
    top: 0,
    bottom: 0,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  countryCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    borderWidth: 1.5,
    borderRightWidth: 0,
    borderColor: colors.text.light,
    paddingHorizontal: 16,
    height: 48,
    zIndex: 20,
  },
  countryCodeText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: colors.text.primary,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 999,
  },
  dropdownContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -100 }],
    width: 200,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.text.light,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
    zIndex: 1000,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '22',
    backgroundColor: colors.surface,
  },
  dropdownFlag: {
    fontSize: 20,
    marginRight: 10,
  },
  dropdownText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  error: {
    color: colors.error,
    marginBottom: spacing.md,
    fontSize: fonts.size.md,
    textAlign: 'center',
    backgroundColor: colors.error + '10',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  signupBtn: {
    borderRadius: 16,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
    width: '100%',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  signupBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: fonts.size.md + 2,
    letterSpacing: 0.5,
  },
  roleNote: {
    marginTop: spacing.lg,
    color: colors.text.secondary,
    fontSize: fonts.size.sm,
    textAlign: 'center',
  },
  correctionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    marginTop: spacing.md,
  },
  correctionBannerText: {
    color: colors.primary,
    fontSize: fonts.size.sm,
    marginLeft: 8,
    flex: 1,
  },
  signInText: {
    fontSize: fonts.size.md,
    textAlign: 'center',
    marginTop: spacing.lg,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: colors.text.secondary,
  },
  signInLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

export default SignupScreen;
