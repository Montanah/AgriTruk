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
import EnhancedSubscriptionStatusCard from '../components/common/EnhancedSubscriptionStatusCard';
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';
import { COMPANY_FLEET_PLANS } from '../constants/subscriptionPlans';
import subscriptionService, { SubscriptionStatus } from '../services/subscriptionService';
import companyFleetValidationService from '../services/companyFleetValidationService';
import { apiRequest } from '../utils/api';
import { useResponsive } from '../hooks/useResponsive';
import BackgroundLocationDisclosureModal from '../components/common/BackgroundLocationDisclosureModal';
import locationService from '../services/locationService';

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
  const { isTablet, maxContentWidth, width: screenWidth, isLandscape } = useResponsive();
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
  
  // Company profile state
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [loadingCompanyProfile, setLoadingCompanyProfile] = useState(false);
  
  // Subscription state
  const [featureAccess, setFeatureAccess] = useState<any>(null);
  
  // Use the subscription hook for better subscription management
  const { subscriptionStatus, loading: subscriptionLoading } = useSubscriptionStatus();
  
  // Background location disclosure state - CRITICAL for Google Play compliance
  const [showBackgroundLocationDisclosure, setShowBackgroundLocationDisclosure] = useState(false);
  const [hasCheckedConsent, setHasCheckedConsent] = useState(false);

  // Check background location consent on mount - CRITICAL for Google Play compliance
  useEffect(() => {
    const checkBackgroundLocationConsent = async () => {
      try {
        console.log('🔍 CompanyDashboardScreen: Checking background location consent...');
        const hasConsent = await locationService.hasBackgroundLocationConsent();
        console.log('🔍 CompanyDashboardScreen: Background location consent status:', hasConsent);
        
        // If consent hasn't been given, show the prominent disclosure modal
        // This ensures Google Play reviewers will see it immediately
        if (!hasConsent) {
          console.log('📢 CompanyDashboardScreen: No consent found - showing prominent disclosure modal');
          setShowBackgroundLocationDisclosure(true);
        }
        
        setHasCheckedConsent(true);
      } catch (error) {
        console.error('Error checking background location consent:', error);
        // On error, show the disclosure to be safe (better to show it than miss it)
        setShowBackgroundLocationDisclosure(true);
        setHasCheckedConsent(true);
      }
    };

    checkBackgroundLocationConsent();
  }, []);

  const validateFeatureAccess = async () => {
    if (subscriptionStatus) {
      const access = {
        jobSeekers: companyFleetValidationService.validateJobSeekersAccess(subscriptionStatus),
        analytics: companyFleetValidationService.validateAdvancedAnalyticsAccess(subscriptionStatus),
        routeOptimization: companyFleetValidationService.validateRouteOptimizationAccess(subscriptionStatus),
        accountManager: companyFleetValidationService.validateAccountManagerAccess(subscriptionStatus),
        customIntegrations: companyFleetValidationService.validateCustomIntegrationsAccess(subscriptionStatus),
      };
      setFeatureAccess(access);
    }
  };

  const fetchCompanyProfile = async (): Promise<any | null> => {
    if (loadingCompanyProfile) {
      console.log('🏢 Company profile already loading, skipping...');
      return companyProfile; // Return existing profile if already loading
    }

    try {
      setLoadingCompanyProfile(true);
      const { getAuth } = require('firebase/auth');
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

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      // Ensure company profile is loaded first - get it directly from the function
      let currentProfile = companyProfile;
      if (!currentProfile?.id && !currentProfile?.companyId) {
        console.log('🏢 Company profile not loaded, fetching...');
        currentProfile = await fetchCompanyProfile();
        if (!currentProfile) {
          console.error('🏢 Failed to load company profile');
          setError('Unable to load company profile. Please try again.');
          setLoading(false);
          return;
        }
      }

      // Use the profile we just fetched or the existing one
      const companyId = currentProfile?.id || currentProfile?.companyId;
      if (!companyId) {
        console.error('🏢 Company ID not available');
        setError('Company ID not available. Please try again.');
        setLoading(false);
        return;
      }

      console.log('🏢 Fetching dashboard data for company:', companyId);

      // Use company-specific endpoints - handle 404s gracefully (expected for empty data)
      const [vehiclesData, driversData, jobsData, activityData] = await Promise.all([
        apiRequest(`/companies/${companyId}/vehicles`).catch((err: any) => {
          // 404 is expected for empty resources - return empty array
          if (err?.status === 404 || err?.isNotFound) {
            return { vehicles: [] };
          }
          console.error('Error fetching vehicles:', err);
          return { vehicles: [] };
        }),
        apiRequest(`/companies/${companyId}/drivers`).catch((err: any) => {
          // 404 is expected for empty resources - return empty array
          if (err?.status === 404 || err?.isNotFound) {
            return { drivers: [] };
          }
          console.error('Error fetching drivers:', err);
          return { drivers: [] };
        }),
        apiRequest(`/bookings/company-stats`).catch((err: any) => {
          // 404 is expected for empty resources - return default stats
          if (err?.status === 404 || err?.isNotFound) {
            return {
              totalJobs: 0,
              completedJobs: 0,
              pendingJobs: 0,
              totalEarnings: 0,
              thisMonthEarnings: 0,
            };
          }
          console.error('Error fetching company stats:', err);
          return {
            totalJobs: 0,
            completedJobs: 0,
            pendingJobs: 0,
            totalEarnings: 0,
            thisMonthEarnings: 0,
          };
        }),
        apiRequest(`/companies/${companyId}/recent-activity`).catch((err: any) => {
          // 404 is expected for empty resources - return empty array
          if (err?.status === 404 || err?.isNotFound) {
            return { activities: [] };
          }
          console.error('Error fetching recent activity:', err);
          return { activities: [] };
        }),
      ]);

      // Process vehicles data
      const vehicles = vehiclesData.vehicles || [];
      const allVehicles = vehicles;
      const approvedVehicles = vehicles.filter((v: any) => v.status === 'approved');
      setStats(prev => ({
        ...prev,
        totalVehicles: allVehicles.length,
        activeVehicles: approvedVehicles.length,
      }));

      // Process drivers data
      const drivers = driversData.drivers || [];
      setStats(prev => ({
        ...prev,
        totalDrivers: drivers.length,
        activeDrivers: drivers.filter((d: any) => d.status === 'active').length,
        assignedDrivers: drivers.filter((d: any) => d.assignedVehicleId).length,
      }));

      // Process jobs data
      setStats(prev => ({
        ...prev,
        totalJobs: jobsData.totalJobs || 0,
        completedJobs: jobsData.completedJobs || 0,
        pendingJobs: jobsData.pendingJobs || 0,
        totalEarnings: jobsData.totalEarnings || 0,
        thisMonthEarnings: jobsData.thisMonthEarnings || 0,
      }));

      // Process recent activity
      setRecentActivity(activityData.activities || []);

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCompanyProfile();
    await fetchDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    const initializeData = async () => {
      await fetchCompanyProfile();
      await fetchDashboardData();
    };
    
    initializeData();
  }, []);

  // Refetch dashboard data when company profile is loaded
  useEffect(() => {
    // Only refetch if profile is loaded and we're not already loading
    if ((companyProfile?.id || companyProfile?.companyId) && !loading && !refreshing) {
      // Use a small delay to avoid race conditions
      const timeoutId = setTimeout(() => {
        fetchDashboardData();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyProfile?.id, companyProfile?.companyId]);

  useEffect(() => {
    validateFeatureAccess();
  }, [subscriptionStatus]);

  // Calculate responsive card width based on device type and orientation
  const getCardWidth = (columns: number = 2) => {
    if (isTablet) {
      if (isLandscape) {
        // Landscape tablets: more columns
        if (columns === 4) {
          return '18%'; // 5 columns in landscape
        } else if (columns === 3) {
          return '23%'; // 4 columns in landscape
        }
      } else {
        // Portrait tablets
        if (columns === 4) {
          return '23%'; // 4 columns in portrait
        } else if (columns === 3) {
          return '31%'; // 3 columns in portrait
        }
      }
      return '48%'; // fallback
    }
    // Phones: 2 columns (48% each)
    return '48%';
  };

  // Number of columns for stats grid - adjust for landscape
  const statsColumns = isTablet ? (isLandscape ? 5 : 4) : 2;
  const actionsColumns = isTablet ? (isLandscape ? 4 : 3) : 2;

  // Create styles early so they're available for loading state
  const styles = getStyles(isTablet, maxContentWidth, isLandscape);

  const renderStatCard = (title: string, value: string | number, icon: string, color: string, onPress?: () => void) => {
    const cardWidth = getCardWidth(statsColumns);
    return (
      <TouchableOpacity
        style={[styles.statCard, { borderLeftColor: color, width: cardWidth }]}
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={styles.statHeader}>
          <MaterialCommunityIcons name={icon} size={isTablet ? 28 : 24} color={color} />
          <Text style={styles.statValue}>{value}</Text>
        </View>
        <Text style={styles.statTitle}>{title}</Text>
      </TouchableOpacity>
    );
  };

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
        <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.8}>Fleet Dashboard</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <MaterialCommunityIcons name="refresh" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 100 + insets.bottom },
          isTablet && { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Subscription Status - Read Only */}
        <View style={styles.section}>
          <EnhancedSubscriptionStatusCard
            subscriptionStatus={subscriptionStatus || {
              hasActiveSubscription: true,
              isTrialActive: false,
              currentPlan: COMPANY_FLEET_PLANS.find(plan => plan.id === 'fleet_growing') || COMPANY_FLEET_PLANS[1],
              daysRemaining: 15,
              subscriptionStatus: 'active'
            }}
            onManagePress={undefined}
            onRenewPress={undefined}
            onUpgradePress={undefined}
            showUpgradeOptions={false}
            animated={true}
          />
        </View>

        {/* Fleet Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fleet Overview</Text>
          <View style={[styles.statsGrid, { gap: 12 }]}>
            {renderStatCard(
              'Total Vehicles',
              stats.totalVehicles,
              'truck',
              colors.primary,
              () => navigation.navigate('Fleet', { screen: 'VehicleManagement' })
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
          <View style={[styles.statsGrid, { gap: 12 }]}>
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
              `KES ${stats.thisMonthEarnings.toLocaleString()}`,
              'cash-multiple',
              colors.success
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={[styles.actionsGrid, { gap: 12 }]}>
            <TouchableOpacity
              style={[styles.actionButton, { width: getCardWidth(actionsColumns) }]}
              onPress={() => {
                // Navigate to Fleet tab and then to VehicleManagement screen
                navigation.navigate('Fleet', { 
                  screen: 'VehicleManagement'
                });
              }}
            >
              <MaterialCommunityIcons name="truck-plus" size={isTablet ? 36 : 32} color={colors.primary} />
              <Text style={styles.actionText}>Add Vehicle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { width: getCardWidth(actionsColumns) }]}
              onPress={() => {
                // Navigate to Fleet tab and then to DriverManagement screen
                navigation.navigate('Fleet', { 
                  screen: 'DriverManagement'
                });
              }}
            >
              <MaterialCommunityIcons name="account-plus" size={isTablet ? 36 : 32} color={colors.primary} />
              <Text style={styles.actionText}>Recruit Driver</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { width: getCardWidth(actionsColumns) }]}
              onPress={() => {
                // Navigate to Fleet tab and then to FleetAnalytics screen
                navigation.navigate('Fleet', { 
                  screen: 'FleetAnalytics'
                });
              }}
            >
              <MaterialCommunityIcons name="chart-line" size={isTablet ? 36 : 32} color={colors.primary} />
              <Text style={styles.actionText}>Analytics</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { width: getCardWidth(actionsColumns) },
                (!featureAccess?.jobSeekers?.hasAccess) && styles.actionButtonDisabled
              ]}
              onPress={() => {
                if (featureAccess?.jobSeekers?.hasAccess) {
                  navigation.navigate('JobSeekersMarketplace');
                } else {
                  Alert.alert(
                    'Feature Not Available',
                    featureAccess?.jobSeekers?.reason || 'Job Seekers Marketplace is not available in your current plan.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Upgrade Plan', 
                        onPress: () => navigation.navigate('CompanyFleetPlans' as never)
                      }
                    ]
                  );
                }
              }}
            >
              <MaterialCommunityIcons 
                name="account-search" 
                size={isTablet ? 36 : 32} 
                color={featureAccess?.jobSeekers?.hasAccess ? colors.primary : colors.text.secondary} 
              />
              <Text style={[
                styles.actionText,
                (!featureAccess?.jobSeekers?.hasAccess) && styles.actionTextDisabled
              ]}>
                Browse Job Seekers
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { width: getCardWidth(actionsColumns) }]}
              onPress={() => {
                // Navigate to Fleet tab and then to FleetReports screen
                navigation.navigate('Fleet', { 
                  screen: 'FleetReports'
                });
              }}
            >
              <MaterialCommunityIcons name="file-document" size={isTablet ? 36 : 32} color={colors.primary} />
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

      {/* Background Location Disclosure Modal - Required by Google Play Store */}
      <BackgroundLocationDisclosureModal
        visible={showBackgroundLocationDisclosure}
        userRole="company"
        transporterType="company"
        onAccept={async () => {
          console.log('✅ CompanyDashboardScreen: User accepted background location disclosure');
          // User consented - save consent
          await locationService.saveBackgroundLocationConsent(true);
          setShowBackgroundLocationDisclosure(false);
          
          // Note: We don't start tracking here - that happens when user explicitly starts tracking
          // This disclosure is just for consent, per Google Play requirements
          console.log('✅ CompanyDashboardScreen: Background location consent saved');
        }}
        onDecline={async () => {
          console.log('❌ CompanyDashboardScreen: User declined background location disclosure');
          // User declined - save consent status
          await locationService.saveBackgroundLocationConsent(false);
          setShowBackgroundLocationDisclosure(false);
          
          // User can still use the app, but background location won't be available
          console.log('ℹ️ CompanyDashboardScreen: Background location consent declined - app will use foreground-only tracking');
        }}
      />
    </View>
  );
};

