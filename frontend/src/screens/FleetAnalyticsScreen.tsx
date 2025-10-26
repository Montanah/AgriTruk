import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { API_ENDPOINTS } from '../constants/api';

const { width } = Dimensions.get('window');

interface FleetStats {
  totalVehicles: number;
  activeVehicles: number;
  totalDrivers: number;
  activeDrivers: number;
  assignedDrivers: number;
  totalJobs: number;
  completedJobs: number;
  pendingJobs: number;
  monthlyRevenue: number;
  averageJobValue: number;
  utilizationRate: number;
  maintenanceAlerts: number;
}

const FleetAnalyticsScreen = () => {
  const navigation = useNavigation();
  const [stats, setStats] = useState<FleetStats>({
    totalVehicles: 0,
    activeVehicles: 0,
    totalDrivers: 0,
    activeDrivers: 0,
    assignedDrivers: 0,
    totalJobs: 0,
    completedJobs: 0,
    pendingJobs: 0,
    monthlyRevenue: 0,
    averageJobValue: 0,
    utilizationRate: 0,
    maintenanceAlerts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      const [vehiclesRes, driversRes, jobsRes] = await Promise.all([
        fetch(`${API_ENDPOINTS.VEHICLES}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_ENDPOINTS.DRIVERS}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_ENDPOINTS.BOOKINGS}/analytics`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
      ]);

      const vehiclesData = vehiclesRes.ok ? await vehiclesRes.json() : { vehicles: [] };
      const driversData = driversRes.ok ? await driversRes.json() : { drivers: [] };
      const jobsData = jobsRes.ok ? await jobsRes.json() : { analytics: {} };

      const vehicles = vehiclesData.vehicles || [];
      const drivers = driversData.drivers || [];
      const analytics = jobsData.analytics || {};

      // Only count approved vehicles for companies
      const approvedVehicles = vehicles.filter(v => v.status === 'approved');

      setStats({
        totalVehicles: approvedVehicles.length,
        activeVehicles: approvedVehicles.filter(v => !v.assignedDriverId).length,
        totalDrivers: drivers.length,
        activeDrivers: drivers.filter(d => d.status === 'active').length,
        assignedDrivers: drivers.filter(d => d.assignedVehicleId).length,
        totalJobs: analytics.totalJobs || 0,
        completedJobs: analytics.completedJobs || 0,
        pendingJobs: analytics.pendingJobs || 0,
        monthlyRevenue: analytics.monthlyRevenue || 0,
        averageJobValue: analytics.averageJobValue || 0,
        utilizationRate: analytics.utilizationRate || 0,
        maintenanceAlerts: analytics.maintenanceAlerts || 0,
      });
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const StatCard = ({ title, value, icon, color, subtitle }: {
    title: string;
    value: string | number;
    icon: string;
    color: string;
    subtitle?: string;
  }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            try {
              navigation.goBack();
            } catch (error) {
              // Fallback navigation if goBack fails
              navigation.navigate('FleetManagement');
            }
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fleet Analytics</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={onRefresh}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="refresh" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Fleet Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fleet Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Vehicles"
              value={stats.totalVehicles}
              icon="truck"
              color={colors.primary}
            />
            <StatCard
              title="Active Vehicles"
              value={stats.activeVehicles}
              icon="truck-check"
              color={colors.success}
            />
            <StatCard
              title="Total Drivers"
              value={stats.totalDrivers}
              icon="account-group"
              color={colors.warning}
            />
            <StatCard
              title="Assigned Drivers"
              value={stats.assignedDrivers}
              icon="account-check"
              color={colors.success}
            />
          </View>
        </View>

        {/* Job Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Performance</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Jobs"
              value={stats.totalJobs}
              icon="briefcase"
              color={colors.primary}
            />
            <StatCard
              title="Completed"
              value={stats.completedJobs}
              icon="check-circle"
              color={colors.success}
            />
            <StatCard
              title="Pending"
              value={stats.pendingJobs}
              icon="clock"
              color={colors.warning}
            />
            <StatCard
              title="Utilization Rate"
              value={`${stats.utilizationRate}%`}
              icon="chart-line"
              color={colors.info}
            />
          </View>
        </View>

        {/* Financial Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Metrics</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Monthly Revenue"
              value={`$${stats.monthlyRevenue.toLocaleString()}`}
              icon="currency-usd"
              color={colors.success}
            />
            <StatCard
              title="Average Job Value"
              value={`$${stats.averageJobValue.toLocaleString()}`}
              icon="chart-bar"
              color={colors.primary}
            />
            <StatCard
              title="Maintenance Alerts"
              value={stats.maintenanceAlerts}
              icon="alert"
              color={colors.error}
              subtitle="Requires attention"
            />
          </View>
        </View>

        {/* Performance Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Insights</Text>
          <View style={styles.insightsContainer}>
            <View style={styles.insightCard}>
              <MaterialCommunityIcons name="trending-up" size={32} color={colors.success} />
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>Fleet Utilization</Text>
                <Text style={styles.insightDescription}>
                  {stats.utilizationRate > 80 
                    ? 'Excellent utilization rate! Your fleet is performing well.'
                    : stats.utilizationRate > 60
                    ? 'Good utilization rate. Consider optimizing assignments.'
                    : 'Low utilization rate. Review fleet efficiency and job assignments.'
                  }
                </Text>
              </View>
            </View>

            <View style={styles.insightCard}>
              <MaterialCommunityIcons name="account-group" size={32} color={colors.warning} />
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>Driver Assignment</Text>
                <Text style={styles.insightDescription}>
                  {stats.assignedDrivers === stats.totalDrivers
                    ? 'All drivers are assigned to vehicles. Great job!'
                    : `${stats.totalDrivers - stats.assignedDrivers} drivers need vehicle assignments.`
                  }
                </Text>
              </View>
            </View>

            <View style={styles.insightCard}>
              <MaterialCommunityIcons name="wrench" size={32} color={colors.error} />
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>Maintenance</Text>
                <Text style={styles.insightDescription}>
                  {stats.maintenanceAlerts === 0
                    ? 'No maintenance alerts. All vehicles are in good condition.'
                    : `${stats.maintenanceAlerts} vehicles require maintenance attention.`
                  }
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('FleetReports')}
            >
              <MaterialCommunityIcons name="file-document" size={24} color={colors.primary} />
              <Text style={styles.actionButtonText}>Generate Report</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('FleetMaintenance')}
            >
              <MaterialCommunityIcons name="wrench" size={24} color={colors.warning} />
              <Text style={styles.actionButtonText}>Maintenance</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('DriverAssignments')}
            >
              <MaterialCommunityIcons name="account-arrow-right" size={24} color={colors.success} />
              <Text style={styles.actionButtonText}>Assignments</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.primary,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.white,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding for bottom navigation
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    width: (width - 60) / 2,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  statTitle: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  insightsContainer: {
    gap: 12,
  },
  insightCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightContent: {
    flex: 1,
    marginLeft: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default FleetAnalyticsScreen;
