import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, spacing } from '../../constants';
import colors from '../../constants/colors';

const EmailVerificationScreen = ({ navigation, route }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const { email, phone, role, password } = route.params || {};
  const codeRefs = React.useRef([]);

  const handleVerify = async () => {
    setError('');
    setLoading(true);
    try {
      const { auth } = await import('../../firebaseConfig');
      const idToken = await auth.currentUser?.getIdToken(true);
      const { apiRequest } = await import('../../utils/api');
      await apiRequest('/auth/verify-code', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ code }),
      });
      await auth.currentUser.reload();
      // Write to correct Firestore collection after verification
      const { getFirestore, doc, setDoc } = await import('firebase/firestore');
      const db = getFirestore();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      if (role === 'transporter' || role === 'driver') {
        // Create minimal transporter doc (profile completion will update it)
        await setDoc(doc(db, 'transporters', user.uid), {
          transporterId: user.uid,
          email: user.email,
          phone: phone || '',
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } else {
        // Normal user
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          phone: phone || '',
          role: role || 'user',
          isVerified: true,
          profileCompleted: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
      setVerified(true);
      // After email verification, do not navigate to PhoneOTPScreen. Let App.tsx handle navigation.
      // Optionally, you can show a success message or spinner here.
      // The user will be routed by App.tsx after re-login.
    } catch (err) {
      setError(err?.message || JSON.stringify(err) || 'Verification failed.');
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
    });
  } catch (err) {
    setError('Failed to resend verification code.');
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
        <Text style={styles.title}>Email Verification</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to your email address to verify your account.
        </Text>
        <View style={styles.codeInputRow}>
          {Array.from({ length: 6 }).map((_, i) => (
            <TextInput
              key={i}
              ref={(el) => (codeRefs.current[i] = el)}
              style={styles.codeInput}
              maxLength={1}
              keyboardType="number-pad"
              value={code[i] || ''}
              onChangeText={(val) => {
                const newCode = code.split('');
                newCode[i] = val.replace(/[^0-9]/g, '');
                setCode(newCode.join(''));
                // Auto-focus next input
                if (val && i < 5 && val) {
                  codeRefs.current[i + 1]?.focus();
                }
              }}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === 'Backspace' && !code[i] && i > 0) {
                  codeRefs.current[i - 1]?.focus();
                }
              }}
              autoFocus={i === 0}
              returnKeyType="next"
            />
          ))}
        </View>
        {loading && !verified && (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Verifying...</Text>
          </View>
        )}
        {verified && (
          <View style={styles.verifiedWrap}>
            <Ionicons name="checkmark-circle" size={54} color={colors.success} style={{ marginBottom: 8 }} />
            <Text style={styles.verifiedText}>Verified!</Text>
          </View>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity
          style={styles.verifyBtn}
          onPress={handleVerify}
          disabled={loading || code.length !== 6 || verified}
        >
          <Text style={styles.verifyBtnText}>{loading ? 'Verifying...' : 'Verify'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resendBtn} onPress={handleResend} disabled={loading}>
          <Text style={styles.resendBtnText}>Resend Code</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  codeInputRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  codeInput: {
    width: 44,
    height: 54,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    fontSize: 28,
    color: colors.primary,
    textAlign: 'center',
    marginHorizontal: 6,
    fontWeight: 'bold',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
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
  loaderWrap: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  loadingText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: fonts.size.md,
    marginTop: 8,
  },
  verifiedWrap: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  verifiedText: {
    color: colors.success,
    fontWeight: 'bold',
    fontSize: fonts.size.lg,
    marginTop: 2,
    marginBottom: 2,
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

export default EmailVerificationScreen;
