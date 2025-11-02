import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../constants';
import { apiRequest } from '../utils/api';
import { getReadableLocationName, cleanLocationDisplay, getReadableLocationNameSync } from '../utils/locationUtils';
import { getDisplayBookingId, getBookingTypeAndMode } from '../utils/unifiedIdSystem';

interface BookingTrackerProps {
  bookingId: string;
  onChatPress?: () => void;
  onCallPress?: () => void;
  onTrackPress?: () => void;
  userType: 'shipper' | 'business' | 'broker';
}

interface BookingStatus {
  booking: {
    id: string;
    status: string;
    fromLocation: string;
    toLocation: string;
    productType: string;
    cost: number;
    transporter?: {
      id: string;
      name: string;
      phone: string;
      rating: number;
      profilePhoto?: string;
    };
    estimatedDelivery?: string;
    recentNotifications: any[];
  };
}

const ClientBookingTracker: React.FC<BookingTrackerProps> = ({
  bookingId,
  onChatPress,
  onCallPress,
  onTrackPress,
  userType
}) => {
  const [bookingStatus, setBookingStatus] = useState<BookingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchBookingStatus();
  }, [bookingId]);

  const fetchBookingStatus = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(`/bookings/${bookingId}/status`, {
        method: 'GET'
      });

      if (response.success) {
        setBookingStatus(response.data);
      } else {
        Alert.alert('Error', 'Failed to fetch booking status');
      }
    } catch (error) {
      console.error('Error fetching booking status:', error);
      Alert.alert('Error', 'Failed to fetch booking status');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBookingStatus();
    setRefreshing(false);
  };

  const handleCallTransporter = () => {
    if (bookingStatus?.booking.transporter?.phone) {
      Linking.openURL(`tel:${bookingStatus.booking.transporter.phone}`);
    } else {
      Alert.alert('No Phone Number', 'Transporter phone number not available');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return colors.warning;
      case 'accepted': return colors.primary;
      case 'in_progress': return colors.secondary;
      case 'completed': return colors.success;
      case 'cancelled': return colors.error;
      default: return colors.gray;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'clock-outline';
      case 'accepted': return 'check-circle';
      case 'in_progress': return 'truck-delivery';
      case 'completed': return 'check-circle-outline';
      case 'cancelled': return 'close-circle';
      default: return 'help-circle-outline';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'Waiting for transporter to accept';
      case 'accepted': return 'Transporter has accepted your booking';
      case 'in_progress': return 'Your shipment is on the way';
      case 'completed': return 'Shipment delivered successfully';
      case 'cancelled': return 'Booking was cancelled';
      default: return 'Status unknown';
    }
  };

  const formatEstimatedDelivery = (estimatedDelivery: string) => {
    if (!estimatedDelivery) return null;
    
    const deliveryTime = new Date(estimatedDelivery);
    const now = new Date();
    const diffMs = deliveryTime.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    
    if (diffHours <= 0) return 'Delivered';
    if (diffHours === 1) return '1 hour remaining';
    return `${diffHours} hours remaining`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading booking status...</Text>
      </View>
    );
  }

  if (!bookingStatus) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={48} color={colors.error} />
        <Text style={styles.errorText}>Failed to load booking status</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchBookingStatus}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { booking } = bookingStatus;

  return (
    <View style={styles.container}>
      {/* Status Header */}
      <View style={styles.statusHeader}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
          <MaterialCommunityIcons 
            name={getStatusIcon(booking.status)} 
            size={20} 
            color={colors.white} 
          />
          <Text style={styles.statusText}>{booking.status.toUpperCase()}</Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <MaterialCommunityIcons 
            name="refresh" 
            size={20} 
            color={colors.primary} 
          />
        </TouchableOpacity>
      </View>

      {/* Status Message */}
      <Text style={styles.statusMessage}>{getStatusMessage(booking.status)}</Text>
      
      {/* Booking ID */}
      <View style={styles.bookingIdContainer}>
        <Text style={styles.bookingIdLabel}>Booking ID:</Text>
        <Text style={styles.bookingIdValue}>{getDisplayBookingId(booking)}</Text>
      </View>

      {/* Route Information */}
      <View style={styles.routeContainer}>
        <View style={styles.routeItem}>
          <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
          <Text style={styles.routeText}>
            From: {cleanLocationDisplay(booking.fromLocation)}
          </Text>
        </View>
        <View style={styles.routeItem}>
          <MaterialCommunityIcons name="map-marker-check" size={16} color={colors.success} />
          <Text style={styles.routeText}>
            To: {cleanLocationDisplay(booking.toLocation)}
          </Text>
        </View>
      </View>

      {/* Booking Details */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="package-variant" size={16} color={colors.gray} />
          <Text style={styles.detailText}>{booking.productType}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="currency-usd" size={16} color={colors.gray} />
          <Text style={styles.detailText}>
            KES {Number(booking.cost || booking.price || booking.estimatedCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
        {booking.estimatedDelivery && (
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={colors.gray} />
            <Text style={styles.detailText}>
              {formatEstimatedDelivery(booking.estimatedDelivery)}
            </Text>
          </View>
        )}
      </View>

      {/* Transporter Information */}
      {booking.transporter && (
        <View style={styles.transporterContainer}>
          <Text style={styles.transporterTitle}>Your Transporter</Text>
          <View style={styles.transporterInfo}>
            <View style={styles.transporterDetails}>
              <Text style={styles.transporterName}>{booking.transporter.name}</Text>
              <View style={styles.ratingContainer}>
                <MaterialCommunityIcons name="star" size={14} color={colors.warning} />
                <Text style={styles.ratingText}>{booking.transporter.rating || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.transporterActions}>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={onChatPress || (() => {})}
              >
                <MaterialCommunityIcons name="message-text" size={16} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.callButton]} 
                onPress={onCallPress || handleCallTransporter}
              >
                <MaterialCommunityIcons name="phone" size={16} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {onTrackPress && (
          <TouchableOpacity style={styles.trackButton} onPress={onTrackPress}>
            <MaterialCommunityIcons name="map-marker-path" size={20} color={colors.white} />
            <Text style={styles.buttonText}>Track Shipment</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Recent Notifications */}
      {booking.recentNotifications.length > 0 && (
        <View style={styles.notificationsContainer}>
          <Text style={styles.notificationsTitle}>Recent Updates</Text>
          {booking.recentNotifications.slice(0, 3).map((notification, index) => (
            <View key={index} style={styles.notificationItem}>
              <MaterialCommunityIcons 
                name="bell-outline" 
                size={14} 
                color={colors.gray} 
              />
              <Text style={styles.notificationText}>{notification.message}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    margin: spacing.md,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fonts.size.md,
    color: colors.text,
  },
  errorContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: fonts.size.md,
    color: colors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: fonts.size.sm,
    fontWeight: fonts.weight.medium,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 20,
  },
  statusText: {
    fontSize: fonts.size.xs,
    fontWeight: fonts.weight.bold,
    color: colors.white,
    marginLeft: spacing.xs,
  },
  refreshButton: {
    padding: spacing.xs,
  },
  statusMessage: {
    fontSize: fonts.size.md,
    color: colors.text,
    marginBottom: spacing.md,
  },
  bookingIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  bookingIdLabel: {
    fontSize: fonts.size.sm,
    color: colors.text,
    marginRight: spacing.sm,
  },
  bookingIdValue: {
    fontSize: fonts.size.sm,
    fontWeight: fonts.weight.bold,
    color: colors.primary,
  },
  routeContainer: {
    marginBottom: spacing.md,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  routeText: {
    fontSize: fonts.size.sm,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  detailsContainer: {
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  detailText: {
    fontSize: fonts.size.sm,
    color: colors.gray,
    marginLeft: spacing.sm,
  },
  transporterContainer: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  transporterTitle: {
    fontSize: fonts.size.sm,
    fontWeight: fonts.weight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  transporterInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transporterDetails: {
    flex: 1,
  },
  transporterName: {
    fontSize: fonts.size.md,
    fontWeight: fonts.weight.medium,
    color: colors.text,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  ratingText: {
    fontSize: fonts.size.sm,
    color: colors.gray,
    marginLeft: spacing.xs,
  },
  transporterActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButton: {
    backgroundColor: colors.success,
  },
  actionContainer: {
    marginBottom: spacing.md,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: fonts.size.md,
    fontWeight: fonts.weight.medium,
    color: colors.white,
    marginLeft: spacing.sm,
  },
  notificationsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  notificationsTitle: {
    fontSize: fonts.size.sm,
    fontWeight: fonts.weight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  notificationText: {
    fontSize: fonts.size.xs,
    color: colors.gray,
    marginLeft: spacing.sm,
    flex: 1,
  },
});

export default ClientBookingTracker;
