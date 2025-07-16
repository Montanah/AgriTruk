import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Button, RefreshControl, TouchableOpacity } from 'react-native';

// Dummy data for now; replace with API integration
const dummyBookings = [
  {
    id: '1',
    pickupLocation: 'Farm A',
    cargoDetails: 'Maize, 2 tons',
    pickupTime: '2024-06-10T10:00:00Z',
    status: 'pending',
  },
  {
    id: '2',
    pickupLocation: 'Warehouse B',
    cargoDetails: 'Fertilizer, 1 ton',
    pickupTime: '2024-06-12T14:00:00Z',
    status: 'accepted',
  },
  {
    id: '3',
    pickupLocation: 'Market C',
    cargoDetails: 'Tomatoes, 500kg',
    pickupTime: '2024-06-08T09:00:00Z',
    status: 'completed',
  },
  {
    id: '4',
    pickupLocation: 'Depot D',
    cargoDetails: 'Wheat, 3 tons',
    pickupTime: '2024-06-15T11:00:00Z',
    status: 'pending',
  },
  {
    id: '5',
    pickupLocation: 'Farm E',
    cargoDetails: 'Beans, 1.5 tons',
    pickupTime: '2024-06-13T08:30:00Z',
    status: 'cancelled',
  },
];

const statusColors = {
  pending: '#FFA500',
  accepted: '#007bff',
  scheduled: '#17a2b8',
  'in-progress': '#ffc107',
  completed: '#28a745',
  cancelled: '#dc3545',
};

const statusTabs = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const BookingListScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    // TODO: Replace with API call
    setBookings(dummyBookings);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    // TODO: Fetch bookings from backend
    setTimeout(() => {
      setBookings(dummyBookings);
      setRefreshing(false);
    }, 1000);
  };

  // Analytics
  const total = bookings.length;
  const completed = bookings.filter(b => b.status === 'completed').length;
  const pending = bookings.filter(b => b.status === 'pending').length;
  const accepted = bookings.filter(b => b.status === 'accepted').length;
  const cancelled = bookings.filter(b => b.status === 'cancelled').length;

  // Filter bookings by status
  const filteredBookings =
    activeTab === 'all' ? bookings : bookings.filter(b => b.status === activeTab);

  const renderItem = ({ item }) => (
    <View style={styles.bookingCard}>
      <Text style={styles.label}>Pickup Location:</Text>
      <Text>{item.pickupLocation}</Text>
      <Text style={styles.label}>Cargo:</Text>
      <Text>{item.cargoDetails}</Text>
      <Text style={styles.label}>Pickup Time:</Text>
      <Text>{new Date(item.pickupTime).toLocaleString()}</Text>
      <Text style={[styles.status, { color: statusColors[item.status] || '#000' }]}>Status: {item.status}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Business Dashboard</Text>
      {/* Analytics Summary */}
      <View style={styles.analyticsRow}>
        <View style={styles.analyticsCard}><Text style={styles.analyticsLabel}>Total</Text><Text style={styles.analyticsValue}>{total}</Text></View>
        <View style={styles.analyticsCard}><Text style={styles.analyticsLabel}>Completed</Text><Text style={styles.analyticsValue}>{completed}</Text></View>
        <View style={styles.analyticsCard}><Text style={styles.analyticsLabel}>Pending</Text><Text style={styles.analyticsValue}>{pending}</Text></View>
        <View style={styles.analyticsCard}><Text style={styles.analyticsLabel}>Accepted</Text><Text style={styles.analyticsValue}>{accepted}</Text></View>
        <View style={styles.analyticsCard}><Text style={styles.analyticsLabel}>Cancelled</Text><Text style={styles.analyticsValue}>{cancelled}</Text></View>
      </View>
      {/* Status Filter Tabs */}
      <View style={styles.tabsRow}>
        {statusTabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filteredBookings}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text>No bookings found.</Text>}
      />
      <Button title="Create New Booking" onPress={() => navigation.navigate('BookingCreation')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 4,
  },
  analyticsCard: {
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    minWidth: 60,
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: 'bold',
  },
  analyticsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 2,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#007bff',
  },
  tabText: {
    color: '#333',
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#fff',
  },
  bookingCard: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  label: {
    fontWeight: 'bold',
    marginTop: 5,
  },
  status: {
    marginTop: 10,
    fontWeight: 'bold',
  },
});

export default BookingListScreen;
