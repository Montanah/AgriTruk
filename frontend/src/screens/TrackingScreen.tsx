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
    Alert,
} from 'react-native';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { formatRoute } from '../utils/locationUtils';
import LocationDisplay from '../components/common/LocationDisplay';
import { getDisplayBookingId } from '../utils/unifiedIdSystem';
import RealtimeChatModal from '../components/Chat/RealtimeChatModal';
import { unifiedTrackingService, TrackingData as UnifiedTrackingData } from '../services/unifiedTrackingService';
import { unifiedBookingService } from '../services/unifiedBookingService';
import { API_ENDPOINTS } from '../constants/api';
import { getAuth } from 'firebase/auth';
import VehicleDisplayCard from '../components/common/VehicleDisplayCard';
import { enhancedRatingService } from '../services/enhancedRatingService';
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
    const { booking: initialBooking, isConsolidated, consolidatedRequests, userType } = (route.params as RouteParams) || {};
    const [booking, setBooking] = useState<any>(initialBooking);
    const [trackingData, setTrackingData] = useState<UnifiedTrackingData | null>(null);
    const [loading, setLoading] = useState(false);
    const [chatVisible, setChatVisible] = useState(false);
    const [callVisible, setCallVisible] = useState(false);
    const [isTracking, setIsTracking] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
    const [hasRated, setHasRated] = useState(false);
    const [existingRating, setExistingRating] = useState<any>(null);

    // Get transporter info for communication - prioritize assignedDriver
    // IMPORTANT: For chat, we need USER IDs (Firebase UIDs), not driver IDs (Firestore doc IDs)
    const transporter = booking?.transporter || trackingData?.transporterInfo;
    const assignedDriver = booking?.assignedDriver || transporter?.assignedDriver;
    const commTarget = assignedDriver ? {
        // Priority: Use booking.transporterId (user ID) > assignedDriver.userId > transporter.userId > transporter.id
        id: booking?.transporterId || 
            assignedDriver.userId || 
            transporter?.userId || 
            transporter?.id || 
            'driver-id',
        // Use actual driver name, not generic "Driver"
        name: assignedDriver.name || 
              assignedDriver.driverName || 
              transporter?.name || 
              transporter?.transporterName || 
              'Driver',
        phone: assignedDriver.phone || assignedDriver.driverPhone || transporter?.phone || transporter?.transporterPhone || transporter?.phoneNumber || '+254700000000',
        role: 'driver',
        photo: assignedDriver.photo || assignedDriver.profilePhoto || transporter?.photo || transporter?.profilePhoto
    } : transporter ? {
        // Priority: Use booking.transporterId (user ID) > transporter.userId > transporter.id
        id: booking?.transporterId || 
            transporter.userId || 
            transporter.id || 
            transporter.transporterId || 
            'transporter-id',
        // Use actual transporter name, not generic "Transporter"
        name: transporter.name || 
              transporter.transporterName || 
              transporter.companyName ||
              'Transporter',
        phone: transporter.phone || transporter.transporterPhone || transporter.phoneNumber || '+254700000000',
        role: 'transporter',
        photo: transporter.photo || transporter.profilePhoto
    } : null;

    useEffect(() => {
        if (booking?.id || initialBooking?.id) {
            loadBookingData();
            checkExistingRating();
            // Only auto-refresh if trip is active (started/in transit)
            // We'll check this after initial load and set up interval if needed
        }
        
        // Cleanup function
        return () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        };
    }, [initialBooking?.id, booking?.id]);

    // Check if user has already rated this driver/transporter
    const checkExistingRating = async () => {
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user || !booking?.id) return;

            const transporterId = booking?.assignedDriver?.id || 
                                 booking?.assignedDriver?.driverId ||
                                 booking?.transporter?.id || 
                                 booking?.transporterId;
            
            if (!transporterId) return;

            // Use getUserRatings and filter by bookingId
            const { ratings } = await enhancedRatingService.getUserRatings({ transporterId });
            const userRating = ratings.find((r: any) => r.bookingId === booking.id && r.raterId === user.uid);
            
            if (userRating) {
                setHasRated(true);
                setExistingRating(userRating);
            }
        } catch (error) {
            console.error('Error checking existing rating:', error);
        }
    };

    // Check if trip is completed
    const isTripCompleted = () => {
        const status = booking?.status?.toLowerCase() || '';
        return ['delivered', 'completed', 'finished'].includes(status);
    };

    // Check if user can rate (not transporter/driver rating themselves)
    const canRate = () => {
        const currentUserType = userType || 'shipper';
        return isTripCompleted() && 
               !['transporter', 'driver'].includes(currentUserType) && 
               !hasRated &&
               (booking?.assignedDriver || booking?.transporter);
    };

    // Handle rating submission
    const handleRateDriver = () => {
        if (!booking) return;
        
        const transporterId = booking?.assignedDriver?.id || 
                             booking?.assignedDriver?.driverId ||
                             booking?.transporter?.id || 
                             booking?.transporterId;
        const transporterName = booking?.assignedDriver?.name || 
                               booking?.assignedDriver?.driverName ||
                               booking?.transporter?.name || 
                               booking?.transporterName || 
                               'Driver';
        
        if (!transporterId) {
            Alert.alert('Error', 'Driver/Transporter information not available');
            return;
        }

        // Determine rater role based on user type
        let raterRole = 'client';
        if (userType === 'broker') raterRole = 'broker';
        if (userType === 'business') raterRole = 'business';
        if (userType === 'shipper') raterRole = 'client';

        (navigation as any).navigate('RatingSubmission', {
            transporterId,
            transporterName,
            bookingId: booking?.id || booking?.bookingId,
            tripId: booking?.tripId,
            raterRole,
            existingRating,
        });
    };

    const loadBookingData = async () => {
        try {
            setLoading(true);
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();
            const bookingId = booking?.id || initialBooking?.id || booking?.bookingId || initialBooking?.bookingId;
            
            if (!bookingId) {
                console.error('No booking ID available');
                return;
            }

            // Fetch booking details from backend
            const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${bookingId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                const bookingData = data.booking || data;
                // Ensure booking has all necessary fields for ID display and vehicle/transporter details
                const synthesizedVehicle = bookingData.transporter?.vehicle || {
                    make: bookingData.vehicleMake,
                    model: bookingData.vehicleModel,
                    year: bookingData.vehicleYear,
                    registration: bookingData.vehicleRegistration,
                    type: bookingData.vehicleType,
                    capacity: bookingData.vehicleCapacity,
                    color: bookingData.vehicleColor,
                    vehicleImagesUrl: bookingData.vehiclePhotos ? (Array.isArray(bookingData.vehiclePhotos) ? bookingData.vehiclePhotos : [bookingData.vehiclePhotos]) : undefined,
                    photos: bookingData.vehiclePhotos ? (Array.isArray(bookingData.vehiclePhotos) ? bookingData.vehiclePhotos : [bookingData.vehiclePhotos]) : undefined,
                };

                const synthesizedTransporter = bookingData.transporter || {
                    id: bookingData.transporterId,
                    name: bookingData.transporterName,
                    phone: bookingData.transporterPhone,
                    vehicle: synthesizedVehicle,
                };

                const enrichedBooking = {
                    ...bookingData,
                    transporter: synthesizedTransporter,
                    readableId: bookingData.readableId,
                    bookingType: bookingData.bookingType || bookingData.type,
                    bookingMode: bookingData.bookingMode || (bookingData.type === 'instant' ? 'instant' : 'booking'),
                    createdAt: bookingData.createdAt,
                    bookingId: bookingData.bookingId || bookingData.id,
                    id: bookingData.id || bookingData.bookingId,
                };
                setBooking(enrichedBooking);
                
                // Only try to load tracking data once - don't retry on 404
                if (!trackingData || trackingData.bookingId !== bookingId) {
                    try {
                        const tracking = await unifiedTrackingService.getTrackingData(bookingId, bookingData.userId || 'current-user');
                        if (tracking) {
                            setTrackingData(tracking);
                        } else {
                            // Fallback: derive minimal tracking from booking object
                            setTrackingData({
                                bookingId: bookingId,
                                status: bookingData.status || 'pending',
                                fromLocation: bookingData.fromLocation || bookingData.from,
                                toLocation: bookingData.toLocation || bookingData.to,
                                productType: bookingData.productType || 'Cargo',
                                weight: (bookingData.weightKg ? `${bookingData.weightKg}kg` : (bookingData.weight ? `${bookingData.weight}kg` : 'Unknown')),
                                route: [],
                                currentLocation: null,
                                estimatedDelivery: bookingData.estimatedDuration || 'TBD',
                                transporter: bookingData.transporter ? {
                                    name: bookingData.transporter.name || 'Transporter',
                                    phone: bookingData.transporter.phone || 'N/A',
                                    vehicle: bookingData.transporter.vehicle?.registration || bookingData.transporter.vehicle?.make || 'N/A'
                                } : null,
                            } as any);
                        }
                    } catch (trackingError: any) {
                        // Silently handle 404 - tracking endpoint may not exist yet for pending bookings
                        setTrackingData({
                            bookingId: bookingId,
                            status: bookingData.status || 'pending',
                            fromLocation: bookingData.fromLocation || bookingData.from,
                            toLocation: bookingData.toLocation || bookingData.to,
                            productType: bookingData.productType || 'Cargo',
                            weight: (bookingData.weightKg ? `${bookingData.weightKg}kg` : (bookingData.weight ? `${bookingData.weight}kg` : 'Unknown')),
                            route: [],
                            currentLocation: null,
                            estimatedDelivery: bookingData.estimatedDuration || 'TBD',
                            transporter: bookingData.transporter ? {
                                name: bookingData.transporter.name || 'Transporter',
                                phone: bookingData.transporter.phone || 'N/A',
                                vehicle: bookingData.transporter.vehicle?.registration || bookingData.transporter.vehicle?.make || 'N/A'
                            } : null,
                        } as any);
                    }
                    
                    // Start auto-refresh only if trip is active
                    const isActiveTrip = bookingData.status && ['started', 'in_progress', 'in_transit', 'enroute', 'picked_up'].includes(bookingData.status.toLowerCase());
                    if (isActiveTrip && !refreshInterval) {
                        const interval = setInterval(() => {
                            loadBookingData();
                        }, 30000); // Refresh every 30 seconds for active trips
                        setRefreshInterval(interval);
                    }
                }
            } else {
                console.error('Failed to fetch booking:', response.status);
                // As a last resort, render with existing booking object if we have it
                if (booking) {
                    setTrackingData({
                        bookingId: booking.id,
                        status: booking.status || 'pending',
                        fromLocation: booking.fromLocation,
                        toLocation: booking.toLocation,
                        productType: booking.productType || 'Cargo',
                        weight: booking.weight || 'Unknown',
                        route: [],
                        currentLocation: null,
                        estimatedDelivery: booking.estimatedDuration || 'TBD',
                        transporter: booking.transporter || null,
                    } as any);
                }
            }
        } catch (error) {
            console.error('Error loading booking data:', error);
        } finally {
            setLoading(false);
        }
    };

    const startRealTimeTracking = async () => {
        if (!booking?.id) return;
        
        try {
            setIsTracking(true);
            // Navigate to MapViewScreen for real-time tracking
            (navigation as any).navigate('MapViewScreen', {
                booking: booking,
                trackingData: trackingData,
                isConsolidated: isConsolidated || false,
                consolidatedRequests: consolidatedRequests || [],
                isInstant: booking?.bookingMode === 'instant'
            });
        } catch (error) {
            console.error('Error starting real-time tracking:', error);
            setIsTracking(false);
        }
    };

    // Build status timeline from booking data
    const buildStatusTimeline = (bookingData: any) => {
        const timeline: Array<{ status: string; location: string; time: string; description: string }> = [];
        const now = new Date();
        const status = bookingData.status || 'pending';
        const statusHistory = bookingData.statusHistory || [];
        
        // Sort status history by timestamp
        const sortedHistory = [...statusHistory].sort((a: any, b: any) => {
            const timeA = a.timestamp?._seconds ? a.timestamp._seconds * 1000 : new Date(a.timestamp || 0).getTime();
            const timeB = b.timestamp?._seconds ? b.timestamp._seconds * 1000 : new Date(b.timestamp || 0).getTime();
            return timeA - timeB;
        });

        // Add timeline entries from status history
        sortedHistory.forEach((entry: any, index: number) => {
            const timestamp = entry.timestamp?._seconds 
                ? new Date(entry.timestamp._seconds * 1000)
                : entry.timestamp 
                ? new Date(entry.timestamp)
                : new Date(bookingData.createdAt || now);
            
            let description = '';
            let location = '';
            
            switch (entry.status?.toLowerCase()) {
                case 'pending':
                    description = 'Booking request has been submitted and is awaiting transporter confirmation.';
                    location = 'Booking Created';
                    break;
                case 'accepted':
                    description = 'A transporter has accepted your booking request.';
                    location = 'Booking Accepted';
                    break;
                case 'confirmed':
                    description = 'Booking has been confirmed by the transporter.';
                    location = 'Booking Confirmed';
                    break;
                case 'started':
                case 'picked_up':
                case 'pickup':
                    description = 'Package has been picked up from the origin location.';
                    location = typeof bookingData.fromLocation === 'object' 
                        ? (bookingData.fromLocation.address || 'Pickup Location')
                        : bookingData.fromLocation || 'Pickup Location';
                    break;
                case 'in_progress':
                case 'in_transit':
                case 'enroute':
                    description = 'Package is on its way to the destination.';
                    location = 'In Transit';
                    break;
                case 'delivered':
                    description = 'Package has been delivered successfully.';
                    location = typeof bookingData.toLocation === 'object'
                        ? (bookingData.toLocation.address || 'Delivery Location')
                        : bookingData.toLocation || 'Delivery Location';
                    break;
                case 'cancelled':
                    description = entry.reason || 'Booking has been cancelled.';
                    location = 'Booking Cancelled';
                    break;
                default:
                    description = `Status changed to ${entry.status}.`;
                    location = 'Status Update';
            }

            timeline.push({
                status: 'completed',
                location,
                time: timestamp.toLocaleString(),
                description
            });
        });

        // If no status history, create basic timeline from current status
        if (timeline.length === 0) {
            const createdAt = bookingData.createdAt?._seconds 
                ? new Date(bookingData.createdAt._seconds * 1000)
                : bookingData.createdAt 
                ? new Date(bookingData.createdAt)
                : now;
            
            timeline.push({
                status: 'completed',
                location: 'Booking Created',
                time: createdAt.toLocaleString(),
                description: 'Your booking request has been submitted and is being processed.'
            });

            if (['accepted', 'confirmed', 'started', 'picked_up', 'pickup', 'in_progress', 'in_transit', 'enroute', 'delivered'].includes(status)) {
                const acceptedAt = bookingData.acceptedAt?._seconds 
                    ? new Date(bookingData.acceptedAt._seconds * 1000)
                    : bookingData.acceptedAt 
                    ? new Date(bookingData.acceptedAt)
                    : new Date(createdAt.getTime() + 30 * 60 * 1000); // 30 minutes after creation
                
                timeline.push({
                    status: 'completed',
                    location: 'Booking Accepted',
                    time: acceptedAt.toLocaleString(),
                    description: 'Your booking has been accepted by a transporter.'
                });
            }

            if (['started', 'picked_up', 'pickup', 'in_progress', 'in_transit', 'enroute', 'delivered'].includes(status)) {
                const pickupTime = bookingData.pickUpDate?._seconds
                    ? new Date(bookingData.pickUpDate._seconds * 1000)
                    : bookingData.pickUpDate
                    ? new Date(bookingData.pickUpDate)
                    : bookingData.startedAt?._seconds
                    ? new Date(bookingData.startedAt._seconds * 1000)
                    : bookingData.startedAt
                    ? new Date(bookingData.startedAt)
                    : new Date();
                
                timeline.push({
                    status: 'completed',
                    location: typeof bookingData.fromLocation === 'object'
                        ? (bookingData.fromLocation.address || 'Pickup Location')
                        : bookingData.fromLocation || 'Pickup Location',
                    time: pickupTime.toLocaleString(),
                    description: 'Package has been picked up from the origin location.'
                });
            }

            if (['in_progress', 'in_transit', 'enroute', 'delivered'].includes(status)) {
                timeline.push({
                    status: status === 'delivered' ? 'completed' : 'in_progress',
                    location: 'In Transit',
                    time: status === 'delivered' ? new Date().toLocaleString() : 'Currently',
                    description: 'Package is on its way to the destination.'
                });
            }

            if (status === 'delivered') {
                const deliveredTime = bookingData.completedAt?._seconds
                    ? new Date(bookingData.completedAt._seconds * 1000)
                    : bookingData.completedAt
                    ? new Date(bookingData.completedAt)
                    : new Date();
                
                timeline.push({
                    status: 'completed',
                    location: typeof bookingData.toLocation === 'object'
                        ? (bookingData.toLocation.address || 'Delivery Location')
                        : bookingData.toLocation || 'Delivery Location',
                    time: deliveredTime.toLocaleString(),
                    description: 'Package has been delivered successfully.'
                });
            }
        }

        return timeline;
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

    // No mock data generation - use real API data only
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


    const getStatusConfig = (status: string) => {
        return statusConfig[status] || statusConfig.pending;
    };

    const renderStatusTimeline = () => {
        if (!booking) return null;
        
        const timeline = buildStatusTimeline(booking);
        if (timeline.length === 0) return null;
        
        return timeline.map((step: any, index: number) => (
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
                {index < timeline.length - 1 && (
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

    // Show booking info even without tracking data (for pending bookings)
    if (!trackingData && !booking) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading booking information...</Text>
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
                <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.8}>Track Booking</Text>
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
                            <Text style={styles.bookingId}>#{getDisplayBookingId({
                                ...booking,
                                readableId: booking.readableId,
                                bookingType: booking.bookingType || booking.type,
                                bookingMode: booking.bookingMode || (booking.type === 'instant' ? 'instant' : 'booking'),
                                createdAt: booking.createdAt,
                                bookingId: booking.bookingId || booking.id,
                                id: booking.id || booking.bookingId,
                            })}</Text>
                            <Text style={styles.bookingDate}>
                                Created: {new Date(booking.createdAt || new Date()).toLocaleDateString()}
                            </Text>
                        </View>
                        <View style={[styles.statusBadge, { 
                            backgroundColor: getStatusConfig(booking.status || 'pending').color + '15',
                            borderColor: getStatusConfig(booking.status || 'pending').color + '50',
                            borderWidth: 1.5
                        }]}>
                            <MaterialCommunityIcons
                                name={getStatusConfig(booking.status || 'pending').icon as any}
                                size={18}
                                color={getStatusConfig(booking.status || 'pending').color}
                            />
                            <Text style={[styles.statusText, { 
                                color: getStatusConfig(booking.status || 'pending').color,
                                fontWeight: '700'
                            }]}>
                                {getStatusConfig(booking.status || 'pending').label}
                            </Text>
                        </View>
                    </View>
                    
                    {/* Additional Booking Details */}
                    <View style={styles.bookingDetails}>
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="package-variant" size={16} color={colors.text.secondary} />
                            <Text style={styles.detailLabel}>Product:</Text>
                            <Text style={styles.detailValue}>{booking.productType || 'Unknown'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="weight-kilogram" size={16} color={colors.text.secondary} />
                            <Text style={styles.detailLabel}>Weight:</Text>
                            <Text style={styles.detailValue}>
                                {booking.weightKg ? `${booking.weightKg} kg` : booking.weight || 'Unknown'}
                            </Text>
                        </View>
                        {booking.pickUpDate && (
                            <View style={styles.detailRow}>
                                <MaterialCommunityIcons name="calendar-clock" size={16} color={colors.text.secondary} />
                                <Text style={styles.detailLabel}>Pickup Date:</Text>
                                <Text style={styles.detailValue}>
                                    {(() => {
                                        const pickupDate = booking.pickUpDate?._seconds 
                                            ? new Date(booking.pickUpDate._seconds * 1000)
                                            : booking.pickUpDate 
                                            ? new Date(booking.pickUpDate)
                                            : null;
                                        return pickupDate ? pickupDate.toLocaleString() : 'Not specified';
                                    })()}
                                </Text>
                            </View>
                        )}
                        {booking.estimatedDuration && (
                            <View style={styles.detailRow}>
                                <MaterialCommunityIcons name="truck-delivery" size={16} color={colors.text.secondary} />
                                <Text style={styles.detailLabel}>Estimated Duration:</Text>
                                <Text style={styles.detailValue}>{booking.estimatedDuration}</Text>
                            </View>
                        )}
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
                                    location={booking.fromLocation || 'Unknown location'} 
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
                                    location={booking.toLocation || 'Unknown location'} 
                                    style={styles.routeValue}
                                    showIcon={false}
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Transporter/Driver Information */}
                {(booking.transporterId || booking.transporter || booking.assignedDriver || booking.driver) ? (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="account-tie" size={24} color={colors.tertiary} />
                            <Text style={styles.cardTitle}>Transporter & Driver Details</Text>
                        </View>
                        <View style={styles.transporterInfo}>
                            {/* Company Name - Always show for accepted bookings with driver */}
                            {(() => {
                                const companyName = 
                                    booking.assignedDriver?.companyName || 
                                    booking.assignedDriver?.company?.name ||
                                    booking.driver?.companyName ||
                                    booking.driver?.company?.name ||
                                    booking.transporter?.assignedDriver?.companyName ||
                                    booking.transporter?.assignedDriver?.company?.name ||
                                    booking.transporter?.companyName || 
                                    booking.transporter?.company?.name || 
                                    booking.companyName;
                                
                                if (['accepted', 'confirmed', 'assigned'].includes(booking.status?.toLowerCase()) && 
                                    (booking.assignedDriver || booking.driver || booking.transporter?.assignedDriver) && 
                                    companyName) {
                                    return (
                                        <View style={styles.companyInfo}>
                                            <MaterialCommunityIcons name="office-building" size={16} color={colors.primary} />
                                            <Text style={styles.companyName}>{companyName}</Text>
                                        </View>
                                    );
                                }
                                return null;
                            })()}
                            
                            {/* Driver Details - Show name and phone */}
                            {(booking.assignedDriver || booking.driver || booking.transporter?.assignedDriver) && (
                                <>
                                    <View style={styles.transporterDetailRow}>
                                        <MaterialCommunityIcons name="account" size={16} color={colors.text.secondary} />
                                        <Text style={styles.transporterLabel}>Driver:</Text>
                                        <Text style={styles.transporterValue}>
                                            {booking.assignedDriver?.name || booking.assignedDriver?.driverName || booking.assignedDriver?.firstName && booking.assignedDriver?.lastName ? `${booking.assignedDriver.firstName} ${booking.assignedDriver.lastName}` : booking.driver?.name || booking.driver?.driverName || booking.transporter?.assignedDriver?.name || booking.transporter?.name || booking.transporterName || 'N/A'}
                                        </Text>
                                    </View>
                                    {(booking.assignedDriver?.phone || booking.driver?.phone || booking.transporter?.assignedDriver?.phone) && (
                                        <View style={styles.transporterDetailRow}>
                                            <MaterialCommunityIcons name="phone" size={16} color={colors.text.secondary} />
                                            <Text style={styles.transporterLabel}>Phone:</Text>
                                            <Text style={styles.transporterValue}>
                                                {booking.assignedDriver?.phone || booking.driver?.phone || booking.transporter?.assignedDriver?.phone || 'N/A'}
                                            </Text>
                                        </View>
                                    )}
                                </>
                            )}
                            
                            {/* Transporter Details (if no driver) - Just show name (phone is available for calling via buttons) */}
                            {!booking.assignedDriver && !booking.driver && !booking.transporter?.assignedDriver && (booking.transporter?.name || booking.transporterName) && (
                                <View style={styles.transporterDetailRow}>
                                    <MaterialCommunityIcons name="account" size={16} color={colors.text.secondary} />
                                    <Text style={styles.transporterLabel}>Name:</Text>
                                    <Text style={styles.transporterValue}>
                                        {booking.transporter?.name || booking.transporterName || 'N/A'}
                                    </Text>
                                </View>
                            )}
                            {booking.transporter?.rating && (
                                <View style={styles.transporterDetailRow}>
                                    <MaterialCommunityIcons name="star" size={16} color={colors.warning} />
                                    <Text style={styles.transporterLabel}>Rating:</Text>
                                    <Text style={styles.transporterValue}>
                                        {booking.transporter?.rating.toFixed(1)} ⭐
                                    </Text>
                                </View>
                            )}
                            
                            {/* Vehicle Information - Always show for accepted bookings */}
                            {['accepted', 'confirmed', 'assigned'].includes(booking.status?.toLowerCase()) && (
                                <View style={styles.vehicleSection}>
                                    <Text style={styles.vehicleSectionTitle}>Vehicle Details</Text>
                                    {(() => {
                                        const vehicle = 
                                            booking.assignedDriver?.assignedVehicle ||
                                            booking.assignedDriver?.vehicle ||
                                            booking.driver?.assignedVehicle ||
                                            booking.driver?.vehicle ||
                                            booking.transporter?.assignedVehicle ||
                                            booking.transporter?.assignedDriver?.assignedVehicle ||
                                            booking.transporter?.assignedDriver?.vehicle ||
                                            booking.transporter?.vehicle ||
                                            booking.vehicle;
                                        
                                        const vehicleData = vehicle || {
                                            make: booking.vehicleMake,
                                            model: booking.vehicleModel,
                                            year: booking.vehicleYear,
                                            registration: booking.vehicleRegistration,
                                            type: booking.vehicleType,
                                            capacity: booking.vehicleCapacity,
                                            color: booking.vehicleColor,
                                            vehicleImagesUrl: booking.vehiclePhotos ? (Array.isArray(booking.vehiclePhotos) ? booking.vehiclePhotos : [booking.vehiclePhotos]) : undefined,
                                            photos: booking.vehiclePhotos ? (Array.isArray(booking.vehiclePhotos) ? booking.vehiclePhotos : [booking.vehiclePhotos]) : undefined,
                                        };
                                        
                                        return (
                                            <VehicleDisplayCard 
                                                vehicle={vehicleData}
                                                showImages={true}
                                                compact={false}
                                            />
                                        );
                                    })()}
                                </View>
                            )}
                            
                            {/* Communication Buttons - Only show for accepted/confirmed/assigned bookings */}
                            {['accepted', 'confirmed', 'assigned'].includes(booking?.status?.toLowerCase()) && commTarget && (
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
                            )}

                            {/* Rating Button - Show for completed trips */}
                            {canRate() && (
                                <TouchableOpacity 
                                    style={styles.rateButton}
                                    onPress={handleRateDriver}
                                >
                                    <MaterialCommunityIcons name="star" size={20} color={colors.white} />
                                    <Text style={styles.rateButtonText}>Rate Driver</Text>
                                </TouchableOpacity>
                            )}
                            
                            {/* Report Issue Button */}
                            <TouchableOpacity 
                                style={styles.reportButton}
                                onPress={() => navigation.navigate('CreateDispute' as never, { bookingId: booking?.id || booking?.bookingId } as never)}
                            >
                                <MaterialCommunityIcons name="alert-circle" size={20} color={colors.error} />
                                <Text style={styles.reportButtonText}>Report Issue</Text>
                            </TouchableOpacity>

                            {hasRated && (
                                <View style={styles.ratedButton}>
                                    <MaterialCommunityIcons name="star-check" size={20} color={colors.success} />
                                    <Text style={styles.ratedButtonText}>Rated</Text>
                                </View>
                            )}
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

                {booking.transporterId && ['started', 'in_progress', 'in_transit', 'enroute', 'picked_up'].includes(booking.status?.toLowerCase()) && (
                    <TouchableOpacity
                        style={styles.trackingButton}
                        onPress={() => (navigation as any).navigate('MapViewScreen', {
                            booking: booking,
                            trackingData: trackingData,
                            isConsolidated: isConsolidated || false,
                            consolidatedRequests: consolidatedRequests || [],
                            isInstant: booking?.bookingMode === 'instant',
                            userType: userType
                        })}
                    >
                        <MaterialCommunityIcons name="map-marker-radius" size={24} color={colors.white} />
                        <Text style={styles.trackingButtonText}>View Real-time Location</Text>
                    </TouchableOpacity>
                )}

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
                                width: booking.status === 'delivered' ? '100%' : 
                                      ['in_progress', 'in_transit', 'enroute'].includes(booking.status) ? '75%' :
                                      ['started', 'picked_up', 'pickup'].includes(booking.status) ? '50%' :
                                      ['accepted', 'confirmed'].includes(booking.status) ? '25%' : '10%'
                            }]} />
                        </View>
                        <Text style={styles.progressText}>
                            {booking.status === 'delivered' ? 'Completed' : 
                             ['in_progress', 'in_transit', 'enroute'].includes(booking.status) ? 'In Progress' :
                             ['started', 'picked_up', 'pickup'].includes(booking.status) ? 'Ready for Pickup' :
                             ['accepted', 'confirmed'].includes(booking.status) ? 'Confirmed' : 'Processing'}
                        </Text>
                    </View>
                </View>

                {/* Current Location - Show if trip has started */}
                {trackingData?.currentLocation && ['started', 'in_progress', 'in_transit', 'enroute', 'picked_up'].includes(booking.status?.toLowerCase()) && (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="crosshairs-gps" size={24} color={colors.success} />
                            <Text style={styles.cardTitle}>Current Location</Text>
                        </View>
                        <View style={styles.locationInfo}>
                            <LocationDisplay 
                                location={trackingData.currentLocation} 
                                style={styles.locationAddress}
                                showIcon={false}
                            />
                            <Text style={styles.locationTime}>
                                Last updated: {trackingData.currentLocation.timestamp || new Date().toLocaleString()}
                            </Text>
                        </View>
                    </View>
                )}
            </ScrollView>

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
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primary,
        flex: 1,
        marginRight: 8,
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
    companyInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.sm,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        backgroundColor: colors.primary + '10',
        borderRadius: 6,
    },
    companyName: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.primary,
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
    rateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.secondary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 8,
        marginTop: spacing.md,
    },
    rateButtonText: {
        color: colors.white,
        fontSize: fonts.size.md,
        fontWeight: '600',
        marginLeft: spacing.sm,
    },
    ratedButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.success + '20',
        borderWidth: 1,
        borderColor: colors.success,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 8,
        marginTop: spacing.md,
    },
    ratedButtonText: {
        color: colors.success,
        fontSize: fonts.size.md,
        fontWeight: '600',
        marginLeft: spacing.sm,
    },
    reportButton: {
        backgroundColor: colors.white,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        borderWidth: 1,
        borderColor: colors.error,
        marginTop: spacing.sm,
    },
    reportButtonText: {
        color: colors.error,
        fontFamily: fonts.family.medium,
        fontSize: fonts.size.sm,
    },
    vehicleSection: {
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    vehicleSectionTitle: {
        fontSize: fonts.size.sm,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.sm,
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

