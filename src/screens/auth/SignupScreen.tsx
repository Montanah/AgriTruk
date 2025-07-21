import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, spacing } from '../../constants';
import colors from '../../constants/colors';

import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../../firebaseConfig';

WebBrowser.maybeCompleteAuthSession();

const countryOptions = [
  { code: '+255', name: 'Tanzania', flag: '🇹🇿' },
  { code: '+250', name: 'Rwanda', flag: '🇷🇼' },
  { code: '+256', name: 'Uganda', flag: '🇺🇬' },
  { code: '+254', name: 'Kenya', flag: '🇰🇪' },
];

const roleAccents = {
  farmer: colors.primary,
  business: colors.secondary,
  broker: colors.tertiary,
  driver: '#FF8C00', // Unique bold orange for drivers
};

const roleLabels = {
  farmer: 'Shipper',
  business: 'Business',
  broker: 'Broker',
  driver: 'Transporter',
};

const SignupScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { role } = route.params || {};
  const accent = roleAccents[role] || colors.primary;
  const label = roleLabels[role] || 'User';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(countryOptions[3]); // Default Kenya
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const truckAnim = React.useRef(new Animated.Value(0)).current;

  // Google Auth
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      signInWithCredential(auth, credential)
        .then(() => {
          // User is signed in, navigation will update via App.tsx
        })
        .catch((error) => {
          setError('Google sign-in failed');
        })
        .finally(() => setLoading(false));
    }
  }, [response]);

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(truckAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(truckAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      truckAnim.stopAnimation();
      truckAnim.setValue(0);
    }
  }, [loading]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'left', 'right']}>
      <LinearGradient
        colors={[
          colors.primary,
          colors.primaryDark,
          colors.secondary,
          colors.background,
        ]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {loading && (
              <View style={styles.loadingOverlay} pointerEvents="auto">
                <View style={styles.loadingBox}>
                  <Animated.Image
                    source={require('../../../assets/images/TRUK Logo.png')}
                    style={[
                      styles.loadingLogo,
                      {
                        transform: [
                          {
                            translateX: truckAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 80],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                  <Text style={styles.loadingText}>Signing Up...</Text>
                  <View style={{ marginTop: 18 }}>
                    <Animated.View
                      style={{
                        transform: [
                          {
                            rotate: truckAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '360deg'],
                            }),
                          },
                        ],
                      }}
                    >
                      <View style={styles.spinner} />
                    </Animated.View>
                  </View>
                </View>
              </View>
            )}
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: colors.white }]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={accent} />
            </TouchableOpacity>
            <View style={styles.formCard}>
              <TouchableOpacity
                style={[styles.googleBtn, { borderColor: accent }]}
                onPress={() => promptAsync()}
                activeOpacity={0.85}
                disabled={!request}
              >
                <Image
                  source={require('../../../assets/images/google_g.png')}
                  style={styles.googleIcon}
                />
                <Text style={[styles.googleBtnText, { color: colors.text.primary }]}>
                  Continue with Google
                </Text>
              </TouchableOpacity>
              <View style={styles.orSeparatorWrap}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>or</Text>
                <View style={styles.orLine} />
              </View>
              <Text style={[styles.title, { color: accent }]}>Create Account</Text>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                placeholderTextColor={colors.text.light}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor={colors.text.light}
              />
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
                  ]}
                  placeholder="Phone Number"
                  value={phone}
                  onChangeText={setPhone}
                  autoCapitalize="none"
                  keyboardType="phone-pad"
                  placeholderTextColor={colors.text.light}
                />
              </View>
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
              <View
                style={{
                  width: '100%',
                  position: 'relative',
                  marginBottom: spacing.md,
                  justifyContent: 'center',
                }}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholderTextColor={colors.text.light}
                />
                <TouchableOpacity
                  style={styles.eyeIconTrueAlign}
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
              <View
                style={{
                  width: '100%',
                  position: 'relative',
                  marginBottom: spacing.md,
                  justifyContent: 'center',
                }}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholderTextColor={colors.text.light}
                />
                <TouchableOpacity
                  style={styles.eyeIconTrueAlign}
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
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.signupBtn, { backgroundColor: accent }]}
                onPress={async () => {
                  setError('');
                  setLoading(true);
                  if (!name || !email || !phone || !password || !confirmPassword) {
                    setError('All fields are required.');
                    setLoading(false);
                    return;
                  }
                  if (password !== confirmPassword) {
                    setError('Passwords do not match.');
                    setLoading(false);
                    return;
                  }
                  try {
                    // Firebase Auth signup
                    const { createUserWithEmailAndPassword } = await import(
                      'firebase/auth'
                    );
                    const { auth } = await import('../../firebaseConfig');
                    const userCredential = await createUserWithEmailAndPassword(
                      auth,
                      email,
                      password,
                    );
                    // Get Firebase JWT
                    const idToken = await userCredential.user.getIdToken();
                    // Store JWT for future requests
                    const AsyncStorage = (await import('@react-native-async-storage/async-storage'))
                      .default;
                    await AsyncStorage.setItem('jwt', idToken);
                    // Register user profile in backend and send verification code
                    const { apiRequest } = await import('../../utils/api');
                    // Map frontend role to backend role
                    const backendRoleMap = {
                      farmer: 'farmer',
                      driver: 'transporter',
                      individual: 'user',
                      business: 'user',
                      broker: 'broker',
                    };
                    await apiRequest('/auth/register', {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${idToken}` },
                      body: JSON.stringify({
                        name,
                        email,
                        phone: selectedCountry.code + phone,
                        role: backendRoleMap[role],
                      }),
                    });
                    // Backend sends code, not link
                    navigation.navigate('EmailVerification', { email, phone, role: role === 'driver' ? 'transporter' : role, password });
                  } catch (err) {
                    // Firebase Auth error handling
                    let msg = 'Signup failed.';
                    if (err.code === 'auth/email-already-in-use') {
                      msg =
                        'This email is already registered. Please sign in or use a different email.';
                    } else if (err.code === 'auth/invalid-email') {
                      msg = 'Please enter a valid email address.';
                    } else if (err.code === 'auth/weak-password') {
                      msg = 'Password should be at least 6 characters.';
                    } else if (err.code === 'auth/network-request-failed') {
                      msg = 'Network error. Please check your connection.';
                    } else if (err.message) {
                      msg = err.message;
                    }
                    setError(msg);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                {loading ? (
                  <Text style={styles.signupBtnText}>Signing Up...</Text>
                ) : (
                  <Text style={styles.signupBtnText}>Sign Up</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.roleNote}>
                You are signing up as{' '}
                <Text style={{ fontWeight: 'bold', color: accent }}>{label}</Text>
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                <Text style={[styles.signInText, { color: accent }]}>
                  Already have an account? Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  loadingBox: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  loadingLogo: {
    width: 60,
    height: 60,
    marginBottom: 18,
    resizeMode: 'contain',
  },
  loadingText: {
    fontSize: fonts.size.lg,
    color: colors.primary,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: colors.secondary,
    borderTopColor: colors.primary,
    borderRightColor: colors.primary,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    alignSelf: 'center',
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
    shadowOpacity: 0.13,
    shadowRadius: 8,
    elevation: 8,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    marginTop: 60,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: fonts.size.xl + 2,
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
    borderRadius: 24,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    width: '100%',
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1.5,
  },
  googleIcon: {
    width: 22,
    height: 22,
    marginRight: spacing.sm,
    resizeMode: 'contain',
  },
  googleBtnText: {
    fontSize: fonts.size.md + 1,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  orSeparatorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 16,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
    marginHorizontal: 8,
  },
  orText: {
    color: colors.text.secondary,
    fontWeight: 'bold',
    fontSize: 15,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.text.light,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: fonts.size.md,
    backgroundColor: colors.background,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  eyeIconTrueAlign: {
    position: 'absolute',
    right: 18,
    top: 0,
    bottom: 0,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.md,
  },
  countryCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: colors.text.light,
    paddingHorizontal: 12,
    height: 44,
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
    backgroundColor: 'transparent',
    zIndex: 99,
  },
  dropdownContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    width: 180,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.text.light,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 100,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '22',
    backgroundColor: colors.surface,
  },
  dropdownFlag: {
    fontSize: 18,
    marginRight: 8,
  },
  dropdownText: {
    fontSize: 15,
    color: colors.text.primary,
  },
  error: {
    color: colors.error,
    marginBottom: spacing.md,
    fontSize: fonts.size.md,
  },
  signupBtn: {
    borderRadius: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  signupBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: fonts.size.md,
  },
  roleNote: {
    marginTop: spacing.md,
    color: colors.text.secondary,
    fontSize: fonts.size.sm,
  },
  signInText: {
    fontSize: fonts.size.md,
    textAlign: 'center',
    marginTop: spacing.md,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default SignupScreen;
