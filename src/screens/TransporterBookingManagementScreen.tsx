import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Button, RefreshControl } from 'react-native';

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
];

const statusColors = {
  pending: '#FFA500',
  accepted: '#007bff',
  scheduled: '#17a2b8',
  'in-progress': '#ffc107',
  completed: '#28a745',
  cancelled: '#dc3545',
};

const TransporterBookingManagementScreen = () => {
  const [bookings, setBookings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

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

  const handleAccept = (id) => {
    // TODO: API call to accept booking
    alert('Accepted booking ' + id + ' (API integration pending)');
  };

  const handleReject = (id) => {
    // TODO: API call to reject booking
    alert('Rejected booking ' + id + ' (API integration pending)');
  };

  const renderItem = ({ item }) => (
    <View style={styles.bookingCard}>
      <Text style={styles.label}>Pickup Location:</Text>
      <Text>{item.pickupLocation}</Text>
      <Text style={styles.label}>Cargo:</Text>
      <Text>{item.cargoDetails}</Text>
      <Text style={styles.label}>Pickup Time:</Text>
      <Text>{new Date(item.pickupTime).toLocaleString()}</Text>
      <Text style={[styles.status, { color: statusColors[item.status] || '#000' }]}>Status: {item.status}</Text>
      {item.status === 'pending' && (
        <View style={styles.buttonRow}>
          <Button title="Accept" onPress={() => handleAccept(item.id)} />
          <View style={{ width: 10 }} />
          <Button title="Reject" color="#dc3545" onPress={() => handleReject(item.id)} />
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Bookings</Text>
      <FlatList
        data={bookings}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text>No bookings found.</Text>}
      />
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
  buttonRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
});

export default TransporterBookingManagementScreen;
