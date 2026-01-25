import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal,
    Linking,
} from 'react-native';
let MapView, Marker, Polyline, PROVIDER_GOOGLE;
try {
  ({ default: MapView, Marker, Polyline, PROVIDER_GOOGLE } = require('react-native-maps'));
} catch (e) {
  // Fallback for Expo Go - maps not available
  MapView = ({ children, ...props }: any) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 18, color: '#666', textAlign: 'center', paddingHorizontal: 20 }}>
        Maps are not available in Expo Go. Please build the app locally or use a development client.
      </Text>
    </View>
  );
  Marker = () => null;
  Polyline = () => null;
  PROVIDER_GOOGLE = null;
}
import { googleMapsService } from '../services/googleMapsService';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { getReadableLocationName, formatRoute } from '../utils/locationUtils';
import LocationDisplay from '../components/common/LocationDisplay';
import RealtimeChatModal from '../components/Chat/RealtimeChatModal';
import { getDisplayBookingId } from '../utils/unifiedIdSystem';
import { unifiedTrackingService, TrackingData as UnifiedTrackingData } from '../services/unifiedTrackingService';
import { API_ENDPOINTS } from '../constants/api';
import { getAuth } from 'firebase/auth';

const { width, height } = Dimensions.get('window');

const MapViewScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { booking, trackingData, isConsolidated, consolidatedRequests, isInstant, userType } = route.params || {};
    const [loading, setLoading] = useState(true);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
    const [estimatedTime, setEstimatedTime] = useState('2 hours 30 minutes');
    const [isTracking, setIsTracking] = useState(false);
    const [transporterLocation, setTransporterLocation] = useState<any>(null);
    const [unifiedTrackingData, setUnifiedTrackingData] = useState<UnifiedTrackingData | null>(null);
    const [chatVisible, setChatVisible] = useState(false);
    const [callVisible, setCallVisible] = useState(false);
    const [routePolyline, setRoutePolyline] = useState<Array<{ latitude: number; longitude: number }>>([]);
    const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);

    // Get transporter info for communication - prioritize assignedDriver
    const transporter = booking?.transporter;
    const assignedDriver = booking?.assignedDriver || transporter?.assignedDriver;
    const commTarget = assignedDriver ? {
        id: assignedDriver.id || assignedDriver.driverId || transporter?.id || 'driver-id',
        name: assignedDriver.name || assignedDriver.driverName || transporter?.name || 'Driver',
        phone: assignedDriver.phone || assignedDriver.driverPhone || transporter?.phone || '+254700000000',
        role: 'driver',
        photo: assignedDriver.photo || assignedDriver.profilePhoto || transporter?.photo || transporter?.profilePhoto
    } : transporter ? {
        id: transporter.id || transporter.transporterId || 'transporter-id',
        name: transporter.name || transporter.transporterName || 'Transporter',
        phone: transporter.phone || transporter.transporterPhone || '+254700000000',
        role: 'transporter',
        photo: transporter.photo || transporter.profilePhoto
    } : null;

    useEffect(() => {
        initializeMap();
        if (booking?.id) {
            loadUnifiedTrackingData();
            calculateRoute();
        }
    }, [booking?.id, booking?.fromLocation, booking?.toLocation, transporterLocation]);

    useEffect(() => {
        return () => {
            // Cleanup tracking when component unmounts
            if (booking?.id) {
                unifiedTrackingService.stopTracking(booking.id);
            }
        };
    }, [booking?.id]);

    const loadUnifiedTrackingData = async () => {
        try {
            const trackingData = await unifiedTrackingService.getTrackingData(booking.id, booking.userId || 'current-user');
            setUnifiedTrackingData(trackingData);
            
            if (trackingData?.currentLocation) {
                setTransporterLocation({
                    latitude: trackingData.currentLocation.latitude,
                    longitude: trackingData.currentLocation.longitude,
                    address: trackingData.currentLocation.address || 'Transporter Location',
                    timestamp: new Date().toISOString(),
                    speed: 0,
                });
            }
            
            if (trackingData?.route && Array.isArray(trackingData.route)) {
                setRouteCoordinates(trackingData.route);
            }
            
            if (trackingData?.estimatedArrival) {
                setEstimatedTime(trackingData.estimatedArrival);
            }
        } catch (error) {
            console.error('Error loading unified tracking data:', error);
        }
    };

    const initializeMap = async () => {
        try {
            // Get user's current location
            const { getCurrentPositionAsync } = require('expo-location');
            const { status } = await getCurrentPositionAsync();
            
            if (status === 'granted') {
                const location = await getCurrentPositionAsync({});
                setCurrentLocation({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                });
            }
        } catch (error) {
            // Handle location error silently
        } finally {
            setLoading(false);
        }
    };

    const startRealTimeTracking = async () => {
        if (!booking?.id) return;
        
        try {
            setIsTracking(true);
            await unifiedTrackingService.startTracking(booking.id, {
                onLocationUpdate: (location) => {
                    setTransporterLocation({
                        latitude: location.latitude,
                        longitude: location.longitude,
                        address: location.address || 'Transporter Location',
                        timestamp: new Date().toISOString(),
                        speed: 0,
                    });
                    // Recalculate route when location updates
                    calculateRoute();
                },
                onStatusUpdate: (data) => {
                    console.log('Status updated:', data);
                },
                onRouteDeviation: (deviation) => {
                    console.log('Route deviation detected:', deviation);
                },
                onTrafficAlert: (alert) => {
                    console.log('Traffic alert:', alert);
                },
            });
        } catch (error) {
            console.error('Error starting real-time tracking:', error);
            setIsTracking(false);
        }
    };

    const fetchTransporterLocation = async () => {
        try {
            if (!booking?.transporterId) {
                return;
            }

            const { getAuth } = require('firebase/auth');
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();
            
            // Try to fetch transporter location from backend
            const response = await fetch(`${API_ENDPOINTS.TRANSPORTERS}/${booking.transporterId}/location`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.location) {
                    setTransporterLocation({
                        latitude: data.location.latitude,
                        longitude: data.location.longitude,
                        address: data.location.address || 'Transporter Location',
                        timestamp: data.location.timestamp || new Date().toLocaleString(),
                        speed: data.location.speed || 0,
                    });
                }
            } else {
                // No location data available from backend
                console.log('No location data available from backend');
                setTransporterLocation(null);
            }
        } catch (error) {
            // No fallback to mock data - handle error gracefully
            console.error('Error fetching transporter location:', error);
            setTransporterLocation(null);
        }
    };

    const stopRealTimeTracking = () => {
        if (booking?.id) {
            unifiedTrackingService.stopTracking(booking.id);
        }
        setIsTracking(false);
    };

    const generateMockTransporterLocation = () => {
        // Generate a location between pickup and delivery
        const fromLat = typeof booking?.fromLocation === 'object' 
            ? booking.fromLocation.latitude 
            : -0.0917016; // Kisumu
        const fromLng = typeof booking?.fromLocation === 'object' 
            ? booking.fromLocation.longitude 
            : 34.7679568;
        const toLat = typeof booking?.toLocation === 'object' 
            ? booking.toLocation.latitude 
            : -1.2920659; // Nairobi
        const toLng = typeof booking?.toLocation === 'object' 
            ? booking.toLocation.longitude 
            : 36.8219462;

        // Generate a random position between pickup and delivery
        const progress = Math.random() * 0.8 + 0.1; // 10% to 90% progress
        const currentLat = fromLat + (toLat - fromLat) * progress;
        const currentLng = fromLng + (toLng - fromLng) * progress;

        return {
            latitude: currentLat,
            longitude: currentLng,
            address: `En route to ${booking?.toLocationAddress || 'Nairobi'}`,
            timestamp: new Date().toLocaleString(),
            speed: Math.floor(Math.random() * 40) + 30, // 30-70 km/h
        };
    };

    const decodePolyline = (encoded: string): Array<{ latitude: number; longitude: number }> => {
        const coordinates: Array<{ latitude: number; longitude: number }> = [];
        let index = 0;
        let lat = 0;
        let lng = 0;

        while (index < encoded.length) {
            let shift = 0;
            let result = 0;
            let byte;

            do {
                byte = encoded.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);

            const deltaLat = ((result & 1) !== 0) ? ~(result >> 1) : (result >> 1);
            lat += deltaLat;

            shift = 0;
            result = 0;

            do {
                byte = encoded.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);

            const deltaLng = ((result & 1) !== 0) ? ~(result >> 1) : (result >> 1);
            lng += deltaLng;

            coordinates.push({
                latitude: lat * 1e-5,
                longitude: lng * 1e-5,
            });
        }

        return coordinates;
    };

    const calculateRoute = async () => {
        if (!booking?.fromLocation || !booking?.toLocation) return;

        try {
            const fromLoc = typeof booking.fromLocation === 'object'
                ? { latitude: booking.fromLocation.latitude, longitude: booking.fromLocation.longitude }
                : null;
            const toLoc = typeof booking.toLocation === 'object'
                ? { latitude: booking.toLocation.latitude, longitude: booking.toLocation.longitude }
                : null;

            if (!fromLoc || !toLoc) return;

            // If we have transporter location, calculate from current location to destination
            const origin = transporterLocation 
                ? { latitude: transporterLocation.latitude, longitude: transporterLocation.longitude }
                : fromLoc;
            const destination = transporterLocation?.latitude && transporterLocation?.longitude 
                ? (transporterLocation.latitude === fromLoc.latitude ? toLoc : fromLoc)
                : toLoc;

            const route = await googleMapsService.getDirections(origin, destination);
            const coordinates = decodePolyline(route.polyline);
            
            setRoutePolyline(coordinates);
            setRouteInfo({ distance: route.distance, duration: route.duration });
            setEstimatedTime(route.duration);
        } catch (error) {
            console.error('Error calculating route:', error);
        }
    };


    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading map...</Text>
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
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Live Tracking</Text>
                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={startRealTimeTracking}
                >
                    <MaterialCommunityIcons name="refresh" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Map Container */}
            <View style={styles.mapContainer}>
                <MapView
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    initialRegion={(() => {
                        if (booking && booking.fromLocation && booking.toLocation) {
                            const fromLat = typeof booking.fromLocation === 'object' 
                                ? booking.fromLocation.latitude 
                                : -1.2921;
                            const fromLng = typeof booking.fromLocation === 'object' 
                                ? booking.fromLocation.longitude 
                                : 36.8219;
                            const toLat = typeof booking.toLocation === 'object' 
                                ? booking.toLocation.latitude 
                                : -1.2921;
                            const toLng = typeof booking.toLocation === 'object' 
                                ? booking.toLocation.longitude 
                                : 36.8219;
                            
                            return {
                                latitude: (fromLat + toLat) / 2,
                                longitude: (fromLng + toLng) / 2,
                                latitudeDelta: Math.abs(fromLat - toLat) + 0.1,
                                longitudeDelta: Math.abs(fromLng - toLng) + 0.1,
                            };
                        }
                        return {
                            latitude: -1.2921,
                            longitude: 36.8219,
                            latitudeDelta: 0.0922,
                            longitudeDelta: 0.0421,
                        };
                    })()}
                    showsUserLocation={true}
                    showsMyLocationButton={false}
                >
                    {/* Pickup location marker */}
                    {booking?.fromLocation && (
                        <Marker
                            coordinate={{
                                latitude: typeof booking.fromLocation === 'object' 
                                    ? (booking.fromLocation.latitude || -1.2921)
                                    : -1.2921,
                                longitude: typeof booking.fromLocation === 'object' 
                                    ? (booking.fromLocation.longitude || 36.8219)
                                    : 36.8219,
                            }}
                            title="Pickup Location"
                            description={typeof booking.fromLocation === 'object' 
                                ? (booking.fromLocation.address || booking.fromLocationAddress || 'Pickup point')
                                : booking.fromLocation || 'Pickup point'}
                            pinColor={colors.primary}
                        />
                    )}

                    {/* Delivery location marker */}
                    {booking?.toLocation && (
                        <Marker
                            coordinate={{
                                latitude: typeof booking.toLocation === 'object' 
                                    ? (booking.toLocation.latitude || -1.2921)
                                    : -1.2921,
                                longitude: typeof booking.toLocation === 'object' 
                                    ? (booking.toLocation.longitude || 36.8219)
                                    : 36.8219,
                            }}
                            title="Delivery Location"
                            description={typeof booking.toLocation === 'object' 
                                ? (booking.toLocation.address || booking.toLocationAddress || 'Delivery point')
                                : booking.toLocation || 'Delivery point'}
                            pinColor={colors.secondary}
                        />
                    )}

                    {/* Real-time transporter location marker */}
                    {transporterLocation && (
                        <Marker
                            coordinate={{
                                latitude: transporterLocation.latitude,
                                longitude: transporterLocation.longitude,
                            }}
                            title="Transporter Location"
                            description={transporterLocation.address || 'Current position'}
                            pinColor={colors.success}
                        />
                    )}

                    {/* Route Polyline */}
                    {routePolyline.length > 0 && (
                        <Polyline
                            coordinates={routePolyline}
                            strokeColor={colors.primary}
                            strokeWidth={4}
                            lineDashPattern={[5, 5]}
                        />
                    )}
                </MapView>
            </View>

            {/* Tracking Info Panel */}
            <View style={styles.infoPanel}>
                <View style={styles.infoHeader}>
                    <MaterialCommunityIcons name="truck-delivery" size={24} color={colors.primary} />
                    <Text style={styles.infoTitle}>
                        {isConsolidated ? 'Consolidated Tracking' : isInstant ? 'Instant Request Tracking' : 'Live Tracking'}
                    </Text>
                    <View style={styles.statusIndicator}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>Active</Text>
                    </View>
                </View>

                <View style={styles.trackingDetails}>
                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="identifier" size={20} color={colors.primary} />
                        <View style={styles.detailText}>
                            <Text style={styles.detailLabel}>Job ID</Text>
                            <Text style={styles.detailValue}>
                                {getDisplayBookingId(booking)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="map-marker" size={20} color={colors.primary} />
                        <View style={styles.detailText}>
                            <Text style={styles.detailLabel}>Route</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
                                <LocationDisplay location={booking?.fromLocation} showIcon={false} />
                                <MaterialCommunityIcons name="arrow-right" size={16} color={colors.text.secondary} style={{ marginHorizontal: 8 }} />
                                <LocationDisplay location={booking?.toLocation} showIcon={false} />
                            </View>
                        </View>
                    </View>

                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="package-variant" size={20} color={colors.secondary} />
                        <View style={styles.detailText}>
                            <Text style={styles.detailLabel}>Cargo</Text>
                            <Text style={styles.detailValue}>
                                {booking?.productType || 'Unknown'} ({booking?.weight || 'Unknown'})
                            </Text>
                        </View>
                    </View>

                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="clock-outline" size={20} color={colors.tertiary} />
                        <View style={styles.detailText}>
                            <Text style={styles.detailLabel}>Status</Text>
                            <Text style={styles.detailValue}>
                                {booking?.status ? booking.status.replace('_', ' ').toUpperCase() : 'PENDING'}
                            </Text>
                        </View>
                    </View>

                    {transporterLocation && (
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="map-marker-radius" size={20} color={colors.success} />
                            <View style={styles.detailText}>
                                <Text style={styles.detailLabel}>Transporter Location</Text>
                                <Text style={styles.detailValue}>
                                    {transporterLocation.address}
                                </Text>
                                <Text style={styles.detailSubtext}>
                                    Last updated: {transporterLocation.timestamp}
                                </Text>
                            </View>
                        </View>
                    )}

                    {transporterLocation?.speed && (
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="speedometer" size={20} color={colors.warning} />
                            <View style={styles.detailText}>
                                <Text style={styles.detailLabel}>Speed</Text>
                                <Text style={styles.detailValue}>
                                    {transporterLocation.speed} km/h
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.primaryButton]}
                        onPress={startRealTimeTracking}
                    >
                        <MaterialCommunityIcons name="play" size={20} color={colors.white} />
                        <Text style={styles.primaryButtonText}>Start Tracking</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.secondaryButton]}
                        onPress={() => navigation.navigate('TrackingScreen', {
                            booking,
                            isConsolidated,
                            consolidatedRequests
                        })}
                    >
                        <MaterialCommunityIcons name="timeline-clock" size={20} color={colors.primary} />
                        <Text style={styles.secondaryButtonText}>View Timeline</Text>
                    </TouchableOpacity>
                </View>

                {/* Communication Buttons - Only show for accepted/confirmed/assigned bookings */}
                {commTarget && ['accepted', 'confirmed', 'assigned'].includes((booking?.status || unifiedTrackingData?.status || '').toLowerCase()) && (
                    <View style={styles.communicationButtons}>
                        <TouchableOpacity 
                            style={styles.communicationButton}
                            onPress={() => setChatVisible(true)}
                        >
                            <MaterialCommunityIcons name="message-text" size={20} color={colors.primary} />
                            <Text style={styles.communicationButtonText}>Chat with Transporter</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.communicationButton}
                            onPress={() => setCallVisible(true)}
                        >
                            <MaterialCommunityIcons name="phone" size={20} color={colors.success} />
                            <Text style={styles.communicationButtonText}>Call Transporter</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Chat Modal */}
            {commTarget && (
                <RealtimeChatModal
                    visible={chatVisible}
                    onClose={() => setChatVisible(false)}
                    bookingId={booking?.id || booking?.bookingId}
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
                        <MaterialCommunityIcons name="call" size={48} color={colors.secondary} style={{ marginBottom: 12 }} />
                        <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>
                            Calling {commTarget?.role || 'Transporter'}...
                        </Text>
                        <Text style={{ color: colors.text.secondary, marginBottom: 16 }}>
                            {commTarget?.name || 'Transporter'} ({commTarget?.phone || 'N/A'})
                        </Text>
                        <TouchableOpacity 
                            style={styles.cancelBtn} 
                            onPress={() => setCallVisible(false)}
                        >
                            <Text style={styles.cancelText}>End Call</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.callBtn} 
                            onPress={() => {
                                if (commTarget?.phone) {
                                    Linking.openURL(`tel:${commTarget.phone}`);
                                }
                                setCallVisible(false);
                            }}
                        >
                            <Text style={styles.callText}>Call Now</Text>
                        </TouchableOpacity>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.text.light + '20',
    },
    backButton: {
        padding: spacing.sm,
    },
    headerTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.primary,
    },
    refreshButton: {
        padding: spacing.sm,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: spacing.md,
        fontSize: fonts.size.md,
        color: colors.text.secondary,
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    map: {
        flex: 1,
        width: '100%',
    },
    mapControls: {
        position: 'absolute',
        right: spacing.lg,
        top: spacing.lg,
        gap: spacing.sm,
    },
    mapControlButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    infoPanel: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    infoTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginLeft: spacing.sm,
        flex: 1,
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.success,
        marginRight: spacing.xs,
    },
    statusText: {
        fontSize: fonts.size.sm,
        color: colors.success,
        fontWeight: '600',
    },
    trackingDetails: {
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailText: {
        marginLeft: spacing.sm,
        flex: 1,
    },
    detailLabel: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    detailValue: {
        fontSize: fonts.size.md,
        color: colors.text.primary,
        fontWeight: '600',
    },
    detailSubtext: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginTop: 2,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 12,
    },
    primaryButton: {
        backgroundColor: colors.primary,
    },
    primaryButtonText: {
        color: colors.white,
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        marginLeft: spacing.sm,
    },
    secondaryButton: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    secondaryButtonText: {
        color: colors.primary,
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        marginLeft: spacing.sm,
    },
    communicationButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    communicationButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.primary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 8,
    },
    communicationButtonText: {
        color: colors.primary,
        fontSize: fonts.size.sm,
        fontWeight: '600',
        marginLeft: spacing.xs,
    },
    modalBg: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    callModal: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: spacing.xl,
        alignItems: 'center',
        minWidth: 280,
    },
    cancelBtn: {
        backgroundColor: colors.error,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: 8,
        marginBottom: spacing.sm,
        width: '100%',
    },
    cancelText: {
        color: colors.white,
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    callBtn: {
        backgroundColor: colors.success,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: 8,
        width: '100%',
    },
    callText: {
        color: colors.white,
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});

export default MapViewScreen;

