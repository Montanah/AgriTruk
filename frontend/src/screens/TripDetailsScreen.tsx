import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState, useRef } from 'react';
import { FlatList, Image, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, ActivityIndicator } from 'react-native';
import { notificationService } from '../services/notificationService';
import { enhancedNotificationService } from '../services/enhancedNotificationService';
import { realTimeTrackingService } from '../services/realTimeTrackingService';
import { trafficMonitoringService } from '../services/trafficMonitoringService';
import NotificationBell from '../components/Notification/NotificationBell';
import AvailableLoadsAlongRoute from '../components/TransporterService/AvailableLoadsAlongRoute';
import ExpoCompatibleMap from '../components/common/ExpoCompatibleMap';
import RealtimeChatModal from '../components/Chat/RealtimeChatModal';
import { enhancedRatingService } from '../services/enhancedRatingService';
import colors from '../constants/colors';
import { PLACEHOLDER_IMAGES } from '../constants/images';
import { apiRequest } from '../utils/api';
import { getLocationName, formatRoute } from '../utils/locationUtils';
import { getAuth } from 'firebase/auth';
import LocationDisplay from '../components/common/LocationDisplay';
import { getDisplayBookingId } from '../utils/unifiedIdSystem';

interface TripDetailsParams {
  requests?: any[];
  isInstant?: boolean;
  booking?: any;
  trip?: any;
  transporter?: any;
  vehicle?: any;
  bookingId?: string;
  tripId?: string;
  jobId?: string;
  job?: any;
  userType?: 'shipper' | 'broker' | 'business' | 'transporter';
  eta?: string;
  distance?: string;
}

const TripDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const params = route.params as TripDetailsParams || {};

  // Support consolidated instant requests: params.requests (array) or single booking/trip
  const requests = params.requests || null; // array of requests for consolidated
  const isConsolidated = Array.isArray(requests) && requests.length > 1;
  const isInstant = params.isInstant || false; // Flag for instant requests

  // Get user type from params or determine from navigation context
  const userType = params.userType || 'shipper';

  // State for real booking data
  const [realBooking, setRealBooking] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transporterLocation, setTransporterLocation] = useState<any>(null);
  const [routeDeviation, setRouteDeviation] = useState<boolean>(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  
  // Real-time tracking state
  const [isTracking, setIsTracking] = useState(false);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [trafficAlerts, setTrafficAlerts] = useState<any[]>([]);
  const [alternativeRoutes, setAlternativeRoutes] = useState<any[]>([]);
  const [showTrafficModal, setShowTrafficModal] = useState(false);
  const [showRouteOptions, setShowRouteOptions] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const mapRef = useRef<any>(null);

  // Fetch real booking data when job is provided
  useEffect(() => {
    const fetchBookingData = async () => {
      if (!params.job && !params.bookingId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const { getAuth } = require('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        const token = await user.getIdToken();
        const bookingId = params.bookingId || params.job?.bookingId;
        
        if (bookingId) {
          const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://agritruk.onrender.com'}/api/bookings/${bookingId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const bookingData = await response.json();
            setRealBooking(bookingData);
            console.log('Fetched real booking data:', bookingData);
          } else {
            console.error('Failed to fetch booking data:', response.status);
            setError('Failed to fetch booking details');
          }
        }
      } catch (err) {
        console.error('Error fetching booking data:', err);
        setError('Error loading booking details');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingData();
  }, [params.job, params.bookingId]);

  // Real-time tracking for clients
  useEffect(() => {
    if (!realBooking || !['started', 'in_progress', 'accepted', 'ongoing'].includes(realBooking.status)) return;

    const trackingInterval = setInterval(async () => {
      // Fetch updated location data
      await fetchBookingData();
      
      // Send location update notification
      if (realBooking?.transporterId) {
        try {
          await enhancedNotificationService.sendNotification(
            'location_update',
            realBooking.userId,
            {
              bookingId: realBooking.id,
              transporterName: realBooking.transporterName || 'Transporter',
              currentLocation: transporterLocation,
              estimatedArrival: '15 minutes'
            }
          );
        } catch (error) {
          console.error('Error sending location update notification:', error);
        }
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(trackingInterval);
  }, [realBooking?.status, realBooking?.transporterId, realBooking?.userId]);

  // Monitor status changes and send notifications
  useEffect(() => {
    if (realBooking?.status) {
      sendStatusNotification(realBooking.status, realBooking);
    }
  }, [realBooking?.status]);

  // Initialize real-time tracking for clients
  useEffect(() => {
    if (realBooking && ['shipper', 'business', 'broker'].includes(userType)) {
      initializeRealTimeTracking();
    }
    
    return () => {
      if (realBooking?.id) {
        realTimeTrackingService.stopTracking(realBooking.id);
        realTimeTrackingService.unsubscribe(realBooking.id);
      }
    };
  }, [realBooking, userType]);

  // Real-time tracking functions
  const initializeRealTimeTracking = async () => {
    if (!realBooking?.id) return;

    try {
      // Start tracking
      await realTimeTrackingService.startTracking(realBooking.id, realBooking.userId);
      setIsTracking(true);

      // Subscribe to location updates
      realTimeTrackingService.onLocationUpdate(realBooking.id, (location) => {
        setTransporterLocation(location);
        setLastUpdateTime(new Date());
        
        // Update map if available
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
        }
      });

      // Subscribe to route deviations
      realTimeTrackingService.onRouteDeviation(realBooking.id, (deviation) => {
        setRouteDeviation(true);
        Alert.alert(
          'Route Update',
          `Your transporter is taking an alternative route. ${deviation.reason}`,
          [
            { text: 'View Traffic Info', onPress: () => setShowTrafficModal(true) },
            { text: 'OK', style: 'default' },
          ]
        );
      });

      // Subscribe to traffic alerts
      realTimeTrackingService.onTrafficAlert(realBooking.id, (alert) => {
        setTrafficAlerts(prev => [alert, ...prev]);
        Alert.alert(
          'Traffic Alert',
          alert.message,
          [
            { text: 'View Details', onPress: () => setShowTrafficModal(true) },
            { text: 'OK', style: 'default' },
          ]
        );
      });

      // Load initial tracking data
      const data = await realTimeTrackingService.getTrackingData(realBooking.id);
      if (data) {
        setTrackingData(data);
      }

      // Load traffic conditions
      await loadTrafficConditions();
    } catch (error) {
      console.error('Error initializing real-time tracking:', error);
    }
  };

  const loadTrafficConditions = async () => {
    if (!realBooking?.route) return;

    try {
      const { pickup, delivery } = realBooking.route;
      const centerLat = (pickup.latitude + delivery.latitude) / 2;
      const centerLon = (pickup.longitude + delivery.longitude) / 2;
      
      const conditions = await trafficMonitoringService.getTrafficConditions(
        centerLat,
        centerLon,
        10000 // 10km radius
      );
      
      setTrafficAlerts(conditions);

      // Get alternative routes
      const routes = await trafficMonitoringService.getAlternativeRoutes(
        pickup,
        delivery,
        realBooking.route.plannedRoute
      );
      
      setAlternativeRoutes(routes);
    } catch (error) {
      console.error('Error loading traffic conditions:', error);
    }
  };

  // Helper functions for UI
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return colors.success;
      case 'medium': return colors.warning;
      case 'high': return colors.error;
      case 'critical': return colors.error;
      default: return colors.text.secondary;
    }
  };

  const getTrafficColor = (level: string) => {
    switch (level) {
      case 'low': return colors.success;
      case 'medium': return colors.warning;
      case 'high': return colors.error;
      default: return colors.text.secondary;
    }
  };

  // Route deviation detection
  useEffect(() => {
    if (!transporterLocation || !realBooking) return;

    const checkRouteDeviation = () => {
      // Simple route deviation check - in production, this would use a proper routing service
      const expectedRoute = {
        from: realBooking.fromLocation,
        to: realBooking.toLocation
      };
      
      // Calculate if transporter is significantly off the expected route
      // This is a simplified check - in production, use Google Maps Roads API or similar
      const deviationThreshold = 0.01; // ~1km
      const currentLat = transporterLocation.latitude;
      const currentLng = transporterLocation.longitude;
      
      // Check if transporter is moving away from the route
      const fromLat = expectedRoute.from?.latitude || 0;
      const fromLng = expectedRoute.from?.longitude || 0;
      const toLat = expectedRoute.to?.latitude || 0;
      const toLng = expectedRoute.to?.longitude || 0;
      
      const distanceFromStart = Math.sqrt(
        Math.pow(currentLat - fromLat, 2) + Math.pow(currentLng - fromLng, 2)
      );
      const distanceFromEnd = Math.sqrt(
        Math.pow(currentLat - toLat, 2) + Math.pow(currentLng - toLng, 2)
      );
      
      const isDeviating = distanceFromStart > deviationThreshold && distanceFromEnd > deviationThreshold;
      
      if (isDeviating && !routeDeviation) {
        setRouteDeviation(true);
        Alert.alert(
          'Route Deviation Alert',
          'The transporter appears to be taking an unexpected route. Would you like to contact them?',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Contact Now', onPress: () => setChatVisible(true) }
          ]
        );
      } else if (!isDeviating && routeDeviation) {
        setRouteDeviation(false);
      }
    };

    checkRouteDeviation();
  }, [transporterLocation, realBooking, routeDeviation]);

  // Determine if trip can be cancelled based on status and user type
  const canCancelTrip = () => {
    if (!currentBooking && !currentTrip) return false;

    const status = currentBooking?.status || currentTrip?.status || '';
    const inTransitStatuses = ['in_transit', 'in_progress', 'on_the_way', 'picked_up'];

    // Can't cancel if already in transit
    if (inTransitStatuses.includes(status.toLowerCase())) return false;

    // Only shippers and business users can cancel (not brokers on behalf of clients)
    if (userType === 'broker') return false;

    // Can cancel if pending, confirmed, or assigned
    const cancellableStatuses = ['pending', 'confirmed', 'assigned', 'accepted'];
    return cancellableStatuses.includes(status.toLowerCase());
  };

  // Check if trip is completed and can be rated
  const isTripCompleted = () => {
    if (!currentBooking && !currentTrip) return false;
    const status = currentBooking?.status || currentTrip?.status || '';
    const completedStatuses = ['completed', 'delivered', 'finished'];
    return completedStatuses.includes(status.toLowerCase());
  };

  // Check if user can rate (not transporter rating themselves)
  const canRate = () => {
    return isTripCompleted() && userType !== 'transporter' && !hasRated;
  };

  // Handle rating submission
  const handleRateTransporter = () => {
    if (!currentBooking && !currentTrip) return;
    
    const transporterId = currentBooking?.transporterId || currentTrip?.transporterId;
    const transporterName = currentBooking?.transporterName || currentTrip?.transporterName || 'Transporter';
    
    if (!transporterId) {
      Alert.alert('Error', 'Transporter information not available');
      return;
    }

    // Determine rater role based on user type
    let raterRole = 'client';
    if (userType === 'broker') raterRole = 'broker';
    if (userType === 'business') raterRole = 'business';

    navigation.navigate('RatingSubmission', {
      transporterId,
      transporterName,
      bookingId: currentBooking?.id,
      tripId: currentTrip?.id,
      raterRole,
      existingRating,
    });
  };

  // booking param should be passed in navigation
  const booking = params.booking || (requests && requests[0]) || null;
  const trip = params.trip || null;
  // If transporter/vehicle are passed directly, use them
  const selectedTransporter = params.transporter || booking?.transporter;
  const selectedVehicle = params.vehicle || booking?.vehicle;

  // State for real data
  const [bookingData, setBookingData] = useState(booking);
  const [tripData, setTripData] = useState(trip);

  // Fetch booking and trip data if not provided
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Only try to fetch if we have IDs and the endpoints exist
        if (!bookingData && params.bookingId) {
          try {
            const bookingResponse = await apiRequest(`/bookings/${params.bookingId}`);
            setBookingData(bookingResponse);
          } catch (error) {
            // Booking endpoint not available, using passed data
            // Endpoint not available, use passed data
          }
        }

        if (!tripData && params.tripId) {
          try {
            const tripResponse = await apiRequest(`/trips/${params.tripId}`);
            setTripData(tripResponse);
          } catch (error) {
            // Trip endpoint not available, using passed data
            // Endpoint not available, use passed data
          }
        }

        // Messages are now handled by the ChatModal component

      } catch (error) {
        console.error('Failed to fetch trip details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.bookingId, params.tripId]);

  // Use the fetched data or fallback to params
  const currentBooking = realBooking || bookingData || booking;
  const currentTrip = tripData || trip;

  // Determine communication target: assigned driver (for company) or selected transporter
  let commTarget = null;
  let transporter = (booking && booking.transporter) || {};
  const assignedDriver = booking?.assignedDriver || transporter?.assignedDriver;

  if (assignedDriver) {
    commTarget = {
      id: assignedDriver.id || assignedDriver.driverId || transporter?.id || 'driver-id',
      name: assignedDriver.name || assignedDriver.driverName || 'Driver',
      phone: assignedDriver.phone || assignedDriver.driverPhone || transporter?.phone || '+254700000000',
      photo: assignedDriver.photo || assignedDriver.profilePhoto || transporter?.photo || PLACEHOLDER_IMAGES.DEFAULT_USER_MALE,
      role: 'driver',
    };
  } else if (transporter && transporter.name) {
    commTarget = {
      id: transporter.id || transporter.transporterId || 'transporter-id',
      name: transporter.name || transporter.transporterName || 'Transporter',
      phone: transporter.phone || transporter.transporterPhone || '+254700000000',
      photo: transporter.photo || transporter.profilePhoto || PLACEHOLDER_IMAGES.DEFAULT_USER_MALE,
      role: 'transporter',
    };
  } else {
    // fallback: transporter info (mocked for now)
    commTarget = {
      id: 'transporter-id',
      name: 'Transporter',
      phone: '+254700000000',
      photo: PLACEHOLDER_IMAGES.DEFAULT_USER_MALE,
      role: 'transporter',
    };
  }

  const [chatVisible, setChatVisible] = useState(false);
  const [callVisible, setCallVisible] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [existingRating, setExistingRating] = useState(null);

  // Send status change notifications
  const sendStatusNotification = async (status: string, booking: any) => {
    if (!booking?.userId) return;

    try {
      let notificationType: any = null;
      let customData: any = {};

      switch (status) {
        case 'accepted':
          notificationType = 'booking_accepted';
          customData = {
            bookingId: booking.id,
            transporterName: booking.transporterName || 'Transporter',
            pickupLocation: booking.fromLocation?.address || 'Pickup Location',
            deliveryLocation: booking.toLocation?.address || 'Delivery Location',
            estimatedPickup: booking.pickUpDate || 'TBD'
          };
          break;
        case 'in_progress':
        case 'started':
          notificationType = 'trip_started';
          customData = {
            bookingId: booking.id,
            transporterName: booking.transporterName || 'Transporter',
            currentLocation: transporterLocation?.address || 'En Route'
          };
          break;
        case 'completed':
          notificationType = 'trip_completed';
          customData = {
            bookingId: booking.id,
            transporterName: booking.transporterName || 'Transporter',
            deliveryLocation: booking.toLocation?.address || 'Delivery Location'
          };
          break;
        case 'cancelled':
          notificationType = 'booking_cancelled';
          customData = {
            bookingId: booking.id,
            transporterName: booking.transporterName || 'Transporter',
            cancellationReason: booking.cancellationReason || 'No reason provided'
          };
          break;
      }

      if (notificationType) {
        await enhancedNotificationService.sendNotification(
          notificationType,
          booking.userId,
          customData
        );
      }
    } catch (error) {
      console.error('Error sending status notification:', error);
    }
  };

  // Mock users for notification demo
  const customer = { id: 'C001', name: 'Green Agri Co.', email: 'info@greenagri.com', phone: '+254712345678' };
  const driver = { id: 'D001', name: commTarget.name, email: 'driver@trukapp.com', phone: commTarget.phone };
  const company = { id: 'COMP001', name: 'TransCo Ltd.', email: 'company@trukapp.com', phone: '+254700111222' };
  const broker = { id: 'B001', name: 'BrokerX', email: 'brokerx@trukapp.com', phone: '+254700999888' };
  const admin = { id: 'ADMIN', name: 'Admin', email: 'admin@trukapp.com', phone: '+254700000000' };

  // Notification triggers for trip status changes
  const notifyTripStatus = (status: string) => {
    const tripSummary = `${trip.from} to ${trip.to}`;
    // In-app
    notificationService.sendInApp(customer.id, `Trip status: ${status} for ${tripSummary}`, 'customer', 'request_status', { trip, status });
    notificationService.sendInApp(driver.id, `Trip status: ${status} for ${tripSummary}`, 'driver', 'request_status', { trip, status });
    notificationService.sendInApp(company.id, `Trip status: ${status} for ${tripSummary}`, 'transporter', 'request_status', { trip, status });
    notificationService.sendInApp(broker.id, `Trip status: ${status} for ${tripSummary}`, 'broker', 'request_status', { trip, status });
    notificationService.sendInApp(admin.id, `Trip status: ${status} for ${tripSummary}`, 'admin', 'request_status', { trip, status });
    // Email
    notificationService.sendEmail(customer.email, `Trip ${status}`, `Your trip ${tripSummary} is now ${status}.`, 'customer', 'request_status', { trip, status });
    notificationService.sendEmail(driver.email, `Trip ${status}`, `Trip ${tripSummary} is now ${status}.`, 'driver', 'request_status', { trip, status });
    notificationService.sendEmail(company.email, `Trip ${status}`, `Trip ${tripSummary} is now ${status}.`, 'transporter', 'request_status', { trip, status });
    notificationService.sendEmail(broker.email, `Trip ${status}`, `Trip ${tripSummary} is now ${status}.`, 'broker', 'request_status', { trip, status });
    notificationService.sendEmail(admin.email, `Trip ${status}`, `Trip ${tripSummary} is now ${status}.`, 'admin', 'request_status', { trip, status });
    // SMS
    notificationService.sendSMS(customer.phone, `Trip ${status}: ${tripSummary}`, 'customer', 'request_status', { trip, status });
    notificationService.sendSMS(driver.phone, `Trip ${status}: ${tripSummary}`, 'driver', 'request_status', { trip, status });
    notificationService.sendSMS(company.phone, `Trip ${status}: ${tripSummary}`, 'transporter', 'request_status', { trip, status });
    notificationService.sendSMS(broker.phone, `Trip ${status}: ${tripSummary}`, 'broker', 'request_status', { trip, status });
    notificationService.sendSMS(admin.phone, `Trip ${status}: ${tripSummary}`, 'admin', 'request_status', { trip, status });
  };

  // Use trip.id or booking.id as tripId for AvailableLoadsAlongRoute
  const tripId = (trip && trip.id) || (booking && booking.id) || 'TRIP123';

  // Show loading state
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, color: colors.text.primary }}>Loading booking details...</Text>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, color: colors.error, textAlign: 'center', marginBottom: 16 }}>{error}</Text>
        <TouchableOpacity 
          style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: colors.white }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingTop: 18, paddingRight: 8 }}>
        <NotificationBell />
      </View>

      <View style={styles.mapCard}>
        <ExpoCompatibleMap
          style={styles.map}
          showUserLocation={true}
          markers={[
            // Pickup location marker
            ...(currentBooking && currentBooking.pickupLocation ? [{
              id: 'pickup',
              coordinate: {
                latitude: currentBooking.pickupLocation.latitude || -1.2921,
                longitude: currentBooking.pickupLocation.longitude || 36.8219,
              },
              title: 'Pickup Location',
              description: currentBooking.pickupLocation.address || 'Pickup point',
              pinColor: colors.primary,
            }] : []),
            // Delivery location marker
            ...(currentBooking && currentBooking.toLocation ? [{
              id: 'delivery',
              coordinate: {
                latitude: currentBooking.toLocation.latitude || -1.2921,
                longitude: currentBooking.toLocation.longitude || 36.8219,
              },
              title: 'Delivery Location',
              description: currentBooking.toLocation.address || 'Delivery point',
              pinColor: colors.secondary,
            }] : []),
            // Transporter location marker (if available)
            ...(transporterLocation || (currentTrip && currentTrip.currentLocation) ? [{
              id: 'transporter',
              coordinate: {
                latitude: transporterLocation?.latitude || currentTrip?.currentLocation?.latitude || -1.2921,
                longitude: transporterLocation?.longitude || currentTrip?.currentLocation?.longitude || 36.8219,
              },
              title: 'Transporter Location',
              description: routeDeviation ? '⚠️ Route Deviation Detected' : 'Current position',
              pinColor: routeDeviation ? colors.warning : colors.success,
            }] : []),
          ]}
          initialRegion={{
            latitude: -1.2921, // Nairobi
            longitude: 36.8219,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        />
      </View>

      {/* Available Loads Along Route - Only show for transporters */}
      {!isInstant && <AvailableLoadsAlongRoute tripId={tripId} />}

      <View style={styles.divider} />

      {/* Bottom Card - Clean, At-a-Glance Trip Details */}
      <View style={[styles.bottomCard, { marginBottom: 24 }]}>
        {/* Trip Reference and Status */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="identifier" size={16} color={colors.secondary} style={{ marginRight: 4 }} />
            <Text style={{ color: colors.text.secondary, fontWeight: 'bold', fontSize: 13 }}>
              Job: {getDisplayBookingId(currentBooking || booking || {})}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="progress-clock" size={16} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { fontSize: 15 }]}>
              Status: <Text style={{ color: colors.primary }}>
                {currentBooking?.status || currentTrip?.status || params.job?.status || 'Pending'}
              </Text>
            </Text>
          </View>
        </View>

        {/* User Type Specific Info */}
        {userType === 'broker' && (
          <View style={{ marginBottom: 8, backgroundColor: '#f0f8ff', borderRadius: 8, padding: 8 }}>
            <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>
              📋 Managing on behalf of client
            </Text>
          </View>
        )}

        {/* Route Information */}
        <View style={[styles.tripInfoRow, { marginBottom: 4 }]}>
          <LocationDisplay 
            location={currentBooking?.fromLocation || booking?.pickupLocation || trip?.from || 'Unknown location'} 
            iconName="map-marker-alt"
            iconColor={colors.primary}
            style={styles.tripInfoText}
          />
          <LocationDisplay 
            location={currentBooking?.toLocation || booking?.toLocation || 'Unknown location'} 
            iconName="flag-checkered"
            iconColor={colors.secondary}
            style={[styles.tripInfoText, { marginLeft: 12 }]}
          />
        </View>

        {/* ETA and Distance */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, backgroundColor: '#f5f5f5', borderRadius: 8, padding: 6, alignSelf: 'flex-start' }}>
          <Ionicons name="time" size={18} color={colors.secondary} style={{ marginRight: 4 }} />
          <Text style={[styles.tripInfoText, { fontWeight: 'bold', marginRight: 4 }]}>ETA:</Text>
          <Text style={[styles.tripInfoText, { fontWeight: 'bold', color: colors.primary }]}>
            {currentBooking?.estimatedDuration || params.eta || (booking && booking.eta) || (trip && trip.eta) || '--'}
            {(currentBooking?.actualDistance || params.distance || (booking && booking.distance) || (trip && trip.distance)) ?
              ` (${Math.round(currentBooking?.actualDistance || 0)}km)` : ''}
          </Text>
        </View>

        {/* Transporter Info */}
        <View style={{ marginBottom: 8, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Image source={{ 
              uri: (currentBooking?.transporter?.photo) || 
                   (selectedTransporter && selectedTransporter.profilePhoto) || 
                   (selectedTransporter && selectedTransporter.photo) || 
                   commTarget.photo || 
                   PLACEHOLDER_IMAGES.USER 
            }} style={styles.avatar} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.name}>
                {currentBooking?.transporter?.name || 
                 (selectedTransporter && selectedTransporter.name) || 
                 commTarget.name || 
                 'Transporter'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <MaterialCommunityIcons name="star" size={14} color={colors.secondary} style={{ marginRight: 4 }} />
                <Text style={{ color: colors.secondary, fontWeight: 'bold', fontSize: 13 }}>
                  {currentBooking?.transporter?.rating || selectedTransporter?.rating || 'N/A'}
                </Text>
                <Text style={{ color: colors.text.secondary, fontSize: 12, marginLeft: 8 }}>
                  {currentBooking?.transporter?.tripsCompleted || selectedTransporter?.tripsCompleted || 0} trips
                </Text>
              </View>
            </View>
          </View>
          
          {/* Real-time tracking status */}
          {['started', 'in_progress'].includes(currentBooking?.status) && (
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              backgroundColor: routeDeviation ? colors.warning + '20' : colors.success + '20',
              padding: 8,
              borderRadius: 8,
              marginTop: 8
            }}>
              <MaterialCommunityIcons 
                name={routeDeviation ? "alert-circle" : "map-marker"} 
                size={16} 
                color={routeDeviation ? colors.warning : colors.success} 
              />
              <Text style={{ 
                color: routeDeviation ? colors.warning : colors.success, 
                fontSize: 12, 
                marginLeft: 4,
                fontWeight: 'bold'
              }}>
                {routeDeviation ? 'Route Deviation Detected' : 'Live Tracking Active'}
              </Text>
              {lastUpdateTime && (
                <Text style={{ color: colors.text.secondary, fontSize: 10, marginLeft: 'auto' }}>
                  Updated {Math.floor((Date.now() - lastUpdateTime.getTime()) / 60000)}m ago
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRowSplit}>
          {canCancelTrip() && (
            <TouchableOpacity style={[styles.cancelBtn, { marginBottom: 8, marginTop: 8 }]} onPress={() => notifyTripStatus('cancelled')}>
              <Text style={styles.cancelText}>Cancel Trip</Text>
            </TouchableOpacity>
          )}
          
          {canRate() && (
            <TouchableOpacity style={[styles.rateBtn, { marginBottom: 8, marginTop: 8 }]} onPress={handleRateTransporter}>
              <MaterialCommunityIcons name="star" size={20} color={colors.white} />
              <Text style={styles.rateText}>Rate Transporter</Text>
            </TouchableOpacity>
          )}
          
          {hasRated && (
            <View style={[styles.ratedBtn, { marginBottom: 8, marginTop: 8 }]}>
              <MaterialCommunityIcons name="star-check" size={20} color={colors.success} />
              <Text style={styles.ratedText}>Rated</Text>
            </View>
          )}
          <View style={styles.actionIconsRight}>
            {/* Communication Buttons - Only show for accepted/confirmed/assigned bookings */}
            {['accepted', 'confirmed', 'assigned'].includes((currentBooking?.status || currentTrip?.status || realBooking?.status || '').toLowerCase()) && commTarget && (
              <>
                <TouchableOpacity style={styles.iconBtn} onPress={() => setChatVisible(true)}>
                  <Ionicons name="chatbubble-ellipses" size={22} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => setCallVisible(true)}>
                  <Ionicons name="call" size={22} color={colors.secondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => Linking.openURL(`tel:${currentBooking?.client?.phone || (selectedTransporter && selectedTransporter.phone) || commTarget.phone}`)}>
                  <MaterialCommunityIcons name="phone-forward" size={22} color={colors.tertiary} />
                </TouchableOpacity>
              </>
            )}
            {isInstant && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => navigation.navigate('MapViewScreen', {
                  booking: booking || {},
                  isInstant: true
                })}
              >
                <MaterialCommunityIcons name="map" size={22} color={colors.success} />
              </TouchableOpacity>
            )}
            {/* Report Issue Button */}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('CreateDispute' as never, { 
                bookingId: currentBooking?.id || currentBooking?.bookingId || currentTrip?.id || realBooking?.id 
              } as never)}
            >
              <MaterialCommunityIcons name="alert-circle" size={22} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Chat Modal */}
      {commTarget && (
        <RealtimeChatModal
          visible={chatVisible}
          onClose={() => setChatVisible(false)}
          bookingId={realBooking?.id || booking?.id || booking?.bookingId}
          participant1Id={getAuth().currentUser?.uid || ''}
          participant1Type={userType || 'shipper'}
          participant2Id={commTarget.id}
          participant2Type={commTarget.role}
          participant2Name={commTarget.name}
          participant2Photo={commTarget.photo}
          onChatCreated={(chatRoom) => {
            // Chat created
          }}
        />
      )}

      {/* Call Modal */}
      <Modal visible={callVisible} animationType="fade" transparent>
        <View style={styles.modalBg}>
          <View style={styles.callModal}>
            <Ionicons name="call" size={48} color={colors.secondary} style={{ marginBottom: 12 }} />
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>Calling {commTarget.role}...</Text>
            <Text style={{ color: colors.text.secondary, marginBottom: 16 }}>{commTarget.name} ({commTarget.phone})</Text>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setCallVisible(false)}>
              <Text style={styles.cancelText}>End Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Traffic Alerts Modal */}
      <Modal visible={showTrafficModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.trafficModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Traffic Alerts</Text>
              <TouchableOpacity onPress={() => setShowTrafficModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.trafficContent}>
              {trafficAlerts.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="check-circle" size={48} color={colors.success} />
                  <Text style={styles.emptyText}>No traffic alerts</Text>
                  <Text style={styles.emptySubtext}>Your route is clear!</Text>
                </View>
              ) : (
                trafficAlerts.map((alert, index) => (
                  <View key={index} style={styles.alertCard}>
                    <View style={styles.alertHeader}>
                      <MaterialCommunityIcons
                        name={alert.type === 'congestion' ? 'traffic-light' : 'alert-circle'}
                        size={20}
                        color={alert.severity === 'high' ? colors.error : colors.warning}
                      />
                      <Text style={styles.alertType}>{alert.type.toUpperCase()}</Text>
                      <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(alert.severity) }]}>
                        <Text style={styles.severityText}>{alert.severity.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.alertMessage}>{alert.message || alert.description}</Text>
                    <Text style={styles.alertLocation}>{alert.location.address}</Text>
                    <Text style={styles.alertTime}>
                      {new Date(alert.createdAt).toLocaleString()}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Route Options Modal */}
      <Modal visible={showRouteOptions} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.routeModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Route Options</Text>
              <TouchableOpacity onPress={() => setShowRouteOptions(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.routeContent}>
              {alternativeRoutes.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="map" size={48} color={colors.primary} />
                  <Text style={styles.emptyText}>No alternative routes</Text>
                  <Text style={styles.emptySubtext}>Current route is optimal</Text>
                </View>
              ) : (
                alternativeRoutes.map((route, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.routeCard, selectedRoute === index && styles.selectedRouteCard]}
                    onPress={() => setSelectedRoute(index)}
                  >
                    <View style={styles.routeHeader}>
                      <Text style={styles.routeName}>{route.name}</Text>
                      <View style={[styles.trafficBadge, { backgroundColor: getTrafficColor(route.trafficLevel) }]}>
                        <Text style={styles.trafficText}>{route.trafficLevel.toUpperCase()}</Text>
                      </View>
                    </View>
                    <View style={styles.routeDetails}>
                      <View style={styles.routeDetail}>
                        <MaterialCommunityIcons name="clock" size={16} color={colors.text.secondary} />
                        <Text style={styles.routeDetailText}>{route.estimatedTime} min</Text>
                      </View>
                      <View style={styles.routeDetail}>
                        <MaterialCommunityIcons name="map-marker-distance" size={16} color={colors.text.secondary} />
                        <Text style={styles.routeDetailText}>{route.distance} km</Text>
                      </View>
                      {route.tolls && (
                        <View style={styles.routeDetail}>
                          <MaterialCommunityIcons name="toll" size={16} color={colors.warning} />
                          <Text style={styles.routeDetailText}>Tolls</Text>
                        </View>
                      )}
                    </View>
                    {route.advantages.length > 0 && (
                      <View style={styles.routeAdvantages}>
                        <Text style={styles.advantagesTitle}>Advantages:</Text>
                        {route.advantages.map((advantage, idx) => (
                          <Text key={idx} style={styles.advantageText}>• {advantage}</Text>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            {alternativeRoutes.length > 0 && (
              <View style={styles.routeActions}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.text.light }]}
                  onPress={() => setShowRouteOptions(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    // Implement route selection logic
                    setShowRouteOptions(false);
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: 'white' }]}>Select Route</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mapCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 22,
    margin: 16,
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  map: {
    height: 300,
    width: '100%',
  },
  divider: {
    height: 8,
    backgroundColor: '#f1f1f1',
    width: '100%',
    marginBottom: 0,
  },
  bottomCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    shadowColor: colors.black,
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 16,
    borderWidth: 0.5,
    borderColor: '#f0f0f0',
  },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#eee' },
  name: { fontWeight: 'bold', fontSize: 17 },
  tripInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  tripInfoText: { marginLeft: 4, marginRight: 12, color: colors.text.primary, fontSize: 14 },
  statusText: { color: colors.text.secondary, fontWeight: '600', fontSize: 14 },
  actionRowSplit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    gap: 10,
  },
  actionIconsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    marginLeft: 0,
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 10,
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  cancelBtn: {
    backgroundColor: colors.error,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 22,
    shadowColor: colors.error,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cancelText: { color: '#fff', fontWeight: 'bold', fontSize: 15, letterSpacing: 0.2 },
  rateBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 22,
    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rateText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 15, 
    letterSpacing: 0.2,
    marginLeft: 6,
  },
  ratedBtn: {
    backgroundColor: colors.success + '20',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratedText: { 
    color: colors.success, 
    fontWeight: 'bold', 
    fontSize: 15, 
    letterSpacing: 0.2,
    marginLeft: 6,
  },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
  chatModal: { backgroundColor: colors.white, borderRadius: 18, padding: 16, width: '90%', height: 340, shadowColor: colors.black, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  callModal: { backgroundColor: colors.white, borderRadius: 18, padding: 24, alignItems: 'center', width: 300 },
  
  // Traffic Modal Styles
  trafficModal: {
    backgroundColor: colors.white,
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: colors.black,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  trafficContent: {
    maxHeight: 400,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
  },
  alertCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  alertMessage: {
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 4,
  },
  alertLocation: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 11,
    color: colors.text.light,
  },

  // Route Modal Styles
  routeModal: {
    backgroundColor: colors.white,
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: colors.black,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  routeContent: {
    maxHeight: 400,
    padding: 20,
  },
  routeCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedRouteCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    flex: 1,
  },
  trafficBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trafficText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  routeDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  routeDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  routeDetailText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 4,
  },
  routeAdvantages: {
    marginTop: 8,
  },
  advantagesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  advantageText: {
    fontSize: 11,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  routeActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.text.light,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
});

export default TripDetailsScreen;