const getStyles = (isTablet: boolean, maxContentWidth: number, isLandscape: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: isTablet ? 40 : 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.white,
    flex: 1,
    marginRight: 8,
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: isTablet ? (isLandscape ? 24 : 32) : 20,
  },
  section: {
    marginBottom: isTablet ? 32 : 24,
  },
  sectionTitle: {
    fontSize: isTablet ? 20 : 18,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: isTablet ? 20 : 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: isTablet && isLandscape ? 'space-between' : 'flex-start',
  },
  statCard: {
    backgroundColor: colors.white,
    padding: isTablet ? 20 : 16,
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
    fontSize: isTablet ? 28 : 24,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  statTitle: {
    fontSize: isTablet ? 15 : 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: isTablet && isLandscape ? 'space-between' : 'flex-start',
  },
  actionButton: {
    backgroundColor: colors.white,
    padding: isTablet ? 20 : 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonDisabled: {
    backgroundColor: colors.background.light,
    opacity: 0.6,
  },
  actionText: {
    fontSize: isTablet ? 15 : 14,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginTop: isTablet ? 10 : 8,
  },
  actionTextDisabled: {
    color: colors.text.secondary,
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
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
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
    fontFamily: fonts.family.medium,
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
    fontFamily: fonts.family.medium,
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
    fontFamily: fonts.family.medium,
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
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
});

export default CompanyDashboardScreen;
