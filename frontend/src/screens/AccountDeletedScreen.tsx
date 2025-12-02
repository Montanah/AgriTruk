import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';

const AccountDeletedScreen = () => {
  const [daysRemaining, setDaysRemaining] = useState(30);

  useEffect(() => {
    // Calculate days remaining (this would ideally come from backend)
    // For now, we'll use a placeholder
    const calculateDaysRemaining = () => {
      // This should be fetched from backend based on deletion date
      // For now, showing 30 days
      setDaysRemaining(30);
    };

    calculateDaysRemaining();
  }, []);

  const handleContactSupport = () => {
    // Open email or support link
    const supportEmail = 'support@trukapp.com';
    Linking.openURL(`mailto:${supportEmail}?subject=Account Restoration Request`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark, colors.secondary, colors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="account-remove"
              size={80}
              color={colors.error}
            />
          </View>

          <Text style={styles.title}>Account Disabled</Text>

          <View style={styles.messageContainer}>
            <Text style={styles.message}>
              Your account has been disabled and is pending deletion.
            </Text>
          </View>

          {daysRemaining > 0 && (
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownLabel}>Days remaining to restore:</Text>
              <Text style={styles.countdownValue}>{daysRemaining}</Text>
            </View>
          )}

          <View style={styles.infoContainer}>
            <MaterialCommunityIcons
              name="email-outline"
              size={24}
              color={colors.primary}
              style={styles.infoIcon}
            />
            <Text style={styles.infoText}>
              Please check your email for a recovery link. You can use this link to restore your account within 30 days.
            </Text>
          </View>

          <View style={styles.warningContainer}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={24}
              color={colors.warning}
              style={styles.warningIcon}
            />
            <Text style={styles.warningText}>
              After 30 days, your account will be permanently deleted and cannot be recovered.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.supportButton}
            onPress={handleContactSupport}
          >
            <MaterialCommunityIcons
              name="headset"
              size={20}
              color={colors.white}
              style={styles.supportIcon}
            />
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  content: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: spacing.xl,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fonts.size.xxl,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
    fontFamily: fonts.family.bold,
  },
  messageContainer: {
    marginBottom: spacing.lg,
  },
  message: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 24,
  },
  countdownContainer: {
    backgroundColor: colors.primary + '15',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  countdownLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  countdownValue: {
    fontSize: fonts.size.xxl * 1.5,
    fontWeight: 'bold',
    color: colors.primary,
    fontFamily: fonts.family.bold,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    width: '100%',
  },
  infoIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  warningContainer: {
    flexDirection: 'row',
    backgroundColor: colors.warning + '15',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  warningIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    lineHeight: 20,
    fontWeight: '500',
  },
  supportButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  supportIcon: {
    marginRight: spacing.sm,
  },
  supportButtonText: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.white,
    fontFamily: fonts.family.bold,
  },
});

export default AccountDeletedScreen;

