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
  createdAt: string;
  urgencyLevel: 'High' | 'Medium' | 'Low';
  value?: number;
  specialCargo: string[];
  cost: number;
  estimatedDuration?: string;
  vehicleType?: string;
  bodyType?: string;
  capacity?: string;
  pickupDate?: string;
  client?: {
    name: string;
    rating: number;
    completedOrders: number;
  };
}

const AllAvailableJobsScreen = () => {
  const navigation = useNavigation();
  const [jobs, setJobs] = useState<AvailableJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setJobs(data.requests || data.bookings || []);
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
      if (!user) return;

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${job.id}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        Alert.alert('Success', 'Job accepted successfully!');
        // Remove the accepted job from the list
        setJobs(prevJobs => prevJobs.filter(j => j.id !== job.id));
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to accept job');
      }
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
      if (!user) return;

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${job.id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        Alert.alert('Success', 'Job rejected');
        // Remove the rejected job from the list
        setJobs(prevJobs => prevJobs.filter(j => j.id !== job.id));
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to reject job');
      }
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
          <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(job.urgencyLevel) }]}>
            <Text style={styles.urgencyText}>{job.urgencyLevel}</Text>
          </View>
        </View>
        <Text style={styles.jobValue}>KES {job.cost.toLocaleString()}</Text>
      </View>

      <View style={styles.jobDetails}>
        <View style={styles.locationRow}>
          <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
          <LocationDisplay 
            location={job.fromLocation}
            style={styles.locationText}
            showIcon={false}
          />
        </View>
        
        <View style={styles.locationRow}>
          <MaterialCommunityIcons name="flag-checkered" size={16} color={colors.secondary} />
          <LocationDisplay 
            location={job.toLocation}
            style={styles.locationText}
            showIcon={false}
          />
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
          
          {job.pickupDate && (
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="calendar" size={16} color={colors.text.secondary} />
              <Text style={styles.infoText}>{formatDate(job.pickupDate)}</Text>
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
      </View>

      <View style={styles.jobActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleRejectJob(job)}
        >
          <MaterialCommunityIcons name="close" size={16} color={colors.error} />
          <Text style={[styles.actionButtonText, { color: colors.error }]}>Reject</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleAcceptJob(job)}
        >
          <MaterialCommunityIcons name="check" size={16} color={colors.white} />
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
        <Text style={styles.headerTitle}>All Available Jobs</Text>
        <View style={styles.headerRight} />
      </View>

      {jobs.length === 0 ? (
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
          data={jobs}
          renderItem={renderJobItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={styles.jobsList}
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
  headerTitle: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  headerRight: {
    width: 40,
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
  jobsList: {
    padding: spacing.md,
  },
  jobCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    alignItems: 'center',
  },
  jobTitle: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginRight: spacing.sm,
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
  jobActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginHorizontal: spacing.xs,
  },
  rejectButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.error,
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.medium,
    marginLeft: spacing.xs,
  },
});

export default AllAvailableJobsScreen;
