import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, fonts } from '../../constants';
// For Android SMS Retriever
// import SmsRetriever from 'react-native-sms-retriever';

const PhoneOTPScreen = ({ navigation, route }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { phone, email, role } = route.params || {};

  // Attempt SMS autofill/auto-read (Android only, pseudo-code)
  useEffect(() => {
    // Uncomment and install react-native-sms-retriever for real implementation
    // if (Platform.OS === 'android') {
    //   SmsRetriever.startSmsRetriever()
    //     .then(() => {
    //       SmsRetriever.addSmsListener(event => {
    //         const codeMatch = event.message.match(/\d{4,6}/);
    //         if (codeMatch) setOtp(codeMatch[0]);
    //         SmsRetriever.removeSmsListener();
    //       });
    //     })
    //     .catch(() => {});
    // }
  }, []);

  const handleVerify = async () => {
    setError('');
    setLoading(true);
    try {
      const { auth } = await import('../../firebaseConfig');
      const { PhoneAuthProvider, signInWithCredential } = await import('firebase/auth');
      // Assume verificationId is passed from previous step (should be set when sending OTP)
      const verificationId = route.params?.verificationId;
      if (!verificationId) throw new Error('Missing verificationId.');
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      await signInWithCredential(auth, credential);
      // Get Firebase JWT
      const idToken = await auth.currentUser?.getIdToken();
      // Update backend profile (optional)
      const { apiRequest } = await import('../../utils/api');
      await apiRequest('/auth/update', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ phone }),
      });
      if (role === 'driver') {
        navigation.navigate('DriverProfileCompletionScreen', { phone, email });
      } else {
        navigation.navigate('MainTabs');
      }
    } catch (err) {
      setError('OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setLoading(true);
    try {
      // You would trigger Firebase to resend the OTP here
      // This is a placeholder; actual implementation requires sending a new OTP
      setError('Resend OTP is not implemented in this demo.');
    } catch (err) {
      setError('Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Verify Your Phone</Text>
        <Text style={styles.subtitle}>
          Enter the OTP sent to your phone number.
          {'\n'}
          {Platform.OS === 'android'
            ? 'If you allow SMS permissions, the code will be auto-filled.'
            : 'If your device supports SMS autofill, the code will be suggested.'}
        </Text>
        <TextInput
          style={styles.input}
          placeholder="OTP Code"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          autoCapitalize="none"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity
          style={styles.verifyBtn}
          onPress={handleVerify}
          disabled={loading || !otp}
        >
          <Text style={styles.verifyBtnText}>{loading ? 'Verifying...' : 'Verify'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resendBtn} onPress={handleResend} disabled={loading}>
          <Text style={styles.resendBtnText}>Resend OTP</Text>
        </TouchableOpacity>
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 36 : 48,
    left: 0,
    zIndex: 10,
    padding: 8,
  },
  title: {
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.md,
    fontFamily: fonts.family.bold,
    letterSpacing: 0.5,
    marginTop: spacing.xl,
  },
  subtitle: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1.2,
    borderColor: colors.text.light,
    borderRadius: 10,
    padding: 14,
    fontSize: fonts.size.md,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
    width: '100%',
    maxWidth: 340,
    textAlign: 'center',
  },
  error: {
    color: colors.error,
    marginBottom: spacing.md,
    fontSize: fonts.size.md,
  },
  verifyBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  verifyBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: fonts.size.md,
  },
  resendBtn: {
    marginTop: spacing.md,
  },
  resendBtnText: {
    color: colors.secondary,
    fontWeight: '600',
    fontSize: fonts.size.md,
  },
});

export default PhoneOTPScreen;
