import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, PermissionsAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, fonts } from '../../constants';
// For Android SMS Retriever
declare const require: any;
let SmsRetriever: any;
if (Platform.OS === 'android') {
  try {
    SmsRetriever = require('react-native-sms-retriever');
  } catch {}
}

const PhoneOTPScreen = ({ navigation, route }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { phone, email, role, idToken, password } = route.params || {};

  // Attempt SMS autofill/auto-read (Android only, pseudo-code)
  useEffect(() => {
    // Request SMS read permission and start SMS Retriever for auto-fill (Android only)
    async function setupSmsRetriever() {
      if (Platform.OS === 'android' && SmsRetriever) {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
            {
              title: 'SMS Permission',
              message: 'Allow TRUKAPP to read your SMS for OTP auto-fill.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            await SmsRetriever.startSmsRetriever();
            SmsRetriever.addSmsListener((event: any) => {
              const codeMatch = event.message.match(/\d{4,6}/);
              if (codeMatch) setOtp(codeMatch[0]);
              SmsRetriever.removeSmsListener();
            });
          }
        } catch (e) {}
      }
    }
    setupSmsRetriever();
  }, []);

  const handleVerify = async () => {
    setError('');
    setLoading(true);
    try {
      const { apiRequest } = await import('../../utils/api');
      await apiRequest('/auth/verify-code', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otp }),
      });
      // After phone verification, do not navigate to EmailVerificationScreen. Let App.tsx handle navigation.
      const { auth } = await import('../../firebaseConfig');
      const { signOut, signInWithEmailAndPassword } = await import('firebase/auth');
      await signOut(auth);
      await signInWithEmailAndPassword(auth, email, password);
      // Navigation will be handled by App.tsx auth state
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
      const { apiRequest } = await import('../../utils/api');
      await apiRequest('/auth/resend-code', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
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
          autoComplete="sms-otp"
          textContentType="oneTimeCode"
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
