import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/common/Button';
import Spacer from '../../components/common/Spacer';
import { colors, fonts, spacing } from '../../constants';

const LoginScreen = ({ navigation }: any) => {
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+254');
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const truckAnim = React.useRef(new Animated.Value(0)).current;

  const countryOptions = [
    { code: '+255', flag: '🇹🇿' },
    { code: '+250', flag: '🇷🇼' },
    { code: '+256', flag: '🇺🇬' },
    { code: '+254', flag: '🇰🇪' },
  ];

  React.useEffect(() => {
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
        ])
      ).start();
    } else {
      truckAnim.stopAnimation();
      truckAnim.setValue(0);
    }
  }, [loading]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[colors.primary, colors.primaryDark, colors.secondary, '#222']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.formCard}>
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={() => {}}
              activeOpacity={0.85}
            >
              <Image source={require('../../../assets/images/google_g.png')} style={styles.googleIcon} />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>

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
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  placeholderTextColor={colors.text.secondary}
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            )}
            
            <Spacer size={spacing.md} />
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
                setTimeout(() => {
                  setLoading(false);
                  navigation.navigate('MainTabs'); // Demo: navigate after loading
                }, 2000); // Demo spinner, replace with real logic
              }}
              disabled={loading}
            />
            <Spacer size={spacing.md} />
            <TouchableOpacity onPress={() => navigation.navigate('SignupSelection')}>
              <Text style={styles.signupText}>Don't have an account? Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

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
            <Text style={styles.loadingText}>Signing In...</Text>
            <View style={{ marginTop: 18 }}>
              <Animated.View style={{
                transform: [{ rotate: truckAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
              }}>
                <View style={styles.spinner} />
              </Animated.View>
            </View>
          </View>
        </View>
      )}
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
    marginBottom: 0,
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
  },
  signupText: {
    color: colors.primary,
    fontSize: fonts.size.md,
    textAlign: 'center',
    marginTop: spacing.md,
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
});

export default LoginScreen;