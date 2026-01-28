import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';
import companyDriverService from '../../services/companyDriverService';
import CustomAlert from '../../components/common/CustomAlert';

interface Job {
  id: string;
  bookingId: string;
  readableId: string;
  fromLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  toLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  productType: string;
  weight: number;
  urgency: string;
  status: string;
  pickupDate: string;
  deliveryDate?: string;
  specialInstructions?: string;
  customerName: string;
  customerPhone: string;
  estimatedCost: number;
  createdAt: string;
}

const CompanyDriverJobsScreen = () => {
  const navigation = useNavigation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const statusFilters = [
    { key: 'all', label: 'All Jobs', icon: 'format-list-bulleted' },
    { key: 'assigned', label: 'Assigned', icon: 'clock' },
    { key: 'in_progress', label: 'In Progress', icon: 'truck' },
    { key: 'completed', label: 'Completed', icon: 'check-circle' },
    { key: 'cancelled', label: 'Cancelled', icon: 'close-circle' },
  ];

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const jobsData = await companyDriverService.getDriverJobs({
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        limit: 50,
      });
      setJobs(jobsData);
    } catch (error) {
      console.error('Error loading jobs:', error);
      setAlertMessage('Failed to load jobs');
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  };

  const handleStatusUpdate = async (jobId: string, newStatus: string) => {
    try {
      await companyDriverService.updateJobStatus(jobId, newStatus);
      setAlertMessage(`Job status updated to ${newStatus}`);
      setShowAlert(true);
      loadJobs(); // Refresh the list
    } catch (error) {
      console.error('Error updating job status:', error);
      setAlertMessage('Failed to update job status');
      setShowAlert(true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return colors.warning;
      case 'in_progress': return colors.primary;
      case 'completed': return colors.success;
      case 'cancelled': return colors.error;
      default: return colors.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned': return 'clock';
      case 'in_progress': return 'truck';
      case 'completed': return 'check-circle';
      case 'cancelled': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  const renderJobItem = ({ item }: { item: Job }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => {
        // Navigate to job details
        navigation.navigate('JobDetails', { jobId: item.id });
      }}
    >
      <View style={styles.jobHeader}>
        <View style={styles.jobIdContainer}>
          <Text style={styles.jobId}>{item.readableId}</Text>
          <Text style={styles.productType}>{item.productType}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <MaterialCommunityIcons
            name={getStatusIcon(item.status)}
            size={16}
            color={colors.white}
          />
          <Text style={styles.statusText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.locationRow}>
          <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.fromLocation.address}
          </Text>
        </View>
        <View style={styles.locationRow}>
          <MaterialCommunityIcons name="flag" size={16} color={colors.success} />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.toLocation.address}
          </Text>
        </View>
      </View>

      <View style={styles.jobDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Weight:</Text>
          <Text style={styles.detailValue}>{item.weight} kg</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Urgency:</Text>
          <Text style={styles.detailValue}>{item.urgency}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Pickup:</Text>
          <Text style={styles.detailValue}>{formatDate(item.pickupDate)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Cost:</Text>
          <Text style={styles.detailValue}>{formatCurrency(item.estimatedCost)}</Text>
        </View>
      </View>

      <View style={styles.jobActions}>
        <Text style={styles.customerInfo}>
          {item.customerName} • {item.customerPhone}
        </Text>
        
        {item.status === 'assigned' && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => handleStatusUpdate(item.id, 'in_progress')}
          >
            <MaterialCommunityIcons name="play" size={16} color={colors.white} />
            <Text style={styles.startButtonText}>Start Job</Text>
          </TouchableOpacity>
        )}
        
        {item.status === 'in_progress' && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => handleStatusUpdate(item.id, 'completed')}
          >
            <MaterialCommunityIcons name="check" size={16} color={colors.white} />
            <Text style={styles.completeButtonText}>Complete</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderStatusFilter = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedStatus === item.key && styles.filterButtonActive,
      ]}
      onPress={() => {
        setSelectedStatus(item.key);
        loadJobs();
      }}
    >
      <MaterialCommunityIcons
        name={item.icon}
        size={16}
        color={selectedStatus === item.key ? colors.white : colors.text.secondary}
      />
      <Text
        style={[
          styles.filterButtonText,
          selectedStatus === item.key && styles.filterButtonTextActive,
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
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
      {/* Status Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          data={statusFilters}
          renderItem={renderStatusFilter}
          keyExtractor={(item) => item.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
        />
      </View>

      {/* Jobs List */}
      <FlatList
        data={jobs}
        renderItem={renderJobItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.jobsList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="truck" size={48} color={colors.text.light} />
            <Text style={styles.emptyText}>No jobs found</Text>
            <Text style={styles.emptySubtext}>
              {selectedStatus === 'all' 
                ? 'You have no jobs assigned yet'
                : `No ${selectedStatus.replace('_', ' ')} jobs found`
              }
            </Text>
          </View>
        }
      />

      {/* Custom Alert */}
      <CustomAlert
        visible={showAlert}
        title="Notification"
        message={alertMessage}
        buttons={[{ text: 'OK', onPress: () => setShowAlert(false) }]}
        onClose={() => setShowAlert(false)}
      />
    </View>
  );
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
    marginTop: spacing.md,
    fontSize: fonts.size.md,
    color: colors.text.secondary,
  },
  filtersContainer: {
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filtersList: {
    paddingHorizontal: spacing.md,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.background,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  jobsList: {
    padding: spacing.md,
  },
  jobCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.black,
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
  jobIdContainer: {
    flex: 1,
  },
  jobId: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  productType: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: fonts.size.xs,
    color: colors.white,
    marginLeft: spacing.xs,
    fontWeight: 'bold',
  },
  routeContainer: {
    marginBottom: spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  locationText: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    marginLeft: spacing.xs,
    flex: 1,
  },
  jobDetails: {
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  detailLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  detailValue: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    fontWeight: '500',
  },
  jobActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  customerInfo: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    flex: 1,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  startButtonText: {
    color: colors.white,
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  completeButtonText: {
    color: colors.white,
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: fonts.size.lg,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: fonts.size.sm,
    color: colors.text.light,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});

export default CompanyDriverJobsScreen;
