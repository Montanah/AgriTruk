import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { fonts, spacing } from '../../constants';

interface TransporterInsightsProps {
  totalRevenue: number;
  weeklyRevenue: number;
  currentTripRevenue: number;
  totalTrips: number;
  completedTrips: number;
  accumulatedRevenue: number;
  subscriptionStatus?: {
    isTrialActive: boolean;
    daysRemaining: number;
    planName: string;
  };
}

const TransporterInsights: React.FC<TransporterInsightsProps> = ({
  totalRevenue,
  weeklyRevenue,
  currentTripRevenue,
  totalTrips,
  completedTrips,
  accumulatedRevenue,
  subscriptionStatus,
}) => {
  // Calculate trip completion percentage
  const tripCompletionPercentage = totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0;

  // Format currency
  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString()}`;
  };

  const insights = [
    {
      id: 'total-revenue',
      icon: 'cash-outline',
      value: formatCurrency(totalRevenue),
      label: 'Total Revenue',
      color: colors.primary,
    },
    {
      id: 'weekly-revenue',
      icon: 'calendar-outline',
      value: formatCurrency(weeklyRevenue),
      label: 'This Week',
      color: colors.secondary,
    },
    {
      id: 'current-trip',
      icon: 'car-outline',
      value: formatCurrency(currentTripRevenue),
      label: 'Current Trip',
      color: colors.success,
    },
    {
      id: 'total-trips',
      icon: 'checkmark-circle-outline',
      value: totalTrips.toString(),
      label: 'Total Trips',
      color: colors.info,
    },
    {
      id: 'trip-completion',
      icon: 'bar-chart-outline',
      value: `${tripCompletionPercentage}%`,
      label: 'Trip Completion',
      color: colors.warning,
    },
    {
      id: 'accumulated-revenue',
      icon: 'trending-up-outline',
      value: formatCurrency(accumulatedRevenue),
      label: 'Accumulated Revenue',
      color: colors.primary,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Insights</Text>
      
      {/* Subscription Status Banner */}
      {subscriptionStatus && (
        <View style={styles.subscriptionBanner}>
          <View style={styles.subscriptionInfo}>
            <Ionicons 
              name={subscriptionStatus.isTrialActive ? 'gift-outline' : 'card-outline'} 
              size={20} 
              color={subscriptionStatus.isTrialActive ? colors.warning : colors.primary} 
            />
            <View style={styles.subscriptionTextContainer}>
              <Text style={styles.subscriptionPlan}>
                {subscriptionStatus.planName}
              </Text>
              <Text style={styles.subscriptionDays}>
                {subscriptionStatus.daysRemaining} days remaining
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Insights Grid */}
      <View style={styles.insightsGrid}>
        {insights.map((insight) => (
          <View key={insight.id} style={styles.insightCard}>
            <View style={[styles.iconContainer, { backgroundColor: insight.color + '20' }]}>
              <Ionicons name={insight.icon} size={24} color={insight.color} />
            </View>
            <Text style={styles.insightValue}>{insight.value}</Text>
            <Text style={styles.insightLabel}>{insight.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  subscriptionBanner: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  subscriptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscriptionTextContainer: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  subscriptionPlan: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  subscriptionDays: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  insightCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    width: '48%',
    marginBottom: spacing.sm,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  insightValue: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  insightLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default TransporterInsights;
