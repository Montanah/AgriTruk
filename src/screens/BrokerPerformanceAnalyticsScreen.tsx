import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { API_ENDPOINTS } from '../constants/api';

interface BrokerPerformanceAnalyticsProps {
  navigation: any;
}

type TimeFilter = 'week' | 'month' | 'quarter' | 'year' | 'all';

const BrokerPerformanceAnalyticsScreen = ({ navigation }: BrokerPerformanceAnalyticsProps) => {
  const [activeFilter, setActiveFilter] = useState<TimeFilter>('month');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRequests: 0,
    activeRequests: 0,
    completedRequests: 0,
    pendingRequests: 0,
    totalEarnings: 0,
    averageRequestValue: 0,
    clientGrowth: 0,
    completionRate: 0,
  });

  useEffect(() => {
    fetchPerformanceData();
  }, [activeFilter]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) return;

      const token = await user.getIdToken();
      
      // TODO: Replace with actual performance analytics endpoint when ready
      // For now, calculate from requests
      const response = await fetch(`${API_ENDPOINTS.BROKERS}/requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const requests = data.requests || data.data || [];
        
        // Calculate stats based on activeFilter
        const now = new Date();
        const filteredRequests = requests.filter((req: any) => {
          const reqDate = new Date(req.createdAt || req.created_at);
          const diffTime = now.getTime() - reqDate.getTime();
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          
          switch (activeFilter) {
            case 'week':
              return diffDays <= 7;
            case 'month':
              return diffDays <= 30;
            case 'quarter':
              return diffDays <= 90;
            case 'year':
              return diffDays <= 365;
            default:
              return true;
          }
        });

        const totalRequests = filteredRequests.length;
        const activeRequests = filteredRequests.filter((r: any) => 
          r.status === 'confirmed' || r.status === 'in_transit'
        ).length;
        const completedRequests = filteredRequests.filter((r: any) => 
          r.status === 'completed'
        ).length;
        const pendingRequests = filteredRequests.filter((r: any) => 
          r.status === 'pending'
        ).length;
        
        const totalEarnings = filteredRequests.reduce((sum: number, r: any) => 
          sum + (r.estimatedValue || r.price || 0), 0
        );
        
        const averageRequestValue = totalRequests > 0 ? totalEarnings / totalRequests : 0;
        const completionRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0;

        setStats({
          totalRequests,
          activeRequests,
          completedRequests,
          pendingRequests,
          totalEarnings,
          averageRequestValue,
          clientGrowth: 0, // TODO: Calculate from client data
          completionRate,
        });
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMetricCard = (title: string, value: string | number, icon: string, color: string) => (
    <View style={styles.metricCard}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.metricInfo}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Performance Analytics</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Time Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['week', 'month', 'quarter', 'year', 'all'] as TimeFilter[]).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterTab, activeFilter === filter && styles.activeFilterTab]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Key Metrics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Metrics</Text>
            <View style={styles.metricsGrid}>
              {renderMetricCard('Total Requests', stats.totalRequests, 'file-document-multiple', colors.primary)}
              {renderMetricCard('Completed', stats.completedRequests, 'check-circle', colors.success)}
              {renderMetricCard('Active', stats.activeRequests, 'clock-outline', colors.warning)}
              {renderMetricCard('Pending', stats.pendingRequests, 'alert-circle', colors.error)}
            </View>
          </View>

          {/* Earnings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Earnings</Text>
            <View style={styles.earningsCard}>
              <View style={styles.earningsHeader}>
                <MaterialCommunityIcons name="cash-multiple" size={32} color={colors.success} />
                <View>
                  <Text style={styles.earningsLabel}>Total Earnings</Text>
                  <Text style={styles.earningsAmount}>KES {stats.totalEarnings.toLocaleString()}</Text>
                </View>
              </View>
              <View style={styles.earningsFooter}>
                <Text style={styles.averageValue}>
                  Avg per request: KES {stats.averageRequestValue.toFixed(0).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          {/* Performance Indicators */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance Indicators</Text>
            <View style={styles.performanceCard}>
              <View style={styles.performanceRow}>
                <View style={styles.performanceInfo}>
                  <MaterialCommunityIcons name="chart-line" size={24} color={colors.primary} />
                  <Text style={styles.performanceLabel}>Completion Rate</Text>
                </View>
                <Text style={styles.performanceValue}>{stats.completionRate.toFixed(1)}%</Text>
              </View>
              
              {/* Progress bar */}
              <View style={styles.progressBar}>
                <View 
                  style={[styles.progressFill, { width: `${stats.completionRate}%` }]} 
                />
              </View>

              <View style={styles.performanceRow}>
                <View style={styles.performanceInfo}>
                  <MaterialCommunityIcons name="account-group" size={24} color={colors.secondary} />
                  <Text style={styles.performanceLabel}>Client Growth</Text>
                </View>
                <Text style={styles.performanceValue}>+{stats.clientGrowth}</Text>
              </View>
            </View>
          </View>

          {/* Insights */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Insights</Text>
            <View style={styles.insightsCard}>
              <MaterialCommunityIcons name="lightbulb" size={24} color={colors.warning} />
              <View style={styles.insightsText}>
                <Text style={styles.insightsTitle}>Keep up the good work!</Text>
                <Text style={styles.insightsDescription}>
                  You have {stats.activeRequests} active requests and are maintaining a {stats.completionRate.toFixed(0)}% completion rate.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
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
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...fonts.h3,
    color: colors.text.primary,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.white,
    gap: spacing.xs,
  },
  filterTab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.background.light,
  },
  activeFilterTab: {
    backgroundColor: colors.primary,
  },
  filterText: {
    ...fonts.body,
    color: colors.text.secondary,
    fontSize: 12,
  },
  activeFilterText: {
    color: colors.white,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...fonts.body,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...fonts.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
    fontWeight: 'bold',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  metricInfo: {
    flex: 1,
  },
  metricValue: {
    ...fonts.h3,
    color: colors.text.primary,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricTitle: {
    ...fonts.caption,
    color: colors.text.secondary,
    fontSize: 12,
  },
  earningsCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  earningsLabel: {
    ...fonts.caption,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  earningsAmount: {
    ...fonts.h2,
    color: colors.text.primary,
    fontWeight: 'bold',
  },
  earningsFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  averageValue: {
    ...fonts.body,
    color: colors.text.secondary,
    fontSize: 14,
  },
  performanceCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  performanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  performanceLabel: {
    ...fonts.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  performanceValue: {
    ...fonts.h3,
    color: colors.primary,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.background.light,
    borderRadius: 4,
    marginBottom: spacing.lg,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 4,
  },
  insightsCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  insightsText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  insightsTitle: {
    ...fonts.h4,
    color: colors.text.primary,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  insightsDescription: {
    ...fonts.body,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});

export default BrokerPerformanceAnalyticsScreen;

