/**
 * Unified Status Tracker Component
 * Provides consistent status tracking and updates across all user roles
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';
import { unifiedBookingService, UnifiedBooking, BookingStatus } from '../../services/unifiedBookingService';
import { unifiedTrackingService, TrackingData } from '../../services/unifiedTrackingService';

interface UnifiedStatusTrackerProps {
  booking: UnifiedBooking;
  userRole: 'shipper' | 'broker' | 'business' | 'transporter' | 'driver';
  onStatusUpdate?: (booking: UnifiedBooking) => void;
  onTrackPress?: () => void;
  onChatPress?: () => void;
  onCallPress?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

const UnifiedStatusTracker: React.FC<UnifiedStatusTrackerProps> = ({
  booking,
  userRole,
  onStatusUpdate,
  onTrackPress,
  onChatPress,
  onCallPress,
  showActions = true,
  compact = false,
}) => {
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [availableStatuses, setAvailableStatuses] = useState<BookingStatus[]>([]);

  useEffect(() => {
    loadTrackingData();
    loadAvailableStatuses();
  }, [booking.id]);

  const loadTrackingData = async () => {
    try {
      setLoading(true);
      const data = await unifiedTrackingService.getTrackingData(booking.id);
      setTrackingData(data);
    } catch (error) {
      console.error('Error loading tracking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableStatuses = () => {
    // Determine available statuses based on current status and user role
    const currentStatus = booking.status;
    const statuses: BookingStatus[] = [];

    switch (userRole) {
      case 'transporter':
      case 'driver':
        // Transporters can update status based on current status
        switch (currentStatus) {
          case 'pending':
            statuses.push('confirmed', 'cancelled');
            break;
          case 'confirmed':
            statuses.push('picked_up', 'cancelled');
            break;
          case 'picked_up':
            statuses.push('in_transit', 'cancelled');
            break;
          case 'in_transit':
            statuses.push('delivered', 'cancelled');
            break;
          case 'delivered':
            statuses.push('completed');
            break;
        }
        break;
      case 'shipper':
      case 'broker':
      case 'business':
        // Clients can only cancel pending bookings
        if (currentStatus === 'pending') {
          statuses.push('cancelled');
        }
        break;
    }

    setAvailableStatuses(statuses);
  };

  const handleStatusUpdate = async (newStatus: BookingStatus) => {
    try {
      setUpdating(true);
      
      const success = await unifiedBookingService.updateBookingStatus(
        booking.id,
        newStatus,
        `Status updated to ${newStatus}`
      );

      if (success) {
        // Update local booking object
        const updatedBooking = { ...booking, status: newStatus };
        onStatusUpdate?.(updatedBooking);
        
        Alert.alert('Success', 'Status updated successfully!');
        setShowStatusModal(false);
      } else {
        Alert.alert('Error', 'Failed to update status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: BookingStatus): string => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'confirmed': return colors.primary;
      case 'picked_up': return colors.tertiary;
      case 'in_transit': return colors.secondary;
      case 'delivered': return colors.success;
      case 'completed': return colors.success;
      case 'cancelled': return colors.error;
      case 'disputed': return colors.error;
      default: return colors.text.secondary;
    }
  };

  const getStatusIcon = (status: BookingStatus): string => {
    switch (status) {
      case 'pending': return 'clock-outline';
      case 'confirmed': return 'check-circle-outline';
      case 'picked_up': return 'package-variant';
      case 'in_transit': return 'truck-delivery';
      case 'delivered': return 'check-circle';
      case 'completed': return 'check-all';
      case 'cancelled': return 'close-circle';
      case 'disputed': return 'alert-circle';
      default: return 'help-circle-outline';
    }
  };

  const getStatusLabel = (status: BookingStatus): string => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'picked_up': return 'Picked Up';
      case 'in_transit': return 'In Transit';
      case 'delivered': return 'Delivered';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'disputed': return 'Disputed';
      default: return 'Unknown';
    }
  };

  const canUpdateStatus = (): boolean => {
    return availableStatuses.length > 0 && (userRole === 'transporter' || userRole === 'driver');
  };

  const renderStatusBadge = () => (
    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
      <MaterialCommunityIcons 
        name={getStatusIcon(booking.status)} 
        size={16} 
        color={colors.white} 
      />
      <Text style={styles.statusText}>{getStatusLabel(booking.status)}</Text>
    </View>
  );

  const renderTrackingInfo = () => {
    if (!trackingData || !trackingData.isActive) return null;

    return (
      <View style={styles.trackingInfo}>
        <View style={styles.trackingRow}>
          <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
          <Text style={styles.trackingText}>
            {trackingData.currentLocation?.address || 'Location unknown'}
          </Text>
        </View>
        <View style={styles.trackingRow}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={colors.secondary} />
          <Text style={styles.trackingText}>
            ETA: {trackingData.estimatedArrival || 'Unknown'}
          </Text>
        </View>
        {trackingData.progress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${trackingData.progress.percentage}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {trackingData.progress.percentage}% complete
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderActions = () => {
    if (!showActions) return null;

    return (
      <View style={styles.actionsContainer}>
        {canUpdateStatus() && (
          <TouchableOpacity
            style={[styles.actionButton, styles.statusButton]}
            onPress={() => setShowStatusModal(true)}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <MaterialCommunityIcons name="update" size={16} color={colors.white} />
            )}
            <Text style={styles.actionButtonText}>Update Status</Text>
          </TouchableOpacity>
        )}
        
        {onTrackPress && (
          <TouchableOpacity
            style={[styles.actionButton, styles.trackButton]}
            onPress={onTrackPress}
          >
            <MaterialCommunityIcons name="map" size={16} color={colors.white} />
            <Text style={styles.actionButtonText}>Track</Text>
          </TouchableOpacity>
        )}
        
        {onChatPress && (
          <TouchableOpacity
            style={[styles.actionButton, styles.chatButton]}
            onPress={onChatPress}
          >
            <MaterialCommunityIcons name="chat" size={16} color={colors.white} />
            <Text style={styles.actionButtonText}>Chat</Text>
          </TouchableOpacity>
        )}
        
        {onCallPress && (
          <TouchableOpacity
            style={[styles.actionButton, styles.callButton]}
            onPress={onCallPress}
          >
            <MaterialCommunityIcons name="phone" size={16} color={colors.white} />
            <Text style={styles.actionButtonText}>Call</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderStatusModal = () => (
    <Modal
      visible={showStatusModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowStatusModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Update Status</Text>
          <Text style={styles.modalSubtitle}>
            Current status: {getStatusLabel(booking.status)}
          </Text>
          
          <ScrollView style={styles.statusList}>
            {availableStatuses.map((status) => (
              <TouchableOpacity
                key={status}
                style={styles.statusOption}
                onPress={() => handleStatusUpdate(status)}
                disabled={updating}
              >
                <MaterialCommunityIcons 
                  name={getStatusIcon(status)} 
                  size={24} 
                  color={getStatusColor(status)} 
                />
                <Text style={styles.statusOptionText}>{getStatusLabel(status)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowStatusModal(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {renderStatusBadge()}
        {renderTrackingInfo()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.bookingId}>#{booking.bookingId}</Text>
        {renderStatusBadge()}
      </View>
      
      {renderTrackingInfo()}
      {renderActions()}
      {renderStatusModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingId: {
    ...fonts.bodyBold,
    color: colors.text.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    ...fonts.caption,
    color: colors.white,
    marginLeft: 4,
    fontWeight: '600',
  },
  trackingInfo: {
    marginBottom: 16,
  },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackingText: {
    ...fonts.body,
    color: colors.text.secondary,
    marginLeft: 8,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.background.light,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    ...fonts.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  statusButton: {
    backgroundColor: colors.primary,
  },
  trackButton: {
    backgroundColor: colors.secondary,
  },
  chatButton: {
    backgroundColor: colors.tertiary,
  },
  callButton: {
    backgroundColor: colors.success,
  },
  actionButtonText: {
    ...fonts.caption,
    color: colors.white,
    marginLeft: 4,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    ...fonts.h3,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    ...fonts.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  statusList: {
    maxHeight: 300,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.background.light,
    marginBottom: 8,
  },
  statusOptionText: {
    ...fonts.body,
    color: colors.text.primary,
    marginLeft: 12,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.background.light,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...fonts.body,
    color: colors.text.secondary,
  },
});

export default UnifiedStatusTracker;
