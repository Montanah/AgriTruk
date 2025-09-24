import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { API_ENDPOINTS } from '../constants/api';
import LocationDisplay from '../components/common/LocationDisplay';

interface AvailableJob {
  id: string;
  bookingId?: string; // API uses bookingId
  productType: string;
  fromLocation: {
    address?: string;
    latitude: number;
    longitude: number;
  };
  toLocation: {
    address?: string;
    latitude: number;
    longitude: number;
  };
  weightKg: number;
  createdAt?: string;
  acceptedAt?: string; // API uses acceptedAt
  urgencyLevel: 'High' | 'Medium' | 'Low';
  value?: number;
  specialCargo: string[];
  cost: number;
  estimatedDuration?: string;
  vehicleType?: string;
  bodyType?: string;
  capacity?: string;
  pickupDate?: string;
  pickUpDate?: string; // API uses pickUpDate
  client?: {
    name: string;
    rating: number;
    completedOrders: number;
  };
  userId?: string; // For communication
  additionalNotes?: string;
  requestId?: string;
  bookingMode?: string; // 'booking' or 'instant'
  bookingType?: string; // 'Cargo' or 'Agri'
}

const AllAvailableJobsScreen = () => {
  const navigation = useNavigation();
  const [jobs, setJobs] = useState<AvailableJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<AvailableJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'instant' | 'booking'>('all');

  const applyFilter = (jobsList: AvailableJob[], filterType: 'all' | 'instant' | 'booking') => {
    if (filterType === 'all') {
      setFilteredJobs(jobsList);
    } else {
      const filtered = jobsList.filter(job => job.bookingMode === filterType);
      setFilteredJobs(filtered);
    }
  };

  const handleFilterChange = (newFilter: 'all' | 'instant' | 'booking') => {
    setFilter(newFilter);
    applyFilter(jobs, newFilter);
  };

  const fetchAvailableJobs = async () => {
    try {
      setError(null);
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      console.log('Fetching all available jobs from:', `${API_ENDPOINTS.BOOKINGS}/requests`);
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      console.log('All available jobs response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('All available jobs data:', data);
        // The API returns availableBookings array
        const rawJobs = data.availableBookings || data.requests || data.bookings || [];
        
        // Remove duplicates based on bookingId or id, prioritizing bookingId
        const uniqueJobs = rawJobs.filter((job: any, index: number, self: any[]) => {
          const currentId = job.bookingId || job.id;
          return index === self.findIndex((j: any) => {
            const otherId = j.bookingId || j.id;
            return currentId === otherId;
          });
        });
        
        console.log(`Filtered ${rawJobs.length} jobs to ${uniqueJobs.length} unique jobs`);
        setJobs(uniqueJobs);
        applyFilter(uniqueJobs, filter);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch available jobs:', response.status, errorText);
        setError(`Failed to load jobs: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Error fetching available jobs:', error);
      if (error.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else {
        setError('Failed to load available jobs. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAvailableJobs();
  };

  useEffect(() => {
    fetchAvailableJobs();
  }, []);

  const handleAcceptJob = async (job: AvailableJob) => {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'Please log in to accept jobs');
        return;
      }

      // Show confirmation dialog
      Alert.alert(
        'Accept Job',
        `Are you sure you want to accept this ${job.productType} job for KES ${job.cost.toLocaleString()}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Accept', 
            onPress: async () => {
              try {
                const token = await user.getIdToken();
                
                // Use bookingId if available, otherwise use id
                const jobId = job.bookingId || job.id;
                console.log('Accepting job with ID:', jobId);
                
                console.log('Making API call to:', `${API_ENDPOINTS.BOOKINGS}/${jobId}/accept`);
                console.log('Request body:', { transporterId: user.uid });
                
                const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${jobId}/accept`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    transporterId: user.uid,
                  }),
                });

                console.log('Accept job response status:', response.status);

                if (response.ok) {
                  const responseData = await response.json();
                  console.log('Job accepted successfully:', responseData);
                  
                  // Remove the accepted job from both lists
                  setJobs(prevJobs => prevJobs.filter(j => (j.bookingId || j.id) !== jobId));
                  setFilteredJobs(prevJobs => prevJobs.filter(j => (j.bookingId || j.id) !== jobId));
                  
                  Alert.alert(
                    'Success!', 
                    'Job accepted successfully. You will be notified when the client confirms.',
                    [{ text: 'OK' }]
                  );
                } else {
                  const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                  console.error('Failed to accept job:', response.status, errorData);
                  Alert.alert(
                    'Error', 
                    `Failed to accept job: ${errorData.message || 'Unknown error'}`,
                    [{ text: 'OK' }]
                  );
                }
              } catch (error) {
                console.error('Error accepting job:', error);
                Alert.alert(
                  'Error', 
                  'Network error. Please check your connection and try again.',
                  [{ text: 'OK' }]
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error accepting job:', error);
      Alert.alert('Error', 'Failed to accept job. Please try again.');
    }
  };

  const handleRejectJob = async (job: AvailableJob) => {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'Please log in to reject jobs');
        return;
      }

      // Show confirmation dialog
      Alert.alert(
        'Reject Job',
        `Are you sure you want to reject this ${job.productType} job?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Reject', 
            style: 'destructive',
            onPress: async () => {
              try {
                const token = await user.getIdToken();
                
                // Use bookingId if available, otherwise use id
                const jobId = job.bookingId || job.id;
                console.log('Rejecting job with ID:', jobId);
                
                console.log('Making API call to:', `${API_ENDPOINTS.BOOKINGS}/${jobId}/reject`);
                console.log('Request body:', { transporterId: user.uid, reason: 'Transporter declined' });
                
                const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${jobId}/reject`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    transporterId: user.uid,
                    reason: 'Transporter declined',
                  }),
                });

                if (response.ok) {
                  // Remove the rejected job from both lists
                  setJobs(prevJobs => prevJobs.filter(j => (j.bookingId || j.id) !== jobId));
                  setFilteredJobs(prevJobs => prevJobs.filter(j => (j.bookingId || j.id) !== jobId));
                  
                  Alert.alert('Success', 'Job rejected successfully');
                } else {
                  const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                  console.error('Failed to reject job:', response.status, errorData);
                  Alert.alert(
                    'Error', 
                    `Failed to reject job: ${errorData.message || 'Unknown error'}`,
                    [{ text: 'OK' }]
                  );
                }
              } catch (error) {
                console.error('Error rejecting job:', error);
                Alert.alert(
                  'Error', 
                  'Network error. Please check your connection and try again.',
                  [{ text: 'OK' }]
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error rejecting job:', error);
      Alert.alert('Error', 'Failed to reject job. Please try again.');
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'High': return colors.error;
      case 'Medium': return colors.warning;
      case 'Low': return colors.success;
      default: return colors.text.secondary;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderJobItem = ({ item: job }: { item: AvailableJob }) => (
    <View style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <View style={styles.jobTitleContainer}>
          <Text style={styles.jobTitle}>{job.productType}</Text>
          <View style={styles.badgeContainer}>
            <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(job.urgencyLevel) }]}>
              <Text style={styles.urgencyText}>{job.urgencyLevel}</Text>
            </View>
            {job.bookingMode && (
              <View style={[styles.bookingModeBadge, { 
                backgroundColor: job.bookingMode === 'instant' ? colors.warning : colors.info 
              }]}>
                <Text style={styles.bookingModeText}>
                  {job.bookingMode === 'instant' ? 'Instant' : 'Scheduled'}
                </Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.jobValue}>KES {job.cost.toLocaleString()}</Text>
      </View>

      <View style={styles.jobDetails}>
        <View style={styles.locationRow}>
          <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
          <Text style={styles.locationText}>
            {job.fromLocation?.address || 
             (job.fromLocation?.latitude && job.fromLocation?.longitude && 
              typeof job.fromLocation.latitude === 'number' && typeof job.fromLocation.longitude === 'number' ? 
              `${job.fromLocation.latitude.toFixed(4)}, ${job.fromLocation.longitude.toFixed(4)}` : 
              'Pickup Location')}
          </Text>
        </View>
        
        <View style={styles.locationRow}>
          <MaterialCommunityIcons name="flag-checkered" size={16} color={colors.secondary} />
          <Text style={styles.locationText}>
            {job.toLocation?.address || 
             (job.toLocation?.latitude && job.toLocation?.longitude && 
              typeof job.toLocation.latitude === 'number' && typeof job.toLocation.longitude === 'number' ? 
              `${job.toLocation.latitude.toFixed(4)}, ${job.toLocation.longitude.toFixed(4)}` : 
              'Delivery Location')}
          </Text>
        </View>

        <View style={styles.jobInfoRow}>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="weight-kilogram" size={16} color={colors.text.secondary} />
            <Text style={styles.infoText}>{job.weightKg} kg</Text>
          </View>
          
          {job.vehicleType && (
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="truck" size={16} color={colors.text.secondary} />
              <Text style={styles.infoText}>{job.vehicleType}</Text>
            </View>
          )}
          
          {(job.pickupDate || job.pickUpDate) && (
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="calendar" size={16} color={colors.text.secondary} />
              <Text style={styles.infoText}>{formatDate(job.pickupDate || job.pickUpDate || '')}</Text>
            </View>
          )}
        </View>

        {job.specialCargo && job.specialCargo.length > 0 && (
          <View style={styles.specialCargoContainer}>
            <Text style={styles.specialCargoLabel}>Special Requirements:</Text>
            <View style={styles.specialCargoTags}>
              {job.specialCargo.map((cargo, index) => (
                <View key={index} style={styles.specialCargoTag}>
                  <Text style={styles.specialCargoText}>{cargo}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {job.client && (
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{job.client.name}</Text>
            <View style={styles.clientRating}>
              <MaterialCommunityIcons name="star" size={14} color={colors.warning} />
              <Text style={styles.ratingText}>{job.client.rating.toFixed(1)}</Text>
              <Text style={styles.ordersText}>({job.client.completedOrders} orders)</Text>
            </View>
          </View>
        )}

        {job.additionalNotes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Additional Notes:</Text>
            <Text style={styles.notesText}>{job.additionalNotes}</Text>
          </View>
        )}
      </View>

      <View style={styles.jobActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleRejectJob(job)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="close" size={18} color={colors.error} />
          <Text style={[styles.actionButtonText, { color: colors.error }]}>Reject</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleAcceptJob(job)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="check" size={18} color={colors.white} />
          <Text style={[styles.actionButtonText, { color: colors.white }]}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading available jobs...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={48} color={colors.error} />
        <Text style={styles.errorTitle}>Error Loading Jobs</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAvailableJobs}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
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
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>All Available Jobs</Text>
          {filteredJobs.length > 0 && (
            <Text style={styles.jobCount}>({filteredJobs.length} jobs)</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => handleFilterChange(filter === 'all' ? 'instant' : filter === 'instant' ? 'booking' : 'all')}
          >
            <MaterialCommunityIcons name="filter" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {filter !== 'all' && (
        <View style={styles.filterIndicator}>
          <Text style={styles.filterText}>
            Showing {filter === 'instant' ? 'Instant' : 'Scheduled'} jobs only
          </Text>
          <TouchableOpacity onPress={() => handleFilterChange('all')}>
            <Text style={styles.clearFilterText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {filteredJobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="truck-delivery" size={64} color={colors.text.light} />
          <Text style={styles.emptyTitle}>No Available Jobs</Text>
          <Text style={styles.emptyText}>
            There are currently no jobs available that match your vehicle capabilities.
            Check back later for new opportunities.
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <MaterialCommunityIcons name="refresh" size={20} color={colors.primary} />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          renderItem={renderJobItem}
          keyExtractor={(item) => item.bookingId || item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={styles.jobsList}
          style={styles.flatList}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  jobCount: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButton: {
    padding: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  filterIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    fontFamily: fonts.family.medium,
  },
  clearFilterText: {
    fontSize: fonts.size.sm,
    color: colors.primary,
    fontFamily: fonts.family.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: fonts.size.md,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  errorTitle: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: fonts.size.md,
    fontFamily: fonts.family.medium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  emptyTitle: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  refreshButtonText: {
    color: colors.primary,
    fontSize: fonts.size.md,
    fontFamily: fonts.family.medium,
    marginLeft: spacing.xs,
  },
  flatList: {
    flex: 1,
  },
  jobsList: {
    padding: spacing.md,
    paddingBottom: 120, // Extra padding to avoid bottom navigation overlap
  },
  jobCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  jobTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  jobTitle: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  urgencyBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgencyText: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.medium,
    color: colors.white,
  },
  bookingModeBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bookingModeText: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.medium,
    color: colors.white,
  },
  jobValue: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.primary,
  },
  jobDetails: {
    marginBottom: spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  locationText: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    marginLeft: spacing.xs,
    flex: 1,
  },
  jobInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  specialCargoContainer: {
    marginTop: spacing.sm,
  },
  specialCargoLabel: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  specialCargoTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  specialCargoTag: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  specialCargoText: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
  },
  clientInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  clientName: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
  },
  clientRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    marginLeft: spacing.xs,
  },
  ordersText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  notesContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  notesLabel: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  notesText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  jobActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
    minHeight: 48,
  },
  rejectButton: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.error,
  },
  acceptButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    marginLeft: spacing.sm,
  },
});

export default AllAvailableJobsScreen;
