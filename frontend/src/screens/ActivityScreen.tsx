import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { PLACEHOLDER_IMAGES } from '../constants/images';
import { apiRequest } from '../utils/api';
import { getAuth } from 'firebase/auth';
import { getReadableLocationName, formatRoute } from '../utils/locationUtils';

interface RequestItem {
  id: string;
  type: 'instant' | 'booking';
  status: string;
  fromLocation: string;
  toLocation: string;
  productType: string;
  weight: string;
  createdAt: string;
  transporter: {
    name: string;
    phone: string;
    profilePhoto?: string;
    photo?: string;
    rating?: number;
    experience?: string;
    availability?: string;
    tripsCompleted?: number;
    status?: string;
  } | null;
}

type NavigationProp = {
  navigate: (screen: string, params?: any) => void;
};

// No mock data - will fetch from API

const ActivityScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // all, instant, booking
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('🔍 Loading bookings for user:', user.uid);

      // Fetch bookings for the current user
      const response = await apiRequest(`/bookings/shipper/${user.uid}`);
      
      console.log('📦 Bookings response:', response);

      if (response.bookings && Array.isArray(response.bookings)) {
        // Transform backend booking data to frontend format
        const transformedBookings = response.bookings.map((booking: any) => ({
          id: booking.bookingId || booking.id || `booking_${Date.now()}`,
          type: booking.bookingMode === 'instant' ? 'instant' : 'booking',
          status: booking.status || 'pending',
          fromLocation: getReadableLocationName(booking.fromLocationAddress || booking.fromLocation),
          toLocation: getReadableLocationName(booking.toLocationAddress || booking.toLocation),
          productType: booking.productType || 'Unknown',
          weight: booking.weightKg ? `${booking.weightKg}kg` : 'Unknown',
          createdAt: booking.createdAt || booking.pickUpDate || new Date().toISOString(),
          transporter: booking.transporterId ? {
            name: booking.transporterName || 'Unknown Transporter',
            phone: booking.transporterPhone || 'N/A',
            profilePhoto: booking.transporterPhoto,
            photo: booking.transporterPhoto,
            rating: booking.transporterRating || 0,
            experience: booking.transporterExperience || 'N/A',
            availability: booking.transporterAvailability || 'N/A',
            tripsCompleted: booking.transporterTripsCompleted || 0,
            status: booking.transporterStatus || 'unknown'
          } : null
        }));

        console.log('✅ Transformed bookings:', transformedBookings.length, 'bookings found');
        setRequests(transformedBookings);
      } else {
        console.log('⚠️ No bookings found or invalid response format');
        setRequests([]);
      }
    } catch (err: any) {
      console.error('❌ Error loading requests:', err);
      setError(err.message || 'Failed to load requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const getFilteredRequests = () => {
    if (activeTab === 'all') return requests;
    return requests.filter(req => req.type === activeTab);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'confirmed': return colors.primary;
      case 'in_transit': return colors.secondary;
      case 'delivered': return colors.success;
      case 'cancelled': return colors.error;
      default: return colors.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'clock-outline';
      case 'confirmed': return 'check-circle-outline';
      case 'in_transit': return 'truck-delivery';
      case 'delivered': return 'check-circle';
      case 'cancelled': return 'close-circle';
      default: return 'help-circle-outline';
    }
  };

  const handleTrackRequest = (request: RequestItem) => {
    if (request.type === 'instant') {
      navigation.navigate('TripDetailsScreen', {
        booking: request,
        isInstant: true
      });
    } else {
      navigation.navigate('TrackingScreen', {
        booking: request,
        isConsolidated: false
      });
    }
  };

  const handleViewMap = (request: RequestItem) => {
    navigation.navigate('MapViewScreen', {
      booking: request,
      isConsolidated: false
    });
  };

  const renderRequestItem = ({ item }: { item: RequestItem }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.requestId}>
          <Text style={styles.requestIdText}>#{item.id}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20', borderColor: getStatusColor(item.status) + '40' }]}>
          <MaterialCommunityIcons
            name={getStatusIcon(item.status)}
            size={16}
            color={getStatusColor(item.status)}
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.requestDetails}>
        <View style={styles.routeInfo}>
          <MaterialCommunityIcons name="map-marker-path" size={20} color={colors.primary} />
          <View style={styles.routeText}>
            <Text style={styles.routeLabel}>Route</Text>
            <Text style={styles.routeValue}>
              {formatRoute(item.fromLocation, item.toLocation)}
            </Text>
          </View>
        </View>

        <View style={styles.productInfo}>
          <MaterialCommunityIcons name="package-variant" size={20} color={colors.secondary} />
          <View style={styles.productText}>
            <Text style={styles.productLabel}>Product</Text>
            <Text style={styles.productValue}>
              {item.productType}
            </Text>
          </View>
        </View>

        <View style={styles.weightInfo}>
          <MaterialCommunityIcons name="weight-kilogram" size={20} color={colors.tertiary} />
          <View style={styles.weightText}>
            <Text style={styles.weightLabel}>Weight</Text>
            <Text style={styles.weightValue}>{item.weight}</Text>
          </View>
        </View>

        {item.transporter && (
          <View style={styles.transporterInfo}>
            <View style={styles.transporterHeader}>
              <MaterialCommunityIcons name="account-tie" size={20} color={colors.success} />
              <Text style={styles.transporterLabel}>Transporter Details</Text>
            </View>
            <View style={styles.transporterDetails}>
              <View style={styles.transporterProfile}>
                <Image
                  source={{ uri: item.transporter?.profilePhoto || item.transporter?.photo || PLACEHOLDER_IMAGES.PROFILE_PHOTO_SMALL }}
                  style={styles.transporterPhoto}
                />
                <View style={styles.transporterBasic}>
                  <Text style={styles.transporterName}>{item.transporter.name}</Text>
                  <View style={styles.transporterRating}>
                    <MaterialCommunityIcons name="star" size={14} color={colors.secondary} style={{ marginRight: 2 }} />
                    <Text style={styles.ratingText}>{item.transporter?.rating || 'N/A'}</Text>
                    <Text style={styles.tripsText}> • {item.transporter?.tripsCompleted || 0} trips</Text>
                  </View>
                </View>
              </View>
              <View style={styles.transporterMeta}>
                <Text style={styles.transporterMetaText}>
                  {item.transporter?.experience || 'N/A'} • {item.transporter?.availability || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.requestMeta}>
          <Text style={styles.requestDate}>
            Created: {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          <Text style={styles.requestType}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)} Request
          </Text>
        </View>
      </View>

      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.trackButton]}
          onPress={() => handleTrackRequest(item)}
        >
          <MaterialCommunityIcons name="map-marker-radius" size={18} color={colors.white} />
          <Text style={styles.trackButtonText}>Track</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.mapButton]}
          onPress={() => handleViewMap(item)}
        >
          <MaterialCommunityIcons name="map" size={18} color={colors.primary} />
          <Text style={styles.mapButtonText}>Map</Text>
        </TouchableOpacity>

        {item.transporter && (
          <TouchableOpacity
            style={[styles.actionButton, styles.contactButton]}
            onPress={() => Alert.alert('Contact', `Call ${item.transporter?.name} at ${item.transporter?.phone}`)}
          >
            <MaterialCommunityIcons name="phone" size={18} color={colors.secondary} />
            <Text style={styles.contactButtonText}>Contact</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Shipments</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your shipments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Shipments</Text>
        </View>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Failed to Load Shipments</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadRequests}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Shipments</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.refreshButton} onPress={loadRequests}>
            <MaterialCommunityIcons name="refresh" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => navigation.navigate('ServiceRequest')}
          >
            <MaterialCommunityIcons name="plus" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'instant' && styles.activeTab]}
          onPress={() => setActiveTab('instant')}
        >
          <Text style={[styles.tabText, activeTab === 'instant' && styles.activeTabText]}>Instant</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'booking' && styles.activeTab]}
          onPress={() => setActiveTab('booking')}
        >
          <Text style={[styles.tabText, activeTab === 'booking' && styles.activeTabText]}>Bookings</Text>
        </TouchableOpacity>
      </View>


      {/* Requests List */}
      <FlatList
        data={getFilteredRequests()}
        renderItem={renderRequestItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="truck-delivery" size={64} color={colors.text.light} />
            <Text style={styles.emptyTitle}>No shipments found</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'all'
                ? 'Create your first shipment request to get started'
                : `No ${activeTab} shipments available`
              }
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('ServiceRequest')}
            >
              <Text style={styles.createButtonText}>Create Shipment Request</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '20',
  },
  headerTitle: {
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  refreshButton: {
    padding: spacing.sm,
  },
  addButton: {
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '20',
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: colors.white,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  activityItem: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  activityTitle: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
  },
  statusText: {
    fontSize: fonts.size.xs,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  activityDescription: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  activityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timestamp: {
    fontSize: fonts.size.xs,
    color: colors.text.light,
  },
  amount: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  reference: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyStateSubtitle: {
    fontSize: fonts.size.md,
    color: colors.text.light,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  errorTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.error,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorSubtitle: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: fonts.size.md,
    fontWeight: '600',
  },
  requestCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  requestId: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestIdText: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.text.primary,
  },


  requestDetails: {
    marginBottom: spacing.md,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  routeText: {
    marginLeft: spacing.sm,
  },
  routeLabel: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  routeValue: {
    fontSize: fonts.size.md,
    fontWeight: '700',
    color: colors.text.primary,
    lineHeight: 22,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  productText: {
    marginLeft: spacing.sm,
  },
  productLabel: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  productValue: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
    color: colors.text.primary,
  },
  weightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  weightText: {
    marginLeft: spacing.sm,
  },
  weightLabel: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  weightValue: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
    color: colors.text.primary,
  },
  consolidatedDetails: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  consolidatedTitle: {
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  consolidatedItem: {
    marginBottom: spacing.xs,
  },
  consolidatedItemText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  transporterInfo: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  transporterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  transporterLabel: {
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  transporterDetails: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
  },
  transporterProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  transporterPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  transporterBasic: {
    flex: 1,
  },
  transporterName: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  transporterRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  ratingText: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    fontWeight: '600',
  },
  tripsText: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  transporterMeta: {
    marginTop: spacing.xs,
  },
  transporterMetaText: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
  },
  requestMeta: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  requestDate: {
    fontSize: fonts.size.xs,
    color: colors.text.light,
    marginBottom: spacing.xs,
  },
  requestType: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
    color: colors.text.primary,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 16,
    flex: 1,
    minHeight: 48,
  },
  trackButton: {
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  trackButtonText: {
    color: colors.white,
    fontSize: fonts.size.sm,
    fontWeight: '600',
  },
  mapButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  mapButtonText: {
    color: colors.primary,
    fontSize: fonts.size.sm,
    fontWeight: '600',
  },
  contactButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  contactButtonText: {
    color: colors.secondary,
    fontSize: fonts.size.sm,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '20',
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fonts.size.md,
    color: colors.text.light,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  createButtonText: {
    color: colors.white,
    fontSize: fonts.size.md,
    fontWeight: '600',
  },
});

export default ActivityScreen;
