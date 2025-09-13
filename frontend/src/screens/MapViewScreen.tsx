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
            console.error('Error getting location:', error);
        } finally {
            setLoading(false);
        }
    };

    const startRealTimeTracking = () => {
        // TODO: Implement real-time location tracking
        console.log('Starting real-time tracking...');
    };

    const stopRealTimeTracking = () => {
        // TODO: Stop real-time location tracking
        console.log('Stopping real-time tracking...');
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
                <ExpoCompatibleMap
                    style={styles.map}
                    showUserLocation={true}
                    markers={[
                        // Pickup location marker
                        ...(booking && booking.pickupLocation ? [{
                            id: 'pickup',
                            coordinate: {
                                latitude: booking.pickupLocation.latitude || -1.2921,
                                longitude: booking.pickupLocation.longitude || 36.8219,
                            },
                            title: 'Pickup Location',
                            description: booking.pickupLocation.address || 'Pickup point',
                            pinColor: colors.primary,
                        }] : []),
                        // Delivery location marker
                        ...(booking && booking.toLocation ? [{
                            id: 'delivery',
                            coordinate: {
                                latitude: booking.toLocation.latitude || -1.2921,
                                longitude: booking.toLocation.longitude || 36.8219,
                            },
                            title: 'Delivery Location',
                            description: booking.toLocation.address || 'Delivery point',
                            pinColor: colors.secondary,
                        }] : []),
                        // Transporter location marker (if available)
                        ...(trackingData && trackingData.currentLocation ? [{
                            id: 'transporter',
                            coordinate: {
                                latitude: trackingData.currentLocation.latitude || -1.2921,
                                longitude: trackingData.currentLocation.longitude || 36.8219,
                            },
                            title: 'Transporter Location',
                            description: 'Current position',
                            pinColor: colors.success,
                        }] : []),
                    ]}
                    initialRegion={{
                        latitude: -1.2921, // Nairobi
                        longitude: 36.8219,
                        latitudeDelta: 0.0922,
                        longitudeDelta: 0.0421,
                    }}
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
                            <Text style={styles.detailLabel}>Current Location</Text>
                            <Text style={styles.detailValue}>Nairobi CBD, Kenya</Text>
                        </View>
                    </View>

                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="clock-outline" size={20} color={colors.secondary} />
                        <View style={styles.detailText}>
                            <Text style={styles.detailLabel}>Estimated Arrival</Text>
                            <Text style={styles.detailValue}>{estimatedTime}</Text>
                        </View>
                    </View>

                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="speedometer" size={20} color={colors.tertiary} />
                        <View style={styles.detailText}>
                            <Text style={styles.detailLabel}>Speed</Text>
                            <Text style={styles.detailValue}>65 km/h</Text>
                        </View>
                    </View>
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

