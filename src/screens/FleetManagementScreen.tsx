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
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import { API_ENDPOINTS } from '../constants/api';
import { getAuth } from 'firebase/auth';
import subscriptionService, { SubscriptionStatus } from '../services/subscriptionService';
import companyFleetValidationService from '../services/companyFleetValidationService';
import { apiRequest } from '../utils/api';

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
  
  // Company profile state
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [loadingCompanyProfile, setLoadingCompanyProfile] = useState(false);
  
  // Vehicle and driver lists
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  
  // Subscription state
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [jobSeekersAccess, setJobSeekersAccess] = useState<any>(null);
  const [vehicleValidation, setVehicleValidation] = useState<any>(null);
  const [driverValidation, setDriverValidation] = useState<any>(null);
  const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false);

  const fetchSubscriptionStatus = async () => {
    try {
      const status = await subscriptionService.getSubscriptionStatus();
      console.log('🔍 FleetManagementScreen - Raw subscription status:', JSON.stringify(status, null, 2));
      
      // Add transporterType to the status for proper plan detection
      const statusWithType = {
        ...status,
        transporterType: 'company'
      };
      console.log('🔍 FleetManagementScreen - Status with transporterType:', JSON.stringify(statusWithType, null, 2));
      setSubscriptionStatus(statusWithType);
      
      // Validate job seekers marketplace access
      const access = companyFleetValidationService.validateJobSeekersAccess(status);
      setJobSeekersAccess(access);
      
      // Store subscription status for later use
      setSubscriptionStatus(status);
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    }
  };

  const updateSubscriptionWithRealCounts = (vehicleCount: number, driverCount: number) => {
    if (subscriptionStatus) {
      console.log('📊 Updating subscription with real counts:', { vehicleCount, driverCount });
      console.log('📊 Current subscription status:', subscriptionStatus);
      
      // DYNAMIC LIMITS - Use actual subscription plan limits
      const getVehicleLimit = () => {
        if (subscriptionStatus.freeTrialActive || subscriptionStatus.isTrialActive) return 3; // Trial limit
        if (subscriptionStatus.currentPlan?.id === 'fleet_basic') return 5;
        if (subscriptionStatus.currentPlan?.id === 'fleet_growing') return 15;
        if (subscriptionStatus.currentPlan?.id === 'fleet_enterprise') return -1; // Unlimited
        return 3; // Default trial limit
      };
      
      const getDriverLimit = () => {
        if (subscriptionStatus.freeTrialActive || subscriptionStatus.isTrialActive) return 3; // Trial limit
        if (subscriptionStatus.currentPlan?.id === 'fleet_basic') return 5;
        if (subscriptionStatus.currentPlan?.id === 'fleet_growing') return 15;
        if (subscriptionStatus.currentPlan?.id === 'fleet_enterprise') return -1; // Unlimited
        return 3; // Default trial limit
      };
      
      const vehicleLimit = getVehicleLimit();
      const driverLimit = getDriverLimit();
      
      const forcedVehicleValidation = {
        canAdd: vehicleLimit === -1 || vehicleCount < vehicleLimit,
        currentCount: vehicleCount, // Use actual vehicle count
        limit: vehicleLimit,
        percentage: vehicleLimit === -1 ? 0 : Math.min((vehicleCount / vehicleLimit) * 100, 100),
        reason: vehicleLimit === -1 ? 'Unlimited vehicles' : `Plan allows up to ${vehicleLimit} vehicles`
      };
      
      const forcedDriverValidation = {
        canAdd: driverLimit === -1 || driverCount < driverLimit,
        currentCount: driverCount, // Use actual driver count
        limit: driverLimit,
        percentage: driverLimit === -1 ? 0 : Math.min((driverCount / driverLimit) * 100, 100),
        reason: driverLimit === -1 ? 'Unlimited drivers' : `Plan allows up to ${driverLimit} drivers`
      };
      
      console.log('🔍 FleetManagementScreen - DYNAMIC Vehicle validation result:', JSON.stringify(forcedVehicleValidation, null, 2));
      console.log('🔍 FleetManagementScreen - DYNAMIC Driver validation result:', JSON.stringify(forcedDriverValidation, null, 2));
      
      setVehicleValidation(forcedVehicleValidation);
      setDriverValidation(forcedDriverValidation);
    }
  };

  const fetchCompanyProfile = async (): Promise<any | null> => {
    if (loadingCompanyProfile) {
      console.log('🏢 Company profile already loading, skipping...');
      return companyProfile; // Return existing profile if already loading
    }

    try {
      setLoadingCompanyProfile(true);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        console.error('🏢 No authenticated user');
        return null;
      }

      console.log('🏢 Fetching company profile for user:', user.uid);
      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.COMPANIES}/transporter/${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🏢 Company profile loaded:', data);
        const profile = data[0] || data;
        console.log('🏢 Setting company profile:', profile);
        console.log('🏢 Company ID:', profile?.id || profile?.companyId);
        setCompanyProfile(profile);
        return profile; // Return the profile data directly
      } else {
        console.error('🏢 Failed to load company profile:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('🏢 Error response:', errorText);
        return null;
      }
    } catch (error) {
      console.error('Error fetching company profile:', error);
      return null;
    } finally {
      setLoadingCompanyProfile(false);
    }
  };

  const fetchFleetStats = async () => {
    try {
      setLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      // Ensure company profile is loaded - get it directly from the function
      let currentProfile = companyProfile;
      if (!currentProfile?.id && !currentProfile?.companyId) {
        console.log('🏢 Company profile not loaded, fetching...');
        currentProfile = await fetchCompanyProfile();
        if (!currentProfile) {
          console.error('🏢 Failed to load company profile');
          Alert.alert(
            'Company Profile Error',
            'Unable to load your company profile. This might be a temporary issue.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Retry', 
                onPress: async () => {
                  const retryProfile = await fetchCompanyProfile();
                  if (retryProfile) {
                    await fetchFleetStats();
                  }
                }
              }
            ]
          );
          setLoading(false);
          return;
        }
      }

      // Use the profile we just fetched or the existing one
      const companyId = currentProfile?.id || currentProfile?.companyId;
      if (!companyId) {
        console.error('🏢 Company ID not available');
        setLoading(false);
        return;
      }

      console.log('🏢 Fetching fleet data for company:', companyId);
      const token = await user.getIdToken();

      // Use company-specific endpoints
      const [vehiclesData, driversData] = await Promise.all([
        apiRequest(`/companies/${companyId}/vehicles`).catch(() => ({ vehicles: [] })),
        apiRequest(`/companies/${companyId}/drivers`).catch(() => ({ drivers: [] })),
      ]);

      const vehiclesList = vehiclesData.vehicles || [];
      const driversList = driversData.drivers || [];

      // Count all vehicles for total, but only approved for active
      const allVehicles = vehiclesList;
      const approvedVehicles = allVehicles.filter((v: any) => v.status === 'approved');
      const totalVehicleCount = allVehicles.length;
      const driverCount = driversList.length;

      // Set vehicles and drivers for display - show ALL vehicles and drivers (not just approved/active)
      setVehicles(allVehicles); // Show all vehicles including pending
      setDrivers(driversList); // Show all drivers including pending and inactive

      setFleetStats({
        totalVehicles: totalVehicleCount,
        activeVehicles: approvedVehicles.filter((v: any) => !v.assignedDriverId).length,
        totalDrivers: driverCount,
        activeDrivers: driversList.filter((d: any) => d.status === 'active').length,
        assignedDrivers: driversList.filter((d: any) => d.assignedVehicleId).length,
      });

      // Update subscription status with real counts (only approved vehicles for limits)
      updateSubscriptionWithRealCounts(approvedVehicles.length, driverCount);
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
    await fetchCompanyProfile();
    await fetchFleetStats();
    setRefreshing(false);
  };

  useEffect(() => {
    const initializeData = async () => {
      await fetchSubscriptionStatus();
      await fetchCompanyProfile();
      await fetchFleetStats();
    };
    
    initializeData();
  }, []);

  // Refetch fleet stats when company profile is loaded
  useEffect(() => {
    if ((companyProfile?.id || companyProfile?.companyId) && !loading) {
      fetchFleetStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyProfile?.id, companyProfile?.companyId]);

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
      subtitle: 'Recruit and manage your driver team',
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
      id: 'job-seekers',
      title: 'Browse Job Seekers',
      subtitle: 'Find and recruit qualified drivers',
      icon: 'account-search',
      color: colors.primary,
      onPress: () => {
        if (jobSeekersAccess?.hasAccess) {
          navigation.navigate('JobSeekersMarketplace');
        } else {
          Alert.alert(
            'Feature Not Available',
            jobSeekersAccess?.reason || 'Job Seekers Marketplace is not available in your current plan.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Upgrade Plan', 
                onPress: () => navigation.navigate('CompanyFleetPlans' as never)
              }
            ]
          );
        }
      }
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
        contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
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
              {subscriptionStatus && vehicleValidation ? (
                <Text style={styles.statSubtext}>
                  {vehicleValidation.currentCount} / {vehicleValidation.limit === -1 ? 'Unlimited' : vehicleValidation.limit}
                </Text>
              ) : subscriptionStatus ? (
                <Text style={styles.statSubtext}>
                  {fleetStats.totalVehicles} / 3 (Trial)
                </Text>
              ) : null}
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
              {subscriptionStatus && driverValidation ? (
                <Text style={styles.statSubtext}>
                  {driverValidation.currentCount} / {driverValidation.limit === -1 ? 'Unlimited' : driverValidation.limit}
                </Text>
              ) : subscriptionStatus ? (
                <Text style={styles.statSubtext}>
                  {fleetStats.totalDrivers} / 3 (Trial)
                </Text>
              ) : null}
            </View>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="account-check" size={24} color={colors.success} />
              <Text style={styles.statNumber}>{fleetStats.assignedDrivers}</Text>
              <Text style={styles.statLabel}>Assigned</Text>
            </View>
          </View>
        </View>

        {/* Vehicles List */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Vehicles ({vehicles.length})</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('VehicleManagement' as never)}
            >
              <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
              <Text style={styles.addButtonText}>Add Vehicle</Text>
            </TouchableOpacity>
          </View>
          {loading && vehicles.length === 0 && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Loading vehicles...</Text>
            </View>
          ) : vehicles.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="truck-remove" size={48} color={colors.text.light} />
              <Text style={styles.emptyText}>No vehicles added yet</Text>
              <Text style={styles.emptySubtext}>Start building your fleet by adding your first vehicle</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('VehicleManagement' as never)}
              >
                <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
                <Text style={styles.emptyButtonText}>Add First Vehicle</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={vehicles.slice(0, 5)} // Show first 5 vehicles
              keyExtractor={(item) => item.id || item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.itemCard}
                  onPress={() => navigation.navigate('VehicleManagement' as never)}
                >
                  <View style={styles.itemIcon}>
                    <MaterialCommunityIcons name="truck" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle}>{item.vehicleReg || item.registration || 'N/A'}</Text>
                    <Text style={styles.itemSubtitle}>
                      {item.vehicleMake || item.make} {item.vehicleType || item.type}
                    </Text>
                    <View style={styles.itemBadge}>
                      <MaterialCommunityIcons 
                        name={item.status === 'approved' ? 'check-circle' : item.status === 'rejected' ? 'close-circle' : 'clock-outline'} 
                        size={12} 
                        color={item.status === 'approved' ? colors.success : item.status === 'rejected' ? colors.error : colors.warning} 
                      />
                      <Text style={[
                        styles.itemBadgeText,
                        { color: item.status === 'approved' ? colors.success : item.status === 'rejected' ? colors.error : colors.warning }
                      ]}>
                        {item.status === 'approved' ? 'Active' : item.status === 'rejected' ? 'Rejected' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.text.secondary} />
                </TouchableOpacity>
              )}
              scrollEnabled={false}
              ListFooterComponent={
                vehicles.length > 5 ? (
                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => navigation.navigate('VehicleManagement' as never)}
                  >
                    <Text style={styles.viewAllText}>View All {vehicles.length} Vehicles</Text>
                  </TouchableOpacity>
                ) : null
              }
            />
          )}
        </View>

        {/* Drivers List */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Drivers ({drivers.length})</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('DriverManagement' as never)}
            >
              <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
              <Text style={styles.addButtonText}>Add Driver</Text>
            </TouchableOpacity>
          </View>
          {loading && drivers.length === 0 && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Loading drivers...</Text>
            </View>
          ) : drivers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-remove" size={48} color={colors.text.light} />
              <Text style={styles.emptyText}>No drivers added yet</Text>
              <Text style={styles.emptySubtext}>Recruit and manage your driver team</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('DriverManagement' as never)}
              >
                <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
                <Text style={styles.emptyButtonText}>Add First Driver</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={drivers.slice(0, 5)} // Show first 5 drivers
              keyExtractor={(item) => item.id || item._id || item.driverId}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.itemCard}
                  onPress={() => navigation.navigate('DriverManagement' as never)}
                >
                  <View style={styles.itemIcon}>
                    <MaterialCommunityIcons name="account" size={24} color={colors.warning} />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle}>{item.name || item.driverName || 'N/A'}</Text>
                    <Text style={styles.itemSubtitle}>
                      {item.phone || item.phoneNumber || 'No phone'}
                    </Text>
                    <View style={styles.itemBadge}>
                      <MaterialCommunityIcons 
                        name={item.status === 'active' ? 'check-circle' : item.status === 'inactive' ? 'pause-circle' : item.status === 'rejected' ? 'close-circle' : 'clock-outline'} 
                        size={12} 
                        color={item.status === 'active' ? colors.success : item.status === 'inactive' ? colors.text.secondary : item.status === 'rejected' ? colors.error : colors.warning} 
                      />
                      <Text style={[
                        styles.itemBadgeText,
                        { color: item.status === 'active' ? colors.success : item.status === 'inactive' ? colors.text.secondary : item.status === 'rejected' ? colors.error : colors.warning }
                      ]}>
                        {item.status === 'active' ? 'Active' : item.status === 'inactive' ? 'Inactive' : item.status === 'rejected' ? 'Rejected' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.text.secondary} />
                </TouchableOpacity>
              )}
              scrollEnabled={false}
              ListFooterComponent={
                drivers.length > 5 ? (
                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => navigation.navigate('DriverManagement' as never)}
                  >
                    <Text style={styles.viewAllText}>View All {drivers.length} Drivers</Text>
                  </TouchableOpacity>
                ) : null
              }
            />
          )}
        </View>

        {/* Collapsible Subscription Section */}
        {subscriptionStatus && (vehicleValidation || driverValidation) && (
          <View style={styles.subscriptionSection}>
            <TouchableOpacity 
              style={styles.subscriptionToggle}
              onPress={() => setShowSubscriptionDetails(!showSubscriptionDetails)}
            >
              <View style={styles.subscriptionToggleContent}>
                <MaterialCommunityIcons 
                  name="truck" 
                  size={20} 
                  color={subscriptionStatus.freeTrialActive ? colors.warning : colors.primary} 
                />
                <View style={styles.subscriptionToggleInfo}>
                  <Text style={styles.subscriptionToggleTitle}>
                    {subscriptionStatus.freeTrialActive ? 'Free Trial' : subscriptionStatus.currentPlan?.name || 'Subscription'}
                  </Text>
                  <Text style={styles.subscriptionToggleSubtitle}>
                    {subscriptionStatus.freeTrialActive 
                      ? `${subscriptionStatus.freeTrialDaysRemaining} days remaining`
                      : 'Active Plan'
                    }
                  </Text>
                </View>
                <MaterialCommunityIcons 
                  name={showSubscriptionDetails ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={colors.text.secondary} 
                />
              </View>
            </TouchableOpacity>
            
            {showSubscriptionDetails && (
              <View style={styles.subscriptionDetails}>
                <View style={styles.usageContainer}>
                  {vehicleValidation && (
                    <View style={styles.usageItem}>
                      <Text style={styles.usageLabel}>Vehicles</Text>
                      <Text style={styles.usageCount}>
                        {vehicleValidation.currentCount} / {vehicleValidation.limit === -1 ? 'Unlimited' : vehicleValidation.limit}
                      </Text>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill, 
                            { 
                              width: `${vehicleValidation.percentage}%`,
                              backgroundColor: vehicleValidation.canAdd ? colors.success : colors.warning
                            }
                          ]} 
                        />
                      </View>
                      {!vehicleValidation.canAdd && (
                        <Text style={styles.limitReachedText}>Vehicle limit reached</Text>
                      )}
                    </View>
                  )}
                  
                  {driverValidation && (
                    <View style={styles.usageItem}>
                      <Text style={styles.usageLabel}>Drivers</Text>
                      <Text style={styles.usageCount}>
                        {driverValidation.currentCount} / {driverValidation.limit === -1 ? 'Unlimited' : driverValidation.limit}
                      </Text>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill, 
                            { 
                              width: `${driverValidation.percentage}%`,
                              backgroundColor: driverValidation.canAdd ? colors.success : colors.warning
                            }
                          ]} 
                        />
                      </View>
                      {!driverValidation.canAdd && (
                        <Text style={styles.limitReachedText}>Driver limit reached</Text>
                      )}
                    </View>
                  )}
                </View>
                
                {((vehicleValidation && !vehicleValidation.canAdd) || (driverValidation && !driverValidation.canAdd)) && (
                  <TouchableOpacity 
                    style={styles.upgradeButton}
                    onPress={() => navigation.navigate('CompanyFleetPlans' as never)}
                  >
                    <MaterialCommunityIcons name="arrow-up" size={16} color={colors.white} />
                    <Text style={styles.upgradeButtonText}>Upgrade Plan</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
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
  statSubtext: {
    fontSize: 10,
    fontFamily: fonts.family.medium,
    color: colors.primary,
    marginTop: 2,
    textAlign: 'center',
  },
  // Collapsible Subscription Section
  subscriptionSection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subscriptionToggle: {
    padding: 16,
  },
  subscriptionToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscriptionToggleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  subscriptionToggleTitle: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  subscriptionToggleSubtitle: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginTop: 2,
  },
  subscriptionDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  usageContainer: {
    marginTop: 16,
  },
  usageItem: {
    marginBottom: 16,
  },
  usageLabel: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginBottom: 4,
  },
  usageCount: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 8,
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
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.warning,
    marginTop: 4,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: 6,
  },
  // List Section Styles
  listSection: {
    marginBottom: 24,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: 6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: colors.white,
    borderRadius: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginLeft: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.white,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: 6,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginBottom: 6,
  },
  itemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  itemBadgeText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    marginLeft: 4,
  },
  viewAllButton: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: colors.background.light,
    borderRadius: 8,
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.primary,
  },
});

export default FleetManagementScreen;
