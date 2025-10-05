import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import { getAuth } from 'firebase/auth';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { API_ENDPOINTS } from '../constants/api';
import { getLocationName, formatRoute, getLocationNameSync } from '../utils/locationUtils';
import LocationDisplay from '../components/common/LocationDisplay';
import { getDisplayBookingId, getBookingType } from '../utils/bookingIdGenerator';
import { chatService } from '../services/chatService';
import { enhancedNotificationService } from '../services/enhancedNotificationService';
import locationService from '../services/locationService';

interface RouteParams {
    transporterType?: 'company' | 'individual' | 'broker';
}

const TransporterBookingManagementScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const params = route.params as RouteParams;
    const transporterType = params?.transporterType || 'company';

    const [activeTab, setActiveTab] = useState<'accepted' | 'route_loads' | 'history'>('accepted');
    const [jobStatusFilter, setJobStatusFilter] = useState<'all' | 'pending' | 'in_transit' | 'completed'>('all');
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [showLoadDetails, setShowLoadDetails] = useState(false);
    const [selectedLoad, setSelectedLoad] = useState<any>(null);
    
    // Real data from API
    const [acceptedJobs, setAcceptedJobs] = useState<any[]>([]);
    const [routeLoads, setRouteLoads] = useState<any[]>([]);
    const [completedJobs, setCompletedJobs] = useState<any[]>([]);
    
    // Current route for intelligent matching
    const [currentRoute, setCurrentRoute] = useState<{
        from: { name: string; coordinates: { lat: number; lng: number } };
        to: { name: string; coordinates: { lat: number; lng: number } };
        waypoints?: Array<{ name: string; coordinates: { lat: number; lng: number } }>;
    } | null>(null);
    
    // Current location for route-based filtering
    const [currentLocation, setCurrentLocation] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);
    
    // Enhanced filtering states
    const [sortBy, setSortBy] = useState<'distance' | 'price' | 'urgency' | 'pickup_time'>('distance');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    
    // Advanced filtering states
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        // Route filters
        fromLocation: '',
        toLocation: '',
        routeType: 'all', // all, short, medium, long
        
        // Cargo filters
        cargoType: 'all', // all, perishable, special, general
        productType: '',
        weightRange: { min: '', max: '' },
        
        // Special requirements
        requiresRefrigeration: false,
        requiresHumidityControl: false,
        isPerishable: false,
        isSpecialCargo: false,
        specialRequirements: [] as string[],
        
        // Service type
        serviceType: 'all', // all, agriTRUK, cargoTRUK
        
        // Time filters
        pickupDate: '',
        deliveryDate: '',
        timeRange: 'all', // all, today, tomorrow, this_week, next_week
        
        // Price filters
        priceRange: { min: '', max: '' },
        
        // Status filters
        status: 'all', // all, pending, confirmed, in_transit, delivered, cancelled
    });

    // Real data from API
    const [allInstantRequests, setAllInstantRequests] = useState<any[]>([]);
    const [allRouteLoads, setAllRouteLoads] = useState<any[]>([]);
    const [allBookings, setAllBookings] = useState<any[]>([]);
    const [currentTransporter, setCurrentTransporter] = useState<any>(null);

    // Fetch transporter profile and booking data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Get user token for API calls
                const { getAuth } = require('firebase/auth');
                const auth = getAuth();
                const currentUser = auth.currentUser;
                if (!currentUser) {
                    setLoading(false);
                    return;
                }

                const token = await currentUser.getIdToken();

                // Fetch real data from API
                const instantRequestsRes = await fetch(`${API_ENDPOINTS.BOOKINGS}/requests`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                if (instantRequestsRes.ok) {
                    const instantRequestsData = await instantRequestsRes.json();
                    setAllInstantRequests(instantRequestsData.requests || []);
                }

                const routeLoadsRes = await fetch(`${API_ENDPOINTS.BOOKINGS}/transporters/route-loads`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                if (routeLoadsRes.ok) {
                    const routeLoadsData = await routeLoadsRes.json();
                    setAllRouteLoads(routeLoadsData.routeLoads || []);
                }

                const bookingsRes = await fetch(`${API_ENDPOINTS.BOOKINGS}/transporter/${currentUser.uid}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                if (bookingsRes.ok) {
                    const bookingsData = await bookingsRes.json();
                    setAllBookings(bookingsData.bookings || []);
                }

                // Fetch transporter profile - check if user is company or individual
                try {
                    // Try company endpoint first (for company transporters)
                    const companyRes = await fetch(`${API_ENDPOINTS.COMPANIES}/transporter/${user.uid}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    });
                    if (companyRes.ok) {
                        const companyData = await companyRes.json();
                        setCurrentTransporter(companyData);
                    } else {
                        // Fallback to individual transporter endpoint
                        const transporterRes = await fetch(`${API_ENDPOINTS.TRANSPORTERS}/profile/me`, {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                            },
                        });
                        if (transporterRes.ok) {
                            const transporterData = await transporterRes.json();
                            setCurrentTransporter(transporterData);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching transporter profile:', error);
                }

                // TODO: Uncomment when backend endpoints are ready
                // // Fetch current transporter profile
                // const transporterData = await apiRequest('/transporters/profile/me');
                // setCurrentTransporter(transporterData);

                // // Fetch instant requests
                // const instantRequests = await apiRequest('/bookings/requests');
                // setAllInstantRequests(instantRequests || []);

                // // Fetch route loads
                // const routeLoads = await apiRequest('/bookings/transporters/route-loads');
                // setAllRouteLoads(routeLoads || []);

                // // Fetch bookings
                // const bookings = await apiRequest(`/bookings/transporter/${user.uid}`);
                // setAllBookings(bookings || []);

            } catch (error) {
                console.error('Failed to fetch booking data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        
        // Get current location for route-based filtering (optional)
        const getCurrentLocation = async () => {
            try {
                // Check if locationService is available
                if (!locationService || typeof locationService.getCurrentLocation !== 'function') {
                    console.warn('LocationService not available, using default location');
                    setCurrentLocation({
                        latitude: -1.2921,
                        longitude: 36.8219,
                    });
                    return;
                }

                const location = await locationService.getCurrentLocation();
                if (location) {
                    setCurrentLocation({
                        latitude: location.latitude,
                        longitude: location.longitude,
                    });
                    console.log('Current location set:', location);
                } else {
                    console.warn('No location data received, using default location');
                    setCurrentLocation({
                        latitude: -1.2921,
                        longitude: 36.8219,
                    });
                }
            } catch (error) {
                console.error('Error getting current location:', error);
                // Set a default location (Nairobi) if location fails
                setCurrentLocation({
                    latitude: -1.2921,
                    longitude: 36.8219,
                });
            }
        };
        
        // Call getCurrentLocation asynchronously to not block the main flow
        getCurrentLocation().catch(error => {
            console.error('Failed to get current location:', error);
            setCurrentLocation({
                latitude: -1.2921,
                longitude: 36.8219,
            });
        });
    }, []);

    // Function to check if transporter can handle a request
    const canTransporterHandleRequest = (transporter: any, request: any) => {
        if (!transporter || !request) return false;

        // Check if transporter can handle the service type
        if (request.serviceType === 'agriTRUK' && !transporter.canHandle?.includes('agri')) {
            return false;
        }
        if (request.serviceType === 'cargoTRUK' && !transporter.canHandle?.includes('cargo')) {
            return false;
        }

        // Check perishable requirements (boolean structure)
        if (request.isPerishable && request.perishableSpecs?.includes('refrigerated') && !transporter.refrigeration) {
            return false;
        }
        if (request.isPerishable && request.perishableSpecs?.includes('humidity') && !transporter.humidityControl) {
            return false;
        }

        // Check special cargo requirements (boolean structure)
        if (request.isSpecialCargo) {
            for (const requirement of request.specialCargoSpecs || []) {
                if (!transporter.specialCargo?.includes(requirement) && !transporter.specialFeatures?.includes(requirement)) {
                    return false;
                }
            }
        }

        // Check perishable specs
        if (request.isPerishable) {
            for (const requirement of request.perishableSpecs || []) {
                if (!transporter.perishableSpecs?.includes(requirement)) {
                    return false;
                }
            }
        }

        return true;
    };

    // Advanced filtering function
    const applyAdvancedFilters = (requests: any[]) => {
        return requests.filter(request => {
            // Route filters
            if (filters.fromLocation && !request.fromLocation?.toLowerCase().includes(filters.fromLocation.toLowerCase())) {
                return false;
            }
            if (filters.toLocation && !request.toLocation?.toLowerCase().includes(filters.toLocation.toLowerCase())) {
                return false;
            }
            
            // Cargo type filters
            if (filters.cargoType !== 'all') {
                if (filters.cargoType === 'perishable' && !request.isPerishable) return false;
                if (filters.cargoType === 'special' && !request.isSpecialCargo) return false;
                if (filters.cargoType === 'general' && (request.isPerishable || request.isSpecialCargo)) return false;
            }
            
            // Product type filter
            if (filters.productType && !request.productType?.toLowerCase().includes(filters.productType.toLowerCase())) {
                return false;
            }
            
            // Weight range filter
            if (filters.weightRange.min && parseFloat(request.weight) < parseFloat(filters.weightRange.min)) {
                return false;
            }
            if (filters.weightRange.max && parseFloat(request.weight) > parseFloat(filters.weightRange.max)) {
                return false;
            }
            
            // Special requirements filters
            if (filters.requiresRefrigeration && request.isPerishable && !request.perishableSpecs?.includes('refrigerated')) {
                return false;
            }
            if (filters.requiresHumidityControl && request.isPerishable && !request.perishableSpecs?.includes('humidity')) {
                return false;
            }
            if (filters.isPerishable && !request.isPerishable) return false;
            if (filters.isSpecialCargo && !request.isSpecialCargo) return false;
            
            // Service type filter
            if (filters.serviceType !== 'all' && request.serviceType !== filters.serviceType) {
                return false;
            }
            
            // Price range filter
            if (filters.priceRange.min && parseFloat(request.price || 0) < parseFloat(filters.priceRange.min)) {
                return false;
            }
            if (filters.priceRange.max && parseFloat(request.price || 0) > parseFloat(filters.priceRange.max)) {
                return false;
            }
            
            // Status filter
            if (filters.status !== 'all' && request.status !== filters.status) {
                return false;
            }
            
            return true;
        });
    };

    // Filter requests based on transporter capabilities and advanced filters
    const filteredRequests = useMemo(() => {
        if (!currentTransporter) return [];
        const capabilityFiltered = allInstantRequests.filter(request => {
            return canTransporterHandleRequest(currentTransporter, request);
        });
        return applyAdvancedFilters(capabilityFiltered);
    }, [allInstantRequests, currentTransporter, filters]);

    const filteredBookings = useMemo(() => {
        if (!currentTransporter) return [];
        return allBookings.filter(booking => {
            return canTransporterHandleRequest(currentTransporter, booking);
        });
    }, [allBookings, currentTransporter]);

    const filteredRouteLoads = useMemo(() => {
        if (!currentTransporter) return [];
        const transporterFiltered = allRouteLoads.filter(load => {
            return canTransporterHandleRequest(currentTransporter, load);
        });
        return filterRouteLoadsByLocation(transporterFiltered);
    }, [allRouteLoads, currentTransporter, currentLocation]);

    // Show loading state AFTER all hooks
    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <LinearGradient
                    colors={[colors.primary, colors.primaryDark, colors.secondary, colors.background]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0.2, y: 0 }}
                    end={{ x: 0.8, y: 1 }}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.white} />
                    <Text style={styles.loadingText}>Loading booking data...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Function to get capability mismatch reasons
    const getCapabilityMismatchReasons = (request: any) => {
        const reasons = [];

        if (request.serviceType === 'agriTRUK' && !currentTransporter?.canHandle.includes('agri')) {
            reasons.push('Agri transport not supported');
        }
        if (request.serviceType === 'cargoTRUK' && !currentTransporter?.canHandle.includes('cargo')) {
            reasons.push('Cargo transport not supported');
        }

        if (request.specialRequirements.includes('refrigerated') && !currentTransporter?.refrigeration) {
            reasons.push('Refrigeration not available');
        }
        if (request.specialRequirements.includes('humidity') && !currentTransporter?.humidityControl) {
            reasons.push('Humidity control not available');
        }

        const specialCargoRequirements = request.specialRequirements.filter((req: string) =>
            ['fragile', 'oversized', 'hazardous', 'temperature', 'highvalue', 'livestock', 'bulk'].includes(req)
        );

        for (const requirement of specialCargoRequirements) {
            if (!currentTransporter?.specialCargo.includes(requirement) && !currentTransporter?.specialFeatures.includes(requirement)) {
                reasons.push(`${requirement.charAt(0).toUpperCase() + requirement.slice(1)} handling not supported`);
            }
        }

        return reasons;
    };

    const getCurrentLocation = async () => {
        try {
            const { getCurrentPositionAsync, requestForegroundPermissionsAsync } = require('expo-location');
            
            const { status } = await requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('Location permission denied');
                return;
            }

            const location = await getCurrentPositionAsync({});
            setCurrentLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });
        } catch (error) {
            console.error('Error getting location:', error);
        }
    };

    const filterRouteLoadsByLocation = (loads: any[]) => {
        if (!currentLocation) return loads;
        
        return loads.filter(load => {
            // Check if the load's route is along the transporter's current route
            const loadFromCoords = getCoordinatesFromLocation(load.fromLocation);
            const loadToCoords = getCoordinatesFromLocation(load.toLocation);
            
            if (!loadFromCoords || !loadToCoords) return false;
            
            // Calculate distance from current location to pickup point
            const distanceToPickup = calculateDistance(currentLocation, loadFromCoords);
            
            // Only show loads within 50km of current location
            return distanceToPickup <= 50;
        });
    };

    const getCoordinatesFromLocation = (locationString: string) => {
        // This would typically use a geocoding service
        // For now, return mock coordinates based on location string
        if (locationString.toLowerCase().includes('nairobi')) {
            return { latitude: -1.2921, longitude: 36.8219 };
        } else if (locationString.toLowerCase().includes('mombasa')) {
            return { latitude: -4.0435, longitude: 39.6682 };
        } else if (locationString.toLowerCase().includes('kisumu')) {
            return { latitude: -0.0917, longitude: 34.7680 };
        }
        return null;
    };

    const calculateDistance = (point1: any, point2: any) => {
        const R = 6371; // Earth's radius in km
        const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
        const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await getCurrentLocation();
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setRefreshing(false);
    };

    const handleAcceptRequest = async (request: any) => {
        setAcceptingId(request.id);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Create chat room for communication
            try {
                const auth = getAuth();
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                const chatRoom = await chatService.getOrCreateChatRoom(
                    request.id,
                    user.uid, // Use actual transporter ID from auth
                    request.userId || request.client?.id // Use actual client ID
                );

                // Send notification to client about request acceptance
                try {
                    await enhancedNotificationService.sendNotification(
                        'instant_request_accepted',
                        request.userId || request.client?.id, // Use actual client ID
                        {
                            requestId: request.id,
                            transporterName: 'You', // This should come from user profile
                            pickupLocation: request.fromLocation || 'Unknown Location',
                            deliveryLocation: request.toLocation || 'Unknown Location',
                        }
                    );
                } catch (notificationError) {
                    console.warn('Failed to send notification:', notificationError);
                    // Don't fail the job acceptance if notification fails
                }
                
                // Remove from appropriate list based on request type
                if (request.type === 'instant' || request.type === 'instant-request') {
                    setAllInstantRequests(prev => prev.filter(req => req.id !== request.id));
                } else if (request.type === 'booking') {
                    setAllBookings(prev => prev.filter(req => req.id !== request.id));
                } else {
                    setAllRouteLoads(prev => prev.filter(req => req.id !== request.id));
                }

                // Check if transporter already has active requests (consolidation)
                const hasActiveRequests = filteredRequests.length > 0 || filteredBookings.length > 0 || filteredRouteLoads.length > 0;

                if (hasActiveRequests) {
                    Alert.alert(
                        'Request Accepted! 🎉',
                        'You can now communicate with the client directly.',
                        [
                            {
                                text: 'Continue',
                                onPress: () => {
                                    // Request already moved
                                }
                            },
                            {
                                text: 'Start Chat',
                                onPress: () => {
                                    // Navigate to chat screen
                                    (navigation as any).navigate('ChatScreen', {
                                        roomId: chatRoom.id,
                                        bookingId: request.id,
                                        transporterName: 'You', // This should come from user profile
                                        clientName: request.client?.name || 'Client',
                                        transporterPhone: 'your-phone', // This should come from user profile
                                        clientPhone: request.client?.phone,
                                        userType: 'transporter'
                                    });
                                }
                            }
                        ]
                    );
                } else {
                    Alert.alert(
                        'Request Accepted! 🎉',
                        'You can now communicate with the client directly.',
                        [
                            {
                                text: 'Continue',
                                onPress: () => {
                                    // Request already moved
                                }
                            },
                            {
                                text: 'Start Chat',
                                onPress: () => {
                                    // Navigate to chat screen
                                    (navigation as any).navigate('ChatScreen', {
                                        roomId: chatRoom.id,
                                        bookingId: request.id,
                                        transporterName: 'You', // This should come from user profile
                                        clientName: request.client?.name || 'Client',
                                        transporterPhone: 'your-phone', // This should come from user profile
                                        clientPhone: request.client?.phone,
                                        userType: 'transporter'
                                    });
                                }
                            }
                        ]
                    );
                }
            } catch (chatError) {
                console.error('Error creating chat room:', chatError);
                // Fallback to original behavior
                if (request.type === 'instant' || request.type === 'instant-request') {
                    setAllInstantRequests(prev => prev.filter(req => req.id !== request.id));
                } else if (request.type === 'booking') {
                    setAllBookings(prev => prev.filter(req => req.id !== request.id));
                } else {
                    setAllRouteLoads(prev => prev.filter(req => req.id !== request.id));
                }
                Alert.alert('Success', `Request ${request.id} accepted successfully!`);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to accept request. Please try again.');
        } finally {
            setAcceptingId(null);
        }
    };

    const handleRejectRequest = async (request: any) => {
        setRejectingId(request.id);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            setAllInstantRequests(prev => prev.filter(req => req.id !== request.id));
            Alert.alert('Request Rejected', `Request ${request.id} has been rejected.`);
        } catch (error) {
            Alert.alert('Error', 'Failed to reject request. Please try again.');
        } finally {
            setRejectingId(null);
        }
    };

    const handleAcceptLoad = async (load: any) => {
        setAcceptingId(load.id);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            setAllRouteLoads(prev => prev.filter(l => l.id !== load.id));

            Alert.alert('Load Accepted', `Load ${load.id} has been added to your route!`);
        } catch (error) {
            Alert.alert('Error', 'Failed to accept load. Please try again.');
        } finally {
            setAcceptingId(null);
        }
    };

    const getUrgencyIcon = (urgency?: string) => {
        if (!urgency) return 'clock';
        switch (urgency.toLowerCase()) {
            case 'high':
                return 'fire';
            case 'medium':
                return 'clock';
            case 'low':
                return 'clock-outline';
            default:
                return 'clock';
        }
    };

    const getUrgencyColor = (urgency?: string) => {
        if (!urgency) return colors.warning;
        switch (urgency.toLowerCase()) {
            case 'high':
                return colors.error;
            case 'medium':
                return colors.warning;
            case 'low':
                return colors.success;
            default:
                return colors.warning;
        }
    };

    // Render functions for new job management system
    const renderAcceptedJob = ({ item }: { item: any }) => (
        <View style={styles.jobCard}>
            <View style={styles.jobHeader}>
                <View style={styles.jobInfo}>
                    <Text style={styles.jobId}>#{getDisplayBookingId(item)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getJobStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getJobStatusColor(item.status) }]}>
                            {item.status?.toUpperCase() || 'PENDING'}
                        </Text>
                    </View>
                </View>
                <Text style={styles.jobValue}>KES {item.value?.toLocaleString() || '0'}</Text>
            </View>
            
            <View style={styles.routeInfo}>
                <View style={styles.routeItem}>
                    <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
                    <LocationDisplay location={item.fromLocation} style={styles.routeText} showIcon={false} />
                </View>
                <View style={styles.routeArrow}>
                    <MaterialCommunityIcons name="arrow-right" size={16} color={colors.text.light} />
                </View>
                <View style={styles.routeItem}>
                    <MaterialCommunityIcons name="map-marker" size={16} color={colors.error} />
                    <LocationDisplay location={item.toLocation} style={styles.routeText} showIcon={false} />
                </View>
            </View>
            
            <View style={styles.jobDetails}>
                <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="package-variant" size={14} color={colors.text.secondary} />
                    <Text style={styles.detailText}>{item.productType || 'General Cargo'}</Text>
                </View>
                <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="weight" size={14} color={colors.text.secondary} />
                    <Text style={styles.detailText}>{item.weightKg || 0} kg</Text>
                </View>
                <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="clock" size={14} color={colors.text.secondary} />
                    <Text style={styles.detailText}>
                        {item.pickupDate ? new Date(item.pickupDate).toLocaleDateString() : 'ASAP'}
                    </Text>
                </View>
            </View>
            
            <View style={styles.jobActions}>
                <TouchableOpacity style={[styles.actionButton, styles.startButton]}>
                    <MaterialCommunityIcons name="play" size={16} color={colors.white} />
                    <Text style={styles.actionButtonText}>Start Trip</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.completeButton]}>
                    <MaterialCommunityIcons name="check" size={16} color={colors.white} />
                    <Text style={styles.actionButtonText}>Complete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderRouteLoad = ({ item }: { item: any }) => (
        <View style={styles.loadCard}>
            <View style={styles.loadHeader}>
                <View style={styles.loadInfo}>
                    <Text style={styles.loadId}>#{getDisplayBookingId(item)}</Text>
                    <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(item.urgency) + '20' }]}>
                        <Text style={[styles.urgencyText, { color: getUrgencyColor(item.urgency) }]}>
                            {item.urgency?.toUpperCase() || 'MEDIUM'}
                        </Text>
                    </View>
                </View>
                <Text style={styles.loadValue}>KES {item.cost?.toLocaleString() || '0'}</Text>
            </View>
            
            <View style={styles.routeInfo}>
                <View style={styles.routeItem}>
                    <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
                    <LocationDisplay location={item.fromLocation} style={styles.routeText} showIcon={false} />
                </View>
                <View style={styles.routeArrow}>
                    <MaterialCommunityIcons name="arrow-right" size={16} color={colors.text.light} />
                </View>
                <View style={styles.routeItem}>
                    <MaterialCommunityIcons name="map-marker" size={16} color={colors.error} />
                    <LocationDisplay location={item.toLocation} style={styles.routeText} showIcon={false} />
                </View>
            </View>
            
            <View style={styles.loadDetails}>
                <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="package-variant" size={14} color={colors.text.secondary} />
                    <Text style={styles.detailText}>{item.productType || 'General Cargo'}</Text>
                </View>
                <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="weight" size={14} color={colors.text.secondary} />
                    <Text style={styles.detailText}>{item.weightKg || 0} kg</Text>
                </View>
                <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="clock" size={14} color={colors.text.secondary} />
                    <Text style={styles.detailText}>
                        {item.pickupDate ? new Date(item.pickupDate).toLocaleDateString() : 'ASAP'}
                    </Text>
                </View>
            </View>
            
            <View style={styles.loadActions}>
                <TouchableOpacity 
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => handleAcceptLoad(item)}
                    disabled={acceptingId === item.id}
                >
                    {acceptingId === item.id ? (
                        <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                        <>
                            <MaterialCommunityIcons name="check" size={16} color={colors.white} />
                            <Text style={styles.actionButtonText}>Accept Load</Text>
                        </>
                    )}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.detailsButton]}>
                    <MaterialCommunityIcons name="eye" size={16} color={colors.primary} />
                    <Text style={[styles.actionButtonText, { color: colors.primary }]}>Details</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderCompletedJob = ({ item }: { item: any }) => (
        <View style={styles.completedJobCard}>
            <View style={styles.jobHeader}>
                <View style={styles.jobInfo}>
                    <Text style={styles.jobId}>#{getDisplayBookingId(item)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: colors.success + '20' }]}>
                        <Text style={[styles.statusText, { color: colors.success }]}>COMPLETED</Text>
                    </View>
                </View>
                <Text style={styles.jobValue}>KES {item.value?.toLocaleString() || '0'}</Text>
            </View>
            
            <View style={styles.routeInfo}>
                <View style={styles.routeItem}>
                    <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
                    <LocationDisplay location={item.fromLocation} style={styles.routeText} showIcon={false} />
                </View>
                <View style={styles.routeArrow}>
                    <MaterialCommunityIcons name="arrow-right" size={16} color={colors.text.light} />
                </View>
                <View style={styles.routeItem}>
                    <MaterialCommunityIcons name="map-marker" size={16} color={colors.error} />
                    <LocationDisplay location={item.toLocation} style={styles.routeText} showIcon={false} />
                </View>
            </View>
            
            <View style={styles.completedInfo}>
                <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="calendar-check" size={14} color={colors.success} />
                    <Text style={styles.detailText}>
                        Completed: {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : 'N/A'}
                    </Text>
                </View>
                <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="star" size={14} color={colors.warning} />
                    <Text style={styles.detailText}>Rating: {item.rating || 'N/A'}</Text>
                </View>
            </View>
        </View>
    );

    // Helper functions
    const getJobStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'pending': return colors.warning;
            case 'in_transit': return colors.primary;
            case 'completed': return colors.success;
            case 'cancelled': return colors.error;
            default: return colors.text.secondary;
        }
    };

    const renderInstantRequest = ({ item }: { item: any }) => (
        <View style={styles.requestCard}>
            {/* Header with service type and urgency indicator */}
            <View style={styles.requestHeader}>
                <View style={styles.headerLeft}>
                    {/* Service Type Badge */}
                    <View style={[
                        styles.serviceTypeBadge,
                        { backgroundColor: item.serviceType === 'agriTRUK' ? colors.primary + '15' : colors.secondary + '15' }
                    ]}>
                        <MaterialCommunityIcons
                            name={item.serviceType === 'agriTRUK' ? 'tractor' : 'truck'}
                            size={14}
                            color={item.serviceType === 'agriTRUK' ? colors.primary : colors.secondary}
                        />
                        <Text style={[
                            styles.serviceTypeText,
                            { color: item.serviceType === 'agriTRUK' ? colors.primary : colors.secondary }
                        ]}>
                            {item.serviceType === 'agriTRUK' ? 'Agri' : 'Cargo'}
                        </Text>
                    </View>

                    {/* Urgency Indicator */}
                    <View style={styles.urgencyContainer}>
                        <MaterialCommunityIcons
                            name={getUrgencyIcon(item.urgency)}
                            size={16}
                            color={getUrgencyColor(item.urgency)}
                        />
                        <Text style={[styles.urgencyText, { color: getUrgencyColor(item.urgency) }]}>
                            {item.urgency ? item.urgency.toUpperCase() : 'MEDIUM'} PRIORITY
                        </Text>
                    </View>
                </View>
                <Text style={styles.requestId}>#{getDisplayBookingId(item)}</Text>
            </View>

            {/* Route information */}
            <View style={styles.routeContainer}>
                <View style={styles.routeItem}>
                    <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
                    <LocationDisplay location={item.fromLocation} style={styles.routeText} showIcon={false} />
                </View>
                <View style={styles.routeArrow}>
                    <MaterialCommunityIcons name="arrow-right" size={16} color={colors.text.secondary} />
                </View>
                <View style={styles.routeItem}>
                    <MaterialCommunityIcons name="map-marker-check" size={16} color={colors.secondary} />
                    <LocationDisplay location={item.toLocation} style={styles.routeText} showIcon={false} />
                </View>
            </View>

            {/* Product and cargo details */}
            <View style={styles.cargoContainer}>
                <View style={styles.cargoItem}>
                    <MaterialCommunityIcons name="package-variant" size={14} color={colors.text.secondary} />
                    <Text style={styles.cargoText}>{item.productType}</Text>
                </View>
                <View style={styles.cargoItem}>
                    <MaterialCommunityIcons name="weight-kilogram" size={14} color={colors.text.secondary} />
                    <Text style={styles.cargoText}>{item.weight}</Text>
                </View>
                <View style={styles.cargoItem}>
                    <MaterialCommunityIcons name="currency-usd" size={14} color={colors.text.secondary} />
                    <Text style={styles.cargoText}>Ksh {item.estimatedValue?.toLocaleString() || '0'}</Text>
                </View>
            </View>

            {/* Special Requirements with detailed display */}
            {item.specialRequirements && item.specialRequirements.length > 0 && (
                <View style={styles.specialContainer}>
                    <Text style={styles.specialLabel}>Special Requirements:</Text>
                    <View style={styles.specialTags}>
                        {item.specialRequirements.map((req: string, index: number) => {
                            const isCapable = canTransporterHandleRequest(currentTransporter, item);
                            const isPerishable = ['refrigerated', 'humidity', 'fast'].includes(req);
                            const isSpecialCargo = ['fragile', 'oversized', 'hazardous', 'temperature', 'highvalue', 'livestock', 'bulk'].includes(req);

                            let icon = 'check-circle';
                            let color = colors.primary;

                            if (isPerishable) {
                                icon = 'snowflake';
                                color = colors.secondary;
                            } else if (isSpecialCargo) {
                                icon = 'package-variant-closed';
                                color = colors.warning;
                            }

                            return (
                                <View key={index} style={[
                                    styles.specialTag,
                                    { backgroundColor: isCapable ? color + '15' : colors.error + '15' }
                                ]}>
                                    <MaterialCommunityIcons
                                        name={icon as any}
                                        size={10}
                                        color={isCapable ? color : colors.error}
                                    />
                                    <Text style={[
                                        styles.specialTagText,
                                        { color: isCapable ? color : colors.error }
                                    ]}>
                                        {req.charAt(0).toUpperCase() + req.slice(1)}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}

            {/* Client Message - Prominently displayed */}
            {item.additional && (
                <View style={styles.clientMessageContainer}>
                    <View style={styles.messageHeader}>
                        <MaterialCommunityIcons name="message-text" size={16} color={colors.primary} />
                        <Text style={styles.messageLabel}>Client Message:</Text>
                    </View>
                    <Text style={styles.clientMessageText}>{item.additional}</Text>
                </View>
            )}

            {/* Client information */}
            <View style={styles.clientContainer}>
                <Text style={styles.clientName}>{item.client.name}</Text>
                <View style={styles.clientRating}>
                    <MaterialCommunityIcons name="star" size={12} color={colors.secondary} />
                    <Text style={styles.ratingText}>{item.client.rating}</Text>
                    <Text style={styles.ordersText}> • {item.client.completedOrders} orders</Text>
                </View>
            </View>

            {/* Comprehensive Pricing breakdown */}
            <View style={styles.pricingContainer}>
                <View style={styles.pricingRow}>
                    <Text style={styles.pricingLabel}>Base Price:</Text>
                    <Text style={styles.pricingValue}>Ksh {item.pricing.basePrice.toLocaleString()}</Text>
                </View>
                {item.pricing.urgencyBonus > 0 && (
                    <View style={styles.pricingRow}>
                        <Text style={styles.pricingLabel}>Urgency Bonus:</Text>
                        <Text style={[styles.pricingValue, { color: colors.success }]}>
                            +Ksh {item.pricing.urgencyBonus.toLocaleString()}
                        </Text>
                    </View>
                )}
                {item.pricing.specialHandling > 0 && (
                    <View style={styles.pricingRow}>
                        <Text style={styles.pricingLabel}>Special Handling:</Text>
                        <Text style={[styles.pricingValue, { color: colors.warning }]}>
                            +Ksh {item.pricing.specialHandling.toLocaleString()}
                        </Text>
                    </View>
                )}
                {item.insureGoods && item.pricing.insuranceCost > 0 && (
                    <View style={styles.pricingRow}>
                        <Text style={styles.pricingLabel}>Insurance Cost:</Text>
                        <Text style={[styles.pricingValue, { color: colors.secondary }]}>
                            +Ksh {item.pricing.insuranceCost.toLocaleString()}
                        </Text>
                    </View>
                )}
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Earnings:</Text>
                    <Text style={styles.totalValue}>Ksh {item.pricing.total.toLocaleString()}</Text>
                </View>

                {/* Route Details */}
                {item.route && (
                    <View style={styles.routeDetails}>
                        <View style={styles.routeDetailItem}>
                            <MaterialCommunityIcons name="map-marker-distance" size={12} color={colors.text.secondary} />
                            <Text style={styles.routeDetailText}>{item.route.distance}</Text>
                        </View>
                        <View style={styles.routeDetailItem}>
                            <MaterialCommunityIcons name="clock-outline" size={12} color={colors.text.secondary} />
                            <Text style={styles.routeDetailText}>{item.route.estimatedTime}</Text>
                        </View>
                        {item.route.detour && item.route.detour !== '0 km' && (
                            <View style={styles.routeDetailItem}>
                                <MaterialCommunityIcons name="directions-fork" size={12} color={colors.warning} />
                                <Text style={[styles.routeDetailText, { color: colors.warning }]}>+{item.route.detour}</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>

            {/* Action buttons */}
            <View style={styles.actionContainer}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleRejectRequest(item)}
                    disabled={rejectingId === item.id}
                >
                    {rejectingId === item.id ? (
                        <Text style={styles.buttonText}>Rejecting...</Text>
                    ) : (
                        <>
                            <MaterialCommunityIcons name="close" size={16} color={colors.error} />
                            <Text style={[styles.buttonText, { color: colors.error }]}>Reject</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => handleAcceptRequest(item)}
                    disabled={acceptingId === item.id}
                >
                    {acceptingId === item.id ? (
                        <Text style={styles.buttonText}>Accepting...</Text>
                    ) : (
                        <>
                            <MaterialCommunityIcons name="check" size={16} color={colors.white} />
                            <Text style={styles.buttonText}>Accept Request</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderBooking = ({ item }: { item: any }) => (
        <View style={styles.bookingCard}>
            {/* Header with service type and urgency indicator */}
            <View style={styles.requestHeader}>
                <View style={styles.headerLeft}>
                    {/* Service Type Badge */}
                    <View style={[
                        styles.serviceTypeBadge,
                        { backgroundColor: (item.serviceType || 'cargoTRUK') === 'agriTRUK' ? colors.primary + '15' : colors.secondary + '15' }
                    ]}>
                        <MaterialCommunityIcons
                            name={(item.serviceType || 'cargoTRUK') === 'agriTRUK' ? 'tractor' : 'truck'}
                            size={14}
                            color={(item.serviceType || 'cargoTRUK') === 'agriTRUK' ? colors.primary : colors.secondary}
                        />
                        <Text style={[
                            styles.serviceTypeText,
                            { color: (item.serviceType || 'cargoTRUK') === 'agriTRUK' ? colors.primary : colors.secondary }
                        ]}>
                            {(item.serviceType || 'cargoTRUK') === 'agriTRUK' ? 'Agri' : 'Cargo'}
                        </Text>
                    </View>

                    {/* Urgency Indicator */}
                    <View style={styles.urgencyContainer}>
                        <MaterialCommunityIcons
                            name={getUrgencyIcon(item.urgency)}
                            size={16}
                            color={getUrgencyColor(item.urgency)}
                        />
                        <Text style={[styles.urgencyText, { color: getUrgencyColor(item.urgency) }]}>
                            {item.urgency ? item.urgency.toUpperCase() : 'MEDIUM'} PRIORITY
                        </Text>
                    </View>
                </View>
                <Text style={styles.requestId}>#{getDisplayBookingId(item)}</Text>
            </View>

            {/* Current Route Information */}
            {item.currentRoute && (
                <View style={styles.currentRouteContainer}>
                    <View style={styles.currentRouteHeader}>
                        <MaterialCommunityIcons name="map-marker-path" size={16} color={colors.primary} />
                        <Text style={styles.currentRouteTitle}>Along Your Route</Text>
                        <View style={styles.routeProgress}>
                            <Text style={styles.progressText}>{item.currentRoute.progress}%</Text>
                        </View>
                    </View>
                    <View style={styles.currentRouteDetails}>
                        <Text style={styles.currentRouteText}>
                            {item.currentRoute.from} → {item.currentRoute.to}
                        </Text>
                        <Text style={styles.currentLocationText}>
                            Current: {item.currentRoute.currentLocation}
                        </Text>
                    </View>
                </View>
            )}

            {/* Route information */}
            <View style={styles.routeContainer}>
                <View style={styles.routeItem}>
                    <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
                    <LocationDisplay location={item.pickup} style={styles.routeText} showIcon={false} />
                </View>
                <View style={styles.routeArrow}>
                    <MaterialCommunityIcons name="arrow-right" size={16} color={colors.text.secondary} />
                </View>
                <View style={styles.routeItem}>
                    <MaterialCommunityIcons name="map-marker-check" size={16} color={colors.secondary} />
                    <LocationDisplay location={item.dropoff} style={styles.routeText} showIcon={false} />
                </View>
            </View>

            {/* Load details */}
            <View style={styles.cargoContainer}>
                <View style={styles.cargoItem}>
                    <MaterialCommunityIcons name="weight-kilogram" size={14} color={colors.text.secondary} />
                    <Text style={styles.cargoText}>{item.weight} kg</Text>
                </View>
                <View style={styles.cargoItem}>
                    <MaterialCommunityIcons name="map-marker-distance" size={14} color={colors.text.secondary} />
                    <Text style={styles.cargoText}>{item.route.distance}</Text>
                </View>
                <View style={styles.cargoItem}>
                    <MaterialCommunityIcons name="currency-usd" size={14} color={colors.text.secondary} />
                    <Text style={styles.cargoText}>Ksh {item.price.toLocaleString()}</Text>
                </View>
            </View>

            {/* Description */}
            <Text style={styles.descriptionText}>{item.description}</Text>

            {/* Special Requirements with proper structure */}
            {((item.isSpecialCargo && item.specialCargoSpecs.length > 0) || (item.isPerishable && item.perishableSpecs.length > 0)) && (
                <View style={styles.specialContainer}>
                    <Text style={styles.specialLabel}>Special Requirements:</Text>
                    <View style={styles.specialTags}>
                        {/* Special Cargo Requirements */}
                        {item.isSpecialCargo && item.specialCargoSpecs.map((req: string, index: number) => {
                            const isCapable = canTransporterHandleRequest(currentTransporter, item);
                            return (
                                <View key={`cargo-${index}`} style={[
                                    styles.specialTag,
                                    { backgroundColor: isCapable ? colors.warning + '15' : colors.error + '15' }
                                ]}>
                                    <MaterialCommunityIcons
                                        name="package-variant-closed"
                                        size={10}
                                        color={isCapable ? colors.warning : colors.error}
                                    />
                                    <Text style={[
                                        styles.specialTagText,
                                        { color: isCapable ? colors.warning : colors.error }
                                    ]}>
                                        {req.charAt(0).toUpperCase() + req.slice(1)}
                                    </Text>
                                </View>
                            );
                        })}

                        {/* Perishable Requirements */}
                        {item.isPerishable && item.perishableSpecs.map((req: string, index: number) => {
                            const isCapable = canTransporterHandleRequest(currentTransporter, item);
                            return (
                                <View key={`perishable-${index}`} style={[
                                    styles.specialTag,
                                    { backgroundColor: isCapable ? colors.secondary + '15' : colors.error + '15' }
                                ]}>
                                    <MaterialCommunityIcons
                                        name="snowflake"
                                        size={10}
                                        color={isCapable ? colors.secondary : colors.error}
                                    />
                                    <Text style={[
                                        styles.specialTagText,
                                        { color: isCapable ? colors.secondary : colors.error }
                                    ]}>
                                        {req.charAt(0).toUpperCase() + req.slice(1)}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}

            {/* Client rating */}
            <View style={styles.clientContainer}>
                <View style={styles.clientRating}>
                    <MaterialCommunityIcons name="star" size={12} color={colors.secondary} />
                    <Text style={styles.ratingText}>{item.clientRating}</Text>
                    <Text style={styles.ordersText}> • Client Rating</Text>
                </View>
            </View>

            {/* Action button */}
            <TouchableOpacity
                style={[styles.actionButton, styles.viewDetailsButton, { width: '100%' }]}
                onPress={() => {
                    setSelectedLoad(item);
                    setShowLoadDetails(true);
                }}
            >
                <MaterialCommunityIcons name="information-outline" size={16} color={colors.primary} />
                <Text style={[styles.buttonText, { color: colors.primary }]}>View Details</Text>
            </TouchableOpacity>
        </View>
    );


    const renderTabButton = (tab: 'accepted' | 'route_loads' | 'history', title: string, icon: string, count?: number) => (
        <TouchableOpacity
            style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
            onPress={() => setActiveTab(tab)}
        >
            <View style={styles.tabContent}>
            <MaterialCommunityIcons
                name={icon as any}
                size={20}
                color={activeTab === tab ? colors.white : colors.text.secondary}
            />
            <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
                {title}
            </Text>
                {count !== undefined && count > 0 && (
                    <View style={[styles.tabBadge, activeTab === tab && styles.activeTabBadge]}>
                        <Text style={[styles.tabBadgeText, activeTab === tab && styles.activeTabBadgeText]}>
                            {count}
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'accepted':
                return (
                    <FlatList
                        data={acceptedJobs}
                        keyExtractor={(item) => item.id}
                        renderItem={renderAcceptedJob}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContainer}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons name="truck-delivery" size={48} color={colors.text.secondary} />
                                <Text style={styles.emptyTitle}>No Active Jobs</Text>
                                <Text style={styles.emptySubtitle}>
                                    Your accepted jobs will appear here. Start by accepting requests from the Route Loads tab.
                                </Text>
                            </View>
                        }
                    />
                );
            case 'route_loads':
                return (
                    <FlatList
                        data={routeLoads}
                        keyExtractor={(item) => item.id}
                        renderItem={renderRouteLoad}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContainer}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons name="map-marker-path" size={48} color={colors.text.secondary} />
                                <Text style={styles.emptyTitle}>No Route Loads</Text>
                                <Text style={styles.emptySubtitle}>
                                    {currentRoute ? 
                                        `No loads found along your route from ${currentRoute.from.name} to ${currentRoute.to.name}` :
                                        'Set your current route to see matching loads'
                                    }
                                </Text>
                            </View>
                        }
                    />
                );
            case 'history':
                return (
                    <FlatList
                        data={completedJobs}
                        keyExtractor={(item) => item.id}
                        renderItem={renderCompletedJob}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContainer}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons name="check-circle" size={48} color={colors.text.secondary} />
                                <Text style={styles.emptyTitle}>No Completed Jobs</Text>
                                <Text style={styles.emptySubtitle}>
                                    Your completed jobs will appear here
                                </Text>
                            </View>
                        }
                    />
                );
            default:
                return null;
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.header}
            >
                <View style={styles.headerLeft} />
                <Text style={styles.headerTitle}>Manage Requests</Text>
                <View style={styles.headerRight} />
            </LinearGradient>

            {/* Enhanced Tab Navigation */}
            <View style={styles.tabContainer}>
                {renderTabButton('accepted', 'Active Jobs', 'truck-delivery', acceptedJobs.length)}
                {renderTabButton('route_loads', 'Route Loads', 'map-marker-path', routeLoads.length)}
                {renderTabButton('history', 'Completed', 'check-circle', completedJobs.length)}
            </View>

            {/* Enhanced Filter Bar */}
            <View style={styles.enhancedFilterBar}>
                <View style={styles.filterHeader}>
                    <View style={styles.filterLeft}>
                <TouchableOpacity
                            style={[styles.filterButton, showFilters && styles.filterButtonActive]}
                    onPress={() => setShowFilters(!showFilters)}
                >
                    <MaterialCommunityIcons 
                                name="filter-variant" 
                                size={18} 
                                color={showFilters ? colors.white : colors.primary} 
                            />
                            <Text style={[styles.filterButtonText, showFilters && styles.filterButtonTextActive]}>
                                Filters
                    </Text>
                            {showFilters && <View style={styles.filterIndicator} />}
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.sortButton}>
                            <MaterialCommunityIcons name="sort" size={18} color={colors.text.secondary} />
                            <Text style={styles.sortButtonText}>
                                {sortBy === 'distance' ? 'Distance' : 
                                 sortBy === 'price' ? 'Price' : 
                                 sortBy === 'urgency' ? 'Urgency' : 'Pickup Time'}
                            </Text>
                </TouchableOpacity>
            </View>

                    {currentRoute && (
                        <View style={styles.routeIndicator}>
                            <MaterialCommunityIcons name="map-marker" size={14} color={colors.primary} />
                            <Text style={styles.routeIndicatorText}>
                                {currentRoute.from.name} → {currentRoute.to.name}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Enhanced Filter Options */}
            {showFilters && (
                <View style={styles.enhancedFilterOptions}>
                    <ScrollView showsVerticalScrollIndicator={false} style={styles.filterScrollView}>
                        {/* Route Filters */}
                        <View style={styles.filterGroup}>
                            <Text style={styles.filterGroupTitle}>Route</Text>
                            <View style={styles.filterRow}>
                                <TextInput
                                    style={styles.filterInput}
                                    placeholder="From location"
                                    value={filters.fromLocation}
                                    onChangeText={(text) => setFilters(prev => ({ ...prev, fromLocation: text }))}
                                />
                                <TextInput
                                    style={styles.filterInput}
                                    placeholder="To location"
                                    value={filters.toLocation}
                                    onChangeText={(text) => setFilters(prev => ({ ...prev, toLocation: text }))}
                                />
                            </View>
                        </View>

                        {/* Cargo Type Filters */}
                        <View style={styles.filterGroup}>
                            <Text style={styles.filterGroupTitle}>Cargo Type</Text>
                            <View style={styles.filterRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.filterChip,
                                        filters.cargoType === 'all' && styles.filterChipActive
                                    ]}
                                    onPress={() => setFilters(prev => ({ ...prev, cargoType: 'all' }))}
                                >
                                    <Text style={[
                                        styles.filterChipText,
                                        filters.cargoType === 'all' && styles.filterChipTextActive
                                    ]}>All</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.filterChip,
                                        filters.cargoType === 'perishable' && styles.filterChipActive
                                    ]}
                                    onPress={() => setFilters(prev => ({ ...prev, cargoType: 'perishable' }))}
                                >
                                    <Text style={[
                                        styles.filterChipText,
                                        filters.cargoType === 'perishable' && styles.filterChipTextActive
                                    ]}>Perishable</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.filterChip,
                                        filters.cargoType === 'special' && styles.filterChipActive
                                    ]}
                                    onPress={() => setFilters(prev => ({ ...prev, cargoType: 'special' }))}
                                >
                                    <Text style={[
                                        styles.filterChipText,
                                        filters.cargoType === 'special' && styles.filterChipTextActive
                                    ]}>Special</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Special Requirements */}
                        <View style={styles.filterGroup}>
                            <Text style={styles.filterGroupTitle}>Requirements</Text>
                            <View style={styles.filterRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.filterChip,
                                        filters.requiresRefrigeration && styles.filterChipActive
                                    ]}
                                    onPress={() => setFilters(prev => ({ ...prev, requiresRefrigeration: !prev.requiresRefrigeration }))}
                                >
                                    <Text style={[
                                        styles.filterChipText,
                                        filters.requiresRefrigeration && styles.filterChipTextActive
                                    ]}>Refrigeration</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.filterChip,
                                        filters.requiresHumidityControl && styles.filterChipActive
                                    ]}
                                    onPress={() => setFilters(prev => ({ ...prev, requiresHumidityControl: !prev.requiresHumidityControl }))}
                                >
                                    <Text style={[
                                        styles.filterChipText,
                                        filters.requiresHumidityControl && styles.filterChipTextActive
                                    ]}>Humidity</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Service Type */}
                        <View style={styles.filterGroup}>
                            <Text style={styles.filterGroupTitle}>Service</Text>
                            <View style={styles.filterRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.filterChip,
                                        filters.serviceType === 'all' && styles.filterChipActive
                                    ]}
                                    onPress={() => setFilters(prev => ({ ...prev, serviceType: 'all' }))}
                                >
                                    <Text style={[
                                        styles.filterChipText,
                                        filters.serviceType === 'all' && styles.filterChipTextActive
                                    ]}>All</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.filterChip,
                                        filters.serviceType === 'agriTRUK' && styles.filterChipActive
                                    ]}
                                    onPress={() => setFilters(prev => ({ ...prev, serviceType: 'agriTRUK' }))}
                                >
                                    <Text style={[
                                        styles.filterChipText,
                                        filters.serviceType === 'agriTRUK' && styles.filterChipTextActive
                                    ]}>Agri</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.filterChip,
                                        filters.serviceType === 'cargoTRUK' && styles.filterChipActive
                                    ]}
                                    onPress={() => setFilters(prev => ({ ...prev, serviceType: 'cargoTRUK' }))}
                                >
                                    <Text style={[
                                        styles.filterChipText,
                                        filters.serviceType === 'cargoTRUK' && styles.filterChipTextActive
                                    ]}>Cargo</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Clear Filters */}
                        <View style={styles.filterGroup}>
                            <TouchableOpacity
                                style={styles.clearFiltersButton}
                                onPress={() => setFilters({
                                    fromLocation: '',
                                    toLocation: '',
                                    routeType: 'all',
                                    cargoType: 'all',
                                    productType: '',
                                    weightRange: { min: '', max: '' },
                                    requiresRefrigeration: false,
                                    requiresHumidityControl: false,
                                    isPerishable: false,
                                    isSpecialCargo: false,
                                    specialRequirements: [],
                                    serviceType: 'all',
                                    pickupDate: '',
                                    deliveryDate: '',
                                    timeRange: 'all',
                                    priceRange: { min: '', max: '' },
                                    status: 'all',
                                })}
                            >
                                <MaterialCommunityIcons name="filter-remove" size={16} color={colors.error} />
                                <Text style={styles.clearFiltersText}>Clear All</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            )}

            {/* Content */}
            <View style={styles.content}>
                {renderContent()}
            </View>

            {/* Load Details Dialog */}
            {showLoadDetails && selectedLoad && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Load Details</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setShowLoadDetails(false);
                                    setSelectedLoad(null);
                                }}
                                style={styles.closeButton}
                            >
                                <MaterialCommunityIcons name="close" size={24} color={colors.text.secondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                            {/* Service Type and Urgency */}
                            <View style={styles.modalHeaderSection}>
                                <View style={styles.headerLeft}>
                                    <View style={[
                                        styles.serviceTypeBadge,
                                        { backgroundColor: (selectedLoad.serviceType || 'cargoTRUK') === 'agriTRUK' ? colors.primary + '15' : colors.secondary + '15' }
                                    ]}>
                                        <MaterialCommunityIcons
                                            name={(selectedLoad.serviceType || 'cargoTRUK') === 'agriTRUK' ? 'tractor' : 'truck'}
                                            size={14}
                                            color={(selectedLoad.serviceType || 'cargoTRUK') === 'agriTRUK' ? colors.primary : colors.secondary}
                                        />
                                        <Text style={[
                                            styles.serviceTypeText,
                                            { color: (selectedLoad.serviceType || 'cargoTRUK') === 'agriTRUK' ? colors.primary : colors.secondary }
                                        ]}>
                                            {(selectedLoad.serviceType || 'cargoTRUK') === 'agriTRUK' ? 'Agri' : 'Cargo'}
                                        </Text>
                                    </View>

                                    <View style={styles.urgencyContainer}>
                                        <MaterialCommunityIcons
                                            name={getUrgencyIcon(selectedLoad.urgency)}
                                            size={16}
                                            color={getUrgencyColor(selectedLoad.urgency)}
                                        />
                                        <Text style={[styles.urgencyText, { color: getUrgencyColor(selectedLoad.urgency) }]}>
                                            {selectedLoad.urgency.toUpperCase()} PRIORITY
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.requestId}>#{selectedLoad.id}</Text>
                            </View>

                            {/* Current Route Information */}
                            {selectedLoad.currentRoute && (
                                <View style={styles.currentRouteContainer}>
                                    <View style={styles.currentRouteHeader}>
                                        <MaterialCommunityIcons name="map-marker-path" size={16} color={colors.primary} />
                                        <Text style={styles.currentRouteTitle}>Along Your Route</Text>
                                        <View style={styles.routeProgress}>
                                            <Text style={styles.progressText}>{selectedLoad.currentRoute.progress}%</Text>
                                        </View>
                                    </View>
                                    <View style={styles.currentRouteDetails}>
                                        <Text style={styles.currentRouteText}>
                                            {selectedLoad.currentRoute.from} → {selectedLoad.currentRoute.to}
                                        </Text>
                                        <Text style={styles.currentLocationText}>
                                            Current: {selectedLoad.currentRoute.currentLocation}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Route Information */}
                            <View style={styles.modalSection}>
                                <Text style={styles.sectionTitle}>Route Information</Text>
                                <View style={styles.routeContainer}>
                                    <View style={styles.routeItem}>
                                        <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
                                        <Text style={styles.routeText}>{selectedLoad.pickup}</Text>
                                    </View>
                                    <View style={styles.routeArrow}>
                                        <MaterialCommunityIcons name="arrow-right" size={16} color={colors.text.secondary} />
                                    </View>
                                    <View style={styles.routeItem}>
                                        <MaterialCommunityIcons name="map-marker-check" size={16} color={colors.secondary} />
                                        <Text style={styles.routeText}>{selectedLoad.dropoff}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Load Details */}
                            <View style={styles.modalSection}>
                                <Text style={styles.sectionTitle}>Load Details</Text>
                                <View style={styles.detailsGrid}>
                                    <View style={styles.detailItem}>
                                        <MaterialCommunityIcons name="weight-kilogram" size={16} color={colors.text.secondary} />
                                        <Text style={styles.detailLabel}>Weight</Text>
                                        <Text style={styles.detailValue}>{selectedLoad.weight} kg</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <MaterialCommunityIcons name="map-marker-distance" size={16} color={colors.text.secondary} />
                                        <Text style={styles.detailLabel}>Distance</Text>
                                        <Text style={styles.detailValue}>{selectedLoad.route.distance}</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <MaterialCommunityIcons name="clock-outline" size={16} color={colors.text.secondary} />
                                        <Text style={styles.detailLabel}>Duration</Text>
                                        <Text style={styles.detailValue}>{selectedLoad.route.estimatedTime}</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <MaterialCommunityIcons name="directions-fork" size={16} color={colors.text.secondary} />
                                        <Text style={styles.detailLabel}>Detour</Text>
                                        <Text style={styles.detailValue}>{selectedLoad.detourKm} km</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Description */}
                            <View style={styles.modalSection}>
                                <Text style={styles.sectionTitle}>Product Details</Text>
                                <View style={styles.productInfo}>
                                    <Text style={styles.productType}>{selectedLoad.productType}</Text>
                                    <Text style={styles.descriptionText}>{selectedLoad.description}</Text>
                                </View>
                            </View>

                            {/* Client Message */}
                            {selectedLoad.additional && (
                                <View style={styles.modalSection}>
                                    <Text style={styles.sectionTitle}>Client Message</Text>
                                    <View style={styles.clientMessageContainer}>
                                        <Text style={styles.clientMessageText}>{selectedLoad.additional}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Special Requirements */}
                            {((selectedLoad.isSpecialCargo && selectedLoad.specialCargoSpecs.length > 0) || (selectedLoad.isPerishable && selectedLoad.perishableSpecs.length > 0)) && (
                                <View style={styles.modalSection}>
                                    <Text style={styles.sectionTitle}>Special Requirements</Text>
                                    <View style={styles.specialTags}>
                                        {/* Special Cargo Requirements */}
                                        {selectedLoad.isSpecialCargo && selectedLoad.specialCargoSpecs.map((req: string, index: number) => {
                                            const isCapable = canTransporterHandleRequest(currentTransporter, selectedLoad);
                                            return (
                                                <View key={`cargo-${index}`} style={[
                                                    styles.specialTag,
                                                    { backgroundColor: isCapable ? colors.warning + '15' : colors.error + '15' }
                                                ]}>
                                                    <MaterialCommunityIcons
                                                        name="package-variant-closed"
                                                        size={12}
                                                        color={isCapable ? colors.warning : colors.error}
                                                    />
                                                    <Text style={[
                                                        styles.specialTagText,
                                                        { color: isCapable ? colors.warning : colors.error }
                                                    ]}>
                                                        {req.charAt(0).toUpperCase() + req.slice(1)}
                                                    </Text>
                                                </View>
                                            );
                                        })}

                                        {/* Perishable Requirements */}
                                        {selectedLoad.isPerishable && selectedLoad.perishableSpecs.map((req: string, index: number) => {
                                            const isCapable = canTransporterHandleRequest(currentTransporter, selectedLoad);
                                            return (
                                                <View key={`perishable-${index}`} style={[
                                                    styles.specialTag,
                                                    { backgroundColor: isCapable ? colors.secondary + '15' : colors.error + '15' }
                                                ]}>
                                                    <MaterialCommunityIcons
                                                        name="snowflake"
                                                        size={12}
                                                        color={isCapable ? colors.secondary : colors.error}
                                                    />
                                                    <Text style={[
                                                        styles.specialTagText,
                                                        { color: isCapable ? colors.secondary : colors.error }
                                                    ]}>
                                                        {req.charAt(0).toUpperCase() + req.slice(1)}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}

                            {/* Cost Breakdown */}
                            <View style={styles.modalSection}>
                                <Text style={styles.sectionTitle}>Cost Breakdown</Text>
                                <View style={styles.costBreakdown}>
                                    <View style={styles.costRow}>
                                        <Text style={styles.costLabel}>Base Price:</Text>
                                        <Text style={styles.costValue}>Ksh {selectedLoad.pricing?.basePrice || selectedLoad.price}</Text>
                                    </View>
                                    {selectedLoad.pricing?.urgencyBonus > 0 && (
                                        <View style={styles.costRow}>
                                            <Text style={styles.costLabel}>Urgency Bonus:</Text>
                                            <Text style={[styles.costValue, { color: colors.success }]}>
                                                +Ksh {selectedLoad.pricing.urgencyBonus.toLocaleString()}
                                            </Text>
                                        </View>
                                    )}
                                    {selectedLoad.pricing?.specialHandling > 0 && (
                                        <View style={styles.costRow}>
                                            <Text style={styles.costLabel}>Special Handling:</Text>
                                            <Text style={[styles.costValue, { color: colors.warning }]}>
                                                +Ksh {selectedLoad.pricing.specialHandling.toLocaleString()}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={styles.costRow}>
                                        <Text style={styles.costLabel}>Detour Cost:</Text>
                                        <Text style={styles.costValue}>Ksh {(selectedLoad.detourKm * 50).toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.totalCostRow}>
                                        <Text style={styles.totalCostLabel}>Total Earnings:</Text>
                                        <Text style={styles.totalCostValue}>Ksh {((selectedLoad.pricing?.total || selectedLoad.price) + (selectedLoad.detourKm * 50)).toLocaleString()}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Client Information */}
                            <View style={styles.modalSection}>
                                <Text style={styles.sectionTitle}>Client Information</Text>
                                <View style={styles.clientInfo}>
                                    <View style={styles.clientHeader}>
                                        <Text style={styles.clientName}>{selectedLoad.client?.name || 'Client'}</Text>
                                        <View style={styles.clientRating}>
                                            <MaterialCommunityIcons name="star" size={16} color={colors.secondary} />
                                            <Text style={styles.ratingText}>{selectedLoad.clientRating}</Text>
                                            <Text style={styles.ordersText}> • {selectedLoad.client?.completedOrders || '0'} orders</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.estimatedValue}>Estimated Value: Ksh {selectedLoad.estimatedValue.toLocaleString()}</Text>
                                </View>
                            </View>
                        </ScrollView>

                        {/* Action Buttons */}
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.rejectButton]}
                                onPress={() => {
                                    setShowLoadDetails(false);
                                    setSelectedLoad(null);
                                }}
                            >
                                <MaterialCommunityIcons name="close" size={16} color={colors.error} />
                                <Text style={[styles.modalButtonText, { color: colors.error }]}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.acceptButton]}
                                onPress={() => {
                                    handleAcceptLoad(selectedLoad);
                                    setShowLoadDetails(false);
                                    setSelectedLoad(null);
                                }}
                                disabled={acceptingId === selectedLoad.id}
                            >
                                {acceptingId === selectedLoad.id ? (
                                    <Text style={styles.modalButtonText}>Adding...</Text>
                                ) : (
                                    <>
                                        <MaterialCommunityIcons name="plus" size={16} color={colors.white} />
                                        <Text style={styles.modalButtonText}>Add to Trip</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </View>
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
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.white,
    },
    headerRight: {
        width: 40,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.text.light + '20',
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 6,
        borderRadius: 12,
        marginHorizontal: 2,
        borderWidth: 1,
        borderColor: colors.text.light + '30',
    },
    activeTabButton: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    tabButtonText: {
        fontSize: fonts.size.xs,
        fontWeight: '600',
        color: colors.text.secondary,
        marginLeft: 4,
    },
    activeTabButtonText: {
        color: colors.white,
    },
    // Enhanced Filter Styles
    enhancedFilterBar: {
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.text.light + '20',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    filterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    filterLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.background,
        marginRight: 12,
        borderWidth: 1,
        borderColor: colors.primary + '30',
    },
    filterButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
        marginLeft: 6,
    },
    filterButtonTextActive: {
        color: colors.white,
    },
    filterIndicator: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.error,
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.text.light + '30',
    },
    sortButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text.secondary,
        marginLeft: 6,
    },
    routeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: colors.primary + '15',
    },
    routeIndicatorText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
        marginLeft: 4,
    },
    enhancedFilterOptions: {
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.text.light + '20',
        maxHeight: 400,
    },
    filterScrollView: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    filterSection: {
        marginBottom: 20,
    },
    filterSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    filterSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text.primary,
        marginLeft: 8,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 12,
    },
    inputWrapper: {
        flex: 1,
        position: 'relative',
    },
    inputIcon: {
        position: 'absolute',
        left: 12,
        top: 12,
        zIndex: 1,
    },
    enhancedFilterInput: {
        backgroundColor: colors.background,
        borderRadius: 12,
        paddingHorizontal: 40,
        paddingVertical: 12,
        fontSize: 14,
        color: colors.text.primary,
        borderWidth: 1,
        borderColor: colors.text.light + '30',
    },
    filterChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    enhancedFilterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.primary + '30',
    },
    enhancedFilterChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    enhancedFilterChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
        marginLeft: 4,
    },
    enhancedFilterChipTextActive: {
        color: colors.white,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 4,
    },
    priceRangeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    priceInputWrapper: {
        flex: 1,
    },
    priceLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text.secondary,
        marginBottom: 4,
    },
    priceInput: {
        backgroundColor: colors.background,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: colors.text.primary,
        borderWidth: 1,
        borderColor: colors.text.light + '30',
    },
    priceSeparator: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    priceSeparatorText: {
        fontSize: 12,
        color: colors.text.light,
    },
    filterActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: colors.text.light + '20',
    },
    clearFiltersButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.error + '30',
    },
    clearFiltersText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.error,
        marginLeft: 6,
    },
    applyFiltersButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: colors.primary,
    },
    applyFiltersText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.white,
        marginLeft: 6,
    },
    tabContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    tabBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: colors.error,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    activeTabBadge: {
        backgroundColor: colors.white,
    },
    tabBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.white,
    },
    activeTabBadgeText: {
        color: colors.primary,
    },
    filterLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.background,
        marginRight: 12,
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text.secondary,
        marginLeft: 6,
    },
    filterIndicator: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.background,
    },
    sortButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text.secondary,
        marginLeft: 6,
    },
    routeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: colors.primary + '15',
    },
    routeIndicatorText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
        marginLeft: 4,
    },
    // New job management styles
    jobCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    jobHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    jobInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    jobId: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    jobValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.success,
    },
    jobDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    detailText: {
        fontSize: 12,
        color: colors.text.secondary,
        marginLeft: 4,
    },
    jobActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
    },
    startButton: {
        backgroundColor: colors.primary,
    },
    completeButton: {
        backgroundColor: colors.success,
    },
    acceptButton: {
        backgroundColor: colors.primary,
    },
    detailsButton: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.white,
        marginLeft: 4,
    },
    loadCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.secondary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: colors.secondary,
    },
    loadHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    loadInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loadId: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginRight: 8,
    },
    urgencyBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    loadValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.secondary,
    },
    loadDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    loadActions: {
        flexDirection: 'row',
        gap: 8,
    },
    completedJobCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.success,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: colors.success,
        opacity: 0.8,
    },
    completedInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    content: {
        flex: 1,
    },
    listContainer: {
        padding: 16,
        paddingBottom: 150, // Increased padding to ensure bottom content is visible
    },
    separator: {
        height: 16,
    },
    requestCard: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.black,
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    loadCard: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.black,
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderLeftWidth: 4,
        borderLeftColor: colors.secondary,
    },
    bookingCard: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.black,
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderLeftWidth: 4,
        borderLeftColor: colors.success,
    },
    requestHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    serviceTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    serviceTypeText: {
        fontSize: fonts.size.xs,
        fontWeight: '600',
    },
    urgencyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    urgencyText: {
        fontSize: fonts.size.xs,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    requestId: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        fontWeight: '600',
    },
    routeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    routeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.sm,
    },
    routeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    routeText: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        fontWeight: '600',
        marginLeft: 4,
    },
    routeArrow: {
        marginHorizontal: 8,
    },
    cargoContainer: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    cargoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    cargoText: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginLeft: 4,
    },
    descriptionText: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        marginBottom: 12,
        fontStyle: 'italic',
    },
    requirementsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 12,
    },
    requirementBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary + '15',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginRight: 8,
        marginBottom: 4,
    },
    requirementText: {
        fontSize: fonts.size.xs,
        color: colors.primary,
        fontWeight: '500',
        marginLeft: 4,
    },
    clientContainer: {
        marginBottom: 12,
    },
    clientName: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 4,
    },
    clientRating: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingText: {
        fontSize: fonts.size.xs,
        color: colors.secondary,
        fontWeight: '600',
        marginLeft: 4,
    },
    ordersText: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
    },
    pricingContainer: {
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    pricingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    pricingLabel: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
    },
    pricingValue: {
        fontSize: fonts.size.xs,
        color: colors.text.primary,
        fontWeight: '600',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: colors.text.light + '30',
        paddingTop: 8,
        marginTop: 8,
    },
    totalLabel: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        fontWeight: '600',
    },
    totalValue: {
        fontSize: fonts.size.sm,
        color: colors.secondary,
        fontWeight: 'bold',
    },
    actionContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    rejectButton: {
        backgroundColor: colors.white,
        borderColor: colors.error,
    },
    acceptButton: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    buttonText: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        marginLeft: 6,
    },
    bookingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    bookingId: {
        fontSize: fonts.size.sm,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: fonts.size.xs,
        fontWeight: '600',
    },
    viewDetailsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary + '15',
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    viewDetailsText: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.primary,
        marginRight: 4,
    },
    clientMessageContainer: {
        backgroundColor: colors.surface,
        padding: 12,
        borderRadius: 8,
        marginTop: 12,
        marginBottom: 12,
    },
    messageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    messageLabel: {
        fontSize: fonts.size.xs,
        fontWeight: '600',
        color: colors.text.primary,
        marginLeft: 4,
    },
    clientMessageText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        fontStyle: 'italic',
        lineHeight: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xl * 2,
    },
    emptyTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.secondary,
        marginTop: spacing.md,
    },
    emptySubtitle: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        marginTop: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
    specialContainer: {
        marginVertical: 8,
    },
    specialLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 4,
    },
    specialTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    specialTag: {
        backgroundColor: colors.primary + '15',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: colors.primary + '30',
    },
    specialTagText: {
        fontSize: 10,
        color: colors.primary,
        fontWeight: '500',
    },
    notesContainer: {
        marginVertical: 8,
        backgroundColor: colors.surface,
        padding: 8,
        borderRadius: 6,
    },
    notesLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 2,
    },
    notesText: {
        fontSize: 11,
        color: colors.text.secondary,
        fontStyle: 'italic',
        lineHeight: 14,
    },
    routeDetails: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 0.5,
        borderTopColor: colors.text.light + '30',
    },
    routeDetailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    routeDetailText: {
        fontSize: 11,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    currentRouteContainer: {
        backgroundColor: colors.primary + '10',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    currentRouteHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    currentRouteTitle: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.primary,
        marginLeft: 4,
        flex: 1,
    },
    routeProgress: {
        backgroundColor: colors.primary + '20',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    progressText: {
        fontSize: fonts.size.xs,
        fontWeight: 'bold',
        color: colors.primary,
    },
    currentRouteDetails: {
        marginLeft: 20,
    },
    currentRouteText: {
        fontSize: fonts.size.xs,
        color: colors.text.primary,
        fontWeight: '500',
    },
    currentLocationText: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        fontStyle: 'italic',
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContainer: {
        backgroundColor: colors.white,
        borderRadius: 16,
        margin: 20,
        maxHeight: '90%',
        width: '90%',
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.text.light + '20',
    },
    modalTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    closeButton: {
        padding: 4,
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    modalHeaderSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    modalSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 12,
    },
    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    detailItem: {
        flex: 1,
        minWidth: '45%',
        alignItems: 'center',
        padding: 12,
        backgroundColor: colors.background,
        borderRadius: 8,
    },
    detailLabel: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginTop: 4,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.primary,
    },
    costBreakdown: {
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: 16,
    },
    costRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    costLabel: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
    },
    costValue: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.primary,
    },
    totalCostRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: colors.text.light + '30',
        paddingTop: 8,
        marginTop: 8,
    },
    totalCostLabel: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.primary,
    },
    totalCostValue: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.secondary,
    },
    clientInfo: {
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: 16,
    },
    clientHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    productInfo: {
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: 16,
    },
    productType: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 8,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: colors.text.light + '20',
    },
    modalButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    modalButtonText: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        marginLeft: 6,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: colors.white,
        fontSize: fonts.size.md,
        marginTop: spacing.md,
        fontWeight: '600',
    },
    estimatedValue: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.secondary,
    },
    
    // Filter styles
    filterContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.text.light + '20',
    },
    filterToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.primary + '30',
    },
    filterToggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
        marginHorizontal: 8,
    },
    filtersPanel: {
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.text.light + '20',
        paddingVertical: 12,
    },
    filtersScroll: {
        paddingHorizontal: 16,
    },
    filterGroup: {
        marginRight: 16,
        minWidth: 120,
    },
    filterGroupTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 8,
    },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    filterInput: {
        flex: 1,
        height: 36,
        borderWidth: 1,
        borderColor: colors.text.light + '40',
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 14,
        color: colors.text.primary,
        backgroundColor: colors.background,
        marginBottom: 8,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.text.light + '40',
        backgroundColor: colors.background,
    },
    filterChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.text.secondary,
    },
    filterChipTextActive: {
        color: colors.white,
    },
    clearFiltersButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: colors.error + '15',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.error + '30',
    },
    clearFiltersText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.error,
        marginLeft: 4,
    },

});

export default TransporterBookingManagementScreen;
