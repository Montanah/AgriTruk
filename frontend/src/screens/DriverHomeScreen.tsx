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
  Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';

import colors from '../constants/colors';
import { API_ENDPOINTS } from '../constants/api';
import AvailableJobsCard from '../components/TransporterService/AvailableJobsCard';
import IncomingRequestsCard from '../components/TransporterService/IncomingRequestsCard';
import AvailableLoadsAlongRoute from '../components/TransporterService/AvailableLoadsAlongRoute';
import OfflineInstructionsCard from '../components/TransporterService/OfflineInstructionsCard';

interface DriverProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  driverLicense: string;
  driverLicenseExpiryDate: string;
  idNumber: string;
  idExpiryDate: string;
  profileImage: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive';
  assignedVehicle?: {
    id: string;
    make: string;
    model: string;
    registration: string;
    type: string;
    capacity: string;
  };
  company: {
    id: string;
    name: string;
  };
}

const DriverHomeScreen = () => {
  const navigation = useNavigation();
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTrip, setCurrentTrip] = useState<any>(null);
  const [acceptingBooking, setAcceptingBooking] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);

  // Drivers accept jobs themselves, so we fetch accepted jobs (not assigned)
  const [acceptedJobs, setAcceptedJobs] = useState<any[]>([]);
  const [loadingAcceptedJobs, setLoadingAcceptedJobs] = useState(false);

  useEffect(() => {
    fetchDriverProfile();
    fetchAcceptedJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDriverProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.DRIVERS}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const driver = data.driver || data;
        
        if (!driver) {
          throw new Error('Driver data not found in response');
        }

        // Helper to convert Firestore timestamp to string
        const formatTimestamp = (ts: any): string => {
          if (!ts) return '';
          if (typeof ts === 'string') return ts;
          if (ts._seconds) {
            return new Date(ts._seconds * 1000).toISOString();
          }
          if (ts.toDate) {
            return ts.toDate().toISOString();
          }
          return ts.toString();
        };

        // Map driver data to expected format
        const profileData: DriverProfile = {
          id: driver.id || driver.driverId || '',
          firstName: driver.firstName || '',
          lastName: driver.lastName || '',
          email: driver.email || '',
          phone: driver.phone || '',
          driverLicense: driver.driverLicense || '',
          driverLicenseExpiryDate: formatTimestamp(driver.driverLicenseExpiryDate),
          idNumber: driver.idNumber || '',
          idExpiryDate: formatTimestamp(driver.idExpiryDate),
          profileImage: driver.profileImage || '',
          status: driver.status || 'pending',
          assignedVehicle: driver.assignedVehicle || driver.assignedVehicleDetails,
          company: driver.company || { id: driver.companyId || '', name: driver.companyName || 'Unknown Company' },
        };

        setDriverProfile(profileData);
        setAcceptingBooking(driver.acceptingBooking || driver.availability || false);
        
        // Check if this is a first-time user (newly approved, no previous activity)
        const isNewUser = !driver.hasAcceptedAnyJob && 
                         driver.status === 'approved' &&
                         !driver.acceptingBooking && !driver.availability;
        setIsFirstTimeUser(isNewUser);
        
        // Check for active trip
        if (profileData.assignedVehicle?.id) {
          await fetchCurrentTrip(profileData.assignedVehicle.id);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const statusCode = response.status;
        
        if (statusCode === 403) {
          throw new Error('Insufficient permissions. Please contact your company administrator.');
        } else if (statusCode === 401) {
          throw new Error('Authentication failed. Please log out and log back in.');
        } else {
          throw new Error(errorData.message || `Failed to fetch driver profile: ${statusCode}`);
        }
      }
    } catch (err: any) {
      console.error('Error fetching driver profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentTrip = async (vehicleId: string) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/driver/active-trip`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentTrip(data.trip);
      }
    } catch (err) {
      console.error('Error fetching current trip:', err);
    }
  };

  const fetchAcceptedJobs = async () => {
    try {
      setLoadingAcceptedJobs(true);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      // Fetch jobs accepted by this driver (same endpoint as transporters)
      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/transporter/accepted`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAcceptedJobs(data.jobs || data.bookings || []);
      } else {
        // If endpoint doesn't exist or permission denied, try alternative
        const altResponse = await fetch(`${API_ENDPOINTS.BOOKINGS}/driver/accepted`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (altResponse.ok) {
          const altData = await altResponse.json();
          setAcceptedJobs(altData.jobs || altData.bookings || []);
        } else {
          setAcceptedJobs([]);
        }
      }
    } catch (err: any) {
      console.error('Error fetching accepted jobs:', err);
      setAcceptedJobs([]);
    } finally {
      setLoadingAcceptedJobs(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDriverProfile(),
      fetchAcceptedJobs()
    ]);
    setRefreshing(false);
  };

  const handleJobAccepted = (job: any) => {
    Alert.alert(
      'Job Accepted',
      'You have successfully accepted this job. You can now start the trip when ready.',
      [
        { text: 'OK', onPress: () => {
          fetchAcceptedJobs();
          fetchDriverProfile();
        }}
      ]
    );
  };

  const handleJobRejected = (job: any) => {
    // Job rejected - just refresh available jobs
    fetchAcceptedJobs();
  };

  const handleViewAllJobs = () => {
    // Navigate to Jobs tab and then to the job management screen
    try {
      (navigation as any).navigate('Jobs', { screen: 'DriverJobManagement' });
    } catch (e) {
      // Fallback navigation
      (navigation as any).navigate('DriverJobManagement');
    }
  };

  const handleViewAllRequests = () => {
    // Navigate to Jobs tab and then to the job management screen
    try {
      (navigation as any).navigate('Jobs', { screen: 'DriverJobManagement' });
    } catch (e) {
      // Fallback navigation
      (navigation as any).navigate('DriverJobManagement');
    }
  };

  const handleViewAllLoads = () => {
    if (currentTrip) {
      try {
        (navigation as any).navigate('RouteLoadsScreen', { tripId: currentTrip.id });
      } catch (e) {
        Alert.alert('Navigation Error', 'Unable to navigate to route loads.');
      }
    } else {
      Alert.alert('No Active Trip', 'You need to be on an active trip to view route loads.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading driver dashboard...</Text>
      </View>
    );
  }

  if (error || !driverProfile) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={64} color={colors.error} />
        <Text style={styles.errorText}>{error || 'Failed to load driver profile'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDriverProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Driver Info Header with Gradient */}
      <LinearGradient
        colors={[colors.primary, colors.primary + 'DD']}
        style={styles.gradientCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.driverInfo}>
          <View style={styles.driverAvatarContainer}>
            {driverProfile.profileImage ? (
              <Image 
                source={{ uri: driverProfile.profileImage }} 
                style={styles.driverAvatarImage}
              />
            ) : (
              <View style={styles.driverAvatar}>
                <MaterialCommunityIcons name="account" size={32} color={colors.white} />
              </View>
            )}
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(driverProfile.status) }]} />
          </View>
          <View style={styles.driverDetails}>
            <Text style={styles.driverName}>
              {driverProfile.firstName} {driverProfile.lastName}
            </Text>
            <View style={styles.companyRow}>
              <MaterialCommunityIcons name="office-building" size={14} color={colors.white + 'CC'} />
              <Text style={styles.driverCompany}>{driverProfile.company.name}</Text>
            </View>
            <View style={styles.statusBadgeContainer}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(driverProfile.status) + '30' }]}>
                <MaterialCommunityIcons 
                  name={driverProfile.status === 'active' ? 'check-circle' : 'clock-outline'} 
                  size={12} 
                  color={getStatusColor(driverProfile.status)} 
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.statusText, { color: getStatusColor(driverProfile.status) }]}>
                  {driverProfile.status.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        {driverProfile.assignedVehicle && (
          <View style={styles.vehicleInfo}>
            <MaterialCommunityIcons name="truck" size={16} color={colors.white + 'DD'} />
            <Text style={styles.vehicleText}>
              {driverProfile.assignedVehicle.make || 'Vehicle'} {driverProfile.assignedVehicle.model || ''}
            </Text>
            {driverProfile.assignedVehicle.registration && (
              <Text style={styles.vehicleReg}>{driverProfile.assignedVehicle.registration}</Text>
            )}
          </View>
        )}
      </LinearGradient>

      {/* Offline Instructions Card - Show when not accepting requests */}
      {!acceptingBooking && (
        <OfflineInstructionsCard
          onToggleAccepting={() => {
            // Navigate to profile tab to show the toggle
            navigation.navigate('Profile');
          }}
          isFirstTime={isFirstTimeUser}
        />
      )}

      {/* Current Trip Status */}
      {currentTrip && (
        <View style={styles.tripStatusCard}>
          <View style={styles.tripStatusHeader}>
            <MaterialCommunityIcons name="map-marker-path" size={24} color={colors.primary} />
            <Text style={styles.tripStatusTitle}>Active Trip</Text>
            <View style={[styles.tripStatusBadge, { backgroundColor: getStatusColor(currentTrip.status) + '20' }]}>
              <Text style={[styles.tripStatusBadgeText, { color: getStatusColor(currentTrip.status) }]}>
                {currentTrip.status.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.tripRoute}>
            {currentTrip.fromLocation?.address || 'Pickup Location'} → {currentTrip.toLocation?.address || 'Delivery Location'}
          </Text>
          <TouchableOpacity 
            style={styles.viewTripButton}
            onPress={() => {
              try {
                (navigation as any).navigate('TransporterJobDetailsScreen', { 
                  jobId: currentTrip.id,
                  bookingId: currentTrip.bookingId,
                  job: currentTrip
                });
              } catch (e) {
                console.error('Navigation error:', e);
              }
            }}
          >
            <Text style={styles.viewTripButtonText}>View Trip Details</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Available Jobs */}
      <AvailableJobsCard
        onJobAccepted={handleJobAccepted}
        onJobRejected={handleJobRejected}
        onViewAll={handleViewAllJobs}
      />

      {/* My Accepted Jobs - Drivers choose and accept jobs themselves */}
      <IncomingRequestsCard
        jobs={acceptedJobs}
        loading={loadingAcceptedJobs}
        onJobPress={(job) => {
          try {
            (navigation as any).navigate('TransporterJobDetailsScreen', { 
              jobId: job.id,
              bookingId: job.bookingId,
              job: job
            });
          } catch (e) {
            console.error('Navigation error:', e);
          }
        }}
        onViewAll={handleViewAllRequests}
        title="My Accepted Jobs"
      />

      {/* Route Loads - Only show if on active trip */}
      {currentTrip && ['started', 'in_progress'].includes(currentTrip.status) && (
        <AvailableLoadsAlongRoute
          tripId={currentTrip.id}
          onViewAll={handleViewAllLoads}
        />
      )}

      {/* Quick Actions */}
      <View style={styles.quickActionsCard}>
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => (navigation as any).navigate('Jobs', { screen: 'DriverJobManagement' })}
          >
            <MaterialCommunityIcons name="briefcase" size={24} color={colors.primary} />
            <Text style={styles.quickActionText}>My Jobs</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => (navigation as any).navigate('Profile', { screen: 'DriverProfile' })}
          >
            <MaterialCommunityIcons name="account" size={24} color={colors.secondary} />
            <Text style={styles.quickActionText}>Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => (navigation as any).navigate('Profile', { screen: 'DriverSettings' })}
          >
            <MaterialCommunityIcons name="cog" size={24} color={colors.tertiary} />
            <Text style={styles.quickActionText}>Settings</Text>
          </TouchableOpacity>
          
          {currentTrip && (
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('RouteLoadsScreen', { tripId: currentTrip.id })}
            >
              <MaterialCommunityIcons name="map-marker-path" size={24} color={colors.success} />
              <Text style={styles.quickActionText}>Route Loads</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Bottom padding to prevent cut-off */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return colors.success;
    case 'pending': return colors.warning;
    case 'approved': return colors.primary;
    case 'rejected': return colors.error;
    case 'inactive': return colors.text.secondary;
    case 'started': return colors.primary;
    case 'in_progress': return colors.success;
    case 'completed': return colors.success;
    default: return colors.text.secondary;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  gradientCard: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverAvatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  driverAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.white + '20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  driverAvatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: colors.white,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.white,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 6,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  driverCompany: {
    fontSize: 14,
    color: colors.white + 'DD',
    marginLeft: 6,
  },
  statusBadgeContainer: {
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white + '15',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.white + '30',
    marginTop: 8,
  },
  vehicleText: {
    fontSize: 14,
    color: colors.white,
    marginLeft: 8,
    flex: 1,
    fontWeight: '600',
  },
  vehicleReg: {
    fontSize: 12,
    color: colors.white + 'CC',
    fontWeight: 'bold',
    backgroundColor: colors.white + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tripStatusCard: {
    backgroundColor: colors.white,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tripStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripStatusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  tripStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tripStatusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  tripRoute: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  viewTripButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary + '10',
    padding: 12,
    borderRadius: 8,
  },
  viewTripButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: 'bold',
  },
  quickActionsCard: {
    backgroundColor: colors.white,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 12,
    color: colors.text.primary,
    marginTop: 8,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 100,
  },
});

export default DriverHomeScreen;
