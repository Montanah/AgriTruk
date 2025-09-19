import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
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

interface RouteParams {
    transporterType?: 'company' | 'individual' | 'broker';
}

const TransporterBookingManagementScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const params = route.params as RouteParams;
    const transporterType = params?.transporterType || 'company';

    const [activeTab, setActiveTab] = useState<'instant' | 'bookings' | 'route'>('instant');
    const [refreshing, setRefreshing] = useState(false);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [showLoadDetails, setShowLoadDetails] = useState(false);
    const [selectedLoad, setSelectedLoad] = useState<any>(null);
    
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
    const [loading, setLoading] = useState(true);

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

                // Fetch transporter profile
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
        return allRouteLoads.filter(load => {
            return canTransporterHandleRequest(currentTransporter, load);
        });
    }, [allRouteLoads, currentTransporter]);

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

    const onRefresh = async () => {
        setRefreshing(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setRefreshing(false);
    };

    const handleAcceptRequest = async (request: any) => {
        setAcceptingId(request.id);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));

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
                    'Consolidation Active',
                    `Request ${request.id} accepted and added to your active trip! You're now handling multiple requests.`
                );
            } else {
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
                <Text style={styles.requestId}>#{item.id}</Text>
            </View>

            {/* Route information */}
            <View style={styles.routeContainer}>
                <View style={styles.routeItem}>
                    <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
                    <Text style={styles.routeText}>{item.fromLocation}</Text>
                </View>
                <View style={styles.routeArrow}>
                    <MaterialCommunityIcons name="arrow-right" size={16} color={colors.text.secondary} />
                </View>
                <View style={styles.routeItem}>
                    <MaterialCommunityIcons name="map-marker-check" size={16} color={colors.secondary} />
                    <Text style={styles.routeText}>{item.toLocation}</Text>
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

    const renderRouteLoad = ({ item }: { item: any }) => (
        <View style={styles.loadCard}>
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
                <Text style={styles.requestId}>#{item.id}</Text>
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
                    <Text style={styles.routeText}>{item.pickup}</Text>
                </View>
                <View style={styles.routeArrow}>
                    <MaterialCommunityIcons name="arrow-right" size={16} color={colors.text.secondary} />
                </View>
                <View style={styles.routeItem}>
                    <MaterialCommunityIcons name="map-marker-check" size={16} color={colors.secondary} />
                    <Text style={styles.routeText}>{item.dropoff}</Text>
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
                            name={getUrgencyIcon(item.urgency || 'medium')}
                            size={16}
                            color={getUrgencyColor(item.urgency || 'medium')}
                        />
                        <Text style={[styles.urgencyText, { color: getUrgencyColor(item.urgency || 'medium') }]}>
                            {(item.urgency || 'MEDIUM').toUpperCase()} PRIORITY
                        </Text>
                    </View>
                </View>
                <Text style={styles.requestId}>#{item.id}</Text>
            </View>

            {/* Route information */}
            <View style={styles.routeContainer}>
                <View style={styles.routeItem}>
                    <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
                    <Text style={styles.routeText}>{item.fromLocation || item.pickupLocation}</Text>
                </View>
                <View style={styles.routeArrow}>
                    <MaterialCommunityIcons name="arrow-right" size={16} color={colors.text.secondary} />
                </View>
                <View style={styles.routeItem}>
                    <MaterialCommunityIcons name="map-marker-check" size={16} color={colors.secondary} />
                    <Text style={styles.routeText}>{item.toLocation || item.destination || 'Destination'}</Text>
                </View>
            </View>

            {/* Product and cargo details */}
            <View style={styles.cargoContainer}>
                <View style={styles.cargoItem}>
                    <MaterialCommunityIcons name="package-variant" size={14} color={colors.text.secondary} />
                    <Text style={styles.cargoText}>{item.productType || item.cargoDetails?.split(',')[0] || 'Product'}</Text>
                </View>
                <View style={styles.cargoItem}>
                    <MaterialCommunityIcons name="weight-kilogram" size={14} color={colors.text.secondary} />
                    <Text style={styles.cargoText}>{item.weight || item.cargoDetails?.split(',')[1]?.trim() || 'Weight'}</Text>
                </View>
                <View style={styles.cargoItem}>
                    <MaterialCommunityIcons name="calendar" size={14} color={colors.text.secondary} />
                    <Text style={styles.cargoText}>
                        {item.pickupTime ? new Date(item.pickupTime).toLocaleDateString() : 'Flexible'}
                    </Text>
                </View>
            </View>

            {/* Special Requirements */}
            {item.specialRequirements && item.specialRequirements.length > 0 && (
                <View style={styles.specialContainer}>
                    <Text style={styles.specialLabel}>Special Requirements:</Text>
                    <View style={styles.specialTags}>
                        {item.specialRequirements.slice(0, 3).map((req: string, index: number) => (
                            <View key={index} style={styles.specialTag}>
                                <Text style={styles.specialTagText}>{req}</Text>
                            </View>
                        ))}
                        {item.specialRequirements.length > 3 && (
                            <View style={styles.specialTag}>
                                <Text style={styles.specialTagText}>+{item.specialRequirements.length - 3}</Text>
                            </View>
                        )}
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
                <Text style={styles.clientName}>{item.client?.name || 'Client'}</Text>
                <View style={styles.clientRating}>
                    <MaterialCommunityIcons name="star" size={12} color={colors.secondary} />
                    <Text style={styles.ratingText}>{item.client?.rating || '4.5'}</Text>
                    <Text style={styles.ordersText}> • {item.client?.completedOrders || '0'} orders</Text>
                </View>
            </View>

            {/* Comprehensive Pricing breakdown */}
            <View style={styles.pricingContainer}>
                <View style={styles.pricingRow}>
                    <Text style={styles.pricingLabel}>Base Price:</Text>
                    <Text style={styles.pricingValue}>Ksh {(item.pricing?.basePrice || item.estimatedCost || 0).toLocaleString()}</Text>
                </View>
                {item.pricing?.urgencyBonus > 0 && (
                    <View style={styles.pricingRow}>
                        <Text style={styles.pricingLabel}>Urgency Bonus:</Text>
                        <Text style={[styles.pricingValue, { color: colors.success }]}>
                            +Ksh {item.pricing.urgencyBonus.toLocaleString()}
                        </Text>
                    </View>
                )}
                {item.pricing?.specialHandling > 0 && (
                    <View style={styles.pricingRow}>
                        <Text style={styles.pricingLabel}>Special Handling:</Text>
                        <Text style={[styles.pricingValue, { color: colors.warning }]}>
                            +Ksh {item.pricing.specialHandling.toLocaleString()}
                        </Text>
                    </View>
                )}
                {item.insureGoods && item.pricing?.insuranceCost > 0 && (
                    <View style={styles.pricingRow}>
                        <Text style={styles.pricingLabel}>Insurance Cost:</Text>
                        <Text style={[styles.pricingValue, { color: colors.secondary }]}>
                            +Ksh {item.pricing.insuranceCost.toLocaleString()}
                        </Text>
                    </View>
                )}
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Earnings:</Text>
                    <Text style={styles.totalValue}>Ksh {(item.pricing?.total || item.estimatedCost || 0).toLocaleString()}</Text>
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

            {/* Quick action buttons */}
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
                            <Text style={styles.buttonText}>Accept Booking</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderTabButton = (tab: 'instant' | 'bookings' | 'route', title: string, icon: string) => (
        <TouchableOpacity
            style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
            onPress={() => setActiveTab(tab)}
        >
            <MaterialCommunityIcons
                name={icon as any}
                size={20}
                color={activeTab === tab ? colors.white : colors.text.secondary}
            />
            <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
                {title}
            </Text>
        </TouchableOpacity>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'instant':
                return (
                    <FlatList
                        data={filteredRequests}
                        keyExtractor={(item) => item.id}
                        renderItem={renderInstantRequest}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContainer}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons name="package-variant-closed" size={48} color={colors.text.secondary} />
                                <Text style={styles.emptyTitle}>No Instant Requests</Text>
                                <Text style={styles.emptySubtitle}>
                                    New instant requests will appear here when they match your route
                                </Text>
                            </View>
                        }
                    />
                );
            case 'bookings':
                return (
                    <FlatList
                        data={filteredBookings}
                        keyExtractor={(item) => item.id}
                        renderItem={renderBooking}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContainer}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons name="calendar-blank" size={48} color={colors.text.secondary} />
                                <Text style={styles.emptyTitle}>No Active Bookings</Text>
                                <Text style={styles.emptySubtitle}>
                                    Your scheduled bookings will appear here
                                </Text>
                            </View>
                        }
                    />
                );
            case 'route':
                return (
                    <FlatList
                        data={filteredRouteLoads}
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
                                    Loads along your route will appear here
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

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                {renderTabButton('instant', 'Instant', 'lightning-bolt')}
                {renderTabButton('bookings', 'Bookings', 'calendar')}
                {renderTabButton('route', 'Route Loads', 'map-marker-path')}
            </View>

            {/* Filter Toggle */}
            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={styles.filterToggle}
                    onPress={() => setShowFilters(!showFilters)}
                >
                    <MaterialCommunityIcons 
                        name={showFilters ? "filter" : "filter-outline"} 
                        size={20} 
                        color={colors.primary} 
                    />
                    <Text style={styles.filterToggleText}>
                        {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </Text>
                    <MaterialCommunityIcons 
                        name={showFilters ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color={colors.primary} 
                    />
                </TouchableOpacity>
            </View>

            {/* Advanced Filters */}
            {showFilters && (
                <View style={styles.filtersPanel}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
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
