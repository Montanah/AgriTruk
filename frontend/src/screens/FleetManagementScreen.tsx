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
import { getAuth } from 'firebase/auth';

const FleetManagementScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fleetStats, setFleetStats] = useState({
    totalVehicles: 0,
    activeVehicles: 0,
    totalDrivers: 0,
    activeDrivers: 0,
    assignedDrivers: 0,
  });

  const fetchFleetStats = async () => {
    try {
      setLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      const [vehiclesRes, driversRes] = await Promise.all([
        fetch(`${API_ENDPOINTS.VEHICLES}`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        }),
        fetch(`${API_ENDPOINTS.DRIVERS}`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        }),
      ]);

      const vehiclesData = vehiclesRes.ok ? await vehiclesRes.json() : { vehicles: [] };
      const driversData = driversRes.ok ? await driversRes.json() : { drivers: [] };

      setFleetStats({
        totalVehicles: vehiclesData.vehicles.length,
        activeVehicles: vehiclesData.vehicles.filter(v => v.status === 'approved' && !v.assignedDriverId).length,
        totalDrivers: driversData.drivers.length,
        activeDrivers: driversData.drivers.filter(d => d.status === 'active').length,
        assignedDrivers: driversData.drivers.filter(d => d.assignedVehicleId).length,
      });
    } catch (err: any) {
      console.error('Error fetching fleet stats:', err);
      // Don't show alert for 404 errors - just set empty stats
      if (err.message && err.message.includes('404')) {
        console.log('Fleet data not available yet - showing empty state');
      } else {
        Alert.alert(
          'Unable to Load Fleet Data', 
          'We couldn\'t load your fleet statistics. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFleetStats();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchFleetStats();
  }, []);

  const fleetOptions = [
    {
      id: 'vehicles',
      title: 'Vehicle Management',
      subtitle: 'Add, edit, and manage your fleet vehicles',
      icon: 'truck',
      color: colors.primary,
      onPress: () => navigation.navigate('VehicleManagement')
    },
    {
      id: 'drivers',
      title: 'Driver Management',
      subtitle: 'Recruit, manage, and assign drivers',
      icon: 'account-group',
      color: colors.warning,
      onPress: () => navigation.navigate('DriverManagement')
    },
    {
      id: 'assignments',
      title: 'Driver Assignments',
      subtitle: 'Assign drivers to vehicles and manage assignments',
      icon: 'account-arrow-right',
      color: colors.success,
      onPress: () => navigation.navigate('DriverAssignments')
    },
    {
      id: 'analytics',
      title: 'Fleet Analytics',
      subtitle: 'View performance metrics and insights',
      icon: 'chart-line',
      color: colors.info,
      onPress: () => navigation.navigate('FleetAnalytics')
    },
    {
      id: 'reports',
      title: 'Fleet Reports',
      subtitle: 'Generate and view detailed reports',
      icon: 'file-document',
      color: colors.secondary,
      onPress: () => navigation.navigate('FleetReports')
    },
    {
      id: 'maintenance',
      title: 'Maintenance',
      subtitle: 'Track vehicle maintenance and schedules',
      icon: 'wrench',
      color: colors.error,
      onPress: () => navigation.navigate('FleetMaintenance')
    }
  ];

  const renderFleetOption = (option: any) => (
    <TouchableOpacity
      key={option.id}
      style={styles.optionCard}
      onPress={option.onPress}
    >
      <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
        <MaterialCommunityIcons name={option.icon} size={32} color={option.color} />
      </View>
      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>{option.title}</Text>
        <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={colors.text.secondary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            try {
              navigation.goBack();
            } catch (error) {
              // Fallback navigation if goBack fails
              navigation.navigate('CompanyDashboard');
            }
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fleet Management</Text>
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manage Your Fleet</Text>
          <Text style={styles.sectionSubtitle}>
            Control and monitor your vehicles, drivers, and operations
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {fleetOptions.map(renderFleetOption)}
        </View>

        <View style={styles.quickStats}>
          <Text style={styles.statsTitle}>Fleet Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="truck" size={24} color={colors.primary} />
              <Text style={styles.statNumber}>{fleetStats.totalVehicles}</Text>
              <Text style={styles.statLabel}>Total Vehicles</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="truck-check" size={24} color={colors.success} />
              <Text style={styles.statNumber}>{fleetStats.activeVehicles}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="account-group" size={24} color={colors.warning} />
              <Text style={styles.statNumber}>{fleetStats.totalDrivers}</Text>
              <Text style={styles.statLabel}>Total Drivers</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="account-check" size={24} color={colors.success} />
              <Text style={styles.statNumber}>{fleetStats.assignedDrivers}</Text>
              <Text style={styles.statLabel}>Assigned</Text>
            </View>
          </View>
        </View>
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  headerRight: {
    width: 40,
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
    fontSize: 24,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  optionsContainer: {
    marginBottom: 32,
  },
  optionCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  quickStats: {
    marginBottom: 20,
  },
  statsTitle: {
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
    width: '48%',
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default FleetManagementScreen;
