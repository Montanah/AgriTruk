import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { Booking } from '../../mocks/bookings';

type BookingCardProps = {
  booking: Booking;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onComplete: (id: string) => void;
};

const statusColors: Record<string, string> = {
  pending: '#FFA500',
  accepted: '#007bff',
  scheduled: '#17a2b8',
  'in-progress': '#ffc107',
  completed: '#28a745',
  cancelled: '#dc3545',
};

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onAccept,
  onReject,
  onComplete,
}) => {
  if (!booking) {
    return (
      <View style={styles.card}>
        <Text style={styles.errorText}>Invalid booking data</Text>
      </View>
    );
  }

  const {
    id,
    type,
    pickupLocation,
    cargoDetails,
    pickupTime,
    status,
  } = booking;

  return (
    <View style={styles.card}>
      <Text style={styles.typeTag}>
        {type === 'booking' ? 'Booking' : 'Instant Request'}
      </Text>

      <Text style={styles.label}>Pickup Location:</Text>
      <Text style={styles.value}>{pickupLocation || 'N/A'}</Text>

      <Text style={styles.label}>Cargo:</Text>
      <Text style={styles.value}>{cargoDetails || 'N/A'}</Text>

      <Text style={styles.label}>Pickup Time:</Text>
      <Text style={styles.value}>
        {type === 'booking'
          ? new Date(pickupTime).toLocaleString()
          : 'ASAP'}
      </Text>

      <Text
        style={[
          styles.status,
          { color: statusColors[status] || '#6c757d' },
        ]}
      >
        Status: {status}
      </Text>

      <View style={styles.buttonRow}>
        {status === 'pending' && (
          <>
            <Button title="Accept" onPress={() => onAccept(id)} />
            <View style={{ width: 10 }} />
            <Button
              title="Reject"
              color="#dc3545"
              onPress={() => onReject(id)}
            />
          </>
        )}
        {(status === 'accepted' || status === 'in-progress') && (
          <Button
            title="Mark Complete"
            color="#28a745"
            onPress={() => onComplete(id)}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    backgroundColor: '#fefefe',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 12,
  },
  typeTag: {
    alignSelf: 'flex-end',
    backgroundColor: '#e6e6e6',
    color: '#333',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginBottom: 8,
  },
  label: {
    fontWeight: '600',
    marginTop: 6,
  },
  value: {
    marginBottom: 4,
    color: '#333',
  },
  status: {
    marginTop: 10,
    fontWeight: 'bold',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 10,
    flexWrap: 'wrap',
  },
  errorText: {
    color: '#dc3545',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default BookingCard;
