import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import { API_ENDPOINTS } from '../constants/api';
import { getAuth } from 'firebase/auth';

interface Job {
  id: string;
  bookingId: string;
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  deliveryLocation: string;
  pickupTime: string;
  deliveryTime: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  paymentAmount: number;
  vehicleId: string;
  vehicleRegistration: string;
  createdAt: string;
  updatedAt: string;
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
  const [selectedTab, setSelectedTab] = useState<'available' | 'my_jobs'>('available');

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

  const fetchJobs = async () => {
    try {
      setError(null);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const endpoint = selectedTab === 'available' 
        ? `${API_ENDPOINTS.BOOKINGS}/available`
        : `${API_ENDPOINTS.BOOKINGS}/driver-jobs`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      } else {
        throw new Error('Failed to fetch jobs');
      }
    } catch (err: any) {
      console.error('Error fetching jobs:', err);
      setError(err.message || 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  const handleAcceptJob = async (jobId: string) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${jobId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        Alert.alert('Success', 'Job accepted successfully');
        fetchJobs(); // Refresh the list
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to accept job');
      }
    } catch (err: any) {
      console.error('Error accepting job:', err);
      Alert.alert('Error', 'Failed to accept job');
    }
  };

  const handleUpdateJobStatus = async (jobId: string, status: string) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${jobId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Job status updated successfully');
        fetchJobs(); // Refresh the list
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to update job status');
      }
    } catch (err: any) {
      console.error('Error updating job status:', err);
      Alert.alert('Error', 'Failed to update job status');
    }
  };

  useEffect(() => {
    fetchDriverProfile();
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [selectedTab]);

  const renderJob = ({ item }: { item: Job }) => (
    <View style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <View style={styles.jobInfo}>
          <Text style={styles.jobId}>Job #{item.bookingId}</Text>
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
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
          <Text style={styles.detailText}>From: {item.pickupLocation}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="map-marker-check" size={16} color={colors.success} />
          <Text style={styles.detailText}>To: {item.deliveryLocation}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="clock" size={16} color={colors.text.secondary} />
          <Text style={styles.detailText}>
            Pickup: {new Date(item.pickupTime).toLocaleString()}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="currency-usd" size={16} color={colors.success} />
          <Text style={styles.detailText}>Payment: ${item.paymentAmount}</Text>
        </View>
      </View>

      <View style={styles.jobActions}>
        {selectedTab === 'available' && item.status === 'pending' && (
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAcceptJob(item.id)}
          >
            <MaterialCommunityIcons name="check" size={16} color={colors.white} />
            <Text style={styles.actionText}>Accept Job</Text>
          </TouchableOpacity>
        )}
        
        {selectedTab === 'my_jobs' && item.status === 'accepted' && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => handleUpdateJobStatus(item.id, 'in_progress')}
          >
            <MaterialCommunityIcons name="play" size={16} color={colors.white} />
            <Text style={styles.actionText}>Start Job</Text>
          </TouchableOpacity>
        )}

        {selectedTab === 'my_jobs' && item.status === 'in_progress' && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => handleUpdateJobStatus(item.id, 'completed')}
          >
            <MaterialCommunityIcons name="check-circle" size={16} color={colors.white} />
            <Text style={styles.actionText}>Complete Job</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.contactButton}
          onPress={() => navigation.navigate('ContactCustomer', { job: item })}
        >
          <MaterialCommunityIcons name="phone" size={16} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Contact</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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

      {driverProfile && (
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>
            {driverProfile.firstName} {driverProfile.lastName}
          </Text>
          <Text style={styles.vehicleInfo}>
            {driverProfile.assignedVehicle.make} {driverProfile.assignedVehicle.model} 
            ({driverProfile.assignedVehicle.registration})
          </Text>
          <Text style={styles.companyInfo}>
            {driverProfile.company.name}
          </Text>
        </View>
      )}

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
        ) : jobs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="briefcase-outline" size={64} color={colors.text.secondary} />
            <Text style={styles.emptyTitle}>
              {selectedTab === 'available' ? 'No Available Jobs' : 'No Jobs Assigned'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {selectedTab === 'available' 
                ? 'Check back later for new job opportunities'
                : 'You don\'t have any assigned jobs at the moment'
              }
            </Text>
          </View>
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
    fontFamily: fonts.bold,
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
    fontFamily: fonts.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  vehicleInfo: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.primary,
    marginBottom: 2,
  },
  companyInfo: {
    fontSize: 14,
    fontFamily: fonts.medium,
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
    fontFamily: fonts.medium,
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
    fontFamily: fonts.bold,
    color: colors.primary,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: fonts.bold,
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
    fontFamily: fonts.medium,
    color: colors.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  jobActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
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
    fontFamily: fonts.bold,
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
    fontFamily: fonts.medium,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
});

export default DriverJobManagementScreen;
