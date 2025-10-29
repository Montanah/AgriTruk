import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { getDisplayBookingId } from '../utils/unifiedIdSystem';
import { API_ENDPOINTS } from '../constants/api';
import LocationDisplay from '../components/common/LocationDisplay';

interface Job {
  id: string;
  bookingId: string;
  customerName: string;
  customerPhone: string;
  fromLocation: any;
  toLocation: any;
  pickupTime: string;
  deliveryTime: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  paymentAmount: number;
  vehicleId: string;
  vehicleRegistration: string;
  createdAt: string;
  updatedAt: string;
  productType?: string;
  weight?: number;
  specialRequirements?: string[];
  client?: {
    id?: string;
    name: string;
    phone: string;
    rating: number;
  };
}

interface RouteLoad {
  id: string;
  pickup: string;
  dropoff: string;
  detourKm: number;
  weight: number;
  price: number;
  description?: string;
  urgency: 'high' | 'medium' | 'low';
  specialRequirements: string[];
  clientRating: number;
  estimatedValue: number;
  route: {
    distance: string;
    estimatedTime: string;
  };
}

interface DriverProfile {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  assignedVehicle: {
    id: string;
    make: string;
    model: string;
    registration: string;
  };
  company: {
    id: string;
    name: string;
  };
}

