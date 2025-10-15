import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal,
    Linking,
} from 'react-native';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { formatRoute } from '../utils/locationUtils';
import LocationDisplay from '../components/common/LocationDisplay';
import { getDisplayBookingId } from '../utils/unifiedIdSystem';
import ChatModal from '../components/Chat/ChatModal';
import { unifiedTrackingService, TrackingData as UnifiedTrackingData } from '../services/unifiedTrackingService';
import { unifiedBookingService } from '../services/unifiedBookingService';
// Mock data removed - now using real API calls

interface TrackingData {
    bookingId: string;
    status: string;
    fromLocation: string;
    toLocation: string;
    productType: string;
    weight: string;
    route: {
        status: string;
        location: string;
        time: string;
        description: string;
    }[];
    currentLocation: {
        address: string;
        timestamp: string;
    } | null;
    estimatedDelivery: string;
    transporter: {
        name: string;
        phone: string;
        vehicle: string;
    } | null;
}

interface RouteParams {
    booking: any;
    isConsolidated?: boolean;
    consolidatedRequests?: any[];
}

const statusConfig: { [key: string]: { color: string; icon: string; label: string } } = {
    pending: { color: colors.primary, icon: 'clock-outline', label: 'Pending' },
    accepted: { color: colors.secondary, icon: 'check-circle', label: 'Accepted' },
    confirmed: { color: colors.secondary, icon: 'check-circle-outline', label: 'Confirmed' },
    pickup: { color: colors.tertiary, icon: 'package-variant', label: 'Pickup' },
    in_transit: { color: colors.success, icon: 'truck-delivery', label: 'In Transit' },
    delivered: { color: colors.success, icon: 'check-circle', label: 'Delivered' },
    cancelled: { color: colors.error, icon: 'close-circle', label: 'Cancelled' },
};

const TrackingScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { booking, isConsolidated, consolidatedRequests, userType } = (route.params as RouteParams) || {};
    const [trackingData, setTrackingData] = useState<UnifiedTrackingData | null>(null);
    const [loading, setLoading] = useState(false);
    const [chatVisible, setChatVisible] = useState(false);
    const [callVisible, setCallVisible] = useState(false);
    const [isTracking, setIsTracking] = useState(false);

    // Get transporter info for communication
    const transporter = booking?.transporter || trackingData?.transporterInfo;
    const commTarget = transporter ? {
        id: transporter.id || 'transporter-id',
        name: transporter.name || 'Transporter',
        phone: transporter.phone || '+254700000000',
        role: 'Transporter'
    } : null;

    useEffect(() => {
        if (booking?.id) {
            loadTrackingData();
        }
    }, [booking?.id]);

    const loadTrackingData = async () => {
        try {
            setLoading(true);
            const trackingData = await unifiedTrackingService.getTrackingData(booking.id, booking.userId || 'current-user');
            setTrackingData(trackingData);
        } catch (error) {
            console.error('Error loading tracking data:', error);
            // Fallback to mock data if needed
            setTrackingData(generateMockTrackingData(booking));
        } finally {
            setLoading(false);
        }
    };

    const startRealTimeTracking = async () => {
        if (!booking?.id) return;
        
        try {
            setIsTracking(true);
            await unifiedTrackingService.startTracking(booking.id, booking.userId || 'current-user', 30000);
            
            // Set up listeners for real-time updates
            unifiedTrackingService.onLocationUpdate(booking.id, (location) => {
                setTrackingData(prev => prev ? {
                    ...prev,
                    currentLocation: location
                } : null);
            });

            unifiedTrackingService.onStatusUpdate(booking.id, (status) => {
                setTrackingData(prev => prev ? {
                    ...prev,
                    status
                } : null);
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

    const stopRealTimeTracking = () => {
        if (booking?.id) {
            unifiedTrackingService.stopTracking(booking.id);
        }
        setIsTracking(false);
    };

    useEffect(() => {
        return () => {
            // Cleanup tracking when component unmounts
            if (booking?.id) {
                unifiedTrackingService.stopTracking(booking.id);
            }
        };
    }, [booking?.id]);

    const generateMockTrackingData = (booking: any): TrackingData => {
        const now = new Date();
        const pickupDate = new Date(booking.pickUpDate || now);
        const deliveryDate = new Date(pickupDate.getTime() + (2 * 24 * 60 * 60 * 1000)); // 2 days later
        
        const status = booking.status || 'pending';
        const fromLocation = booking.fromLocationAddress || booking.fromLocation || 'Pickup Location';
        const toLocation = booking.toLocationAddress || booking.toLocation || 'Delivery Location';

        const timeline = [];
        
        // Always add booking created
        timeline.push({
            status: 'completed',
            location: 'Booking Created',
            time: new Date(booking.createdAt || now).toLocaleString(),
            description: 'Your booking request has been submitted and is being processed.'
        });

        if (['accepted', 'confirmed', 'pickup', 'in_transit', 'delivered'].includes(status)) {
            timeline.push({
                status: 'completed',
                location: 'Booking Accepted',
                time: new Date(booking.acceptedAt || pickupDate.getTime() - (2 * 60 * 60 * 1000)).toLocaleString(),
                description: 'Your booking has been accepted by a transporter.'
            });
        }

        if (['pickup', 'in_transit', 'delivered'].includes(status)) {
            timeline.push({
                status: 'completed',
                location: fromLocation,
                time: pickupDate.toLocaleString(),
                description: 'Package has been picked up from the origin location.'
            });
        }

        if (['in_transit', 'delivered'].includes(status)) {
            timeline.push({
                status: 'completed',
                location: 'In Transit',
                time: new Date(pickupDate.getTime() + (12 * 60 * 60 * 1000)).toLocaleString(), // 12 hours after pickup
                description: 'Package is on its way to the destination.'
            });
        }

        if (status === 'delivered') {
            timeline.push({
                status: 'completed',
                location: toLocation,
                time: deliveryDate.toLocaleString(),
                description: 'Package has been delivered successfully.'
            });
        } else if (status === 'in_transit') {
            timeline.push({
                status: 'in_progress',
                location: 'In Transit',
                time: 'Currently',
                description: 'Package is on its way to the destination.'
            });
        } else if (status === 'pickup') {
            timeline.push({
                status: 'in_progress',
                location: fromLocation,
                time: 'Currently',
                description: 'Package is ready for pickup.'
            });
        } else if (status === 'accepted') {
            timeline.push({
                status: 'pending',
                location: 'Awaiting Pickup',
                time: 'Pending',
                description: 'Booking accepted! Transporter will contact you for pickup details.'
            });
        } else {
            timeline.push({
                status: 'pending',
                location: 'Awaiting Confirmation',
                time: 'Pending',
                description: 'Waiting for a transporter to confirm your booking.'
            });
        }

        return {
            bookingId: booking.id,
            status: status,
            fromLocation: fromLocation,
            toLocation: toLocation,
            productType: booking.productType || 'Cargo',
            weight: booking.weight || 'Unknown',
            route: timeline,
            currentLocation: status === 'in_transit' ? {
                address: 'En route to destination',
                timestamp: new Date().toLocaleString()
            } : null,
            estimatedDelivery: deliveryDate.toLocaleString(),
            transporter: booking.transporter ? {
                name: booking.transporter.name || 'Unknown Transporter',
                phone: booking.transporter.phone || 'N/A',
                vehicle: booking.transporter.vehicle || `${booking.vehicleMake || ''} ${booking.vehicleModel || ''}`.trim() || booking.vehicleRegistration || 'N/A'
            } : (booking.transporterName ? {
                name: booking.transporterName,
                phone: booking.transporterPhone || 'N/A',
                vehicle: `${booking.vehicleMake || ''} ${booking.vehicleModel || ''}`.trim() || booking.vehicleRegistration || 'N/A'
            } : null)
        };
    };

    const fetchTrackingData = useCallback(async (bookingId: string) => {
        setLoading(true);
        try {
            // Generate mock tracking data based on booking information
            const trackingData = generateMockTrackingData(booking);
            setTrackingData(trackingData);
        } catch {
            // Handle error silently
        } finally {
            setLoading(false);
        }
    }, [booking]);

    useEffect(() => {
        if (booking?.id) {
            fetchTrackingData(booking.id);
        }
    }, [booking, fetchTrackingData]);

    const getStatusConfig = (status: string) => {
        return statusConfig[status] || statusConfig.pending;
    };

    const renderStatusTimeline = () => {
        if (!trackingData?.route) return null;
        return trackingData.route.map((step: any, index: number) => (
            <View key={index} style={styles.timelineItem}>
                <View style={styles.timelineDot}>
                    <MaterialCommunityIcons
                        name={step.status === 'completed' ? 'check-circle' : step.status === 'in_progress' ? 'progress-clock' : 'circle-outline' as any}
                        size={20}
                        color={step.status === 'completed' ? colors.success : step.status === 'in_progress' ? colors.secondary : colors.text.light}
                    />
                </View>
                <View style={styles.timelineContent}>
                    <Text style={styles.timelineLocation}>{step.location}</Text>
                    <Text style={styles.timelineTime}>{step.time}</Text>
                    <Text style={styles.timelineDescription}>{step.description}</Text>
                </View>
                {index < trackingData.route.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: step.status === 'completed' ? colors.success : colors.text.light }]} />
                )}
            </View>
        ));
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

    if (!trackingData) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>No tracking data available</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Track Booking</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Booking Info Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialCommunityIcons name="package-variant" size={24} color={colors.primary} />
                        <Text style={styles.cardTitle}>
                            {isConsolidated ? 'Consolidated Shipment' : 'Booking Information'}
                        </Text>
                    </View>
                    <View style={styles.bookingInfo}>
                        <View style={styles.bookingIdContainer}>
                            <Text style={styles.bookingId}>#{getDisplayBookingId(booking)}</Text>
                            <Text style={styles.bookingDate}>
                                Created: {new Date(booking.createdAt || new Date()).toLocaleDateString()}
                            </Text>
                        </View>
                        <View style={[styles.statusBadge, { 
                            backgroundColor: getStatusConfig(trackingData.status).color + '15',
                            borderColor: getStatusConfig(trackingData.status).color + '50',
                            borderWidth: 1.5
                        }]}>
                            <MaterialCommunityIcons
                                name={getStatusConfig(trackingData.status).icon as any}
                                size={18}
                                color={getStatusConfig(trackingData.status).color}
                            />
                            <Text style={[styles.statusText, { 
                                color: getStatusConfig(trackingData.status).color,
                                fontWeight: '700'
                            }]}>
                                {getStatusConfig(trackingData.status).label}
                            </Text>
                        </View>
                    </View>
                    
                    {/* Additional Booking Details */}
                    <View style={styles.bookingDetails}>
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="package-variant" size={16} color={colors.text.secondary} />
                            <Text style={styles.detailLabel}>Product:</Text>
                            <Text style={styles.detailValue}>{trackingData.productType}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="weight-kilogram" size={16} color={colors.text.secondary} />
                            <Text style={styles.detailLabel}>Weight:</Text>
                            <Text style={styles.detailValue}>{trackingData.weight}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="calendar-clock" size={16} color={colors.text.secondary} />
                            <Text style={styles.detailLabel}>Pickup Date:</Text>
                            <Text style={styles.detailValue}>
                                {new Date(booking.pickUpDate || new Date()).toLocaleDateString()}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="truck-delivery" size={16} color={colors.text.secondary} />
                            <Text style={styles.detailLabel}>Estimated Delivery:</Text>
                            <Text style={styles.detailValue}>{trackingData.estimatedDelivery}</Text>
                        </View>
                    </View>
                    {isConsolidated && consolidatedRequests && (
                        <View style={styles.consolidatedInfo}>
                            <Text style={styles.consolidatedTitle}>Consolidated Requests:</Text>
                            {consolidatedRequests.map((req: any, index: number) => (
                                <View key={req.id} style={styles.consolidatedItem}>
                                    <Text style={styles.consolidatedItemText}>
                                        • {formatRoute(req.fromLocation, req.toLocation)} ({req.productType}, {req.weight})
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Route Information */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialCommunityIcons name="map-marker-path" size={24} color={colors.secondary} />
                        <Text style={styles.cardTitle}>Route Information</Text>
                    </View>
                    <View style={styles.routeInfo}>
                        <View style={styles.routeItem}>
                            <MaterialCommunityIcons name="map-marker" size={20} color={colors.primary} />
                            <View style={styles.routeText}>
                                <Text style={styles.routeLabel}>Pickup</Text>
                                <LocationDisplay 
                                    location={trackingData.fromLocation || 'Unknown location'} 
                                    style={styles.routeValue}
                                    showIcon={false}
                                />
                            </View>
                        </View>
                        <View style={styles.routeDivider} />
                        <View style={styles.routeItem}>
                            <MaterialCommunityIcons name="map-marker-check" size={20} color={colors.success} />
                            <View style={styles.routeText}>
                                <Text style={styles.routeLabel}>Delivery</Text>
                                <LocationDisplay 
                                    location={trackingData.toLocation || 'Unknown location'} 
                                    style={styles.routeValue}
                                    showIcon={false}
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Transporter Information */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialCommunityIcons name="account-tie" size={24} color={colors.tertiary} />
                        <Text style={styles.cardTitle}>Transporter</Text>
                    </View>
                    {trackingData.transporter?.name && trackingData.transporter.name !== 'N/A' ? (
                        <View style={styles.transporterInfo}>
                            <View style={styles.transporterDetailRow}>
                                <MaterialCommunityIcons name="account" size={16} color={colors.text.secondary} />
                                <Text style={styles.transporterLabel}>Name:</Text>
                                <Text style={styles.transporterValue}>{trackingData.transporter.name}</Text>
                            </View>
                            <View style={styles.transporterDetailRow}>
                                <MaterialCommunityIcons name="phone" size={16} color={colors.text.secondary} />
                                <Text style={styles.transporterLabel}>Phone:</Text>
                                <Text style={styles.transporterValue}>{trackingData.transporter.phone}</Text>
                            </View>
                            <View style={styles.transporterDetailRow}>
                                <MaterialCommunityIcons name="truck" size={16} color={colors.text.secondary} />
                                <Text style={styles.transporterLabel}>Vehicle:</Text>
                                <Text style={styles.transporterValue}>{trackingData.transporter.vehicle}</Text>
                            </View>
                            
                            {/* Communication Buttons */}
                            <View style={styles.communicationButtons}>
                                <TouchableOpacity 
                                    style={styles.communicationButton}
                                    onPress={() => setChatVisible(true)}
                                >
                                    <MaterialCommunityIcons name="message-text" size={20} color={colors.primary} />
                                    <Text style={styles.communicationButtonText}>Chat</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={styles.communicationButton}
                                    onPress={() => setCallVisible(true)}
                                >
                                    <MaterialCommunityIcons name="phone" size={20} color={colors.success} />
                                    <Text style={styles.communicationButtonText}>Call</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.noTransporterInfo}>
                            <MaterialCommunityIcons name="clock-outline" size={32} color={colors.text.light} />
                            <Text style={styles.noTransporterText}>Awaiting Transporter Assignment</Text>
                            <Text style={styles.noTransporterSubtext}>
                                A transporter will be assigned to your booking soon
                            </Text>
                        </View>
                    )}
                </View>

                {/* Real-time Tracking Button */}
                <TouchableOpacity
                    style={styles.trackingButton}
                    onPress={() => (navigation as any).navigate('MapViewScreen', {
                        booking: booking,
                        trackingData: trackingData,
                        isConsolidated: isConsolidated || false,
                        consolidatedRequests: consolidatedRequests || [],
                        isInstant: false
                    })}
                >
                    <MaterialCommunityIcons name="map-marker-radius" size={24} color={colors.white} />
                    <Text style={styles.trackingButtonText}>View Real-time Location</Text>
                </TouchableOpacity>

                {/* Timeline */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialCommunityIcons name="timeline-clock" size={24} color={colors.primary} />
                        <Text style={styles.cardTitle}>Tracking Timeline</Text>
                    </View>
                    <View style={styles.timeline}>
                        {renderStatusTimeline()}
                    </View>
                    
                    {/* Progress Summary */}
                    <View style={styles.progressSummary}>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { 
                                width: trackingData.status === 'delivered' ? '100%' : 
                                      trackingData.status === 'in_transit' ? '75%' :
                                      trackingData.status === 'pickup' ? '50%' :
                                      trackingData.status === 'confirmed' ? '25%' : '10%'
                            }]} />
                        </View>
                        <Text style={styles.progressText}>
                            {trackingData.status === 'delivered' ? 'Completed' : 
                             trackingData.status === 'in_transit' ? 'In Progress' :
                             trackingData.status === 'pickup' ? 'Ready for Pickup' :
                             trackingData.status === 'confirmed' ? 'Confirmed' : 'Processing'}
                        </Text>
                    </View>
                </View>

                {/* Current Location */}
                {trackingData.currentLocation && (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="crosshairs-gps" size={24} color={colors.success} />
                            <Text style={styles.cardTitle}>Current Location</Text>
                        </View>
                        <View style={styles.locationInfo}>
                            <Text style={styles.locationAddress}>{trackingData.currentLocation.address}</Text>
                            <Text style={styles.locationTime}>Last updated: {trackingData.currentLocation.timestamp}</Text>
                        </View>
                    </View>
                )}
            </ScrollView>

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
    headerSpacer: {
        width: 44,
    },
    content: {
        flex: 1,
        padding: spacing.lg,
    },
    scrollContent: {
        paddingBottom: spacing.xl * 2, // Add extra bottom padding to ensure content is fully visible
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
    card: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.md,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
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
    },
    bookingIdContainer: {
        flex: 1,
    },
    bookingId: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: spacing.xs,
    },
    bookingDate: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        borderWidth: 1,
    },
    statusText: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        marginLeft: spacing.xs,
    },
    bookingDetails: {
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    detailLabel: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginLeft: spacing.sm,
        marginRight: spacing.sm,
        fontWeight: '500',
        minWidth: 100,
    },
    detailValue: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        fontWeight: '600',
        flex: 1,
    },
    routeInfo: {
        gap: spacing.sm,
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
        fontSize: fonts.size.md,
        color: colors.text.primary,
        fontWeight: '600',
    },
    routeDivider: {
        height: 1,
        backgroundColor: colors.text.light + '30',
        marginVertical: spacing.xs,
        marginLeft: 10,
    },
    transporterInfo: {
        gap: spacing.sm,
    },
    transporterDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    transporterLabel: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginLeft: spacing.sm,
        marginRight: spacing.sm,
        fontWeight: '500',
        minWidth: 60,
    },
    transporterValue: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        fontWeight: '600',
        flex: 1,
    },
    noTransporterInfo: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
    },
    noTransporterText: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.secondary,
        marginTop: spacing.sm,
        textAlign: 'center',
    },
    noTransporterSubtext: {
        fontSize: fonts.size.sm,
        color: colors.text.light,
        marginTop: spacing.xs,
        textAlign: 'center',
        lineHeight: 20,
    },
    trackingButton: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 12,
        marginBottom: spacing.lg,
    },
    trackingButtonText: {
        color: colors.white,
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        marginLeft: spacing.sm,
    },
    timeline: {
        marginTop: spacing.sm,
    },
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    timelineDot: {
        marginRight: spacing.md,
        marginTop: 2,
    },
    timelineContent: {
        flex: 1,
    },
    timelineLocation: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.primary,
    },
    timelineTime: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginTop: 2,
    },
    timelineDescription: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginTop: 2,
    },
    timelineLine: {
        position: 'absolute',
        left: 10,
        top: 24,
        width: 2,
        height: 20,
    },
    progressSummary: {
        marginTop: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
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
        fontWeight: '600',
        color: colors.primary,
        textAlign: 'center',
    },
    locationInfo: {
        gap: spacing.xs,
    },
    locationAddress: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.primary,
    },
    locationTime: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
    },
    consolidatedInfo: {
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.text.light + '20',
    },
    consolidatedTitle: {
        fontSize: fonts.size.sm,
        fontWeight: 'bold',
        color: colors.secondary,
        marginBottom: spacing.xs,
    },
    consolidatedItem: {
        marginBottom: 2,
    },
    consolidatedItemText: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
    },
    communicationButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
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

export default TrackingScreen;

