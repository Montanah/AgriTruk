import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../../constants';
import EnhancedSubscriptionProgressBar from './EnhancedSubscriptionProgressBar';

interface SubscriptionStatus {
  isTrialActive?: boolean;
  hasActiveSubscription?: boolean;
  daysRemaining?: number;
  currentPlan?: {
    name: string;
    price?: number;
    features?: string[];
  };
  subscriptionStatus?: 'active' | 'expired' | 'cancelled' | 'pending';
  needsTrialActivation?: boolean;
}

interface EnhancedSubscriptionStatusCardProps {
  subscriptionStatus: SubscriptionStatus;
  onManagePress?: () => void;
  onRenewPress?: () => void;
  onActivateTrial?: () => void;
  onUpgradePress?: () => void;
  showUpgradeOptions?: boolean;
  animated?: boolean;
}

const EnhancedSubscriptionStatusCard: React.FC<EnhancedSubscriptionStatusCardProps> = ({
  subscriptionStatus,
  onManagePress,
  onRenewPress,
  onActivateTrial,
  onUpgradePress,
  showUpgradeOptions = true,
  animated = true,
}) => {
  const [cardAnim] = useState(new Animated.Value(0));
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (animated) {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    } else {
      cardAnim.setValue(1);
    }
  }, [animated]);

  const formatStatus = (status: SubscriptionStatus) => {
    let planName = 'No Active Plan';
    let statusText = 'Inactive';
    let daysRemaining = 0;
    let isTrial = false;
    let statusColor = colors.error;
    let statusIcon = 'alert-circle';
    let showProgress = false;

    if (status.isTrialActive) {
      planName = 'Free Trial';
      statusText = 'Trial Active';
      // Cap trial days at 90 (3 months) - backend should return correct value but protect against errors
      const rawDaysRemaining = status.daysRemaining || 0;
      daysRemaining = rawDaysRemaining > 90 ? 90 : rawDaysRemaining;
      isTrial = true;
      statusColor = colors.success;
      statusIcon = 'star';
      showProgress = true;
    } else if (status.hasActiveSubscription && status.currentPlan) {
      planName = status.currentPlan.name;
      statusText = 'Active';
      daysRemaining = status.daysRemaining || 0;
      isTrial = false;
      statusColor = colors.primary;
      statusIcon = 'shield-check';
      showProgress = true;
    } else if (status.subscriptionStatus === 'expired') {
      planName = 'Expired';
      statusText = 'Expired';
      daysRemaining = 0;
      isTrial = false;
      statusColor = colors.error;
      statusIcon = 'alert-circle';
      showProgress = false;
    } else if (status.needsTrialActivation) {
      planName = 'Trial Available';
      statusText = 'Activate Trial';
      daysRemaining = 30;
      isTrial = false;
      statusColor = colors.warning;
      statusIcon = 'gift';
      showProgress = false;
    }

    return {
      planName,
      statusText,
      daysRemaining,
      isTrial,
      statusColor,
      statusIcon,
      showProgress,
    };
  };

  const formatted = formatStatus(subscriptionStatus);

  const getStatusMessage = () => {
    if (formatted.isTrial) {
      return `Trial ends in ${formatted.daysRemaining} days`;
    } else if (formatted.statusText === 'Active') {
      return `Plan ends in ${formatted.daysRemaining} days`;
    } else if (formatted.statusText === 'Expired') {
      return 'Your subscription has expired';
    } else if (formatted.statusText === 'Activate Trial') {
      return 'Start your free 30-day trial';
    } else {
      return 'No active subscription';
    }
  };

  const getActionButtons = () => {
    const buttons = [];

    if (subscriptionStatus.needsTrialActivation && onActivateTrial) {
      buttons.push({
        text: 'Activate Trial',
        onPress: onActivateTrial,
        style: 'primary',
        icon: 'gift',
      });
    }

    if (formatted.statusText === 'Expired' && onRenewPress) {
      buttons.push({
        text: 'Renew Now',
        onPress: onRenewPress,
        style: 'primary',
        icon: 'refresh',
      });
    }

    if ((formatted.statusText === 'Active' || formatted.statusText === 'Trial Active') && onManagePress) {
      buttons.push({
        text: 'Manage',
        onPress: onManagePress,
        style: 'secondary',
        icon: 'cog',
      });
    }

    if (showUpgradeOptions && onUpgradePress && !formatted.isTrial) {
      buttons.push({
        text: 'Upgrade',
        onPress: onUpgradePress,
        style: 'success',
        icon: 'arrow-up',
      });
    }

    return buttons;
  };

  const handleCardPress = () => {
    setShowDetails(!showDetails);
  };

  const renderPlanFeatures = () => {
    if (!subscriptionStatus.currentPlan?.features || !showDetails) return null;

    return (
      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Plan Features:</Text>
        {subscriptionStatus.currentPlan.features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <MaterialCommunityIcons name="check" size={16} color={colors.success} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderUpgradePrompt = () => {
    if (!showUpgradeOptions || formatted.isTrial || formatted.statusText === 'Active') return null;

    return (
      <View style={styles.upgradePrompt}>
        <MaterialCommunityIcons name="arrow-up-circle" size={24} color={colors.primary} />
        <Text style={styles.upgradeText}>
          {formatted.isTrial ? 'Upgrade to unlock premium features' : 'Get started with a free trial'}
        </Text>
      </View>
    );
  };

  const actionButtons = getActionButtons();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: cardAnim,
          transform: [
            {
              translateY: cardAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={handleCardPress}
        activeOpacity={0.8}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: formatted.statusColor + '20' }]}>
              <MaterialCommunityIcons
                name={formatted.statusIcon}
                size={24}
                color={formatted.statusColor}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.planName}>{formatted.planName}</Text>
              <Text style={[styles.statusText, { color: formatted.statusColor }]}>
                {formatted.statusText}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.daysText}>
              {formatted.daysRemaining > 0 ? `${formatted.daysRemaining} days` : 'Expired'}
            </Text>
            <MaterialCommunityIcons
              name={showDetails ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.text.secondary}
            />
          </View>
        </View>

        {/* Enhanced Progress Bar */}
        {formatted.showProgress && (
          <EnhancedSubscriptionProgressBar
            daysRemaining={formatted.daysRemaining}
            totalDays={formatted.isTrial ? 90 : 30}
            isTrial={formatted.isTrial}
            statusColor={formatted.statusColor}
            showDetails={showDetails}
            animated={animated}
          />
        )}

        {/* Status Message */}
        <Text style={styles.statusMessage}>{getStatusMessage()}</Text>

        {/* Plan Features (when expanded) */}
        {renderPlanFeatures()}

        {/* Upgrade Prompt */}
        {renderUpgradePrompt()}

        {/* Action Buttons */}
        {actionButtons.length > 0 && (
          <View style={styles.actionButtons}>
            {actionButtons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.actionButton,
                  button.style === 'primary' && styles.primaryButton,
                  button.style === 'secondary' && styles.secondaryButton,
                  button.style === 'success' && styles.successButton,
                ]}
                onPress={button.onPress}
              >
                <MaterialCommunityIcons
                  name={button.icon}
                  size={16}
                  color={colors.white}
                />
                <Text style={styles.actionButtonText}>{button.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  planName: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  statusText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  daysText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  statusMessage: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  featuresContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  featuresTitle: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  featureText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  upgradePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    padding: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  upgradeText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.primary,
    marginLeft: spacing.xs,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.text.secondary,
  },
  successButton: {
    backgroundColor: colors.success,
  },
  actionButtonText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: spacing.xs,
  },
});

export default EnhancedSubscriptionStatusCard;





