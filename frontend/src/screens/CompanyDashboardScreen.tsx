import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import { API_ENDPOINTS } from '../constants/api';

interface FleetStats {
  totalVehicles: number;
  activeVehicles: number;
  totalDrivers: number;
  activeDrivers: number;
  assignedDrivers: number;
  totalJobs: number;
  completedJobs: number;
  pendingJobs: number;
  totalEarnings: number;
  thisMonthEarnings: number;
}

interface RecentActivity {
  id: string;
  type: 'job_completed' | 'driver_assigned' | 'vehicle_added' | 'driver_recruited';
  message: string;
  timestamp: string;
  driverName?: string;
  vehicleRegistration?: string;
}

const CompanyDashboardScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<FleetStats>({
    totalVehicles: 0,
    activeVehicles: 0,
    totalDrivers: 0,
    activeDrivers: 0,
    assignedDrivers: 0,
    totalJobs: 0,
    completedJobs: 0,
    pendingJobs: 0,
    totalEarnings: 0,
    thisMonthEarnings: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      // Fetch fleet stats and recent activity
      const [vehiclesRes, driversRes, jobsRes, activityRes] = await Promise.all([
        fetch(`${API_ENDPOINTS.VEHICLES}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_ENDPOINTS.DRIVERS}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_ENDPOINTS.BOOKINGS}/company-stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_ENDPOINTS.COMPANIES}/recent-activity`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      ]);

      // Process vehicles data
      if (vehiclesRes.ok) {
        const vehiclesData = await vehiclesRes.json();
        const vehicles = vehiclesData.vehicles || [];
        setStats(prev => ({
          ...prev,
          totalVehicles: vehicles.length,
          activeVehicles: vehicles.filter((v: any) => v.status === 'approved').length,
        }));
      }

      // Process drivers data
      if (driversRes.ok) {
        const driversData = await driversRes.json();
        const drivers = driversData.drivers || [];
        setStats(prev => ({
          ...prev,
          totalDrivers: drivers.length,
          activeDrivers: drivers.filter((d: any) => d.status === 'active').length,
          assignedDrivers: drivers.filter((d: any) => d.assignedVehicleId).length,
        }));
      }

      // Process jobs data
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setStats(prev => ({
          ...prev,
          totalJobs: jobsData.totalJobs || 0,
          completedJobs: jobsData.completedJobs || 0,
          pendingJobs: jobsData.pendingJobs || 0,
          totalEarnings: jobsData.totalEarnings || 0,
          thisMonthEarnings: jobsData.thisMonthEarnings || 0,
        }));
      }

      // Process recent activity
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setRecentActivity(activityData.activities || []);
      }

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const renderStatCard = (title: string, value: string | number, icon: string, color: string, onPress?: () => void) => (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.statHeader}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statTitle}>{title}</Text>
    </TouchableOpacity>
  );

  const renderActivityItem = (activity: RecentActivity) => (
    <View key={activity.id} style={styles.activityItem}>
      <View style={styles.activityIcon}>
        <MaterialCommunityIcons
          name={
            activity.type === 'job_completed' ? 'check-circle' :
            activity.type === 'driver_assigned' ? 'account-plus' :
            activity.type === 'vehicle_added' ? 'truck-plus' :
            'account-group'
          }
          size={20}
          color={colors.primary}
        />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityMessage}>{activity.message}</Text>
        <Text style={styles.activityTime}>
          {new Date(activity.timestamp).toLocaleString()}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fleet Dashboard</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <MaterialCommunityIcons name="refresh" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
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
            {renderStatCard(
              'Total Vehicles',
              stats.totalVehicles,
              'truck',
              colors.primary,
              () => navigation.navigate('VehicleManagement')
            )}
            {renderStatCard(
              'Active Vehicles',
              stats.activeVehicles,
              'truck-check',
              colors.success
            )}
            {renderStatCard(
              'Total Drivers',
              stats.totalDrivers,
              'account-group',
              colors.warning,
              () => navigation.navigate('DriverManagement')
            )}
            {renderStatCard(
              'Active Drivers',
              stats.activeDrivers,
              'account-check',
              colors.success
            )}
          </View>
        </View>

        {/* Job Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Performance</Text>
          <View style={styles.statsGrid}>
            {renderStatCard(
              'Total Jobs',
              stats.totalJobs,
              'briefcase',
              colors.primary
            )}
            {renderStatCard(
              'Completed',
              stats.completedJobs,
              'check-circle',
              colors.success
            )}
            {renderStatCard(
              'Pending',
              stats.pendingJobs,
              'clock',
              colors.warning
            )}
            {renderStatCard(
              'This Month',
              `$${stats.thisMonthEarnings.toLocaleString()}`,
              'currency-usd',
              colors.success
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('VehicleManagement')}
            >
              <MaterialCommunityIcons name="truck-plus" size={32} color={colors.primary} />
              <Text style={styles.actionText}>Add Vehicle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('DriverManagement')}
            >
              <MaterialCommunityIcons name="account-plus" size={32} color={colors.primary} />
              <Text style={styles.actionText}>Recruit Driver</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('FleetAnalytics')}
            >
              <MaterialCommunityIcons name="chart-line" size={32} color={colors.primary} />
              <Text style={styles.actionText}>Analytics</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('FleetReports')}
            >
              <MaterialCommunityIcons name="file-document" size={32} color={colors.primary} />
              <Text style={styles.actionText}>Reports</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {recentActivity.length === 0 ? (
            <View style={styles.emptyActivity}>
              <MaterialCommunityIcons name="clock-outline" size={48} color={colors.text.secondary} />
              <Text style={styles.emptyText}>No recent activity</Text>
            </View>
          ) : (
            <View style={styles.activityList}>
              {recentActivity.slice(0, 5).map(renderActivityItem)}
            </View>
          )}
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={48} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchDashboardData}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.white,
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text.primary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
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
    fontFamily: fonts.bold,
    color: colors.text.primary,
  },
  statTitle: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.text.secondary,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.text.primary,
    marginTop: 8,
  },
  activityList: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.text.primary,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.text.secondary,
  },
  emptyActivity: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.white,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.text.secondary,
    marginTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.text.secondary,
    marginTop: 16,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.error,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.white,
  },
});

export default CompanyDashboardScreen;
