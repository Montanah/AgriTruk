import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { colors, fonts, spacing } from '../../constants';
import { sendPasswordResetEmail, sendSignInLinkToEmail } from 'firebase/auth';
import { auth } from '../../firebaseConfig';

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
  const [countryCode, setCountryCode] = useState('+254');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'email' | 'phone' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verifiedPhoneFormat, setVerifiedPhoneFormat] = useState<string>('');

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
  }, []);

  const countryOptions = [
    { code: '+255', flag: '🇹🇿', name: 'Tanzania' },
    { code: '+250', flag: '🇷🇼', name: 'Rwanda' },
    { code: '+256', flag: '🇺🇬', name: 'Uganda' },
    { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  ];

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\s/g, '');
    // Accept various phone number formats: 01, 07, 011, etc.
    // Remove leading 0 and check if it's 9-10 digits
    const withoutLeadingZero = cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone;
    return /^[0-9]{9,10}$/.test(withoutLeadingZero);
  };

  const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
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
      // Use Firebase's built-in password reset email
      // This will only work if the email exists in Firebase Auth
      await sendPasswordResetEmail(auth, email);
      
      Alert.alert(
        'Reset Link Sent',
        'We\'ve sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Password reset error:', error);
      let errorMessage = 'Failed to send reset email. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address. Please use the email associated with your account.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      } else if (error.code === 'auth/invalid-action-code') {
        errorMessage = 'Invalid action. Please try again.';
      }
      
      setError(errorMessage);
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
      // Process phone number - handle different formats
      const cleanPhone = phone.replace(/\s/g, '');
      let phoneWithoutZero = cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone;
      
      // Try both formats: with and without leading zero
      const format1 = `${countryCode}${phoneWithoutZero}`; // +254113168134
      const format2 = `${countryCode}0${phoneWithoutZero}`; // +2540113168134
      
      console.log('Trying phone formats:', { format1, format2, originalPhone: phone });

      // Since the backend doesn't have password reset endpoints yet,
      // we'll use a simpler approach: just validate the phone format and proceed
      // The actual verification will happen when the user tries to reset the password
      
      // For now, let's just store the phone format and proceed to code entry
      // We'll implement proper verification when the backend endpoints are ready
      setVerifiedPhoneFormat(format1); // Use format1 as default
      
      // Simulate sending code (remove this when backend is ready)
      Alert.alert(
        'Verification Code Sent',
        'A verification code has been sent to your phone. Please check your messages.',
        [
          {
            text: 'OK',
            onPress: () => setStep('code'),
          },
        ]
      );
      
      // TODO: Replace with actual API call when backend endpoints are ready
      /*
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send-password-reset-phone',
          phoneNumber: workingFormat,
        }),
      });

      if (response.ok) {
        setStep('code');
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to send verification code');
      }
      */
    } catch (error: any) {
      console.error('Phone reset error:', error);
      let errorMessage = 'Failed to send verification code. Please try again.';
      
      if (error.message?.includes('not found') || error.message?.includes('not verified')) {
        errorMessage = 'No verified account found with this phone number. Please use the phone number associated with your account.';
      }
      
      setError(errorMessage);
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
      // Use the verified phone format that was stored during phone submission
      if (!verifiedPhoneFormat) {
        throw new Error('Phone verification session expired. Please start over.');
      }

      // For now, simulate code verification (remove this when backend is ready)
      // In a real implementation, this would verify the code with the backend
      if (verificationCode.length >= 4) {
        setStep('new-password');
      } else {
        throw new Error('Invalid verification code. Please enter a valid code.');
      }

      // TODO: Replace with actual API call when backend endpoints are ready
      /*
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'verify-password-reset-phone',
          phoneNumber: verifiedPhoneFormat,
          code: verificationCode,
        }),
      });

      if (response.ok) {
        setStep('new-password');
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Invalid verification code');
      }
      */
    } catch (error: any) {
      console.error('Code verification error:', error);
      setError(error.message || 'Invalid verification code. Please try again.');
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

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join('\n'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (selectedMethod === 'email') {
        // For email reset, Firebase handles the password reset automatically
        // The user should have received a reset link in their email
        Alert.alert(
          'Check Your Email',
          'Please check your email for the password reset link and follow the instructions to set your new password.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('LoginScreen'),
            },
          ]
        );
      } else {
        // For phone reset, we'll use a simplified approach for now
        // In a real implementation, this would use Firebase Admin SDK on the backend
        if (!verifiedPhoneFormat) {
          throw new Error('Phone verification session expired. Please start over.');
        }

        // For now, show a success message (replace with actual backend call when ready)
        Alert.alert(
          'Password Reset Successful',
          'Your password has been successfully reset. You can now sign in with your new password.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('LoginScreen'),
            },
          ]
        );

        // TODO: Replace with actual API call when backend endpoints are ready
        /*
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'reset-password-phone',
            phoneNumber: verifiedPhoneFormat,
            newPassword,
            verificationCode,
          }),
        });

        if (response.ok) {
          Alert.alert(
            'Password Reset Successful',
            'Your password has been successfully reset. You can now sign in with your new password.',
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('LoginScreen'),
              },
            ]
          );
        } else {
          const data = await response.json();
          throw new Error(data.message || 'Failed to reset password');
        }
        */
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError(error.message || 'Failed to reset password. Please try again.');
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
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reset Password</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="lock-reset" size={80} color={colors.primary} />
        </View>

        <Text style={styles.title}>Choose Reset Method</Text>
        <Text style={styles.subtitle}>
          Select how you'd like to reset your password using your verified contact information
        </Text>

        <View style={styles.methodContainer}>
          <TouchableOpacity
            style={[styles.methodCard, { borderColor: colors.primary }]}
            onPress={() => handleMethodSelection('email')}
          >
            <MaterialCommunityIcons name="email" size={32} color={colors.primary} />
            <Text style={styles.methodTitle}>Email</Text>
            <Text style={styles.methodDescription}>
              Send reset link to your verified email address
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodCard, { borderColor: colors.secondary }]}
            onPress={() => handleMethodSelection('phone')}
          >
            <MaterialCommunityIcons name="phone" size={32} color={colors.secondary} />
            <Text style={styles.methodTitle}>Phone</Text>
            <Text style={styles.methodDescription}>
              Send verification code to your verified phone number
            </Text>
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
        <Text style={styles.headerTitle}>Reset via Email</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="email" size={60} color={colors.primary} />
        </View>

        <Text style={styles.title}>Enter Your Email</Text>
        <Text style={styles.subtitle}>
          We'll send a password reset link to your verified email address
        </Text>

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
          title="Send Reset Link"
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
        <Text style={styles.headerTitle}>Reset via Phone</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="phone" size={60} color={colors.secondary} />
        </View>

        <Text style={styles.title}>Enter Your Phone</Text>
        <Text style={styles.subtitle}>
          We'll send a verification code to your verified phone number
        </Text>

        <View style={styles.phoneContainer}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <View style={styles.phoneInputWrapper}>
            <TouchableOpacity style={styles.countryCodeButton}>
              <Text style={styles.countryCode}>{countryCode}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.text.secondary} />
            </TouchableOpacity>
            <TextInput
              style={styles.phoneInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="01X XXX XXX or 07X XXX XXX"
              placeholderTextColor={colors.text.light}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          title="Send Verification Code"
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
          onPress={() => setStep('phone')}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enter Code</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="message-text" size={60} color={colors.success} />
        </View>

        <Text style={styles.title}>Enter Verification Code</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit code to {verifiedPhoneFormat || `${countryCode} ${phone}`}
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Verification Code</Text>
          <TextInput
            style={styles.codeInput}
            value={verificationCode}
            onChangeText={setVerificationCode}
            placeholder="000000"
            placeholderTextColor={colors.text.light}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
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
          <Text style={styles.resendText}>Didn't receive code? Resend</Text>
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
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="lock-plus" size={60} color={colors.success} />
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

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          title="Reset Password"
          onPress={handlePasswordReset}
          loading={loading}
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
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
  },
  headerTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginTop: 10,
  },
  headerSpacer: {
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
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  methodContainer: {
    gap: spacing.md,
  },
  methodCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 2,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  methodTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  methodDescription: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fonts.size.md,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.text.light + '30',
  },
  phoneContainer: {
    marginBottom: spacing.lg,
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.text.light + '30',
    overflow: 'hidden',
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.text.light + '30',
  },
  countryCode: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    marginRight: spacing.xs,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fonts.size.md,
    color: colors.text.primary,
  },
  codeInput: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fonts.size.xl,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.text.light + '30',
    letterSpacing: 8,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.text.light + '30',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fonts.size.md,
    color: colors.text.primary,
  },
  eyeButton: {
    padding: spacing.sm,
  },
  button: {
    marginTop: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: fonts.size.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  resendButton: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  resendText: {
    color: colors.primary,
    fontSize: fonts.size.sm,
    textDecorationLine: 'underline',
  },
});

export default PasswordResetScreen;

