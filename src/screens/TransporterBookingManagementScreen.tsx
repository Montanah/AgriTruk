import { useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AssignTransporterModal from '../components/TransporterService/AssignTransporterModal'; // ✅ make sure this path is correct
import BookingCard from '../components/TransporterService/BookingCard';
import { Booking, MOCK_BOOKINGS } from '../mocks/bookings';

const TransporterBookingManagementScreen = () => {
  const route = useRoute();
  const { transporterType } = route.params || {};

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Booking | null>(null); // ✅

  useEffect(() => {
    loadBookings();
  }, [transporterType]);

  const loadBookings = () => {
    const filteredBookings = transporterType
      ? (MOCK_BOOKINGS || []).filter(
          booking => booking.transporterType === transporterType && (booking.transporterType === 'company' || booking.transporterType === 'individual')
        )
      : (MOCK_BOOKINGS || []).filter(booking => booking.transporterType === 'company' || booking.transporterType === 'individual');

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

  const handleAssign = (job: Booking) => {
    setSelectedJob(job);
  };

  const handleAssignConfirm = (jobId: string, transporter: Booking['assignedTransporter']) => {
    const updated = bookings.map(b =>
      b.id === jobId ? { ...b, assignedTransporter: transporter } : b
    );
    setBookings(updated);
    setSelectedJob(null);
    alert(`Assigned ${transporter.name} to job ${jobId}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Bookings & Requests</Text>

      {transporterType && (
        <Text style={styles.transporterInfo}>
          Transporter Type: {transporterType === 'company' ? 'Company' : 'Individual'}
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
            onAssign={handleAssign} // ✅ connect assign
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

      {/* ✅ Transporter Assignment Modal */}
      <AssignTransporterModal
        visible={!!selectedJob}
        job={selectedJob}
        transporter={selectedJob?.assignedTransporter || null}
        onClose={() => setSelectedJob(null)}
        onAssign={handleAssignConfirm}
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
