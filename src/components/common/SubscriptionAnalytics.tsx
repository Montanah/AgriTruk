import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../../constants';

interface SubscriptionAnalyticsProps {
  subscriptionHistory: Array<{
    date: string;
    plan: string;
    status: 'active' | 'expired' | 'cancelled';
    daysUsed: number;
    totalDays: number;
  }>;
  currentPlan: {
    name: string;
    startDate: string;
    endDate: string;
    daysRemaining: number;
  };
  onViewHistory?: () => void;
  onUpgrade?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

const SubscriptionAnalytics: React.FC<SubscriptionAnalyticsProps> = ({
  subscriptionHistory,
  currentPlan,
  onViewHistory,
  onUpgrade,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const getUsageStats = () => {
    const totalDays = subscriptionHistory.reduce((sum, sub) => sum + sub.daysUsed, 0);
    const activeSubscriptions = subscriptionHistory.filter(sub => sub.status === 'active').length;
    const averageUsage = subscriptionHistory.length > 0 ? totalDays / subscriptionHistory.length : 0;
    
    return {
      totalDays,
      activeSubscriptions,
      averageUsage: Math.round(averageUsage),
      totalSubscriptions: subscriptionHistory.length,
    };
  };

  const getCurrentUsage = () => {
    const startDate = new Date(currentPlan.startDate);
    const endDate = new Date(currentPlan.endDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysUsed = totalDays - currentPlan.daysRemaining;
    const usagePercentage = (daysUsed / totalDays) * 100;

    return {
      daysUsed,
      totalDays,
      usagePercentage: Math.round(usagePercentage),
    };
  };

  const getRecommendations = () => {
    const stats = getUsageStats();
    const recommendations = [];

    if (stats.averageUsage < 15) {
      recommendations.push({
        type: 'warning',
        icon: 'clock-alert',
        title: 'Low Usage',
        message: 'Consider a pay-per-use plan to save money',
        action: 'Switch Plan',
      });
    }

    if (currentPlan.daysRemaining <= 7) {
      recommendations.push({
        type: 'urgent',
        icon: 'alert-circle',
        title: 'Renewal Due',
        message: 'Your subscription expires soon',
        action: 'Renew Now',
      });
    }

    if (stats.activeSubscriptions > 1) {
      recommendations.push({
        type: 'info',
        icon: 'information',
        title: 'Multiple Plans',
        message: 'You have multiple active subscriptions',
        action: 'Manage',
      });
    }

    return recommendations;
  };

  const renderUsageChart = () => {
    const currentUsage = getCurrentUsage();
    const chartData = [
      { label: 'Used', value: currentUsage.daysUsed, color: colors.primary },
      { label: 'Remaining', value: currentPlan.daysRemaining, color: colors.success },
    ];

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Current Plan Usage</Text>
        <View style={styles.chart}>
          {chartData.map((item, index) => (
            <View
              key={index}
              style={[
                styles.chartBar,
                {
                  width: `${(item.value / currentUsage.totalDays) * 100}%`,
                  backgroundColor: item.color,
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.chartLegend}>
          {chartData.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>
                {item.label}: {item.value} days
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderStats = () => {
    const stats = getUsageStats();
    const currentUsage = getCurrentUsage();

    const statItems = [
      {
        title: 'Total Usage',
        value: `${stats.totalDays} days`,
        icon: 'calendar',
        color: colors.primary,
      },
      {
        title: 'Current Usage',
        value: `${currentUsage.usagePercentage}%`,
        icon: 'chart-pie',
        color: colors.success,
      },
      {
        title: 'Avg. Usage',
        value: `${stats.averageUsage} days`,
        icon: 'chart-line',
        color: colors.secondary,
      },
      {
        title: 'Active Plans',
        value: `${stats.activeSubscriptions}`,
        icon: 'shield-check',
        color: colors.warning,
      },
    ];

    return (
      <View style={styles.statsGrid}>
        {statItems.map((item, index) => (
          <Animated.View
            key={index}
            style={[
              styles.statItem,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={[styles.statIcon, { backgroundColor: item.color + '20' }]}>
              <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
            </View>
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statTitle}>{item.title}</Text>
          </Animated.View>
        ))}
      </View>
    );
  };

  const renderRecommendations = () => {
    const recommendations = getRecommendations();

    if (recommendations.length === 0) {
      return (
        <View style={styles.noRecommendations}>
          <MaterialCommunityIcons name="check-circle" size={48} color={colors.success} />
          <Text style={styles.noRecommendationsText}>All good! No recommendations at this time.</Text>
        </View>
      );
    }

    return (
      <View style={styles.recommendationsContainer}>
        <Text style={styles.recommendationsTitle}>Recommendations</Text>
        {recommendations.map((rec, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.recommendationItem,
              rec.type === 'urgent' && styles.urgentRecommendation,
              rec.type === 'warning' && styles.warningRecommendation,
            ]}
          >
            <MaterialCommunityIcons
              name={rec.icon}
              size={20}
              color={rec.type === 'urgent' ? colors.error : rec.type === 'warning' ? colors.warning : colors.primary}
            />
            <View style={styles.recommendationContent}>
              <Text style={styles.recommendationTitle}>{rec.title}</Text>
              <Text style={styles.recommendationMessage}>{rec.message}</Text>
            </View>
            <TouchableOpacity style={styles.recommendationAction}>
              <Text style={styles.recommendationActionText}>{rec.action}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Subscription Analytics</Text>
          <View style={styles.periodSelector}>
            {(['week', 'month', 'year'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.activePeriodButton,
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === period && styles.activePeriodButtonText,
                  ]}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Usage Chart */}
        {renderUsageChart()}

        {/* Stats Grid */}
        {renderStats()}

        {/* Recommendations */}
        {renderRecommendations()}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {onViewHistory && (
            <TouchableOpacity style={styles.secondaryButton} onPress={onViewHistory}>
              <MaterialCommunityIcons name="history" size={20} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>View History</Text>
            </TouchableOpacity>
          )}
          {onUpgrade && (
            <TouchableOpacity style={styles.primaryButton} onPress={onUpgrade}>
              <MaterialCommunityIcons name="arrow-up" size={20} color={colors.white} />
              <Text style={styles.primaryButtonText}>Upgrade Plan</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fonts.size.xl,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: 8,
    padding: 2,
  },
  periodButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  activePeriodButton: {
    backgroundColor: colors.white,
  },
  periodButtonText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  activePeriodButtonText: {
    color: colors.primary,
  },
  chartContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  chart: {
    flexDirection: 'row',
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  chartBar: {
    height: '100%',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.xs,
  },
  legendText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statItem: {
    width: (screenWidth - spacing.lg * 3) / 2,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: fonts.size.xl,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  recommendationsContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recommendationsTitle: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  urgentRecommendation: {
    backgroundColor: colors.error + '10',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  warningRecommendation: {
    backgroundColor: colors.warning + '10',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  recommendationContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  recommendationTitle: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  recommendationMessage: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
  },
  recommendationAction: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  recommendationActionText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  noRecommendations: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  noRecommendationsText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
  },
  primaryButtonText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: spacing.xs,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
});

export default SubscriptionAnalytics;





