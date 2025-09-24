import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/common/Button';
import PasswordStrengthIndicator from '../../components/common/PasswordStrengthIndicator';
import NetworkStatusIndicator from '../../components/common/NetworkStatusIndicator';
import { colors, fonts, spacing } from '../../constants';
import { API_ENDPOINTS } from '../../constants/api';
import { handleNetworkError, retryWithBackoff, checkNetworkConnectivity, showNetworkErrorAlert } from '../../utils/networkUtils';
import { handleAuthBackNavigation } from '../../utils/navigationUtils';

interface PasswordResetScreenProps {
  navigation: any;
  route?: {
    params?: {
      email?: string;
      phone?: string;
    };
  };
}

const PasswordResetScreen: React.FC<PasswordResetScreenProps> = ({ navigation, route }) => {
  const [step, setStep] = useState<'method' | 'email' | 'phone' | 'code' | 'new-password'>('method');
  const [email, setEmail] = useState(route?.params?.email || '');
  const [phone, setPhone] = useState(route?.params?.phone || '');
  const [countryCode] = useState('+254');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'email' | 'phone' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userId, setUserId] = useState<string>('');

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\s/g, '');
    const withoutLeadingZero = cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone;
    return /^[0-9]{9,10}$/.test(withoutLeadingZero);
  };



  const handleMethodSelection = (method: 'email' | 'phone') => {
    setSelectedMethod(method);
    setError('');
    
    if (method === 'email') {
      setStep('email');
    } else {
      setStep('phone');
    }
  };

  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check network connectivity first
      const isConnected = await checkNetworkConnectivity();
      if (!isConnected) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      // Call backend API to send password reset code via email with retry logic
      const response = await retryWithBackoff(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
          const response = await fetch(`${API_ENDPOINTS.AUTH}/forgotPassword`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: email,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      }, 3, 1000);

      if (response.ok) {
        const data = await response.json();
        setUserId(data.userId);
        setStep('code');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send password reset code');
      }
    } catch (error: any) {
      console.error('Password reset email error:', error);
      const networkError = handleNetworkError(error);
      setError(networkError.message);
      
      // Show retry option for retryable errors
      if (networkError.retryable) {
        showNetworkErrorAlert(networkError, handleEmailSubmit);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async () => {
    if (!phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    if (!validatePhone(phone)) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check network connectivity first
      const isConnected = await checkNetworkConnectivity();
      if (!isConnected) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      // Format phone number for API
      const cleanPhone = phone.replace(/\s/g, '');
      let phoneWithoutZero = cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone;
      const formattedPhone = `${countryCode}${phoneWithoutZero}`;
      
      console.log('Phone formatting - Original:', phone);
      console.log('Phone formatting - Clean:', cleanPhone);
      console.log('Phone formatting - Without zero:', phoneWithoutZero);
      console.log('Phone formatting - Country code:', countryCode);
      console.log('Phone formatting - Final formatted:', formattedPhone);
      console.log('Expected Firebase format: +254113168134');
      console.log('Sending to backend:', formattedPhone);

      // Call backend API to send password reset code via SMS with retry logic
      const response = await retryWithBackoff(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
          const response = await fetch(`${API_ENDPOINTS.AUTH}/forgotPassword`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              phone: formattedPhone,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      }, 3, 1000);

      console.log('Password reset response status:', response.status);
      console.log('Password reset response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Password reset response data:', data);
        setUserId(data.userId);
        setStep('code');
      } else {
        const errorData = await response.json();
        console.log('Password reset error data:', errorData);
        throw new Error(errorData.message || 'Failed to send password reset code');
      }
    } catch (error: any) {
      console.error('Password reset SMS error:', error);
      const networkError = handleNetworkError(error);
      setError(networkError.message);
      
      // Show retry option for retryable errors
      if (networkError.retryable) {
        showNetworkErrorAlert(networkError, handlePhoneSubmit);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCodeVerification = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check network connectivity first
      const isConnected = await checkNetworkConnectivity();
      if (!isConnected) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      // Call backend API to verify the reset code with retry logic
      const response = await retryWithBackoff(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
          const response = await fetch(`${API_ENDPOINTS.AUTH}/verifyResetCode`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code: verificationCode,
              userId: userId,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      }, 3, 1000);

      if (response.ok) {
        setStep('new-password');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid verification code');
      }
    } catch (error: any) {
      console.error('Code verification error:', error);
      const networkError = handleNetworkError(error);
      setError(networkError.message);
      
      // Show retry option for retryable errors
      if (networkError.retryable) {
        showNetworkErrorAlert(networkError, handleCodeVerification);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!newPassword.trim()) {
      setError('Please enter a new password');
      return;
    }

    if (!confirmPassword.trim()) {
      setError('Please confirm your new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Use password strength instead of basic validation
    // Basic password validation
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check network connectivity first
      const isConnected = await checkNetworkConnectivity();
      if (!isConnected) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      // Call backend API to reset password with retry logic
      const response = await retryWithBackoff(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
          const response = await fetch(`${API_ENDPOINTS.AUTH}/resetPassword`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              newPassword,
              userId: userId,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      }, 3, 1000);

      if (response.ok) {
        Alert.alert(
          'Password Reset Successful',
          'Your password has been successfully reset. You can now sign in with your new password.',
          [
            {
              text: 'OK',
              onPress: () => navigation.reset({
                index: 0,
                routes: [{ name: 'SignIn' }]
              }),
            },
          ]
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reset password');
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      const networkError = handleNetworkError(error);
      setError(networkError.message);
      
      // Show retry option for retryable errors
      if (networkError.retryable) {
        showNetworkErrorAlert(networkError, handlePasswordReset);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderMethodSelection = () => (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => handleAuthBackNavigation(navigation)}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reset Password</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="lock-reset" size={64} color={colors.primary} />
        </View>

        <Text style={styles.title}>Choose Reset Method</Text>
        <Text style={styles.subtitle}>
          Select how you&apos;d like to receive your password reset code
        </Text>

        <View style={styles.methodContainer}>
          <TouchableOpacity
            style={styles.methodButton}
            onPress={() => handleMethodSelection('email')}
          >
            <MaterialCommunityIcons name="email" size={24} color={colors.primary} />
            <View style={styles.methodTextContainer}>
              <Text style={styles.methodTitle}>Email</Text>
              <Text style={styles.methodSubtitle}>Send code to your email</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.light} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.methodButton}
            onPress={() => handleMethodSelection('phone')}
          >
            <MaterialCommunityIcons name="phone" size={24} color={colors.primary} />
            <View style={styles.methodTextContainer}>
              <Text style={styles.methodTitle}>Phone</Text>
              <Text style={styles.methodSubtitle}>Send code via SMS</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.light} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  const renderEmailForm = () => (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep('method')}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enter Email</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="email" size={64} color={colors.primary} />
        </View>

        <Text style={styles.title}>Enter Your Email</Text>
        <Text style={styles.subtitle}>
          We&apos;ll send a verification code to your email address
        </Text>

        <NetworkStatusIndicator 
          onRetry={handleEmailSubmit}
          showWhenConnected={false}
        />

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email address"
            placeholderTextColor={colors.text.light}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          title="Send Code"
          onPress={handleEmailSubmit}
          loading={loading}
          style={styles.button}
        />
      </View>
    </Animated.View>
  );

  const renderPhoneForm = () => (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep('method')}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enter Phone</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="phone" size={64} color={colors.primary} />
        </View>

        <Text style={styles.title}>Enter Your Phone</Text>
        <Text style={styles.subtitle}>
          We&apos;ll send a verification code via SMS
        </Text>

        <NetworkStatusIndicator 
          onRetry={handlePhoneSubmit}
          showWhenConnected={false}
        />

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <View style={styles.phoneInputContainer}>
            <Text style={styles.countryCode}>+254</Text>
            <TextInput
              style={styles.phoneInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="712345678"
              placeholderTextColor={colors.text.light}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          title="Send Code"
          onPress={handlePhoneSubmit}
          loading={loading}
          style={styles.button}
        />
      </View>
    </Animated.View>
  );

  const renderCodeForm = () => (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep(selectedMethod === 'email' ? 'email' : 'phone')}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Code</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="shield-check" size={64} color={colors.primary} />
        </View>

        <Text style={styles.title}>Enter Verification Code</Text>
        <Text style={styles.subtitle}>
          We&apos;ve sent a 6-digit code to your {selectedMethod === 'email' ? 'email' : 'phone'}
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Verification Code</Text>
          <TextInput
            style={styles.codeInput}
            value={verificationCode}
            onChangeText={setVerificationCode}
            placeholder="Enter 6-digit code"
            placeholderTextColor={colors.text.light}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          title="Verify Code"
          onPress={handleCodeVerification}
          loading={loading}
          style={styles.button}
        />

        <TouchableOpacity style={styles.resendButton}>
          <Text style={styles.resendText}>Didn&apos;t receive the code? Resend</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderNewPasswordForm = () => (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep('code')}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Password</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="lock-plus" size={64} color={colors.primary} />
        </View>

        <Text style={styles.title}>Create New Password</Text>
        <Text style={styles.subtitle}>
          Choose a strong password for your account
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>New Password</Text>
          <View style={styles.passwordInputWrapper}>
            <TextInput
              style={styles.passwordInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              placeholderTextColor={colors.text.light}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Confirm Password</Text>
          <View style={styles.passwordInputWrapper}>
            <TextInput
              style={styles.passwordInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={colors.text.light}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off' : 'eye'}
                size={20}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Password Strength Indicator */}
        <PasswordStrengthIndicator
          password={newPassword}
          confirmPassword={confirmPassword}
          showLabel={true}
          containerStyle={styles.passwordStrengthContainer}
        />

        {/* Password Tips */}
        <View style={styles.passwordTips}>
          <MaterialCommunityIcons name="lightbulb-outline" size={16} color={colors.primary} />
          <Text style={styles.passwordTipsText}>
            Use a combination of letters, numbers, and symbols for better security
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          title="Reset Password"
          onPress={handlePasswordReset}
          loading={loading}
          disabled={loading}
          style={styles.button}
        />
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      {step === 'method' && renderMethodSelection()}
      {step === 'email' && renderEmailForm()}
      {step === 'phone' && renderPhoneForm()}
      {step === 'code' && renderCodeForm()}
      {step === 'new-password' && renderNewPasswordForm()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    paddingTop: spacing.xl,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  methodContainer: {
    marginTop: spacing.lg,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  methodTextContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  methodTitle: {
    fontSize: 18,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginBottom: 4,
  },
  methodSubtitle: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
  },
  countryCode: {
    fontSize: 16,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    marginRight: spacing.sm,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
  },
  codeInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 18,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: 4,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
  },
  eyeButton: {
    padding: spacing.sm,
  },
  button: {
    marginTop: spacing.lg,
  },
  passwordStrengthContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  passwordTips: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    padding: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  passwordTipsText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.primary,
    marginLeft: spacing.xs,
    flex: 1,
  },
  resendButton: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  resendText: {
    fontSize: 16,
    fontFamily: fonts.family.regular,
    color: colors.primary,
  },
  errorText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});

export default PasswordResetScreen;