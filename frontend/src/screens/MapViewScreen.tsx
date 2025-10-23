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
import ExpoCompatibleMap from '../components/common/ExpoCompatibleMap';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { getReadableLocationName, formatRoute } from '../utils/locationUtils';
import LocationDisplay from '../components/common/LocationDisplay';
import ChatModal from '../components/Chat/ChatModal';
import { getDisplayBookingId } from '../utils/unifiedIdSystem';
import { unifiedTrackingService, TrackingData as UnifiedTrackingData } from '../services/unifiedTrackingService';
import { API_ENDPOINTS } from '../constants/api';

const { width, height } = Dimensions.get('window');

const MapViewScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { booking, trackingData, isConsolidated, consolidatedRequests, isInstant, userType } = route.params || {};
    const [loading, setLoading] = useState(true);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [estimatedTime, setEstimatedTime] = useState('2 hours 30 minutes');
    const [isTracking, setIsTracking] = useState(false);
    const [transporterLocation, setTransporterLocation] = useState(null);
    const [unifiedTrackingData, setUnifiedTrackingData] = useState<UnifiedTrackingData | null>(null);
    const [chatVisible, setChatVisible] = useState(false);
    const [callVisible, setCallVisible] = useState(false);

    // Get transporter info for communication
    const transporter = booking?.transporter;
    const commTarget = transporter ? {
        id: transporter.id || 'transporter-id',
        name: transporter.name || 'Transporter',
        phone: transporter.phone || '+254700000000',
        role: 'Transporter'
    } : null;

    useEffect(() => {
        initializeMap();
        if (booking?.id) {
            loadUnifiedTrackingData();
        }
    }, [booking?.id]);

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
                    timestamp: trackingData.currentLocation.timestamp,
                    speed: trackingData.currentLocation.speed || 0,
                });
            }
            
            if (trackingData?.routeCoordinates) {
                setRouteCoordinates(trackingData.routeCoordinates);
            }
            
            if (trackingData?.estimatedTimeOfArrival) {
                setEstimatedTime(trackingData.estimatedTimeOfArrival);
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
            await unifiedTrackingService.startTracking(booking.id, booking.userId || 'current-user', 10000);
            
            // Set up listeners for real-time updates
            unifiedTrackingService.onLocationUpdate(booking.id, (location) => {
                setTransporterLocation({
                    latitude: location.latitude,
                    longitude: location.longitude,
                    address: location.address || 'Transporter Location',
                    timestamp: location.timestamp,
                    speed: location.speed || 0,
                });
            });

            unifiedTrackingService.onStatusUpdate(booking.id, (status) => {
                // Handle status updates if needed
                console.log('Status updated:', status);
            });

            unifiedTrackingService.onRouteDeviation(booking.id, (deviation) => {
                // Handle route deviation alerts
                console.log('Route deviation detected:', deviation);
            });

            unifiedTrackingService.onTrafficAlert(booking.id, (alert) => {
                // Handle traffic alerts
                console.log('Traffic alert:', alert);
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

    const updateEstimatedTime = () => {
        // Calculate estimated time based on distance and speed
        const fromLat = typeof booking?.fromLocation === 'object' 
            ? booking.fromLocation.latitude 
            : -0.0917016;
        const fromLng = typeof booking?.fromLocation === 'object' 
            ? booking.fromLocation.longitude 
            : 34.7679568;
        const toLat = typeof booking?.toLocation === 'object' 
            ? booking.toLocation.latitude 
            : -1.2920659;
        const toLng = typeof booking?.toLocation === 'object' 
            ? booking.toLocation.longitude 
            : 36.8219462;

        // Calculate distance (simplified)
        const distance = Math.sqrt(
            Math.pow(toLat - fromLat, 2) + Math.pow(toLng - fromLng, 2)
        ) * 111; // Rough conversion to km

        const avgSpeed = 50; // km/h
        const hours = distance / avgSpeed;
        const minutes = Math.floor((hours % 1) * 60);
        const hoursInt = Math.floor(hours);

        setEstimatedTime(`${hoursInt}h ${minutes}m`);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (locationInterval) {
                clearInterval(locationInterval);
            }
        };
    }, [locationInterval]);

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
                <ExpoCompatibleMap
                    style={styles.map}
                    showUserLocation={true}
                    markers={[
                        // Pickup location marker
                        ...(booking && booking.fromLocation ? [{
                            id: 'pickup',
                            coordinate: {
                                latitude: typeof booking.fromLocation === 'object' 
                                    ? (booking.fromLocation.latitude || -1.2921)
                                    : -1.2921,
                                longitude: typeof booking.fromLocation === 'object' 
                                    ? (booking.fromLocation.longitude || 36.8219)
                                    : 36.8219,
                            },
                            title: 'Pickup Location',
                            description: typeof booking.fromLocation === 'object' 
                                ? (booking.fromLocation.address || booking.fromLocationAddress || 'Pickup point')
                                : booking.fromLocation || 'Pickup point',
                            pinColor: colors.primary,
                        }] : []),
                        // Delivery location marker
                        ...(booking && booking.toLocation ? [{
                            id: 'delivery',
                            coordinate: {
                                latitude: typeof booking.toLocation === 'object' 
                                    ? (booking.toLocation.latitude || -1.2921)
                                    : -1.2921,
                                longitude: typeof booking.toLocation === 'object' 
                                    ? (booking.toLocation.longitude || 36.8219)
                                    : 36.8219,
                            },
                            title: 'Delivery Location',
                            description: typeof booking.toLocation === 'object' 
                                ? (booking.toLocation.address || booking.toLocationAddress || 'Delivery point')
                                : booking.toLocation || 'Delivery point',
                            pinColor: colors.secondary,
                        }] : []),
                        // Real-time transporter location marker
                        ...(transporterLocation ? [{
                            id: 'transporter',
                            coordinate: {
                                latitude: transporterLocation.latitude,
                                longitude: transporterLocation.longitude,
                            },
                            title: 'Transporter Location',
                            description: transporterLocation.address || 'Current position',
                            pinColor: colors.success,
                        }] : []),
                    ]}
                    initialRegion={(() => {
                        // Try to center the map between pickup and delivery locations
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
                        
                        // Default to Nairobi
                        return {
                            latitude: -1.2921,
                            longitude: 36.8219,
                            latitudeDelta: 0.0922,
                            longitudeDelta: 0.0421,
                        };
                    })()}
                />

                {/* Map Controls */}
                <View style={styles.mapControls}>
                    <TouchableOpacity style={styles.mapControlButton}>
                        <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.mapControlButton}>
                        <MaterialCommunityIcons name="plus" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.mapControlButton}>
                        <MaterialCommunityIcons name="minus" size={20} color={colors.primary} />
                    </TouchableOpacity>
                </View>
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
                            <Text style={styles.detailValue}>
                                {formatRoute(booking?.fromLocation, booking?.toLocation)}
                            </Text>
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

                {/* Communication Buttons */}
                {commTarget && (
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
                <ChatModal
                    visible={chatVisible}
                    onClose={() => setChatVisible(false)}
                    participantIds={[commTarget.id]}
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

