import { theme } from '@/constants';
import React from 'react';
import {
  Button,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Booking } from '../../mocks/bookings';

type BookingCardProps = {
  booking: Booking;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onComplete: (id: string) => void;
  onAssign?: (booking: Booking) => void;
  onPressDetails?: (id: string) => void;
};

const statusColors: Record<string, string> = {
  pending: theme.colors.warning,
  accepted: theme.colors.primary,
  scheduled: '#17a2b8',
  'in-progress': '#ffc107',
  completed: theme.colors.success,
  cancelled: theme.colors.error,
};

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onAccept,
  onReject,
  onComplete,
  onAssign,
  onPressDetails,
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
    assignedTransporter,
  } = booking;

  const canComplete = ['accepted', 'in-progress'].includes(status);

  const canAssign =
    type === 'instant' &&
    ['pending', 'accepted'].includes(status) &&
    !assignedTransporter &&
    !!onAssign;

  const isInstant = type === 'instant';
  return (
  <TouchableOpacity
  style={[styles.card, isInstant && styles.instantCard]}
  activeOpacity={onPressDetails ? 0.8 : 1}
  onPress={onPressDetails ? () => onPressDetails(id) : undefined}
  >
  <View style={[styles.tag, isInstant ? styles.instantTag : { backgroundColor: '#e6e6e6' }]}> 
  {isInstant && (
  <MaterialCommunityIcons name="flash" size={14} color="#fff" style={{ marginRight: 4 }} />
  )}
  <Text style={[styles.tagText, isInstant && { color: '#fff' }]}> 
  {type === 'booking' ? 'Booking' : 'Instant Request'}
  </Text>
  </View>

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

      {assignedTransporter ? (
        <>
          <Text style={styles.label}>Assigned Transporter:</Text>
          <Text style={styles.value}>
            {assignedTransporter.name} ({assignedTransporter.phone})
          </Text>
          {booking.vehicle && (
            <Text style={styles.value}>
              Vehicle: {booking.vehicle.type}{booking.vehicle.bodyType ? ` (${booking.vehicle.bodyType})` : ''} • {booking.vehicle.plate}
            </Text>
          )}
        </>
      ) : (
        <Text style={styles.valueItalic}>Not Assigned</Text>
      )}

      <View style={styles.statusContainer}>
        <Text
          style={[
            styles.status,
            { color: statusColors[status] || '#6c757d' },
          ]}
        >
          Status: {status}
        </Text>
      </View>

      <View style={styles.buttonRow}>
        {status === 'pending' && (
          <>
            <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={() => onAccept(id)}>
              <MaterialCommunityIcons name="check-circle-outline" size={18} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.actionBtnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => onReject(id)}>
              <MaterialCommunityIcons name="close-circle-outline" size={18} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}

        {canAssign && (
          <TouchableOpacity style={[styles.actionBtn, styles.assignBtn]} onPress={() => onAssign?.(booking)}>
            <MaterialCommunityIcons name="account-plus-outline" size={18} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.actionBtnText}>Assign</Text>
          </TouchableOpacity>
        )}

        {canComplete && (
          <TouchableOpacity style={[styles.actionBtn, styles.completeBtn]} onPress={() => onComplete(id)}>
            <MaterialCommunityIcons name="check-bold" size={18} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.actionBtnText}>Complete</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 15,
    backgroundColor: theme.colors.white,
    shadowColor: theme.colors.black,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 12,
  },
  instantCard: {
    borderColor: theme.colors.secondary,
    backgroundColor: '#f7fbff',
  },
  tag: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginBottom: 8,
  },
  instantTag: {
    backgroundColor: theme.colors.secondary,
  },
  tagText: {
    color: theme.colors.text.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 6,
  },
  acceptBtn: {
    backgroundColor: theme.colors.secondary,
  },
  rejectBtn: {
    backgroundColor: theme.colors.error,
  },
  assignBtn: {
    backgroundColor: theme.colors.primary,
  },
  completeBtn: {
    backgroundColor: theme.colors.success,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 2,
  },
  label: {
    fontWeight: '600',
    marginTop: 6,
    color: theme.colors.text.primary,
  },
  value: {
    marginBottom: 4,
    color: theme.colors.text.secondary,
  },
  valueItalic: {
    marginBottom: 4,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  statusContainer: {
    marginTop: 10,
  },
  status: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 10,
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default BookingCard;
