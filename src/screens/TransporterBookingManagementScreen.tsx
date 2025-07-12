import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Button, RefreshControl } from 'react-native';

import { MOCK_BOOKINGS, Booking } from '../mocks/bookings';

const statusColors = {
  pending: '#FFA500',
  accepted: '#007bff',
  scheduled: '#17a2b8',
  'in-progress': '#ffc107',
  completed: '#28a745',
  cancelled: '#dc3545',
};

const TransporterBookingManagementScreen = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // TODO: Replace with API call
    setBookings(MOCK_BOOKINGS);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    // TODO: Fetch bookings from backend
    setTimeout(() => {
      setBookings(MOCK_BOOKINGS);
      setRefreshing(false);
    }, 1000);
  };

  const handleAccept = (id) => {
    // TODO: API call to accept booking/request
    alert('Accepted ' + id + ' (API integration pending)');
  };

  const handleReject = (id) => {
    // TODO: API call to reject booking/request
    alert('Rejected ' + id + ' (API integration pending)');
  };

  const handleComplete = (id) => {
    // TODO: API call to mark as complete
    alert('Marked ' + id + ' as completed (API integration pending)');
  };

  const renderItem = ({ item }) => (
    <View style={styles.bookingCard}>
      <Text style={styles.typeTag}>{item.type === 'booking' ? 'Booking' : 'Instant Request'}</Text>
      <Text style={styles.label}>Pickup Location:</Text>
      <Text>{item.pickupLocation}</Text>
      <Text style={styles.label}>Cargo:</Text>
      <Text>{item.cargoDetails}</Text>
      <Text style={styles.label}>Pickup Time:</Text>
      <Text>
        {item.type === 'booking'
          ? new Date(item.pickupTime).toLocaleString()
          : 'ASAP'}
      </Text>
      <Text style={[styles.status, { color: statusColors[item.status] || '#000' }]}>Status: {item.status}</Text>
      <View style={styles.buttonRow}>
        {item.status === 'pending' && (
          <>
            <Button title="Accept" onPress={() => handleAccept(item.id)} />
            <View style={{ width: 10 }} />
            <Button title="Reject" color="#dc3545" onPress={() => handleReject(item.id)} />
          </>
        )}
        {item.status === 'accepted' || item.status === 'in-progress' ? (
          <Button title="Mark Complete" color="#28a745" onPress={() => handleComplete(item.id)} />
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Bookings & Requests</Text>
      <FlatList
        data={bookings}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text>No bookings or requests found.</Text>}
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
  typeTag: {
    alignSelf: 'flex-end',
    backgroundColor: '#eee',
    color: '#333',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
});

export default TransporterBookingManagementScreen;
