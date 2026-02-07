import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import colors from "../../constants/colors";
import fonts from "../../constants/fonts";
import spacing from "../../constants/spacing";

interface AutoRenewalDisclosureProps {
  planPrice: number;
  billingPeriod: "monthly" | "quarterly" | "yearly";
  renewalDate?: string;
  onAcknowledge?: (acknowledged: boolean) => void;
  requireAcknowledgment?: boolean;
  compact?: boolean;
}

/**
 * Auto-Renewal Disclosure Component
 *
 * This component meets Google Play Store and Apple App Store requirements
 * for auto-renewing subscription disclosures.
 *
 * Requirements met:
 * - Clear statement that subscription will automatically renew
 * - Renewal price displayed prominently
 * - Renewal frequency clearly stated
 * - Cancellation instructions provided
 * - Optional user acknowledgment checkbox
 */
const AutoRenewalDisclosure: React.FC<AutoRenewalDisclosureProps> = ({
  planPrice,
  billingPeriod,
  renewalDate,
  onAcknowledge,
  requireAcknowledgment = false,
  compact = false,
}) => {
  const [acknowledged, setAcknowledged] = useState(false);

  const handleAcknowledgmentChange = (value: boolean) => {
    setAcknowledged(value);
    onAcknowledge?.(value);
  };

  const getBillingPeriodText = () => {
    switch (billingPeriod) {
      case "monthly":
        return "month";
      case "quarterly":
        return "quarter (3 months)";
      case "yearly":
        return "year";
      default:
        return billingPeriod;
    }
  };

  const formatRenewalDate = () => {
    if (!renewalDate) return null;
    try {
      const date = new Date(renewalDate);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return renewalDate;
    }
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <MaterialCommunityIcons
          name="refresh-circle"
          size={20}
          color={colors.primary}
          style={styles.compactIcon}
        />
        <Text style={styles.compactText}>
          Auto-renews at KES {planPrice}/{billingPeriod}. Cancel anytime in
          Settings.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="refresh-circle"
          size={28}
          color={colors.primary}
        />
        <Text style={styles.title}>Automatic Renewal</Text>
      </View>

      {/* Main Disclosure */}
      <View style={styles.disclosureBox}>
        <Text style={styles.mainText}>
          Your subscription will automatically renew{" "}
          {renewalDate && (
            <>
              on <Text style={styles.boldText}>{formatRenewalDate()}</Text>{" "}
            </>
          )}
          for <Text style={styles.priceText}>KES {planPrice}</Text> per{" "}
          {getBillingPeriodText()}.
        </Text>
      </View>

      {/* Details List */}
      <View style={styles.detailsList}>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons
            name="check-circle"
            size={18}
            color={colors.success}
          />
          <Text style={styles.detailText}>
            You will be charged KES {planPrice} every {getBillingPeriodText()}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <MaterialCommunityIcons
            name="check-circle"
            size={18}
            color={colors.success}
          />
          <Text style={styles.detailText}>
            You can cancel anytime before the renewal date
          </Text>
        </View>

        <View style={styles.detailItem}>
          <MaterialCommunityIcons
            name="check-circle"
            size={18}
            color={colors.success}
          />
          <Text style={styles.detailText}>
            To cancel: Settings → Subscription → Cancel Subscription
          </Text>
        </View>

        <View style={styles.detailItem}>
          <MaterialCommunityIcons
            name="check-circle"
            size={18}
            color={colors.success}
          />
          <Text style={styles.detailText}>
            Cancellation takes effect at the end of the current billing period
          </Text>
        </View>

        <View style={styles.detailItem}>
          <MaterialCommunityIcons
            name="check-circle"
            size={18}
            color={colors.success}
          />
          <Text style={styles.detailText}>
            You&apos;ll receive a reminder email 7 days before renewal
          </Text>
        </View>
      </View>

      {/* Acknowledgment Checkbox */}
      {requireAcknowledgment && (
        <TouchableOpacity
          style={styles.acknowledgmentContainer}
          onPress={() => handleAcknowledgmentChange(!acknowledged)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={acknowledged ? "checkbox-marked" : "checkbox-blank-outline"}
            size={24}
            color={acknowledged ? colors.primary : colors.border}
            style={styles.checkbox}
          />
          <Text style={styles.acknowledgmentText}>
            I understand that my subscription will automatically renew at KES{" "}
            {planPrice}/{billingPeriod} unless I cancel before the renewal date.
          </Text>
        </TouchableOpacity>
      )}

      {/* Footer Note */}
      <View style={styles.footer}>
        <MaterialCommunityIcons
          name="information"
          size={16}
          color={colors.text.secondary}
        />
        <Text style={styles.footerText}>
          By completing this purchase, you agree to automatic renewal as
          described above.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    marginVertical: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary + "30",
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  disclosureBox: {
    backgroundColor: colors.primary + "10",
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  mainText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    lineHeight: 22,
  },
  boldText: {
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  priceText: {
    fontFamily: fonts.family.bold,
    color: colors.primary,
    fontSize: fonts.size.lg,
  },
  detailsList: {
    marginBottom: spacing.md,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  detailText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
    flex: 1,
    lineHeight: 20,
  },
  acknowledgmentContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  checkbox: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  acknowledgmentText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
    flex: 1,
    lineHeight: 18,
  },
  // Compact styles
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary + "10",
    borderRadius: 8,
    padding: spacing.sm,
    marginVertical: spacing.sm,
  },
  compactIcon: {
    marginRight: spacing.xs,
  },
  compactText: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    flex: 1,
    lineHeight: 18,
  },
});

export default AutoRenewalDisclosure;
