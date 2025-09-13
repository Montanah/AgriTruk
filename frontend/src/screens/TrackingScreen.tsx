import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { API_ENDPOINTS } from '../constants/api';

// Mock data removed - now using real API calls

const statusConfig = {
    pending: { color: colors.primary, icon: 'clock-outline', label: 'Pending' },
    confirmed: { color: colors.secondary, icon: 'check-circle-outline', label: 'Confirmed' },
    pickup: { color: colors.tertiary, icon: 'package-variant', label: 'Pickup' },
    in_transit: { color: colors.success, icon: 'truck-delivery', label: 'In Transit' },
    delivered: { color: colors.success, icon: 'check-circle', label: 'Delivered' },
    cancelled: { color: colors.error, icon: 'close-circle', label: 'Cancelled' },
};

const TrackingScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { booking, isConsolidated, consolidatedRequests } = route.params || {};
    const [trackingData, setTrackingData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (booking?.id) {
            fetchTrackingData(booking.id);
        }
    }, [booking]);

    const fetchTrackingData = async (bookingId: string) => {
        setLoading(true);
        try {
            const { getAuth } = require('firebase/auth');
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();
            const res = await fetch(`${API_ENDPOINTS.BOOKINGS}/${bookingId}/tracking`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (res.ok) {
                const data = await res.json();
                setTrackingData(data.trackingData || data);
            }
        } catch (error) {
            console.error('Error fetching tracking data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusConfig = (status: string) => {
        return statusConfig[status] || statusConfig.pending;
    };

    const renderStatusTimeline = () => {
        if (!trackingData?.route) return null;
        return trackingData.route.map((step, index) => (
            <View key={index} style={styles.timelineItem}>
                <View style={styles.timelineDot}>
                    <MaterialCommunityIcons
                        name={step.status === 'completed' ? 'check-circle' : step.status === 'in_progress' ? 'progress-clock' : 'circle-outline'}
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
                        <Text style={styles.bookingId}>#{trackingData.bookingId}</Text>
                        <View style={styles.statusBadge}>
                            <MaterialCommunityIcons
                                name={getStatusConfig(trackingData.status).icon}
                                size={16}
                                color={getStatusConfig(trackingData.status).color}
                            />
                            <Text style={[styles.statusText, { color: getStatusConfig(trackingData.status).color }]}>
                                {getStatusConfig(trackingData.status).label}
                            </Text>
                        </View>
                    </View>
                    {isConsolidated && consolidatedRequests && (
                        <View style={styles.consolidatedInfo}>
                            <Text style={styles.consolidatedTitle}>Consolidated Requests:</Text>
                            {consolidatedRequests.map((req, index) => (
                                <View key={req.id} style={styles.consolidatedItem}>
                                    <Text style={styles.consolidatedItemText}>
                                        • {req.fromLocation} → {req.toLocation} ({req.productType}, {req.weight})
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
                                <Text style={styles.routeValue}>{trackingData.pickupLocation}</Text>
                            </View>
                        </View>
                        <View style={styles.routeDivider} />
                        <View style={styles.routeItem}>
                            <MaterialCommunityIcons name="map-marker-check" size={20} color={colors.success} />
                            <View style={styles.routeText}>
                                <Text style={styles.routeLabel}>Delivery</Text>
                                <Text style={styles.routeValue}>{trackingData.deliveryLocation}</Text>
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
                    <View style={styles.transporterInfo}>
                        <Text style={styles.transporterName}>{trackingData.transporter.name}</Text>
                        <Text style={styles.transporterPhone}>{trackingData.transporter.phone}</Text>
                        <Text style={styles.transporterVehicle}>{trackingData.transporter.vehicle}</Text>
                    </View>
                </View>

                {/* Real-time Tracking Button */}
                <TouchableOpacity
                    style={styles.trackingButton}
                    onPress={() => navigation.navigate('MapViewScreen', {
                        booking: booking,
                        trackingData: trackingData,
                        isConsolidated: isConsolidated,
                        consolidatedRequests: consolidatedRequests
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
        borderRadius: 12,
        padding: spacing.lg,
        marginBottom: spacing.md,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
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
    bookingId: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.primary,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 16,
    },
    statusText: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        marginLeft: spacing.xs,
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
        gap: spacing.xs,
    },
    transporterName: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    transporterPhone: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
    },
    transporterVehicle: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
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
});

export default TrackingScreen;

