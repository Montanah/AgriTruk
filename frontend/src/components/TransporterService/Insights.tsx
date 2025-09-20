import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../constants/colors';

type Props = {
  revenue: number;
  recentRevenue: number;
  currentTripRevenue: number;
  accumulatedRevenue: number;
  successfulTrips: number;
  completionRate: number;
  currencyCode: string;
  fleetStats?: {
    fleetSize: number;
    activeToday: number;
    avgUtilizationRate: number;
  };
};

export default function Insights({
  revenue,
  recentRevenue,
  currentTripRevenue,
  accumulatedRevenue,
  successfulTrips,
  completionRate,
  currencyCode,
  fleetStats,
}: Props) {
  // Ensure all values are numbers and handle NaN cases
  const safeRevenue = isNaN(revenue) ? 0 : revenue;
  const safeRecentRevenue = isNaN(recentRevenue) ? 0 : recentRevenue;
  const safeCurrentTripRevenue = isNaN(currentTripRevenue) ? 0 : currentTripRevenue;
  const safeAccumulatedRevenue = isNaN(accumulatedRevenue) ? 0 : accumulatedRevenue;
  const safeSuccessfulTrips = isNaN(successfulTrips) ? 0 : successfulTrips;
  const safeCompletionRate = isNaN(completionRate) ? 0 : completionRate;
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Insights</Text>

      <View style={styles.cardRow}>
        <InsightCard
          label="Total Revenue"
          value={`${currencyCode} ${safeRevenue.toLocaleString()}`}
          icon="cash-outline"
          color={colors.primary}
        />
        <InsightCard
          label="This Week"
          value={`${currencyCode} ${safeRecentRevenue.toLocaleString()}`}
          icon="calendar-outline"
          color={colors.secondary}
        />
      </View>

      <View style={styles.cardRow}>
        <InsightCard
          label="Current Trip"
          value={`${currencyCode} ${safeCurrentTripRevenue.toLocaleString()}`}
          icon="car-outline"
          color={colors.accent}
        />
        <InsightCard
          label="Total Trips"
          value={`${safeSuccessfulTrips}`}
          icon="checkmark-done-outline"
          color={colors.success}
        />
      </View>

      <View style={styles.cardRow}>
        <InsightCard
          label="Trip Completion"
          value={`${safeCompletionRate}%`}
          icon="stats-chart-outline"
          color={colors.info}
        />
        <InsightCard
          label="Accumulated Revenue"
          value={`${currencyCode} ${safeAccumulatedRevenue.toLocaleString()}`}
          icon="archive-outline"
          color={colors.warning}
        />
      </View>

      {fleetStats && (
        <View style={styles.cardRow}>
          <InsightCard
            label="Fleet Size"
            value={fleetStats.fleetSize}
            icon="bus-outline"
            color={colors.primaryDark}
          />
          <InsightCard
            label="Active Today"
            value={fleetStats.activeToday}
            icon="flash-outline"
            color={colors.info}
          />
          <InsightCard
            label="Utilization"
            value={`${fleetStats.avgUtilizationRate}%`}
            icon="speedometer-outline"
            color={colors.success}
          />
        </View>
      )}
    </View>
  );
}

const InsightCard = ({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) => {
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrapper, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View>
        <Text style={styles.cardValue}>{value}</Text>
        <Text style={styles.cardLabel}>{label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: colors.primaryDark,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#00000020',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primaryDark,
  },
  cardLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
