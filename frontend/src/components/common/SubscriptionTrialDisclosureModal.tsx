import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';

interface SubscriptionTrialDisclosureModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  trialDays?: number;
  planName?: string;
}

/**
 * Subscription Trial Disclosure Modal
 * 
 * This component meets Google Play Store's Prominent Disclosure requirement for free trials:
 * - Clear, conspicuous display before any charge
 * - Exact trial terms (duration, renewal, cancellation)
 * - Clear action buttons (Accept/Decline)
 * - Explicit user consent before proceeding
 * 
 * Reference: Google Play Store Policy - "Prominent Disclosure"
 * https://support.google.com/googleplay/android-developer/answer/11034042
 * 
 * Applicable roles: Brokers, Transporters (Individual), Transporters (Company)
 */
const SubscriptionTrialDisclosureModal: React.FC<SubscriptionTrialDisclosureModalProps> = ({
  visible,
  onAccept,
  onDecline,
  trialDays = 90,
  planName = 'Premium',
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onDecline}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onDecline}
          >
            <MaterialCommunityIcons name="close" size={28} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trial Terms & Conditions</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Warning Banner - Prominent Display */}
          <View style={styles.prominentDisclosureBox}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={32}
              color={colors.error}
              style={styles.alertIcon}
            />
            <Text style={styles.prominentDisclosureTitle}>
              IMPORTANT SUBSCRIPTION TERMS
            </Text>
            <Text style={styles.prominentDisclosureText}>
              Please read these terms carefully before proceeding. Your subscription will auto-renew.
            </Text>
          </View>

          {/* Trial Terms Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="calendar-check"
                size={24}
                color={colors.primary}
                style={styles.sectionIcon}
              />
              <Text style={styles.sectionTitle}>Your Free Trial</Text>
            </View>

            <View style={styles.termsCard}>
              <View style={styles.termRow}>
                <Text style={styles.termLabel}>Plan Name:</Text>
                <Text style={styles.termValue}>{planName}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.termRow}>
                <Text style={styles.termLabel}>Trial Duration:</Text>
                <Text style={styles.termValue}>{trialDays} days</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.termRow}>
                <Text style={styles.termLabel}>Trial Cost:</Text>
                <Text style={[styles.termValue, { color: colors.success }]}>FREE</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.termRow}>
                <Text style={styles.termLabel}>Payment Verification:</Text>
                <Text style={styles.termValue}>$1 test charge (immediately refunded)</Text>
              </View>
            </View>
          </View>

          {/* Auto-Renewal Terms Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="refresh-circle"
                size={24}
                color={colors.warning}
                style={styles.sectionIcon}
              />
              <Text style={styles.sectionTitle}>Auto-Renewal Terms</Text>
            </View>

            <View style={styles.warningCard}>
              <Text style={styles.warningText}>
                ⚠️ <Text style={styles.warningBold}>Your subscription will automatically renew</Text> at the end of the {trialDays}-day trial period.
              </Text>
            </View>

            <View style={styles.termsCard}>
              <Text style={styles.termDescription}>
                At the end of your free trial:
              </Text>

              <View style={styles.bulletList}>
                <View style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>Your subscription will automatically renew for the next billing cycle</Text>
                </View>

                <View style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>You will be charged the regular subscription price</Text>
                </View>

                <View style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>The charge will appear on your payment method</Text>
                </View>

                <View style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>Your subscription will continue unless you cancel before the renewal date</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Cancellation Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="cancel"
                size={24}
                color={colors.error}
                style={styles.sectionIcon}
              />
              <Text style={styles.sectionTitle}>How to Cancel</Text>
            </View>

            <View style={styles.termsCard}>
              <Text style={styles.termDescription}>
                You can cancel your subscription at any time:
              </Text>

              <View style={styles.bulletList}>
                <View style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>
                    Go to <Text style={styles.bold}>Account Settings → Subscription Management</Text>
                  </Text>
                </View>

                <View style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>
                    Tap <Text style={styles.bold}>Cancel Subscription</Text>
                  </Text>
                </View>

                <View style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>
                    You will retain access until the end of your current billing cycle
                  </Text>
                </View>

                <View style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>
                    No refunds for partial months are provided
                  </Text>
                </View>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoBoxText}>
                  <Text style={styles.bold}>Pro Tip:</Text> Set a calendar reminder before your trial ends to decide if you want to continue or cancel.
                </Text>
              </View>
            </View>
          </View>

          {/* Pricing Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="credit-card"
                size={24}
                color={colors.primary}
                style={styles.sectionIcon}
              />
              <Text style={styles.sectionTitle}>Pricing After Trial</Text>
            </View>

            <View style={styles.termsCard}>
              <Text style={styles.termDescription}>
                For current pricing and plan details, please visit your Subscription Management section or contact our support team.
              </Text>

              <View style={styles.infoBox}>
                <MaterialCommunityIcons
                  name="information"
                  size={20}
                  color={colors.primary}
                  style={styles.infoIcon}
                />
                <Text style={styles.infoBoxText}>
                  Prices are displayed in Kenyan Shillings (KES). You will see exact pricing during checkout.
                </Text>
              </View>
            </View>
          </View>

          {/* Consent Statement */}
          <View style={styles.section}>
            <View style={styles.consentBox}>
              <MaterialCommunityIcons
                name="check-circle"
                size={28}
                color={colors.success}
                style={styles.consentIcon}
              />
              <Text style={styles.consentTitle}>Your Consent</Text>
              <Text style={styles.consentText}>
                By tapping &quot;Accept &amp; Activate Trial&quot; below, you acknowledge that you have read and understood these terms, including the auto-renewal terms. You consent to the automatic renewal of your subscription at the end of the trial period at the then-current pricing.
              </Text>
            </View>
          </View>

          {/* Additional Information */}
          <View style={styles.section}>
            <View style={styles.termsCard}>
              <Text style={styles.sectionTitle}>Need Help?</Text>
              <Text style={styles.termDescription}>
                If you have questions about your subscription or these terms, please contact us:
              </Text>

              <View style={styles.bulletList}>
                <View style={styles.bulletItem}>
                  <Text style={styles.bullet}>📧</Text>
                  <Text style={styles.bulletText}>hello@trukafrica.com</Text>
                </View>

                <View style={styles.bulletItem}>
                  <Text style={styles.bullet}>📞</Text>
                  <Text style={styles.bulletText}>+254 758 594 951</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Spacer for buttons */}
          <View style={styles.spacer} />
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={onDecline}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="close-circle-outline"
              size={20}
              color={colors.white}
              style={styles.buttonIcon}
            />
            <Text style={styles.declineButtonText}>Decline & Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={onAccept}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color={colors.white}
              style={styles.buttonIcon}
            />
            <Text style={styles.acceptButtonText}>Accept & Activate Trial</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '20',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fonts.size.lg,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  prominentDisclosureBox: {
    backgroundColor: colors.error + '10',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  alertIcon: {
    marginBottom: spacing.sm,
  },
  prominentDisclosureTitle: {
    fontSize: fonts.size.lg,
    fontWeight: '700',
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  prominentDisclosureText: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionIcon: {
    marginRight: spacing.md,
  },
  sectionTitle: {
    fontSize: fonts.size.lg,
    fontWeight: '700',
    color: colors.text.primary,
  },
  termsCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.text.light + '20',
  },
  termRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  termLabel: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  termValue: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: colors.text.light + '20',
  },
  termDescription: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  warningCard: {
    backgroundColor: colors.warning + '15',
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  warningText: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    lineHeight: 24,
  },
  warningBold: {
    fontWeight: '700',
    color: colors.warning,
  },
  bulletList: {
    marginTop: spacing.md,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  bullet: {
    fontSize: fonts.size.lg,
    color: colors.primary,
    marginRight: spacing.md,
    fontWeight: 'bold',
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  infoIcon: {
    marginRight: spacing.md,
    marginTop: 2,
  },
  infoBoxText: {
    flex: 1,
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
    color: colors.text.primary,
  },
  consentBox: {
    backgroundColor: colors.success + '10',
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  consentIcon: {
    marginBottom: spacing.md,
  },
  consentTitle: {
    fontSize: fonts.size.lg,
    fontWeight: '700',
    color: colors.success,
    marginBottom: spacing.sm,
  },
  consentText: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  spacer: {
    height: spacing.lg,
  },
  actionButtonsContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.text.light + '20',
    gap: spacing.md,
  },
  actionButton: {
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  declineButton: {
    backgroundColor: colors.text.secondary,
  },
  declineButtonText: {
    color: colors.white,
    fontSize: fonts.size.md,
    fontWeight: '700',
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  acceptButtonText: {
    color: colors.white,
    fontSize: fonts.size.md,
    fontWeight: '700',
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
});

export default SubscriptionTrialDisclosureModal;
