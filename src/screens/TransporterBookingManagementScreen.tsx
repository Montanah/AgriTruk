import { useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import BookingCard from '../components/TransporterService/BookingCard';
import { Booking, MOCK_BOOKINGS } from '../mocks/bookings';

const TransporterBookingManagementScreen = () => {
  const route = useRoute();
  const { transporterType } = route.params || {};

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBookings();
  }, [transporterType]);

  const loadBookings = () => {
    const filteredBookings = transporterType
      ? MOCK_BOOKINGS.filter(
          booking => booking.transporterType === transporterType
        )
      : MOCK_BOOKINGS;

    setBookings(filteredBookings);
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      loadBookings();
      setRefreshing(false);
    }, 1000);
  };

  const handleAccept = (id: string) => {
    alert('Accepted ' + id + ' (API integration pending)');
  };

  const handleReject = (id: string) => {
    alert('Rejected ' + id + ' (API integration pending)');
  };

  const handleComplete = (id: string) => {
    alert('Marked ' + id + ' as completed (API integration pending)');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Bookings & Requests</Text>

      {transporterType && (
        <Text style={styles.transporterInfo}>
          Transporter Type: {transporterType}
        </Text>
      )}

      <FlatList
        data={bookings}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onAccept={handleAccept}
            onReject={handleReject}
            onComplete={handleComplete}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No bookings or requests found.</Text>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={
          bookings.length === 0
            ? styles.emptyContainer
            : { paddingBottom: 100 }
        }
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
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  transporterInfo: {
    fontSize: 16,
    marginBottom: 20,
    color: '#555',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 50,
    fontSize: 16,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 100,
  },
});

export default TransporterBookingManagementScreen;
