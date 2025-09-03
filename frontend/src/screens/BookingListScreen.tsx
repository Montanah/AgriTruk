import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../constants/colors';
import spacing from '../constants/spacing';

interface Booking {
  id: string;
  pickupLocation: string;
  deliveryLocation: string;
  cargoDetails: string;
  pickupTime: string;
  deliveryTime: string;
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
  transporterName: string;
  estimatedCost: string;
  vehicleType: string;
}

type NavigationProp = {
  navigate: (screen: string) => void;
};

// Shipper-specific booking data
const shipperBookings: Booking[] = [
  {
    id: '1',
    pickupLocation: 'Nairobi Industrial Area',
    deliveryLocation: 'Mombasa Port',
    cargoDetails: 'Electronics, 2 tons',
    pickupTime: '2024-06-10T10:00:00Z',
    deliveryTime: '2024-06-12T14:00:00Z',
    status: 'pending',
    transporterName: 'FastTrack Logistics',
    estimatedCost: 'KES 45,000',
    vehicleType: 'Truck',
  },
  {
    id: '2',
    pickupLocation: 'Eldoret Farm',
    deliveryLocation: 'Nairobi Market',
    cargoDetails: 'Fresh Produce, 1.5 tons',
    pickupTime: '2024-06-12T08:00:00Z',
    deliveryTime: '2024-06-12T16:00:00Z',
    status: 'accepted',
    transporterName: 'Green Transport Co.',
    estimatedCost: 'KES 28,000',
    vehicleType: 'Refrigerated Truck',
  },
  {
    id: '3',
    pickupLocation: 'Kisumu Warehouse',
    deliveryLocation: 'Nakuru Distribution',
    cargoDetails: 'Construction Materials, 3 tons',
    pickupTime: '2024-06-08T09:00:00Z',
    deliveryTime: '2024-06-09T11:00:00Z',
    status: 'completed',
    transporterName: 'Heavy Haul Ltd',
    estimatedCost: 'KES 52,000',
    vehicleType: 'Flatbed Truck',
  },
  {
    id: '4',
    pickupLocation: 'Thika Factory',
    deliveryLocation: 'Nairobi CBD',
    cargoDetails: 'Textiles, 800kg',
    pickupTime: '2024-06-15T14:00:00Z',
    deliveryTime: '2024-06-15T17:00:00Z',
    status: 'cancelled',
    transporterName: 'City Express',
    estimatedCost: 'KES 15,000',
    vehicleType: 'Van',
  },
  {
    id: '5',
    pickupLocation: 'Machakos Farm',
    deliveryLocation: 'Nairobi Supermarket',
    cargoDetails: 'Organic Vegetables, 1 ton',
    pickupTime: '2024-06-13T06:00:00Z',
    deliveryTime: '2024-06-13T10:00:00Z',
    status: 'in-progress',
    transporterName: 'Fresh Logistics',
    estimatedCost: 'KES 22,000',
    vehicleType: 'Refrigerated Van',
  },
];

const statusColors = {
  pending: '#FFA500',
  accepted: '#007bff',
  'in-progress': '#17a2b8',
  completed: '#28a745',
  cancelled: '#dc3545',
};

const statusLabels = {
  pending: 'Pending',
  accepted: 'Accepted',
  'in-progress': 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const statusTabs = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const BookingListScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setBookings(shipperBookings);
      setLoading(false);
    }, 1000);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setBookings(shipperBookings);
      setRefreshing(false);
    }, 1000);
  };

  // Analytics
  const total = bookings.length;
  const completed = bookings.filter(b => b.status === 'completed').length;
  const pending = bookings.filter(b => b.status === 'pending').length;
  const accepted = bookings.filter(b => b.status === 'accepted').length;
  const inProgress = bookings.filter(b => b.status === 'in-progress').length;
  const cancelled = bookings.filter(b => b.status === 'cancelled').length;

  // Filter bookings by status
  const filteredBookings =
    activeTab === 'all' ? bookings : bookings.filter(b => b.status === activeTab);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleBookingPress = (booking: Booking) => {
    Alert.alert(
      'Booking Details',
      `From: ${booking.pickupLocation}\nTo: ${booking.deliveryLocation}\nCargo: ${booking.cargoDetails}\nTransporter: ${booking.transporterName}\nCost: ${booking.estimatedCost}`,
      [{ text: 'OK' }]
    );
  };

  const renderBookingItem = ({ item }: { item: Booking }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => handleBookingPress(item)}
    >
      <View style={styles.bookingHeader}>
        <View style={styles.locationInfo}>
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
            <Text style={styles.locationText}>{item.pickupLocation}</Text>
          </View>
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker-check" size={16} color={colors.success} />
            <Text style={styles.locationText}>{item.deliveryLocation}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] + '20' }]}>
          <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
            {statusLabels[item.status]}
          </Text>
        </View>
      </View>

      <View style={styles.bookingDetails}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="package-variant" size={16} color={colors.text.secondary} />
          <Text style={styles.detailText}>{item.cargoDetails}</Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="truck" size={16} color={colors.text.secondary} />
          <Text style={styles.detailText}>{item.transporterName}</Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="calendar-clock" size={16} color={colors.text.secondary} />
          <Text style={styles.detailText}>
            Pickup: {formatDate(item.pickupTime)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="currency-usd" size={16} color={colors.text.secondary} />
          <Text style={styles.detailText}>{item.estimatedCost}</Text>
        </View>
      </View>

      <View style={styles.bookingActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => Alert.alert('Info', 'Tracking feature coming soon!')}
        >
          <MaterialCommunityIcons name="map-marker-path" size={16} color={colors.primary} />
          <Text style={styles.actionButtonText}>Track</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => Alert.alert('Info', 'Contact feature coming soon!')}
        >
          <MaterialCommunityIcons name="phone" size={16} color={colors.primary} />
          <Text style={styles.actionButtonText}>Contact</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your bookings...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <TouchableOpacity
          style={styles.newBookingButton}
          onPress={() => navigation.navigate('ServiceRequest')}
        >
          <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
          <Text style={styles.newBookingButtonText}>New Request</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{pending}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{accepted}</Text>
          <Text style={styles.summaryLabel}>Accepted</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{completed}</Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={statusTabs}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === item.key && styles.activeTab
              ]}
              onPress={() => setActiveTab(item.key)}
            >
              <Text style={[
                styles.tabText,
                activeTab === item.key && styles.activeTabText
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Bookings List */}
      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        renderItem={renderBookingItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="package-variant-closed" size={64} color={colors.text.light} />
            <Text style={styles.emptyTitle}>No bookings found</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'all'
                ? 'You haven\'t made any transport requests yet.'
                : `No ${activeTab} bookings found.`
              }
            </Text>
            <TouchableOpacity
              style={styles.createFirstButton}
              onPress={() => navigation.navigate('ServiceRequest')}
            >
              <Text style={styles.createFirstButtonText}>Create Your First Request</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  newBookingButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  newBookingButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  tabsContainer: {
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.background,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.white,
    fontWeight: '600',
  },
  listContainer: {
    padding: spacing.lg,
  },
  bookingCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  locationInfo: {
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: spacing.xs,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  bookingDetails: {
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  bookingActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.background,
    paddingTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.background,
  },
  actionButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  createFirstButton: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  createFirstButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BookingListScreen;
