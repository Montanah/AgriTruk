import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, fonts, spacing } from '../constants';
import ExpoCompatibleMap from '../components/common/ExpoCompatibleMap';
import LocationDisplay from '../components/common/LocationDisplay';
import { chatService } from '../services/chatService';
import { apiRequest } from '../utils/api';
import { getReadableLocationName } from '../utils/locationUtils';

const { width, height } = Dimensions.get('window');

interface ShipmentManagementParams {
  booking: any;
  isInstant?: boolean;
  transporterId?: string;
}

const ShipmentManagementScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { booking, isInstant = false, transporterId } = route.params as ShipmentManagementParams;

  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [estimatedTime, setEstimatedTime] = useState('');
  const [clientInfo, setClientInfo] = useState(null);
  const [chatRoom, setChatRoom] = useState(null);

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      setLoading(true);
      
      // Get current location
      await getCurrentLocation();
      
      // Get client information
      await getClientInfo();
      
      // Create or get chat room
      await initializeChat();
      
      // Calculate route
      await calculateRoute();
      
    } catch (error) {
      console.error('Error initializing screen:', error);
      Alert.alert('Error', 'Failed to load shipment details');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { getCurrentPositionAsync, requestForegroundPermissionsAsync } = require('expo-location');
      
      const { status } = await requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required');
        return;
      }

      const location = await getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const getClientInfo = async () => {
    try {
      if (booking?.userId) {
        const response = await apiRequest(`/users/${booking.userId}`, {
          method: 'GET'
        });
        setClientInfo(response);
      }
    } catch (error) {
      console.error('Error getting client info:', error);
    }
  };

  const initializeChat = async () => {
    try {
      if (booking?.id && transporterId && clientInfo?.id) {
        const room = await chatService.getOrCreateChatRoom(
          booking.id,
          transporterId,
          clientInfo.id
        );
        setChatRoom(room);
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
    }
  };

  const calculateRoute = async () => {
    try {
      if (currentLocation && booking?.fromLocation && booking?.toLocation) {
        // Calculate route from current location to pickup, then to destination
        const pickupCoords = await getCoordinatesFromLocation(booking.fromLocation);
        const destinationCoords = await getCoordinatesFromLocation(booking.toLocation);
        
        if (pickupCoords && destinationCoords) {
          setRouteCoordinates([currentLocation, pickupCoords, destinationCoords]);
          
          // Calculate estimated time
          const distance = calculateDistance(currentLocation, pickupCoords);
          const estimatedMinutes = Math.round(distance / 50 * 60); // Assuming 50 km/h average
          setEstimatedTime(`${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`);
        }
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  };

  const getCoordinatesFromLocation = async (locationString: string) => {
    try {
      // This would typically use a geocoding service
      // For now, return mock coordinates
      return {
        latitude: -1.2921 + (Math.random() - 0.5) * 0.1,
        longitude: 36.8219 + (Math.random() - 0.5) * 0.1,
      };
    } catch (error) {
      console.error('Error getting coordinates:', error);
      return null;
    }
  };

  const calculateDistance = (point1: any, point2: any) => {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleStartTrip = async () => {
    try {
      setLoading(true);
      
      const response = await apiRequest(`/bookings/${booking.id}/start`, {
        method: 'POST',
        body: JSON.stringify({
          transporterId: transporterId,
          status: 'in_progress'
        })
      });

      if (response.success) {
        Alert.alert('Trip Started! 🚛', 'You have started the trip. The client has been notified.');
        // Update booking status locally
        booking.status = 'in_progress';
      }
    } catch (error) {
      console.error('Error starting trip:', error);
      Alert.alert('Error', 'Failed to start trip');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTrip = async () => {
    try {
      setLoading(true);
      
      const response = await apiRequest(`/bookings/${booking.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          transporterId: transporterId,
          status: 'completed'
        })
      });

      if (response.success) {
        Alert.alert('Trip Completed! ✅', 'Great job! The client has been notified.');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error completing trip:', error);
      Alert.alert('Error', 'Failed to complete trip');
    } finally {
      setLoading(false);
    }
  };

  const handleCallClient = () => {
    if (clientInfo?.phone) {
      Linking.openURL(`tel:${clientInfo.phone}`);
    } else {
      Alert.alert('No Phone Number', 'Client phone number not available');
    }
  };

  const handleOpenChat = () => {
    if (chatRoom) {
      (navigation as any).navigate('ChatScreen', {
        roomId: chatRoom.id,
        bookingId: booking.id,
        transporterName: 'You',
        clientName: clientInfo?.name || 'Client',
        transporterPhone: 'your-phone',
        clientPhone: clientInfo?.phone,
        userType: 'transporter'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'accepted': return colors.primary;
      case 'in_progress': return colors.warning;
      case 'completed': return colors.success;
      default: return colors.gray;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'accepted': return 'check-circle';
      case 'in_progress': return 'truck-delivery';
      case 'completed': return 'check-circle-outline';
      default: return 'clock-outline';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading shipment details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Shipment Management</Text>
          <Text style={styles.headerSubtitle}>
            {isInstant ? 'Instant Request' : 'Scheduled Booking'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking?.status) }]}>
          <MaterialCommunityIcons 
            name={getStatusIcon(booking?.status)} 
            size={16} 
            color={colors.white} 
          />
          <Text style={styles.statusText}>{booking?.status?.toUpperCase()}</Text>
        </View>
      </View>

      {/* Map Section */}
      <View style={styles.mapContainer}>
        <ExpoCompatibleMap
          style={styles.map}
          initialRegion={{
            latitude: currentLocation?.latitude || -1.2921,
            longitude: currentLocation?.longitude || 36.8219,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          markers={[
            ...(currentLocation ? [{
              id: 'current',
              coordinate: currentLocation,
              title: 'Your Location',
              description: 'Current position',
              pinColor: colors.primary,
            }] : []),
            ...(routeCoordinates.length > 0 ? [
              {
                id: 'pickup',
                coordinate: routeCoordinates[1],
                title: 'Pickup Location',
                description: getReadableLocationName(booking?.fromLocation),
                pinColor: colors.warning,
              },
              {
                id: 'destination',
                coordinate: routeCoordinates[2],
                title: 'Destination',
                description: getReadableLocationName(booking?.toLocation),
                pinColor: colors.success,
              }
            ] : [])
          ]}
          routeCoordinates={routeCoordinates}
        />
      </View>

      {/* Shipment Details */}
      <View style={styles.detailsContainer}>
        <Text style={styles.sectionTitle}>Shipment Details</Text>
        
        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="package-variant" size={20} color={colors.primary} />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Cargo Type</Text>
              <Text style={styles.detailValue}>{booking?.productType || 'Unknown'}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="weight-kilogram" size={20} color={colors.secondary} />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Weight</Text>
              <Text style={styles.detailValue}>{booking?.weightKg || 'Unknown'} kg</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="currency-usd" size={20} color={colors.tertiary} />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Payment</Text>
              <Text style={styles.detailValue}>KES {booking?.cost?.toLocaleString() || '0'}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="clock-outline" size={20} color={colors.gray} />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Estimated Time</Text>
              <Text style={styles.detailValue}>{estimatedTime || 'Calculating...'}</Text>
            </View>
          </View>
        </View>

        {/* Route Information */}
        <View style={styles.routeCard}>
          <Text style={styles.routeTitle}>Route</Text>
          <LocationDisplay 
            fromLocation={booking?.fromLocation}
            toLocation={booking?.toLocation}
            style={styles.routeDisplay}
          />
        </View>

        {/* Client Information */}
        {clientInfo && (
          <View style={styles.clientCard}>
            <Text style={styles.clientTitle}>Client Information</Text>
            <View style={styles.clientInfo}>
              <View style={styles.clientRow}>
                <MaterialCommunityIcons name="account" size={20} color={colors.primary} />
                <Text style={styles.clientName}>{clientInfo.name || 'Unknown'}</Text>
              </View>
              {clientInfo.phone && (
                <View style={styles.clientRow}>
                  <MaterialCommunityIcons name="phone" size={20} color={colors.secondary} />
                  <Text style={styles.clientPhone}>{clientInfo.phone}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.chatButton} 
          onPress={handleOpenChat}
        >
          <MaterialCommunityIcons name="message-text" size={20} color={colors.white} />
          <Text style={styles.buttonText}>Chat with Client</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.callButton} 
          onPress={handleCallClient}
        >
          <MaterialCommunityIcons name="phone" size={20} color={colors.white} />
          <Text style={styles.buttonText}>Call Client</Text>
        </TouchableOpacity>
      </View>

      {/* Trip Control Buttons */}
      <View style={styles.tripControlContainer}>
        {booking?.status === 'accepted' && (
          <TouchableOpacity 
            style={styles.startButton} 
            onPress={handleStartTrip}
            disabled={loading}
          >
            <MaterialCommunityIcons name="play" size={20} color={colors.white} />
            <Text style={styles.buttonText}>Start Trip</Text>
          </TouchableOpacity>
        )}

        {booking?.status === 'in_progress' && (
          <TouchableOpacity 
            style={styles.completeButton} 
            onPress={handleCompleteTrip}
            disabled={loading}
          >
            <MaterialCommunityIcons name="check" size={20} color={colors.white} />
            <Text style={styles.buttonText}>Complete Trip</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fonts.size.md,
    color: colors.text,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.primary,
    paddingTop: 50,
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fonts.size.lg,
    fontWeight: fonts.weight.bold,
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: fonts.size.sm,
    color: colors.white,
    opacity: 0.8,
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
  mapContainer: {
    height: 250,
    margin: spacing.lg,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  map: {
    flex: 1,
  },
  detailsContainer: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fonts.size.lg,
    fontWeight: fonts.weight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  detailLabel: {
    fontSize: fonts.size.sm,
    color: colors.gray,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: fonts.size.md,
    fontWeight: fonts.weight.medium,
    color: colors.text,
  },
  routeCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  routeTitle: {
    fontSize: fonts.size.md,
    fontWeight: fonts.weight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  routeDisplay: {
    marginTop: spacing.sm,
  },
  clientCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  clientTitle: {
    fontSize: fonts.size.md,
    fontWeight: fonts.weight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  clientInfo: {
    marginTop: spacing.sm,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  clientName: {
    fontSize: fonts.size.md,
    fontWeight: fonts.weight.medium,
    color: colors.text,
    marginLeft: spacing.md,
  },
  clientPhone: {
    fontSize: fonts.size.md,
    color: colors.primary,
    marginLeft: spacing.md,
  },
  actionContainer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: fonts.size.md,
    fontWeight: fonts.weight.medium,
    color: colors.white,
    marginLeft: spacing.sm,
  },
  tripControlContainer: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning,
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
});

export default ShipmentManagementScreen;
