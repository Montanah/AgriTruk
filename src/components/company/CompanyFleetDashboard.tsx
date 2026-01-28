import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import CompanyFleetStatusCard from '../common/CompanyFleetStatusCard';
import { SubscriptionStatus } from '../../services/subscriptionService';
import subscriptionService from '../../services/subscriptionService';
import colors from '../../constants/colors';
import { fonts, spacing } from '../../constants';

interface CompanyFleetDashboardProps {
  userId: string;
}

export default function CompanyFleetDashboard({ userId }: CompanyFleetDashboardProps) {
  const navigation = useNavigation();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptionStatus();
  }, [userId]);

  const loadSubscriptionStatus = async () => {
    try {
      setLoading(true);
      const status = await subscriptionService.getSubscriptionStatus(userId);
      setSubscriptionStatus(status);
    } catch (error) {
      console.error('Error loading subscription status:', error);
      Alert.alert('Error', 'Failed to load subscription status');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrial = async () => {
    try {
      const status = await subscriptionService.startCompanyFleetTrial(userId);
      setSubscriptionStatus(status);
      Alert.alert(
        'Free Trial Started',
        'Your 30-day free trial has begun! You can now add up to 3 drivers and 3 vehicles.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error starting trial:', error);
      Alert.alert('Error', 'Failed to start free trial');
    }
  };

  const handleUpgrade = () => {
    navigation.navigate('CompanyFleetPlans' as never);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!subscriptionStatus) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load subscription status</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadSubscriptionStatus}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fleet Management</Text>
        <Text style={styles.headerSubtitle}>Manage your drivers and vehicles</Text>
      </View>

      {/* Subscription Status Card */}
      <CompanyFleetStatusCard 
        subscriptionStatus={subscriptionStatus}
        onUpgrade={handleUpgrade}
      />

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={[
              styles.actionButton,
              !subscriptionStatus.canAddDriver && styles.actionButtonDisabled
            ]}
            onPress={() => navigation.navigate('DriverManagement' as never)}
            disabled={!subscriptionStatus.canAddDriver}
          >
            <MaterialCommunityIcons 
              name="account-plus" 
              size={24} 
              color={subscriptionStatus.canAddDriver ? colors.primary : colors.text.light} 
            />
            <Text style={[
              styles.actionButtonText,
              !subscriptionStatus.canAddDriver && styles.actionButtonTextDisabled
            ]}>
              Add Driver
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.actionButton,
              !subscriptionStatus.canAddVehicle && styles.actionButtonDisabled
            ]}
            onPress={() => navigation.navigate('VehicleManagement' as never)}
            disabled={!subscriptionStatus.canAddVehicle}
          >
            <MaterialCommunityIcons 
              name="truck-plus" 
              size={24} 
              color={subscriptionStatus.canAddVehicle ? colors.primary : colors.text.light} 
            />
            <Text style={[
              styles.actionButtonText,
              !subscriptionStatus.canAddVehicle && styles.actionButtonTextDisabled
            ]}>
              Add Vehicle
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('DriverJobBoard' as never)}
          >
            <MaterialCommunityIcons name="account-group" size={24} color={colors.primary} />
            <Text style={styles.actionButtonText}>Browse Drivers</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('FleetAnalytics' as never)}
          >
            <MaterialCommunityIcons name="chart-line" size={24} color={colors.primary} />
            <Text style={styles.actionButtonText}>Analytics</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Trial Information */}
      {subscriptionStatus.freeTrialActive && (
        <View style={styles.trialInfoContainer}>
          <MaterialCommunityIcons name="gift" size={32} color={colors.warning} />
          <View style={styles.trialInfoText}>
            <Text style={styles.trialTitle}>Free Trial Active</Text>
            <Text style={styles.trialDescription}>
              {subscriptionStatus.freeTrialDaysRemaining} days remaining. 
              Upgrade anytime to unlock more features and higher limits.
            </Text>
          </View>
        </View>
      )}

      {/* Driver Job Board Access */}
      <View style={styles.jobBoardInfoContainer}>
        <MaterialCommunityIcons name="account-group" size={24} color={colors.success} />
        <View style={styles.jobBoardInfoText}>
          <Text style={styles.jobBoardTitle}>Driver Job Board Access</Text>
          <Text style={styles.jobBoardDescription}>
            All plans include unlimited access to browse and recruit from our pool of verified drivers.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.light,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fonts.size.lg,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    fontSize: fonts.size.md,
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: fonts.size.md,
    fontWeight: '600',
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
  },
  quickActionsContainer: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonDisabled: {
    backgroundColor: colors.background.light,
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  actionButtonTextDisabled: {
    color: colors.text.light,
  },
  trialInfoContainer: {
    flexDirection: 'row',
    backgroundColor: colors.warningLight,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  trialInfoText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  trialTitle: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.warning,
    marginBottom: spacing.xs,
  },
  trialDescription: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  jobBoardInfoContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  jobBoardInfoText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  jobBoardTitle: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  jobBoardDescription: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
});

