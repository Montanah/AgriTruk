import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal,
    Linking,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Polyline, Marker } from 'react-native-maps';
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

interface RouteParams {
    booking: any;
    isConsolidated?: boolean;
    consolidatedRequests?: any[];
}

const DriverTrackingScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { booking, isConsolidated, consolidatedRequests } = (route.params as RouteParams) || {};
    const [loading, setLoading] = useState(true);
    const [currentLocation, setCurrentLocation] = useState<any>(null);
    const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
    const [estimatedTime, setEstimatedTime] = useState('2 hours 30 minutes');
    const [isTracking, setIsTracking] = useState(false);
    const [trackingData, setTrackingData] = useState<UnifiedTrackingData | null>(null);
    const [chatVisible, setChatVisible] = useState(false);
    const [callVisible, setCallVisible] = useState(false);
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('');

    // Get client info for communication
    const client = booking?.client || booking?.shipper;
    const commTarget = client ? {
        id: client.id || client.userId || 'client-id',
        name: client.name || client.companyName || 'Client',
        phone: client.phone || '+254700000000',
        role: booking?.userType === 'broker' ? 'broker' : booking?.userType === 'business' ? 'business' : 'shipper',
        photo: client.photo || client.profilePhoto
    } : null;

    useEffect(() => {
        initializeLocation();
        if (booking?.id) {
            loadTrackingData();
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

    const initializeLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Location permission is required for tracking.');
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            setCurrentLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        } catch (error) {
            console.error('Error getting current location:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTrackingData = async () => {
        try {
            console.log('🔍 DriverTrackingScreen: Loading tracking data for booking:', booking.id);
            
            const trackingData = await unifiedTrackingService.getTrackingData(booking.id);
            
            if (trackingData) {
                console.log('🔍 DriverTrackingScreen: Got tracking data:', trackingData);
                setTrackingData(trackingData);
                
                if (trackingData.route && trackingData.route.length > 0) {
                    setRouteCoordinates(trackingData.route);
                }
                
                if (trackingData.estimatedArrival) {
                    setEstimatedTime(trackingData.estimatedArrival);
                }
            } else {
                console.log('🔍 DriverTrackingScreen: No tracking data available from API');
                setTrackingData(null);
            }
        } catch (error) {
            console.error('Error loading tracking data:', error);
            setTrackingData(null);
        }
    };

    const startRealTimeTracking = async () => {
        if (!booking?.id) return;
        
        try {
            console.log('🔍 DriverTrackingScreen: Starting real-time tracking for booking:', booking.id);
            setIsTracking(true);
            
            const trackingStarted = await unifiedTrackingService.startTracking(booking.id, {
                onLocationUpdate: (location) => {
                    console.log('🔍 DriverTrackingScreen: Location update received:', location);
                    // Update tracking data with new location
                    setTrackingData(prev => prev ? {
                        ...prev,
                        currentLocation: location
                    } : null);
                },
                onStatusUpdate: (status) => {
                    console.log('🔍 DriverTrackingScreen: Status update received:', status);
                    setTrackingData(status);
                },
                onRouteDeviation: (deviation) => {
                    console.log('🔍 DriverTrackingScreen: Route deviation detected:', deviation);
                    Alert.alert('Route Deviation', `Alternative route taken: ${deviation.deviation.reason}`);
                },
                onTrafficAlert: (alert) => {
                    console.log('🔍 DriverTrackingScreen: Traffic alert received:', alert);
                    Alert.alert('Traffic Alert', `${alert.message} (Delay: ${alert.estimatedDelay} minutes)`);
                },
            });
            
            if (trackingStarted) {
                console.log('🔍 DriverTrackingScreen: Real-time tracking started successfully');
            } else {
                console.log('🔍 DriverTrackingScreen: Failed to start real-time tracking');
                setIsTracking(false);
            }
        } catch (error) {
            console.error('Error starting real-time tracking:', error);
            setIsTracking(false);
        }
    };

    const stopRealTimeTracking = () => {
        if (booking?.id) {
            unifiedTrackingService.stopTracking(booking.id);
        }
        setIsTracking(false);
    };

    const confirmSelectedRoute = async () => {
        if (!booking?.id || !routeCoordinates?.length) {
            Alert.alert('Route', 'No route to publish.');
            return;
        }
        try {
            const ok = await unifiedTrackingService.publishSelectedRoute(booking.id, routeCoordinates);
            if (ok) {
                Alert.alert('Route Confirmed', 'Clients will now see this route.');
            } else {
                Alert.alert('Route', 'Failed to publish route.');
            }
        } catch (e) {
            Alert.alert('Route', 'Unexpected error confirming route.');
        }
    };

    const sendDriverTrafficAlert = async () => {
        if (!booking?.id) return;
        try {
            const ok = await unifiedTrackingService.sendTrafficAlertToClients(booking.id, {
                type: 'congestion',
                severity: 'medium',
                message: 'Traffic ahead, rerouting to faster alternative.',
                location: trackingData?.currentLocation || {
                    latitude: currentLocation?.latitude || 0,
                    longitude: currentLocation?.longitude || 0,
                    address: 'Current Position'
                },
                estimatedDelay: 10,
            } as any);
            if (ok) Alert.alert('Alert Sent', 'Clients have been notified.');
        } catch (e) {
            Alert.alert('Alert', 'Failed to send alert.');
        }
    };

    const sendLocationUpdate = async () => {
        if (!currentLocation || !booking?.id) return;

        try {
            const locationData = {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                address: await getReadableLocationName(currentLocation.latitude, currentLocation.longitude),
            };

            const success = await unifiedTrackingService.sendLocationUpdate(booking.id, locationData, {
                speed: 0, // Will be updated with real GPS speed
                accuracy: 10,
            });

            if (success) {
                Alert.alert('Success', 'Location update sent successfully');
            } else {
                Alert.alert('Error', 'Failed to send location update');
            }
        } catch (error) {
            console.error('Error sending location update:', error);
            Alert.alert('Error', 'Failed to send location update');
        }
    };

    const updateBookingStatus = async (status: string, message?: string) => {
        if (!booking?.id) return;

        try {
            const success = await unifiedTrackingService.sendDriverStatusUpdate(
                booking.id,
                status,
                message,
                currentLocation ? {
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                    address: await getReadableLocationName(currentLocation.latitude, currentLocation.longitude),
                } : undefined
            );

            if (success) {
                Alert.alert('Success', `Status updated to ${status}`);
                setStatusModalVisible(false);
                // Refresh tracking data
                loadTrackingData();
            } else {
                Alert.alert('Error', 'Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const getStatusConfig = (status: string) => {
        const statusConfig: { [key: string]: { color: string; icon: string; label: string } } = {
            pending: { color: colors.primary, icon: 'clock-outline', label: 'Pending' },
            accepted: { color: colors.secondary, icon: 'check-circle', label: 'Accepted' },
            confirmed: { color: colors.secondary, icon: 'check-circle-outline', label: 'Confirmed' },
            pickup: { color: colors.tertiary, icon: 'package-variant', label: 'Pickup' },
            in_transit: { color: colors.success, icon: 'truck-delivery', label: 'In Transit' },
            delivered: { color: colors.success, icon: 'check-circle', label: 'Delivered' },
            cancelled: { color: colors.error, icon: 'close-circle', label: 'Cancelled' },
        };
        return statusConfig[status] || statusConfig.pending;
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading tracking information...</Text>
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
                <Text style={styles.headerTitle}>Driver Tracking</Text>
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
                        // Driver current location marker
                        ...(currentLocation ? [{
                            id: 'driver',
                            coordinate: {
                                latitude: currentLocation.latitude,
                                longitude: currentLocation.longitude,
                            },
                            title: 'Your Location',
                            description: 'Current driver position',
                            pinColor: colors.success,
                        }] : []),
                    ]}
                    initialRegion={currentLocation || {
                        latitude: -1.2921,
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

            {/* Driver Actions Panel */}
            <View style={styles.actionsPanel}>
                <View style={styles.actionsHeader}>
                    <MaterialCommunityIcons name="truck-delivery" size={24} color={colors.primary} />
                    <Text style={styles.actionsTitle}>Driver Actions</Text>
                    <View style={styles.statusIndicator}>
                        <View style={[styles.statusDot, { backgroundColor: isTracking ? colors.success : colors.warning }]} />
                        <Text style={[styles.statusText, { color: isTracking ? colors.success : colors.warning }]}>
                            {isTracking ? 'Live Tracking' : 'Offline'}
                        </Text>
                    </View>
                </View>

                <ScrollView style={styles.actionsContent} showsVerticalScrollIndicator={false}>
                    {/* Booking Info */}
                    <View style={styles.infoCard}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="package-variant" size={20} color={colors.primary} />
                            <Text style={styles.cardTitle}>Booking Information</Text>
                        </View>
                        <View style={styles.bookingInfo}>
                            <Text style={styles.bookingId}>#{getDisplayBookingId({
                              ...booking,
                              bookingType: booking.bookingType || booking.type,
                              bookingMode: booking.bookingMode || (booking.type === 'instant' ? 'instant' : 'booking')
                            })}</Text>
                            <View style={[styles.statusBadge, { 
                                backgroundColor: getStatusConfig(booking?.status || 'pending').color + '15',
                                borderColor: getStatusConfig(booking?.status || 'pending').color + '50',
                                borderWidth: 1.5
                            }]}>
                                <MaterialCommunityIcons
                                    name={getStatusConfig(booking?.status || 'pending').icon as any}
                                    size={16}
                                    color={getStatusConfig(booking?.status || 'pending').color}
                                />
                                <Text style={[styles.statusText, { 
                                    color: getStatusConfig(booking?.status || 'pending').color,
                                    fontWeight: '700'
                                }]}>
                                    {getStatusConfig(booking?.status || 'pending').label}
                                </Text>
                            </View>
                        </View>
                        
                        <View style={styles.routeInfo}>
                            <View style={styles.routeItem}>
                                <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
                                <View style={styles.routeText}>
                                    <Text style={styles.routeLabel}>Pickup</Text>
                                    <LocationDisplay 
                                        location={booking?.fromLocation || 'Unknown location'} 
                                        style={styles.routeValue}
                                        showIcon={false}
                                    />
                                </View>
                            </View>
                            <View style={styles.routeDivider} />
                            <View style={styles.routeItem}>
                                <MaterialCommunityIcons name="map-marker-check" size={16} color={colors.success} />
                                <View style={styles.routeText}>
                                    <Text style={styles.routeLabel}>Delivery</Text>
                                    <LocationDisplay 
                                        location={booking?.toLocation || 'Unknown location'} 
                                        style={styles.routeValue}
                                        showIcon={false}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.bookingDetails}>
                            <View style={styles.detailRow}>
                                <MaterialCommunityIcons name="package-variant" size={16} color={colors.text.secondary} />
                                <Text style={styles.detailLabel}>Product:</Text>
                                <Text style={styles.detailValue}>{booking?.productType || 'Unknown'}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <MaterialCommunityIcons name="weight-kilogram" size={16} color={colors.text.secondary} />
                                <Text style={styles.detailLabel}>Weight:</Text>
                                <Text style={styles.detailValue}>{booking?.weight || 'Unknown'}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <MaterialCommunityIcons name="calendar-clock" size={16} color={colors.text.secondary} />
                                <Text style={styles.detailLabel}>Pickup Date:</Text>
                                <Text style={styles.detailValue}>
                                    {new Date(booking?.pickUpDate || new Date()).toLocaleDateString()}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Client Information */}
                    {commTarget && (
                        <View style={styles.infoCard}>
                            <View style={styles.cardHeader}>
                                <MaterialCommunityIcons name="account-tie" size={20} color={colors.tertiary} />
                                <Text style={styles.cardTitle}>Client Information</Text>
                            </View>
                            <View style={styles.clientInfo}>
                                <View style={styles.clientDetailRow}>
                                    <MaterialCommunityIcons name="account" size={16} color={colors.text.secondary} />
                                    <Text style={styles.clientLabel}>Name:</Text>
                                    <Text style={styles.clientValue}>{commTarget.name}</Text>
                                </View>
                                <View style={styles.clientDetailRow}>
                                    <MaterialCommunityIcons name="phone" size={16} color={colors.text.secondary} />
                                    <Text style={styles.clientLabel}>Phone:</Text>
                                    <Text style={styles.clientValue}>{commTarget.phone}</Text>
                                </View>
                                <View style={styles.clientDetailRow}>
                                    <MaterialCommunityIcons name="briefcase" size={16} color={colors.text.secondary} />
                                    <Text style={styles.clientLabel}>Type:</Text>
                                    <Text style={styles.clientValue}>{commTarget.role}</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Progress Tracking */}
                    {trackingData?.progress && (
                        <View style={styles.infoCard}>
                            <View style={styles.cardHeader}>
                                <MaterialCommunityIcons name="progress-clock" size={20} color={colors.primary} />
                                <Text style={styles.cardTitle}>Trip Progress</Text>
                            </View>
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
                                    {trackingData.progress.percentage}% Complete
                                </Text>
                                <Text style={styles.progressSubtext}>
                                    {trackingData.progress.distanceRemaining} km remaining • {trackingData.progress.timeRemaining} min ETA
                                </Text>
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.primaryButton]}
                        onPress={sendLocationUpdate}
                    >
                        <MaterialCommunityIcons name="map-marker-radius" size={20} color={colors.white} />
                        <Text style={styles.primaryButtonText}>Send Location</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.secondaryButton]}
                        onPress={confirmSelectedRoute}
                    >
                        <MaterialCommunityIcons name="check-decagram" size={20} color={colors.primary} />
                        <Text style={styles.secondaryButtonText}>Confirm Route</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.secondaryButton]}
                        onPress={sendDriverTrafficAlert}
                    >
                        <MaterialCommunityIcons name="alert-octagon" size={20} color={colors.warning} />
                        <Text style={[styles.secondaryButtonText, { color: colors.warning }]}>Send Alert</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.secondaryButton]}
                        onPress={() => setStatusModalVisible(true)}
                    >
                        <MaterialCommunityIcons name="update" size={20} color={colors.primary} />
                        <Text style={styles.secondaryButtonText}>Update Status</Text>
                    </TouchableOpacity>
                </View>

                {/* Communication Buttons - Only show for accepted/confirmed/assigned bookings */}
                {commTarget && ['accepted', 'confirmed', 'assigned'].includes((booking?.status || trackingData?.status || '').toLowerCase()) && (
                    <View style={styles.communicationButtons}>
                        <TouchableOpacity 
                            style={styles.communicationButton}
                            onPress={() => setChatVisible(true)}
                        >
                            <MaterialCommunityIcons name="message-text" size={20} color={colors.primary} />
                            <Text style={styles.communicationButtonText}>Chat with Client</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.communicationButton}
                            onPress={() => setCallVisible(true)}
                        >
                            <MaterialCommunityIcons name="phone" size={20} color={colors.success} />
                            <Text style={styles.communicationButtonText}>Call Client</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Status Update Modal */}
            <Modal visible={statusModalVisible} animationType="slide" transparent>
                <View style={styles.modalBg}>
                    <View style={styles.statusModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Update Booking Status</Text>
                            <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text.secondary} />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.statusOptions}>
                            {[
                                { status: 'accepted', label: 'Accept Booking', icon: 'check-circle', color: colors.success },
                                { status: 'confirmed', label: 'Confirm Pickup', icon: 'check-circle-outline', color: colors.secondary },
                                { status: 'pickup', label: 'Package Picked Up', icon: 'package-variant', color: colors.tertiary },
                                { status: 'in_transit', label: 'In Transit', icon: 'truck-delivery', color: colors.primary },
                                { status: 'delivered', label: 'Delivered', icon: 'check-circle', color: colors.success },
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.status}
                                    style={styles.statusOption}
                                    onPress={() => {
                                        setSelectedStatus(option.status);
                                        updateBookingStatus(option.status);
                                    }}
                                >
                                    <MaterialCommunityIcons name={option.icon as any} size={24} color={option.color} />
                                    <Text style={styles.statusOptionText}>{option.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Chat Modal */}
            {commTarget && (
                <RealtimeChatModal
                    visible={chatVisible}
                    onClose={() => setChatVisible(false)}
                    bookingId={booking?.id || booking?.bookingId}
                    participant1Id={getAuth().currentUser?.uid || ''}
                    participant1Type="driver"
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
                        <MaterialCommunityIcons name="phone-outline" size={48} color={colors.secondary} style={{ marginBottom: 12 }} />
                        <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>
                            Calling {commTarget?.role || 'Client'}...
                        </Text>
                        <Text style={{ color: colors.text.secondary, marginBottom: 16 }}>
                            {commTarget?.name || 'Client'} ({commTarget?.phone || 'N/A'})
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
    actionsPanel: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: height * 0.5,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    actionsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.text.light + '20',
    },
    actionsTitle: {
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
    actionsContent: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    infoCard: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    cardTitle: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginLeft: spacing.sm,
    },
    bookingInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    bookingId: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.primary,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 16,
        borderWidth: 1,
    },
    routeInfo: {
        gap: spacing.xs,
        marginBottom: spacing.sm,
    },
    routeItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    routeText: {
        marginLeft: spacing.sm,
        flex: 1,
    },
    routeLabel: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    routeValue: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        fontWeight: '600',
    },
    routeDivider: {
        height: 1,
        backgroundColor: colors.text.light + '30',
        marginVertical: spacing.xs,
        marginLeft: 10,
    },
    bookingDetails: {
        gap: spacing.xs,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginLeft: spacing.sm,
        marginRight: spacing.sm,
        fontWeight: '500',
        minWidth: 80,
    },
    detailValue: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        fontWeight: '600',
        flex: 1,
    },
    clientInfo: {
        gap: spacing.xs,
    },
    clientDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    clientLabel: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginLeft: spacing.sm,
        marginRight: spacing.sm,
        fontWeight: '500',
        minWidth: 60,
    },
    clientValue: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        fontWeight: '600',
        flex: 1,
    },
    progressContainer: {
        marginTop: spacing.sm,
    },
    progressBar: {
        height: 8,
        backgroundColor: colors.surface,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: spacing.sm,
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 4,
    },
    progressText: {
        fontSize: fonts.size.sm,
        color: colors.primary,
        fontWeight: '600',
        textAlign: 'center',
    },
    progressSubtext: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        textAlign: 'center',
        marginTop: spacing.xs,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.text.light + '20',
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
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
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
    statusModal: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        width: width * 0.9,
        maxHeight: height * 0.7,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    modalTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    statusOptions: {
        maxHeight: height * 0.4,
    },
    statusOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderRadius: 8,
        marginBottom: spacing.sm,
        backgroundColor: colors.background,
    },
    statusOptionText: {
        fontSize: fonts.size.md,
        color: colors.text.primary,
        fontWeight: '600',
        marginLeft: spacing.sm,
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

export default DriverTrackingScreen;