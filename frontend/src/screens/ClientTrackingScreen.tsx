import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import colors from '../constants/colors';
import spacing from '../constants/spacing';
import fonts from '../constants/fonts';
import { getLocationName } from '../utils/locationUtils';
import RealtimeChatModal from '../components/Chat/RealtimeChatModal';
import { enhancedNotificationService } from '../services/enhancedNotificationService';
import { getAuth } from 'firebase/auth';

const { width, height } = Dimensions.get('window');

interface ClientTrackingScreenProps {
  route: any;
  navigation: any;
}

interface TrackingData {
  bookingId: string;
  status: 'pending' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  transporter: {
    id: string;
    name: string;
    phone: string;
    email: string;
    profilePhoto?: string;
    rating: number;
    vehicle: {
      make: string;
      model: string;
      registration: string;
      color: string;
      capacity: number;
    };
  };
  route: {
    pickup: {
      latitude: number;
      longitude: number;
      address: string;
    };
    delivery: {
      latitude: number;
      longitude: number;
      address: string;
    };
    plannedRoute: Array<{ latitude: number; longitude: number }>;
  };
  timeline: Array<{
    status: string;
    timestamp: string;
    location?: { latitude: number; longitude: number; address: string };
    note?: string;
  }>;
  estimatedArrival: string;
  distance: number;
  currentLocation?: {
    latitude: number;
    longitude: number;
    timestamp: string;
  };
  trafficAlerts: Array<{
    id: string;
    type: 'congestion' | 'accident' | 'road_closure' | 'weather';
    severity: 'low' | 'medium' | 'high';
    message: string;
    location: { latitude: number; longitude: number };
    alternativeRoutes?: Array<{ latitude: number; longitude: number }>;
  }>;
  routeDeviations: Array<{
    id: string;
    timestamp: string;
    originalRoute: Array<{ latitude: number; longitude: number }>;
    actualRoute: Array<{ latitude: number; longitude: number }>;
    reason: string;
    severity: 'minor' | 'major';
  }>;
}