const DriverJobManagementScreen = () => {
  const navigation = useNavigation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'available' | 'my_jobs' | 'route_loads'>('available');
  const [currentTrip, setCurrentTrip] = useState<Job | null>(null);
  const [routeLoads, setRouteLoads] = useState<RouteLoad[]>([]);
  const [selectedLoads, setSelectedLoads] = useState<RouteLoad[]>([]);
  const [acceptingJobId, setAcceptingJobId] = useState<string | null>(null);

  const fetchDriverProfile = async () => {
    try {
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
      }
    } catch (err) {
      console.error('Error fetching driver profile:', err);
    }
  };

  const fetchJobs = useCallback(async () => {
    try {
      setError(null);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      let endpoint = '';

      switch (selectedTab) {
        case 'available':
          endpoint = `${API_ENDPOINTS.BOOKINGS}/available`;
          break;
        case 'my_jobs':
          // Drivers fetch their accepted jobs (same as transporters)
          endpoint = `${API_ENDPOINTS.BOOKINGS}/transporter/accepted`;
          break;
        case 'route_loads':
          if (currentTrip) {
            endpoint = `${API_ENDPOINTS.TRANSPORTERS}/trips/${currentTrip.id}/available-loads`;
          } else {
            setJobs([]);
            return;
          }
          break;
      }

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (selectedTab === 'route_loads') {
          setRouteLoads(data.routeLoads || data.loads || data || []);
        } else {
          setJobs(data.jobs || data.bookings || []);
        }
      } else {
        const statusCode = response.status;
        if (statusCode === 403) {
          // If transporter/accepted fails, try driver/accepted
          if (selectedTab === 'my_jobs' && endpoint.includes('/transporter/accepted')) {
            const altResponse = await fetch(`${API_ENDPOINTS.BOOKINGS}/driver/accepted`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            if (altResponse.ok) {
              const altData = await altResponse.json();
              setJobs(altData.jobs || altData.bookings || []);
              return;
            }
          }
          throw new Error('Insufficient permissions. Backend needs to allow driver role for this endpoint.');
        } else if (statusCode === 401) {
          throw new Error('Authentication failed. Please log out and log back in.');
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to fetch jobs: ${statusCode}`);
        }
      }
    } catch (err: any) {
      console.error('Error fetching jobs:', err);
      setError(err.message || 'Failed to fetch jobs');
      // Set empty arrays on error
      setJobs([]);
      setRouteLoads([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTab, currentTrip]);

  const fetchCurrentTrip = async () => {
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
      fetchJobs(),
      fetchCurrentTrip()
    ]);
    setRefreshing(false);
  };

  const handleAcceptJob = async (job: Job) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      // Set loading state
      setAcceptingJobId(job.id);

      const token = await user.getIdToken();
      const jobId = job.bookingId || job.id; // Use bookingId if available
      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${jobId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transporterId: user.uid, // Same as transporters - use userId
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Job accepted successfully!');
        // Refresh jobs list - if on my_jobs tab, refresh accepted jobs
        fetchJobs();
        fetchCurrentTrip();
      } else {
        const statusCode = response.status;
        if (statusCode === 403) {
          throw new Error('Insufficient permissions. Backend needs to allow driver role for job acceptance.');
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to accept job: ${statusCode}`);
        }
      }
    } catch (err: any) {
      console.error('Error accepting job:', err);
      Alert.alert('Error', err.message || 'Failed to accept job');
    } finally {
      // Clear loading state
      setAcceptingJobId(null);
    }
  };

  const handleStartTrip = async (job: Job) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/update/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'in_progress' })
      });

      if (response.ok) {
        Alert.alert('Success', 'Trip started successfully!');
        fetchJobs();
        fetchCurrentTrip();
        // Navigate to trip navigation screen
        (navigation as any).navigate('TripNavigationScreen', { 
          jobId: job.id,
          bookingId: job.bookingId,
          job: job
        });
      } else {
        throw new Error('Failed to start trip');
      }
    } catch (err: any) {
      console.error('Error starting trip:', err);
      Alert.alert('Error', err.message || 'Failed to start trip');
    }
  };

  const handleCompleteTrip = async (job: Job) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/update/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'completed' })
      });

      if (response.ok) {
        Alert.alert('Success', 'Trip completed successfully!');
        fetchJobs();
        fetchCurrentTrip();
      } else {
        throw new Error('Failed to complete trip');
      }
    } catch (err: any) {
      console.error('Error completing trip:', err);
      Alert.alert('Error', err.message || 'Failed to complete trip');
    }
  };

  const cancelJob = async (job: Job, reason: string) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/update/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'cancelled',
          cancellationReason: reason,
          cancelledAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        Alert.alert('Success', 'Job cancelled successfully!');
        fetchJobs();
        fetchCurrentTrip();
      } else {
        throw new Error('Failed to cancel job');
      }
    } catch (err: any) {
      console.error('Error cancelling job:', err);
      Alert.alert('Error', err.message || 'Failed to cancel job');
    }
  };

  const showCancelModal = (job: Job) => {
    Alert.prompt(
      'Cancel Job',
      'Please provide a reason for cancellation:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: (reason) => {
            if (reason && reason.trim()) {
              cancelJob(job, reason.trim());
            } else {
              Alert.alert('Error', 'Please provide a cancellation reason');
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const handleCall = (phoneNumber: string) => {
    const phoneUrl = `tel:${phoneNumber}`;
    Linking.openURL(phoneUrl).catch(err => {
      console.error('Error opening phone app:', err);
      Alert.alert('Error', 'Unable to open phone app');
    });
  };

  const handleChat = (job: Job) => {
    // Navigate to chat screen or open chat modal
    (navigation as any).navigate('ChatScreen', { 
      jobId: job.id,
      bookingId: job.bookingId,
      clientId: job.client?.id || job.customerPhone,
      clientName: job.client?.name || job.customerName
    });
  };



  const toggleLoadSelection = (load: RouteLoad) => {
    setSelectedLoads(prev => 
      prev.find(l => l.id === load.id) 
        ? prev.filter(l => l.id !== load.id)
        : [...prev, load]
    );
  };



  useEffect(() => {
    fetchDriverProfile();
    fetchCurrentTrip();
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const renderJob = ({ item }: { item: Job }) => (
    <View style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <View style={styles.jobInfo}>
          <Text style={styles.jobId}>{getDisplayBookingId(item)}</Text>
          <Text style={styles.customerName}>{item.customerName}</Text>
          <Text style={styles.customerPhone}>{item.customerPhone}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: 
            item.status === 'completed' ? colors.success :
            item.status === 'in_progress' ? colors.primary :
            item.status === 'accepted' ? colors.warning :
            item.status === 'cancelled' ? colors.error :
            colors.text.secondary
          }
        ]}>
          <Text style={styles.statusText}>
            {item.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.jobDetails}>
        <View style={styles.routeInfo}>
          <View style={styles.locationRow}>
            <LocationDisplay 
              location={item.fromLocation} 
              iconColor={colors.primary} 
            />
          </View>
          <View style={styles.locationRow}>
            <LocationDisplay 
              location={item.toLocation} 
              iconColor={colors.success}
              iconName="map-marker-outline"
            />
          </View>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="clock" size={16} color={colors.text.secondary} />
          <Text style={styles.detailText}>
            Pickup: {(() => {
              if (!item.pickupTime && !item.pickupDate) return 'Not specified';
              try {
                const pickupDate = item.pickupTime || item.pickupDate || item.createdAt;
                if (!pickupDate) return 'Not specified';
                
                // Handle Firestore timestamp
                let date: Date;
                if (pickupDate._seconds) {
                  date = new Date(pickupDate._seconds * 1000);
                } else if (pickupDate.toDate && typeof pickupDate.toDate === 'function') {
                  date = pickupDate.toDate();
                } else if (typeof pickupDate === 'string') {
                  date = new Date(pickupDate);
                } else if (pickupDate instanceof Date) {
                  date = pickupDate;
                } else {
                  return 'Invalid date';
                }
                
                if (isNaN(date.getTime())) return 'Invalid date';
                
                return date.toLocaleString('en-KE', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
              } catch {
                return 'Date error';
              }
            })()}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="currency-usd" size={16} color={colors.success} />
          <Text style={styles.detailText}>
            Payment: KES {(item.paymentAmount || item.cost || item.estimatedValue || 0).toLocaleString('en-KE')}
          </Text>
        </View>
      </View>

      <View style={styles.jobActions}>
        {item.status === 'pending' && (
          <TouchableOpacity
            style={[
              styles.acceptButton,
              acceptingJobId === item.id && styles.acceptButtonDisabled
            ]}
            onPress={() => handleAcceptJob(item)}
            disabled={acceptingJobId === item.id}
          >
            {acceptingJobId === item.id ? (
              <>
                <ActivityIndicator size="small" color={colors.white} />
                <Text style={styles.actionText}>Accepting...</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={16} color={colors.white} />
                <Text style={styles.actionText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        
        {item.status === 'accepted' && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => handleStartTrip(item)}
          >
            <MaterialCommunityIcons name="play" size={16} color={colors.white} />
            <Text style={styles.actionText}>Start Trip</Text>
          </TouchableOpacity>
        )}

        {item.status === 'in_progress' && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => handleCompleteTrip(item)}
          >
            <MaterialCommunityIcons name="check-circle" size={16} color={colors.white} />
            <Text style={styles.actionText}>Complete</Text>
          </TouchableOpacity>
        )}

        {/* Communication Buttons Row */}
        <View style={styles.communicationRow}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => handleChat(item)}
          >
            <MaterialCommunityIcons name="message-text" size={16} color={colors.primary} />
            <Text style={styles.chatButtonText}>Chat</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => handleCall(item.customerPhone || item.client?.phone || '')}
          >
            <MaterialCommunityIcons name="phone" size={16} color={colors.success} />
            <Text style={styles.callButtonText}>Call</Text>
          </TouchableOpacity>
        </View>

        {/* Cancel Button Row */}
        {(item.status === 'accepted' || item.status === 'in_progress') && (
          <View style={styles.cancelRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => showCancelModal(item)}
            >
              <MaterialCommunityIcons name="close-circle" size={16} color={colors.error} />
              <Text style={styles.cancelButtonText}>Cancel Job</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderRouteLoadItem = ({ item }: { item: RouteLoad }) => (
    <TouchableOpacity 
      style={[
        styles.loadCard,
        selectedLoads.find(l => l.id === item.id) && styles.selectedLoadCard
      ]}
      onPress={() => toggleLoadSelection(item)}
    >
      <View style={styles.loadHeader}>
        <View style={styles.loadInfo}>
          <Text style={styles.loadId}>Load #{item.id.slice(-6)}</Text>
          <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(item.urgency) + '20' }]}>
            <Text style={[styles.urgencyText, { color: getUrgencyColor(item.urgency) }]}>
              {item.urgency.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.loadPrice}>KES {item.price.toLocaleString()}</Text>
      </View>

      <View style={styles.loadRoute}>
        <Text style={styles.loadPickup}>{item.pickup}</Text>
        <MaterialCommunityIcons name="arrow-right" size={16} color={colors.text.secondary} />
        <Text style={styles.loadDropoff}>{item.dropoff}</Text>
      </View>

      <View style={styles.loadDetails}>
        <Text style={styles.loadWeight}>{item.weight} kg</Text>
        <Text style={styles.loadDetour}>+{item.detourKm}km detour</Text>
        <Text style={styles.loadTime}>{item.route.estimatedTime}</Text>
      </View>

      {selectedLoads.find(l => l.id === item.id) && (
        <View style={styles.selectedIndicator}>
          <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
        </View>
      )}
    </TouchableOpacity>
  );


  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return colors.error;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.text.secondary;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading jobs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Management</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Job Summary Header */}
      <View style={styles.summaryHeader}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="briefcase-check" size={20} color={colors.primary} />
            <Text style={styles.summaryLabel}>Total Jobs</Text>
            <Text style={styles.summaryValue}>{jobs.filter(j => ['accepted', 'in_progress'].includes(j.status)).length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="truck-fast" size={20} color={colors.success} />
            <Text style={styles.summaryLabel}>Active Trip</Text>
            <Text style={styles.summaryValue}>{currentTrip ? '1' : '0'}</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="package-variant" size={20} color={colors.secondary} />
            <Text style={styles.summaryLabel}>Route Loads</Text>
            <Text style={styles.summaryValue}>{routeLoads.length}</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'available' && styles.activeTab]}
          onPress={() => setSelectedTab('available')}
        >
          <Text style={[styles.tabText, selectedTab === 'available' && styles.activeTabText]}>
            Available Jobs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'my_jobs' && styles.activeTab]}
          onPress={() => setSelectedTab('my_jobs')}
        >
          <Text style={[styles.tabText, selectedTab === 'my_jobs' && styles.activeTabText]}>
            My Jobs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'route_loads' && styles.activeTab]}
          onPress={() => setSelectedTab('route_loads')}
          disabled={!currentTrip}
        >
          <Text style={[
            styles.tabText, 
            selectedTab === 'route_loads' && styles.activeTabText,
            !currentTrip && styles.disabledTab
          ]}>
            Route Loads
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={48} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchJobs}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (selectedTab === 'route_loads' ? routeLoads.length === 0 : jobs.length === 0) ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons 
              name={selectedTab === 'route_loads' ? 'package-variant' : 'briefcase-outline'} 
              size={64} 
              color={colors.text.secondary} 
            />
            <Text style={styles.emptyTitle}>
              {selectedTab === 'available' ? 'No Available Jobs' : 
               selectedTab === 'my_jobs' ? 'No Jobs Assigned' : 
               'No Loads Available Along Route'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {selectedTab === 'available' 
                ? 'Check back later for new job opportunities'
                : selectedTab === 'my_jobs'
                ? 'You don\'t have any assigned jobs at the moment'
                : 'No loads available along your current route'
              }
            </Text>
          </View>
        ) : selectedTab === 'route_loads' ? (
          <FlatList
            data={routeLoads}
            renderItem={renderRouteLoadItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        ) : (
          <FlatList
            data={jobs}
            renderItem={renderJob}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
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
  driverInfo: {
    backgroundColor: colors.white,
    padding: 16,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverName: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  vehicleInfo: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.primary,
    marginBottom: 2,
  },
  companyInfo: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    margin: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  activeTabText: {
    color: colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  jobCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobId: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.primary,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  jobDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  jobActions: {
    flexDirection: 'column',
    gap: 8,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptButtonDisabled: {
    backgroundColor: colors.text.light,
    opacity: 0.7,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: 4,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 100,
    paddingHorizontal: 16,
  },
  // New styles for enhanced functionality
  routeInfo: {
    marginBottom: 12,
  },
  locationRow: {
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 4,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  productType: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
  weight: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  detailsButton: {
    backgroundColor: colors.background,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  detailsButtonText: {
    color: colors.text.primary,
    fontWeight: 'bold',
  },
  communicationRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  cancelRow: {
    marginTop: 8,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  chatButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  callButtonText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.error,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    width: '100%',
  },
  cancelButtonText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  // Summary header styles
  summaryHeader: {
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    fontFamily: fonts.family.medium,
  },
  summaryValue: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginTop: 2,
  },
  // Route loads styles
  loadCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedLoadCard: {
    borderColor: colors.success,
    backgroundColor: colors.success + '10',
  },
  loadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  loadInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginRight: 8,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  loadPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  loadRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  loadPickup: {
    fontSize: 14,
    color: colors.text.primary,
    flex: 1,
  },
  loadDropoff: {
    fontSize: 14,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'right',
  },
  loadDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  loadWeight: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  loadDetour: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  loadTime: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  disabledTab: {
    color: colors.text.secondary,
    opacity: 0.5,
  },
  jobIdSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  jobIdLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  jobIdValue: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
});

export default DriverJobManagementScreen;
