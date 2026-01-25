import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import colors from '../../constants/colors';
import { fonts, spacing } from '../../constants';
import { SubscriptionStatus } from '../../services/subscriptionService';

interface CompanyFleetStatusCardProps {
  subscriptionStatus: SubscriptionStatus;
  onUpgrade?: () => void;
}

export default function CompanyFleetStatusCard({ 
  subscriptionStatus, 
  onUpgrade 
}: CompanyFleetStatusCardProps) {
  const navigation = useNavigation();

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigation.navigate('CompanyFleetPlans' as never);
    }
  };

  const getStatusColor = () => {
    if (subscriptionStatus.freeTrialActive) return colors.warning;
    if (subscriptionStatus.hasActiveSubscription) return colors.success;
    return colors.error;
  };

  const getStatusText = () => {
    if (subscriptionStatus.freeTrialActive && subscriptionStatus.freeTrialDaysRemaining > 0) {
      return `Free Trial (${subscriptionStatus.freeTrialDaysRemaining} days remaining)`;
    }
    if (subscriptionStatus.hasActiveSubscription) {
      return subscriptionStatus.currentPlan?.name || 'Active Plan';
    }
    if (subscriptionStatus.needsTrialActivation) {
      return 'No active trial. Please contact support or wait for admin activation.';
    }
    return 'No Active Plan';
  };

  const getDriverLimitText = () => {
    if (subscriptionStatus.freeTrialActive && subscriptionStatus.driverLimit) {
      return `${subscriptionStatus.driverLimit} drivers (Trial)`;
    }
    if (subscriptionStatus.driverLimit === -1) {
      return 'Unlimited drivers';
    }
    return `${subscriptionStatus.driverLimit || 0} drivers`;
  };

  const getVehicleLimitText = () => {
    if (subscriptionStatus.freeTrialActive && subscriptionStatus.vehicleLimit) {
      return `${subscriptionStatus.vehicleLimit} vehicles (Trial)`;
    }
    if (subscriptionStatus.vehicleLimit === -1) {
      return 'Unlimited vehicles';
    }
    return `${subscriptionStatus.vehicleLimit || 0} vehicles`;
  };

  const canAddDriver = subscriptionStatus.canAddDriver || false;
  const canAddVehicle = subscriptionStatus.canAddVehicle || false;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons 
            name="truck" 
            size={24} 
            color={colors.primary} 
          />
          <Text style={styles.headerTitle}>Fleet Management</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>

      {/* Usage Stats */}
      <View style={styles.usageContainer}>
        <View style={styles.usageItem}>
          <View style={styles.usageHeader}>
            <Text style={styles.usageLabel}>Drivers</Text>
            <Text style={styles.usageCount}>
              {subscriptionStatus.currentDriverCount || 0} / {getDriverLimitText()}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${Math.min(
                    ((subscriptionStatus.currentDriverCount || 0) / 
                     (subscriptionStatus.freeTrialActive ? 3 : (subscriptionStatus.driverLimit || 1))) * 100, 
                    100
                  )}%`,
                  backgroundColor: canAddDriver ? colors.success : colors.warning
                }
              ]} 
            />
          </View>
          {!canAddDriver && (
            <Text style={styles.limitReachedText}>Driver limit reached</Text>
          )}
        </View>

        <View style={styles.usageItem}>
          <View style={styles.usageHeader}>
            <Text style={styles.usageLabel}>Vehicles</Text>
            <Text style={styles.usageCount}>
              {subscriptionStatus.currentVehicleCount || 0} / {getVehicleLimitText()}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${Math.min(
                    ((subscriptionStatus.currentVehicleCount || 0) / 
                     (subscriptionStatus.freeTrialActive ? 3 : (subscriptionStatus.vehicleLimit || 1))) * 100, 
                    100
                  )}%`,
                  backgroundColor: canAddVehicle ? colors.success : colors.warning
                }
              ]} 
            />
          </View>
          {!canAddVehicle && (
            <Text style={styles.limitReachedText}>Vehicle limit reached</Text>
          )}
        </View>
      </View>

      {/* Features */}
      <View style={styles.featuresContainer}>
        <View style={styles.featureItem}>
          <MaterialCommunityIcons name="check" size={16} color={colors.success} />
          <Text style={styles.featureText}>Driver Job Board Access</Text>
        </View>
        <View style={styles.featureItem}>
          <MaterialCommunityIcons name="check" size={16} color={colors.success} />
          <Text style={styles.featureText}>Central Dashboard</Text>
        </View>
        <View style={styles.featureItem}>
          <MaterialCommunityIcons name="check" size={16} color={colors.success} />
          <Text style={styles.featureText}>24/7 Support</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {/* Only show subscribe if user has no active trial or subscription */}
        {!subscriptionStatus.freeTrialActive && !subscriptionStatus.hasActiveSubscription && !subscriptionStatus.needsTrialActivation && (
          <TouchableOpacity 
            style={styles.subscribeButton}
            onPress={handleUpgrade}
          >
            <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
            <Text style={styles.subscribeButtonText}>Subscribe</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={styles.manageButton}
          onPress={() => navigation.navigate('SubscriptionManagement' as never)}
        >
          <MaterialCommunityIcons name="cog" size={20} color={colors.primary} />
          <Text style={styles.manageButtonText}>Manage</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    marginVertical: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
  },
  usageContainer: {
    marginBottom: spacing.lg,
  },
  usageItem: {
    marginBottom: spacing.md,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  usageLabel: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: '500',
  },
  usageCount: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.background.light,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  limitReachedText: {
    fontSize: fonts.size.xs,
    color: colors.warning,
    marginTop: spacing.xs,
  },
  featuresContainer: {
    marginBottom: spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  featureText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  upgradeButton: {
    flex: 1,
    backgroundColor: colors.warning,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginRight: spacing.sm,
  },
  upgradeButtonText: {
    color: colors.white,
    fontSize: fonts.size.sm,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  subscribeButton: {
    flex: 1,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginRight: spacing.sm,
  },
  subscribeButtonText: {
    color: colors.white,
    fontSize: fonts.size.sm,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  manageButtonText: {
    color: colors.primary,
    fontSize: fonts.size.sm,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
});