const ClientTrackingScreen: React.FC<ClientTrackingScreenProps> = ({ route, navigation }) => {
  const { booking, isInstant = false } = route.params || {};
  const mapRef = useRef<MapView>(null);
  
  // State management
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [showTrafficAlerts, setShowTrafficAlerts] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  
  // Real-time tracking interval
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeTracking();
    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
    };
  }, []);

  const initializeTracking = async () => {
    try {
      setLoading(true);
      
      // Get user's current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation(location);
      }
      
      // Fetch initial tracking data
      await fetchTrackingData();
      
      // Start real-time tracking if booking is active
      if (trackingData?.status && ['accepted', 'picked_up', 'in_transit'].includes(trackingData.status)) {
        startRealTimeTracking();
      }
    } catch (error) {
      console.error('Error initializing tracking:', error);
      Alert.alert('Error', 'Failed to initialize tracking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrackingData = async () => {
    try {
      // This would be an actual API call in production
      const mockData: TrackingData = {
        bookingId: booking?.id || 'BK-001',
        status: 'in_transit',
        transporter: {
          id: 'transporter-1',
          name: 'John Mwangi',
          phone: '+254700000000',
          email: 'john@example.com',
          profilePhoto: 'https://via.placeholder.com/50',
          rating: 4.8,
          vehicle: {
            make: 'Toyota',
            model: 'Hiace',
            registration: 'KCA 123A',
            color: 'White',
            capacity: 1500,
          },
        },
        route: {
          pickup: {
            latitude: -1.2921,
            longitude: 36.8219,
            address: 'Nairobi CBD',
          },
          delivery: {
            latitude: -1.3733,
            longitude: 36.6883,
            address: 'Karen, Nairobi',
          },
          plannedRoute: [
            { latitude: -1.2921, longitude: 36.8219 },
            { latitude: -1.3000, longitude: 36.8000 },
            { latitude: -1.3500, longitude: 36.7500 },
            { latitude: -1.3733, longitude: 36.6883 },
          ],
        },
        timeline: [
          {
            status: 'pending',
            timestamp: '2024-01-01T08:00:00Z',
            note: 'Request submitted',
          },
          {
            status: 'accepted',
            timestamp: '2024-01-01T08:15:00Z',
            location: { latitude: -1.2921, longitude: 36.8219, address: 'Nairobi CBD' },
            note: 'Transporter assigned',
          },
          {
            status: 'picked_up',
            timestamp: '2024-01-01T09:30:00Z',
            location: { latitude: -1.2921, longitude: 36.8219, address: 'Nairobi CBD' },
            note: 'Package picked up',
          },
          {
            status: 'in_transit',
            timestamp: '2024-01-01T09:45:00Z',
            location: { latitude: -1.3000, longitude: 36.8000, address: 'Ngong Road' },
            note: 'On the way to delivery',
          },
        ],
        estimatedArrival: '11:30 AM',
        distance: 15.2,
        currentLocation: {
          latitude: -1.3200,
          longitude: 36.7800,
          timestamp: new Date().toISOString(),
        },
        trafficAlerts: [
          {
            id: 'alert-1',
            type: 'congestion',
            severity: 'medium',
            message: 'Heavy traffic on Ngong Road',
            location: { latitude: -1.3000, longitude: 36.8000 },
            alternativeRoutes: [
              [
                { latitude: -1.2921, longitude: 36.8219 },
                { latitude: -1.2800, longitude: 36.8200 },
                { latitude: -1.3500, longitude: 36.7500 },
                { latitude: -1.3733, longitude: 36.6883 },
              ],
            ],
          },
        ],
        routeDeviations: [],
      };
      
      setTrackingData(mockData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching tracking data:', error);
      throw error;
    }
  };

  const startRealTimeTracking = () => {
    setIsTracking(true);
    trackingIntervalRef.current = setInterval(async () => {
      await fetchTrackingData();
    }, 30000); // Update every 30 seconds
  };

  const stopRealTimeTracking = () => {
    setIsTracking(false);
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }
  };

  const handleCallTransporter = () => {
    if (trackingData?.transporter.phone) {
      setShowCall(true);
    }
  };

  const handleChatTransporter = () => {
    setShowChat(true);
  };

  const handleRouteDeviation = (deviation: any) => {
    Alert.alert(
      'Route Update',
      `Your transporter is taking an alternative route. ${deviation.reason}`,
      [
        { text: 'View Traffic Info', onPress: () => setShowTrafficAlerts(true) },
        { text: 'OK', style: 'default' },
      ]
    );
  };

  const handleTrafficAlert = (alert: any) => {
    Alert.alert(
      'Traffic Alert',
      alert.message,
      [
        { text: 'View Alternative Routes', onPress: () => setShowRouteOptions(true) },
        { text: 'OK', style: 'default' },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'accepted': return colors.primary;
      case 'picked_up': return colors.tertiary;
      case 'in_transit': return colors.success;
      case 'delivered': return colors.success;
      case 'cancelled': return colors.error;
      default: return colors.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'clock-outline';
      case 'accepted': return 'check-circle-outline';
      case 'picked_up': return 'package-variant';
      case 'in_transit': return 'truck-delivery';
      case 'delivered': return 'check-circle';
      case 'cancelled': return 'close-circle';
      default: return 'help-circle-outline';
    }
  };

  const renderMap = () => (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: trackingData?.route.pickup.latitude || -1.2921,
          longitude: trackingData?.route.pickup.longitude || 36.8219,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
      >
        {/* Pickup Marker */}
        <Marker
          coordinate={trackingData?.route.pickup || { latitude: -1.2921, longitude: 36.8219 }}
          title="Pickup Location"
          description={trackingData?.route.pickup.address || 'Nairobi CBD'}
        >
          <View style={[styles.markerContainer, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons name="package-up" size={20} color="white" />
          </View>
        </Marker>

        {/* Delivery Marker */}
        <Marker
          coordinate={trackingData?.route.delivery || { latitude: -1.3733, longitude: 36.6883 }}
          title="Delivery Location"
          description={trackingData?.route.delivery.address || 'Karen, Nairobi'}
        >
          <View style={[styles.markerContainer, { backgroundColor: colors.success }]}>
            <MaterialCommunityIcons name="package-down" size={20} color="white" />
          </View>
        </Marker>

        {/* Transporter Current Location */}
        {trackingData?.currentLocation && (
          <Marker
            coordinate={trackingData.currentLocation}
            title="Transporter Location"
            description={`Last updated: ${new Date(trackingData.currentLocation.timestamp).toLocaleTimeString()}`}
          >
            <View style={[styles.markerContainer, { backgroundColor: colors.tertiary }]}>
              <MaterialCommunityIcons name="truck" size={20} color="white" />
            </View>
          </Marker>
        )}

        {/* Planned Route */}
        {trackingData?.route.plannedRoute && (
          <Polyline
            coordinates={trackingData.route.plannedRoute}
            strokeColor={colors.primary}
            strokeWidth={3}
            lineDashPattern={[5, 5]}
          />
        )}

        {/* Actual Route (if different from planned) */}
        {trackingData?.routeDeviations && trackingData.routeDeviations.length > 0 && (
          <Polyline
            coordinates={trackingData.routeDeviations[0].actualRoute}
            strokeColor={colors.warning}
            strokeWidth={3}
          />
        )}
      </MapView>

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity
          style={styles.mapControlButton}
          onPress={() => setShowTrafficAlerts(true)}
        >
          <MaterialCommunityIcons name="traffic-light" size={20} color={colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.mapControlButton}
          onPress={() => setShowTrafficAlerts(true)}
        >
          <MaterialCommunityIcons name="information" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProgressBar = () => {
    const steps = ['Accepted', 'Picked Up', 'In Transit', 'Delivered'];
    const currentStepIndex = steps.findIndex(step => 
      trackingData?.status === step.toLowerCase().replace(' ', '_')
    );

    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressTitle}>Delivery Progress</Text>
        <View style={styles.progressBar}>
          {steps.map((step, index) => (
            <View key={step} style={styles.progressStep}>
              <View
                style={[
                  styles.progressCircle,
                  {
                    backgroundColor: index <= currentStepIndex ? colors.primary : colors.text.light,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={getStatusIcon(step.toLowerCase().replace(' ', '_'))}
                  size={16}
                  color="white"
                />
              </View>
              <Text style={[
                styles.progressLabel,
                { color: index <= currentStepIndex ? colors.primary : colors.text.secondary }
              ]}>
                {step}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderTransporterInfo = () => (
    <View style={styles.transporterCard}>
      <View style={styles.transporterHeader}>
        <View style={styles.transporterAvatar}>
          <MaterialCommunityIcons name="account" size={24} color={colors.primary} />
        </View>
        <View style={styles.transporterDetails}>
          <Text style={styles.transporterName}>{trackingData?.transporter.name}</Text>
          <Text style={styles.transporterVehicle}>
            {trackingData?.transporter.vehicle.make} {trackingData?.transporter.vehicle.model} • {trackingData?.transporter.vehicle.registration}
          </Text>
          <View style={styles.ratingContainer}>
            <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
            <Text style={styles.rating}>{trackingData?.transporter.rating}</Text>
          </View>
        </View>
        {/* Communication Buttons - Only show for accepted/confirmed/assigned bookings */}
        {['accepted', 'confirmed', 'assigned'].includes((trackingData?.status || booking?.status || '').toLowerCase()) && (
          <View style={styles.transporterActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCallTransporter}
            >
              <MaterialCommunityIcons name="phone" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleChatTransporter}
            >
              <MaterialCommunityIcons name="message" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderTimeline = () => (
    <View style={styles.timelineContainer}>
      <Text style={styles.timelineTitle}>Delivery Timeline</Text>
      {trackingData?.timeline.map((event, index) => (
        <View key={index} style={styles.timelineItem}>
          <View style={styles.timelineMarker}>
            <MaterialCommunityIcons
              name={getStatusIcon(event.status)}
              size={16}
              color={getStatusColor(event.status)}
            />
          </View>
          <View style={styles.timelineContent}>
            <Text style={styles.timelineStatus}>
              {event.status.replace('_', ' ').toUpperCase()}
            </Text>
            <Text style={styles.timelineTime}>
              {new Date(event.timestamp).toLocaleString()}
            </Text>
            {event.location && (
              <Text style={styles.timelineLocation}>{event.location.address}</Text>
            )}
            {event.note && (
              <Text style={styles.timelineNote}>{event.note}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading tracking data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Your Delivery</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowTrafficAlerts(true)}
          >
            <MaterialCommunityIcons name="traffic-light" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowRouteOptions(true)}
          >
            <MaterialCommunityIcons name="routes" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Map */}
      {renderMap()}

      {/* Progress Bar */}
      {renderProgressBar()}

      {/* Transporter Info */}
      {renderTransporterInfo()}

      {/* Timeline */}
      <ScrollView style={styles.timelineScrollView}>
        {renderTimeline()}
      </ScrollView>

      {/* Modals */}
      {trackingData?.transporter && (
        <RealtimeChatModal
          visible={showChat}
          onClose={() => setShowChat(false)}
          bookingId={booking?.id || booking?.bookingId || trackingData?.bookingId}
          participant1Id={getAuth().currentUser?.uid || ''}
          participant1Type="shipper"
          participant2Id={trackingData.transporter.id}
          participant2Type="transporter"
          participant2Name={trackingData.transporter.name}
          participant2Photo={trackingData.transporter.profilePhoto}
          onChatCreated={(chatRoom) => {
            // Chat created
          }}
        />
      )}

      <Modal
        visible={showCall}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCall(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.callModal}>
            <Text style={styles.callTitle}>Call Transporter</Text>
            <Text style={styles.callNumber}>{trackingData?.transporter.phone}</Text>
            <View style={styles.callActions}>
              <TouchableOpacity
                style={[styles.callButton, styles.callButtonSecondary]}
                onPress={() => setShowCall(false)}
              >
                <Text style={styles.callButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.callButton, styles.callButtonPrimary]}
                onPress={() => {
                  // Implement actual calling logic
                  setShowCall(false);
                }}
              >
                <Text style={[styles.callButtonText, { color: 'white' }]}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  mapContainer: {
    height: height * 0.4,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'column',
  },
  mapControlButton: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  progressContainer: {
    padding: 16,
    backgroundColor: 'white',
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  transporterCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transporterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transporterAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transporterDetails: {
    flex: 1,
  },
  transporterName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  transporterVehicle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rating: {
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: 4,
  },
  transporterActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  timelineContainer: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  timelineTime: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  timelineLocation: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  timelineNote: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  timelineScrollView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callModal: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    width: width * 0.8,
    alignItems: 'center',
  },
  callTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  callNumber: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 24,
  },
  callActions: {
    flexDirection: 'row',
    width: '100%',
  },
  callButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  callButtonPrimary: {
    backgroundColor: colors.primary,
  },
  callButtonSecondary: {
    backgroundColor: colors.text.light,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
});

export default ClientTrackingScreen;
