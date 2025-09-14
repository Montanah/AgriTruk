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
} from 'react-native';
import ExpoCompatibleMap from '../components/common/ExpoCompatibleMap';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';

const { width, height } = Dimensions.get('window');

const MapViewScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { booking, trackingData, isConsolidated, consolidatedRequests, isInstant } = route.params || {};
    const [loading, setLoading] = useState(true);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [estimatedTime, setEstimatedTime] = useState('2 hours 30 minutes');
    const [isTracking, setIsTracking] = useState(false);
    const [transporterLocation, setTransporterLocation] = useState(null);
    const [locationInterval, setLocationInterval] = useState(null);

    useEffect(() => {
        initializeMap();
    }, []);

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
        setIsTracking(true);
        
        // First, try to fetch current transporter location from backend
        await fetchTransporterLocation();
        
        // Set up polling for real-time updates
        const interval = setInterval(async () => {
            await fetchTransporterLocation();
            updateEstimatedTime();
        }, 10000); // Update every 10 seconds
        
        setLocationInterval(interval);
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
                // Fallback to mock data if backend doesn't have location
                const mockLocation = generateMockTransporterLocation();
                setTransporterLocation(mockLocation);
            }
        } catch (error) {
            // Fallback to mock data
            const mockLocation = generateMockTransporterLocation();
            setTransporterLocation(mockLocation);
        }
    };

    const stopRealTimeTracking = () => {
        setIsTracking(false);
        
        if (locationInterval) {
            clearInterval(locationInterval);
            setLocationInterval(null);
        }
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
                        <MaterialCommunityIcons name="map-marker" size={20} color={colors.primary} />
                        <View style={styles.detailText}>
                            <Text style={styles.detailLabel}>Route</Text>
                            <Text style={styles.detailValue}>
                                {booking?.fromLocationAddress || (typeof booking?.fromLocation === 'object' 
                                    ? booking.fromLocation.address 
                                    : booking?.fromLocation) || 'Pickup'} → {booking?.toLocationAddress || (typeof booking?.toLocation === 'object' 
                                    ? booking.toLocation.address 
                                    : booking?.toLocation) || 'Delivery'}
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
            </View>
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
});

export default MapViewScreen;

