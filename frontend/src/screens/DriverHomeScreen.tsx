import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';

import colors from '../constants/colors';
import fonts from '../constants/fonts';
import { API_ENDPOINTS } from '../constants/api';
import AvailableJobsCard from '../components/TransporterService/AvailableJobsCard';
import IncomingRequestsCard from '../components/TransporterService/IncomingRequestsCard';
import AvailableLoadsAlongRoute from '../components/TransporterService/AvailableLoadsAlongRoute';
import { useAssignedJobs } from '../hooks/UseAssignedJobs';
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

  // Use the same hook as transporters for assigned jobs
  const { assignedJobs, loading: loadingJobs, fetchAssignedJobs } = useAssignedJobs();

  useEffect(() => {
    fetchDriverProfile();
    fetchAssignedJobs();
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
        setDriverProfile(data.driver);
        setAcceptingBooking(data.driver?.acceptingBooking || false);
        
        // Check if this is a first-time user (newly approved, no previous activity)
        const isNewUser = !data.driver?.hasAcceptedAnyJob && 
                         data.driver?.status === 'approved' &&
                         !data.driver?.acceptingBooking;
        setIsFirstTimeUser(isNewUser);
        
        // Check for active trip
        if (data.driver?.assignedVehicle) {
          await fetchCurrentTrip(data.driver.assignedVehicle.id);
        }
      } else {
        throw new Error('Failed to fetch driver profile');
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

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDriverProfile(),
      fetchAssignedJobs()
    ]);
    setRefreshing(false);
  };

  const handleJobAccepted = (job: any) => {
    Alert.alert(
      'Job Accepted',
      'You have successfully accepted this job. You can now start the trip when ready.',
      [
        { text: 'OK', onPress: () => fetchAssignedJobs() }
      ]
    );
  };

  const handleJobRejected = (job: any) => {
    Alert.alert(
      'Job Rejected',
      'You have rejected this job. It will be available for other drivers.',
      [
        { text: 'OK', onPress: () => fetchAssignedJobs() }
      ]
    );
  };

  const handleViewAllJobs = () => {
    navigation.navigate('DriverJobManagement');
  };

  const handleViewAllRequests = () => {
    navigation.navigate('DriverJobManagement');
  };

  const handleViewAllLoads = () => {
    if (currentTrip) {
      navigation.navigate('RouteLoadsScreen', { tripId: currentTrip.id });
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
      {/* Driver Info Header */}
      <View style={styles.driverInfoCard}>
        <View style={styles.driverInfo}>
          <View style={styles.driverAvatar}>
            <MaterialCommunityIcons name="account" size={32} color={colors.primary} />
          </View>
          <View style={styles.driverDetails}>
            <Text style={styles.driverName}>
              {driverProfile.firstName} {driverProfile.lastName}
            </Text>
            <Text style={styles.driverCompany}>{driverProfile.company.name}</Text>
            <Text style={styles.driverStatus}>
              Status: <Text style={[styles.statusText, { color: getStatusColor(driverProfile.status) }]}>
                {driverProfile.status.toUpperCase()}
              </Text>
            </Text>
          </View>
        </View>
        
        {driverProfile.assignedVehicle && (
          <View style={styles.vehicleInfo}>
            <MaterialCommunityIcons name="truck" size={16} color={colors.text.secondary} />
            <Text style={styles.vehicleText}>
              {driverProfile.assignedVehicle.make} {driverProfile.assignedVehicle.model}
            </Text>
            <Text style={styles.vehicleReg}>{driverProfile.assignedVehicle.registration}</Text>
          </View>
        )}
      </View>

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
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentTrip.status) + '20' }]}>
              <Text style={[styles.statusBadgeText, { color: getStatusColor(currentTrip.status) }]}>
                {currentTrip.status.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.tripRoute}>
            {currentTrip.fromLocation?.address || 'Pickup Location'} → {currentTrip.toLocation?.address || 'Delivery Location'}
          </Text>
          <TouchableOpacity 
            style={styles.viewTripButton}
            onPress={() => navigation.navigate('TransporterJobDetailsScreen', { 
              jobId: currentTrip.id,
              bookingId: currentTrip.bookingId,
              job: currentTrip
            })}
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

      {/* Assigned Jobs */}
      <IncomingRequestsCard
        jobs={assignedJobs}
        loading={loadingJobs}
        onJobPress={(job) => navigation.navigate('TransporterJobDetailsScreen', { 
          jobId: job.id,
          bookingId: job.bookingId,
          job: job
        })}
        onViewAll={handleViewAllRequests}
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
            onPress={() => navigation.navigate('DriverJobManagement')}
          >
            <MaterialCommunityIcons name="briefcase" size={24} color={colors.primary} />
            <Text style={styles.quickActionText}>My Jobs</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('DriverProfile')}
          >
            <MaterialCommunityIcons name="account" size={24} color={colors.secondary} />
            <Text style={styles.quickActionText}>Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('DriverSettings')}
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
  driverInfoCard: {
    backgroundColor: colors.white,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  driverCompany: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  driverStatus: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  statusText: {
    fontWeight: 'bold',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
  },
  vehicleText: {
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  vehicleReg: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: 'bold',
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
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
});

export default DriverHomeScreen;
