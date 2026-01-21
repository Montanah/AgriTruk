import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { apiRequest } from '../utils/api';

const RestoreAccountScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [loading, setLoading] = useState(false);
  const [restored, setRestored] = useState(false);
  const [error, setError] = useState('');

  // Extract token from query params
  const token = route.params?.token || '';

  useEffect(() => {
    if (!token) {
      setError('Invalid restore link. Please check your email for the correct link.');
    }
  }, [token]);

  const handleRestore = async () => {
    if (!token) {
      Alert.alert('Error', 'Invalid restore token. Please check your email for the correct link.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiRequest('/auth/users/restore_account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
        }),
      });

      setRestored(true);
      
      // Show success message and navigate to login after a delay
      setTimeout(() => {
        Alert.alert(
          'Account Restored',
          'Your account has been successfully restored. Please sign in to continue.',
          [
            {
              text: 'Sign In',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'SignIn' }],
                });
              },
            },
          ]
        );
      }, 1000);
    } catch (err: any) {
      console.error('Restore account error:', err);
      setError(
        err.message ||
        'Failed to restore account. The link may have expired or is invalid. Please contact support.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (restored) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark, colors.secondary, colors.background]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
        />
        <View style={styles.content}>
          <View style={styles.successIconContainer}>
            <MaterialCommunityIcons
              name="check-circle"
              size={100}
              color={colors.success}
            />
          </View>
          <Text style={styles.successTitle}>Account Restored!</Text>
          <Text style={styles.successMessage}>
            Your account has been successfully restored. You can now sign in.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark, colors.secondary, colors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="account-restore"
            size={80}
            color={colors.primary}
          />
        </View>

        <Text style={styles.title}>Restore Account</Text>

        <Text style={styles.description}>
          Click the button below to restore your account. You will be able to sign in immediately after restoration.
        </Text>

        {error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={24}
              color={colors.error}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.restoreButton,
            (loading || !token) && styles.restoreButtonDisabled
          ]}
          onPress={handleRestore}
          disabled={loading || !token}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <MaterialCommunityIcons
                name="restore"
                size={20}
                color={colors.white}
                style={styles.restoreIcon}
              />
              <Text style={styles.restoreButtonText}>Restore Account</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Welcome' as never)}
        >
          <Text style={styles.backButtonText}>Back to Welcome</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successIconContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fonts.size.xxl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
    fontFamily: fonts.family.bold,
  },
  successTitle: {
    fontSize: fonts.size.xxl,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: spacing.md,
    textAlign: 'center',
    fontFamily: fonts.family.bold,
  },
  description: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
  },
  successMessage: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
  },
  errorContainer: {
    flexDirection: 'row',
    backgroundColor: colors.error + '15',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
    maxWidth: 400,
    alignItems: 'flex-start',
  },
  errorText: {
    flex: 1,
    fontSize: fonts.size.sm,
    color: colors.error,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },
  restoreButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: spacing.md,
  },
  restoreButtonDisabled: {
    opacity: 0.6,
  },
  restoreIcon: {
    marginRight: spacing.sm,
  },
  restoreButtonText: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.white,
    fontFamily: fonts.family.bold,
  },
  backButton: {
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  backButtonText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    textDecorationLine: 'underline',
  },
});

export default RestoreAccountScreen;

