import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import { routeValidationService } from '../../services/routeValidationService';
import type { ActiveTrip } from '../../services/routeValidationService';

interface CurrentRouteStatusProps {
  userType: 'driver' | 'transporter';
  onRouteChange?: (trip: ActiveTrip | null) => void;
  style?: any;
}

const CurrentRouteStatus: React.FC<CurrentRouteStatusProps> = ({
  userType,
  onRouteChange,
  style
}) => {
  const [currentTrip, setCurrentTrip] = useState<ActiveTrip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentTrip();
  }, [userType]);

  const fetchCurrentTrip = async () => {
    try {
      setLoading(true);
      const trip = await routeValidationService.getCurrentActiveTrip(userType);
      setCurrentTrip(trip);
      onRouteChange?.(trip);
    } catch (error) {
      console.error('Error fetching current trip:', error);
      setCurrentTrip(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="loading" size={16} color={colors.text.secondary} />
          <Text style={styles.loadingText}>Checking route status...</Text>
        </View>
      </View>
    );
  }

  if (!currentTrip) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.noTripContainer}>
          <MaterialCommunityIcons name="map-marker-off" size={20} color={colors.text.secondary} />
          <Text style={styles.noTripText}>No active trip</Text>
          <Text style={styles.noTripSubtext}>You can accept any available jobs</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.tripContainer}>
        <View style={styles.tripHeader}>
          <MaterialCommunityIcons name="truck-delivery" size={20} color={colors.primary} />
          <Text style={styles.tripTitle}>Current Trip</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentTrip.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(currentTrip.status) }]}>
              {getStatusLabel(currentTrip.status)}
            </Text>
          </View>
        </View>
        
        <View style={styles.routeInfo}>
          <View style={styles.routeItem}>
            <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
            <Text style={styles.routeText} numberOfLines={1}>
              {currentTrip.route.from.name}
            </Text>
          </View>
          
          <MaterialCommunityIcons name="arrow-right" size={16} color={colors.text.secondary} />
          
          <View style={styles.routeItem}>
            <MaterialCommunityIcons name="map-marker" size={16} color={colors.error} />
            <Text style={styles.routeText} numberOfLines={1}>
              {currentTrip.route.to.name}
            </Text>
          </View>
        </View>
        
        <Text style={styles.routeNote}>
          Only jobs along this route will be shown
        </Text>
      </View>
    </View>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'accepted': return colors.warning;
    case 'in_progress': return colors.primary;
    case 'picked_up': return colors.info;
    case 'in_transit': return colors.success;
    case 'delivered': return colors.text.secondary;
    default: return colors.text.secondary;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'accepted': return 'ACCEPTED';
    case 'in_progress': return 'IN PROGRESS';
    case 'picked_up': return 'PICKED UP';
    case 'in_transit': return 'IN TRANSIT';
    case 'delivered': return 'DELIVERED';
    default: return status.toUpperCase();
  }
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...fonts.regular,
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 8,
  },
  noTripContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  noTripText: {
    ...fonts.medium,
    fontSize: 16,
    color: colors.text.primary,
    marginTop: 8,
  },
  noTripSubtext: {
    ...fonts.regular,
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
  tripContainer: {
    // Container styles
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripTitle: {
    ...fonts.medium,
    fontSize: 16,
    color: colors.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    ...fonts.medium,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  routeText: {
    ...fonts.regular,
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: 6,
    flex: 1,
  },
  routeNote: {
    ...fonts.regular,
    fontSize: 12,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
});

export default CurrentRouteStatus;
