import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts, spacing } from "../../constants";

interface SubscriptionStatus {
  isTrialActive?: boolean;
  hasActiveSubscription?: boolean;
  daysRemaining?: number;
  currentPlan?: {
    name: string;
    price?: number;
    features?: string[];
  };
  subscriptionStatus?:
    | "active"
    | "expired"
    | "cancelled"
    | "pending"
    | "trial"
    | "none";
  needsTrialActivation?: boolean;
}

interface UnifiedSubscriptionCardProps {
  subscriptionStatus: SubscriptionStatus;
  userType: "transporter" | "broker" | "company";
  onManagePress?: () => void;
  onUpgradePress?: () => void;
  onActivateTrialPress?: () => void;
  compact?: boolean;
}

const UnifiedSubscriptionCard: React.FC<UnifiedSubscriptionCardProps> = ({
  subscriptionStatus,
  userType,
  onManagePress,
  onUpgradePress,
  onActivateTrialPress,
  compact = false,
}) => {
  const [progressAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));

  // Calculate subscription details
  const getSubscriptionDetails = () => {
    let planName = "No Active Plan";
    let statusText = "Inactive";
    let daysRemaining = 0;
    let totalDays = 90; // Default to 90 days for trials
    let isTrial = false;
    let statusColor = colors.error;
    let gradientColors = [colors.error, colors.error + "CC"];
    let icon = "alert-circle";

    // PRIORITY 1: Active trial subscription (already activated and running)
    // This takes precedence over everything else
    // If isTrialActive is true, the trial is ALREADY RUNNING
    if (subscriptionStatus.isTrialActive) {
      planName = "Free Trial";
      statusText = "Trial Active";
      daysRemaining = subscriptionStatus.daysRemaining || 0;
      totalDays = 90; // Trials are 90 days
      isTrial = true;
      statusColor = colors.success;
      gradientColors = ["#4CAF50", "#66BB6A"];
      icon = "star-circle";
    }
    // PRIORITY 2: Active paid subscription
    else if (
      subscriptionStatus.hasActiveSubscription &&
      subscriptionStatus.currentPlan
    ) {
      planName = subscriptionStatus.currentPlan.name;
      statusText = "Active";
      daysRemaining = subscriptionStatus.daysRemaining || 0;
      totalDays = 30; // Paid subscriptions typically 30 days
      isTrial = false;
      statusColor = colors.primary;
      gradientColors = [colors.primary, colors.primaryDark];
      icon = "shield-check";
    }
    // PRIORITY 3: Expired subscription
    else if (subscriptionStatus.subscriptionStatus === "expired") {
      planName = "Expired";
      statusText = "Expired";
      daysRemaining = 0;
      totalDays = 30;
      isTrial = false;
      statusColor = colors.error;
      gradientColors = ["#F44336", "#E53935"];
      icon = "alert-circle";
    }
    // PRIORITY 4: Trial available but not yet activated
    // CRITICAL FIX: Only show "Activate Trial" if trial is NOT already active
    // This fixes the issue where backend returns both isTrialActive=true AND needsTrialActivation=true
    // The condition !subscriptionStatus.isTrialActive ensures we never show "Activate Trial" for an active trial
    else if (
      subscriptionStatus.needsTrialActivation &&
      !subscriptionStatus.isTrialActive
    ) {
      planName = "Trial Available";
      statusText = "Activate Now";
      daysRemaining = 90;
      totalDays = 90;
      isTrial = false;
      statusColor = colors.warning;
      gradientColors = ["#FF9800", "#FFA726"];
      icon = "gift";
    }

    const progressPercentage =
      totalDays > 0 ? Math.max(0, Math.min(1, daysRemaining / totalDays)) : 0;
    const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;

    return {
      planName,
      statusText,
      daysRemaining,
      totalDays,
      isTrial,
      statusColor,
      gradientColors,
      icon,
      progressPercentage,
      isExpiringSoon,
    };
  };

  const details = getSubscriptionDetails();

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: details.progressPercentage,
      duration: 1000,
      useNativeDriver: false,
    }).start();

    // Pulse animation for expiring soon
    if (details.isExpiringSoon) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [details.progressPercentage, details.isExpiringSoon]);

  const getStatusMessage = () => {
    if (details.daysRemaining === 0) {
      return details.isTrial ? "Trial ended" : "Subscription ended";
    }
    if (details.isExpiringSoon) {
      return `${details.daysRemaining} ${details.daysRemaining === 1 ? "day" : "days"} left`;
    }
    return `${details.daysRemaining} ${details.daysRemaining === 1 ? "day" : "days"} remaining`;
  };

  const renderActionButton = () => {
    // CRITICAL FIX: Only show "Activate Trial" button if trial is NOT already active
    // This prevents showing "Activate Trial" when the trial is already running
    if (
      subscriptionStatus.needsTrialActivation &&
      !subscriptionStatus.isTrialActive &&
      onActivateTrialPress
    ) {
      return (
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: details.statusColor },
          ]}
          onPress={onActivateTrialPress}
        >
          <MaterialCommunityIcons name="gift" size={16} color={colors.white} />
          <Text style={styles.actionButtonText}>Activate Trial</Text>
        </TouchableOpacity>
      );
    }

    if (details.statusText === "Expired" && onUpgradePress) {
      return (
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: details.statusColor },
          ]}
          onPress={onUpgradePress}
        >
          <MaterialCommunityIcons
            name="refresh"
            size={16}
            color={colors.white}
          />
          <Text style={styles.actionButtonText}>Renew Now</Text>
        </TouchableOpacity>
      );
    }

    if (
      (details.statusText === "Active" ||
        details.statusText === "Trial Active") &&
      onManagePress
    ) {
      return (
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={onManagePress}
        >
          <MaterialCommunityIcons name="cog" size={16} color={colors.primary} />
          <Text style={[styles.actionButtonText, { color: colors.primary }]}>
            Manage
          </Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <View
            style={[
              styles.compactIcon,
              { backgroundColor: details.statusColor + "15" },
            ]}
          >
            <MaterialCommunityIcons
              name={details.icon}
              size={18}
              color={details.statusColor}
            />
          </View>
          <View style={styles.compactInfo}>
            <Text style={styles.compactPlanName}>{details.planName}</Text>
            <Text
              style={[styles.compactStatus, { color: details.statusColor }]}
            >
              {details.statusText}
            </Text>
          </View>
          <View style={styles.compactDaysContainer}>
            <Text style={[styles.compactDays, { color: details.statusColor }]}>
              {details.daysRemaining}
            </Text>
            <Text style={styles.compactDaysLabel}>days</Text>
          </View>
        </View>

        {/* Minimal Progress Bar */}
        <View style={styles.compactProgressContainer}>
          <View style={styles.compactProgressBar}>
            <Animated.View
              style={[
                styles.compactProgressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                  backgroundColor: details.statusColor + "80",
                },
              ]}
            />
          </View>
          <View style={styles.compactProgressFooter}>
            <Text style={styles.compactProgressText}>{getStatusMessage()}</Text>
            {onManagePress && (
              <TouchableOpacity
                style={styles.compactManageButton}
                onPress={onManagePress}
              >
                <MaterialCommunityIcons
                  name="cog-outline"
                  size={14}
                  color={colors.primary}
                />
                <Text style={styles.compactManageText}>Manage</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={details.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name={details.icon}
                size={32}
                color={colors.white}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.planName}>{details.planName}</Text>
              <Text style={styles.statusText}>{details.statusText}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.daysNumber}>{details.daysRemaining}</Text>
            <Text style={styles.daysLabel}>days</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {/* Enhanced Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Time Remaining</Text>
            <Text style={styles.progressPercentage}>
              {Math.round(details.progressPercentage * 100)}%
            </Text>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                    backgroundColor: details.statusColor,
                  },
                ]}
              >
                {/* Shimmer effect */}
                <LinearGradient
                  colors={[
                    "transparent",
                    "rgba(255,255,255,0.3)",
                    "transparent",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.shimmer}
                />
              </Animated.View>

              {/* Progress indicator dot */}
              <Animated.View
                style={[
                  styles.progressDot,
                  {
                    left: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                    backgroundColor: details.statusColor,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.progressFooter}>
            <Text style={styles.progressStart}>Start</Text>
            <Text
              style={[
                styles.progressMessage,
                details.isExpiringSoon && styles.warningText,
              ]}
            >
              {getStatusMessage()}
            </Text>
            <Text style={styles.progressEnd}>End</Text>
          </View>
        </View>

        {/* Action Button */}
        {renderActionButton()}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    marginVertical: spacing.md,
  },
  gradientHeader: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  planName: {
    fontSize: fonts.size.xl,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginBottom: 4,
  },
  statusText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.medium,
    color: "rgba(255,255,255,0.9)",
  },
  headerRight: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  daysNumber: {
    fontSize: 32,
    fontFamily: fonts.family.bold,
    color: colors.white,
    lineHeight: 36,
  },
  daysLabel: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: "rgba(255,255,255,0.9)",
  },
  body: {
    padding: spacing.lg,
  },
  progressSection: {
    marginBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  progressPercentage: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.text.secondary,
  },
  progressBarContainer: {
    marginBottom: spacing.sm,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: colors.background,
    borderRadius: 6,
    overflow: "hidden",
    position: "relative",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 6,
    overflow: "hidden",
  },
  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  progressDot: {
    position: "absolute",
    top: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  progressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressStart: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.medium,
    color: colors.text.light,
  },
  progressMessage: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    textAlign: "center",
    flex: 1,
  },
  warningText: {
    color: colors.warning,
    fontFamily: fonts.family.bold,
  },
  progressEnd: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.medium,
    color: colors.text.light,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButton: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: spacing.xs,
  },
  // Compact styles - More subtle and chill
  compactContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.background,
    marginVertical: spacing.xs,
  },
  compactHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  compactIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  compactInfo: {
    flex: 1,
  },
  compactPlanName: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  compactStatus: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.regular,
  },
  compactDaysContainer: {
    alignItems: "flex-end",
  },
  compactDays: {
    fontSize: fonts.size.xl,
    fontFamily: fonts.family.bold,
    lineHeight: fonts.size.xl * 1.2,
  },
  compactDaysLabel: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.regular,
    color: colors.text.light,
  },
  compactProgressContainer: {
    marginTop: spacing.xs,
  },
  compactProgressBar: {
    height: 3,
    backgroundColor: colors.background,
    borderRadius: 1.5,
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  compactProgressFill: {
    height: "100%",
    borderRadius: 1.5,
  },
  compactProgressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  compactProgressText: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.regular,
    color: colors.text.light,
    flex: 1,
  },
  compactManageButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.primary + "10",
    gap: 4,
  },
  compactManageText: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.semibold,
    color: colors.primary,
  },
});

export default UnifiedSubscriptionCard;
