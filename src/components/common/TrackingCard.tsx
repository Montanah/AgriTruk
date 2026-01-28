import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../../constants';
import { getDisplayBookingId } from '../../utils/unifiedIdSystem';
import LocationDisplay from './LocationDisplay';

interface TrackingCardProps {
  request: any;
  onTrack: (request: any) => void;
  onViewMap: (request: any) => void;
  onContact?: (request: any) => void;
  userType?: 'shipper' | 'broker' | 'business' | 'transporter';
  showContactButton?: boolean;
}

const TrackingCard: React.FC<TrackingCardProps> = ({
  request,
  onTrack,
  onViewMap,
  onContact,
  userType = 'shipper',
  showContactButton = false,
}) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return colors.success;
      case 'in_transit':
      case 'in_progress':
        return colors.primary;
      case 'pending':
      case 'assigned':
        return colors.warning;
      case 'cancelled':
      case 'rejected':
        return colors.error;
      default:
        return colors.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return 'check-circle';
      case 'in_transit':
      case 'in_progress':
        return 'truck-delivery';
      case 'pending':
      case 'assigned':
        return 'clock-outline';
      case 'cancelled':
      case 'rejected':
        return 'close-circle';
      default:
        return 'help-circle-outline';
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'instant' ? 'lightning-bolt' : 'calendar-clock';
  };

  const getTypeColor = (type: string) => {
    return type === 'instant' ? colors.warning : colors.primary;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => onTrack(request)}>
      {/* Header with ID and Status */}
      <View style={styles.header}>
        <View style={styles.requestId}>
          <Text style={styles.requestIdText}>#{getDisplayBookingId(request)}</Text>
          <View style={[styles.typeBadge, { backgroundColor: getTypeColor(request.type) + '15' }]}>
            <MaterialCommunityIcons 
              name={getTypeIcon(request.type)} 
              size={12} 
              color={getTypeColor(request.type)} 
            />
            <Text style={[styles.typeText, { color: getTypeColor(request.type) }]}>
              {request.type?.toUpperCase() || 'BOOKING'}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '15', borderColor: getStatusColor(request.status) + '30' }]}>
          <MaterialCommunityIcons
            name={getStatusIcon(request.status)}
            size={14}
            color={getStatusColor(request.status)}
          />
          <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
            {request.status?.replace('_', ' ').toUpperCase() || 'PENDING'}
          </Text>
        </View>
      </View>

      {/* Route Information */}
      <View style={styles.routeSection}>
        <View style={styles.routeRow}>
          <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
          <View style={styles.routeInfo}>
            <LocationDisplay 
              location={request.fromLocation || request.pickUpLocation} 
              style={styles.routeText} 
              showIcon={false}
            />
            <MaterialCommunityIcons name="arrow-down" size={14} color={colors.text.secondary} style={styles.arrowIcon} />
            <LocationDisplay 
              location={request.toLocation || request.dropOffLocation} 
              style={styles.routeText} 
              showIcon={false}
            />
          </View>
        </View>
      </View>

      {/* Cargo Information */}
      <View style={styles.cargoSection}>
        <View style={styles.cargoRow}>
          <MaterialCommunityIcons name="package-variant" size={16} color={colors.secondary} />
          <Text style={styles.cargoText}>
            {request.productType || request.product || 'General Cargo'} 
            {request.weight && ` • ${request.weight}`}
          </Text>
        </View>
        
        {request.urgency && (
          <View style={styles.urgencyRow}>
            <MaterialCommunityIcons 
              name={request.urgency === 'high' ? 'alert-circle' : 'clock-outline'} 
              size={16} 
              color={request.urgency === 'high' ? colors.error : colors.warning} 
            />
            <Text style={[styles.urgencyText, { color: request.urgency === 'high' ? colors.error : colors.warning }]}>
              {request.urgency?.toUpperCase()} PRIORITY
            </Text>
          </View>
        )}
      </View>

      {/* Transporter Information */}
      {request.transporter && (
        <View style={styles.transporterSection}>
          <View style={styles.transporterRow}>
            <MaterialCommunityIcons name="truck" size={16} color={colors.primary} />
            <Text style={styles.transporterText}>
              {request.transporter.name || 'Transporter Assigned'}
            </Text>
            {request.transporter.phone && (
              <Text style={styles.transporterPhone}>
                {request.transporter.phone}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.trackButton}
          onPress={() => onTrack(request)}
        >
          <MaterialCommunityIcons name="map-marker-path" size={16} color={colors.white} />
          <Text style={styles.trackButtonText}>Track</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.mapButton}
          onPress={() => onViewMap(request)}
        >
          <MaterialCommunityIcons name="map" size={16} color={colors.primary} />
          <Text style={styles.mapButtonText}>Map</Text>
        </TouchableOpacity>

        {showContactButton && request.transporter && onContact && (
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => onContact(request)}
          >
            <MaterialCommunityIcons name="phone" size={16} color={colors.success} />
            <Text style={styles.contactButtonText}>Contact</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Timestamp */}
      <View style={styles.timestampSection}>
        <MaterialCommunityIcons name="clock-outline" size={14} color={colors.text.secondary} />
        <Text style={styles.timestampText}>
          {request.createdAt ? new Date(request.createdAt).toLocaleDateString('en-KE', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : 'Unknown'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.text.light + '20',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  requestId: {
    flex: 1,
  },
  requestIdText: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  typeText: {
    fontSize: fonts.size.xs,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: fonts.size.xs,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  routeSection: {
    marginBottom: spacing.sm,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  routeText: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  arrowIcon: {
    alignSelf: 'center',
    marginVertical: spacing.xs,
  },
  cargoSection: {
    marginBottom: spacing.sm,
  },
  cargoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cargoText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  urgencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgencyText: {
    fontSize: fonts.size.xs,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  transporterSection: {
    marginBottom: spacing.sm,
  },
  transporterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transporterText: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    fontWeight: '500',
    marginLeft: spacing.sm,
    flex: 1,
  },
  transporterPhone: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  trackButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    gap: spacing.xs,
  },
  trackButtonText: {
    color: colors.white,
    fontSize: fonts.size.sm,
    fontWeight: '600',
  },
  mapButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    gap: spacing.xs,
  },
  mapButtonText: {
    color: colors.primary,
    fontSize: fonts.size.sm,
    fontWeight: '600',
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.success,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    gap: spacing.xs,
  },
  contactButtonText: {
    color: colors.success,
    fontSize: fonts.size.sm,
    fontWeight: '600',
  },
  timestampSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.text.light + '20',
  },
  timestampText: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
});

export default TrackingCard;

