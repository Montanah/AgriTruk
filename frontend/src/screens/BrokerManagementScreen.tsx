import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { API_ENDPOINTS } from '../constants/api';
import { getReadableLocationName, formatRoute, cleanLocationDisplay, getReadableLocationNameSync } from '../utils/locationUtils';
import LocationDisplay from '../components/common/LocationDisplay';
import { getDisplayBookingId, getBookingTypeAndMode } from '../utils/unifiedIdSystem';
import { unifiedBookingService, UnifiedBooking, BookingFilters } from '../services/unifiedBookingService';

// Use UnifiedBooking interface from the service
type RequestItem = UnifiedBooking;

interface Client {
    id: string;
    name: string;
    company: string;
    phone: string;
    email: string;
    totalRequests: number;
    activeRequests: number;
    instantRequests: number;
    bookingRequests: number;
    // Enhanced request counters
    pendingRequests: number;
    confirmedRequests: number;
    inTransitRequests: number;
    deliveredRequests: number;
    completedRequests: number;
    cancelledRequests: number;
    consolidatedRequests: number;
    lastRequest: string;
    latestRequestStatus?: string;
    latestRequestType?: string;
    isVerified: boolean;
    requests?: RequestItem[];
    // Client performance metrics
    averageResponseTime?: number; // in hours
    successRate?: number; // percentage
    totalValue?: number; // total value of all requests
}

// Mock data removed - now using real API calls

const BrokerManagementScreen = ({ navigation, route }: any) => {
    const [activeTab, setActiveTab] = useState(route?.params?.activeTab || 'requests');
    const [requests, setRequests] = useState<RequestItem[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
    const [showConsolidationModal, setShowConsolidationModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    useEffect(() => {
        if (route.params?.activeTab) {
            setActiveTab(route.params.activeTab);
        }
        if (route.params?.selectedClient) {
            setSelectedClient(route.params.selectedClient);
        }
    }, [route.params]);

    useEffect(() => {
        // Load data when component mounts
        loadRequests();
        loadClients();
    }, []);

    // Refresh data when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            loadRequests();
            loadClients();
        }, [])
    );

    const loadRequests = async () => {
        try {
            setLoading(true);
            
            // Use unified booking service for consistent data handling
            const filters: BookingFilters = {
                // Add any specific filters for broker requests
            };
            
            const bookings = await unifiedBookingService?.getBookings('broker', filters);
            console.log('Broker requests from unified service:', bookings);
            
            setRequests(Array.isArray(bookings) ? bookings : []);
            // Reload clients to update active request counts
            await loadClients();
        } catch (error) {
            console.error('Error loading requests:', error);
            // Set empty data on error to prevent crashes
            setRequests([]);
        } finally {
            setLoading(false);
        }
    };

    const loadClients = async () => {
        try {
            const { getAuth } = require('firebase/auth');
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;
            
            const token = await user.getIdToken();
            const url = `${API_ENDPOINTS.BROKERS}/clients-with-requests`;
            console.log('🔍 Frontend calling URL:', url);
            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            
            if (res.ok) {
                const data = await res.json();
                console.log('Clients with requests API response:', data);
                setClients(Array.isArray(data?.data) ? data.data : []);
            } else {
                console.error('Failed to fetch clients with requests:', res.status, res.statusText);
                const errorData = await res.json().catch(() => ({}));
                console.error('Error details:', errorData);
                
                // If 404, it means broker lookup failed - set empty data instead of crashing
                if (res.status === 404) {
                    console.log('Broker not found in backend - setting empty clients');
                    setClients([]);
                }
            }
        } catch (error) {
            console.error('Error loading clients:', error);
            // Set empty data on error to prevent crashes
            setClients([]);
        }
    };

    const handleTrackRequest = (request: RequestItem) => {
        if (!request) return;
        if (request.type === 'instant') {
            navigation?.navigate?.('TripDetailsScreen', {
                booking: request,
                isInstant: true,
                userType: 'broker',
            });
        } else {
            navigation?.navigate?.('TrackingScreen', {
                booking: request,
                isConsolidated: false,
                userType: 'broker',
            });
        }
    };

    const handleViewMap = (request: RequestItem) => {
        if (!request) return;
        navigation?.navigate?.('MapViewScreen', {
            booking: request,
            userType: 'broker',
        });
    };

    const handleContactTransporter = (request: RequestItem) => {
        if (!request.transporter) {
            Alert.alert('No Transporter', 'No transporter assigned to this request yet.');
            return;
        }

        Alert.alert(
            'Contact Transporter',
            `Contact ${request.transporter.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Call', 
                    onPress: () => {
                        // TODO: Implement phone call functionality
                        Alert.alert('Call', `Calling ${request.transporter?.phone}...`);
                    }
                },
                { 
                    text: 'Chat', 
                    onPress: () => {
                        navigation?.navigate?.('ChatScreen', {
                            transporter: request?.transporter,
                            requestId: request?.id,
                            userType: 'broker'
                        });
                    }
                }
            ]
        );
    };

    const handleRequestSelection = (requestId: string) => {
        setSelectedRequests(prev =>
            prev.includes(requestId)
                ? prev.filter(id => id !== requestId)
                : [...prev, requestId]
        );
    };

    const handleConsolidate = () => {
        if (selectedRequests.length < 2) {
            Alert.alert('Error', 'Please select at least 2 requests to consolidate');
            return;
        }
        setShowConsolidationModal(true);
    };

    const confirmConsolidation = async () => {
        try {
            // Get selected requests data
            const selectedRequestsData = Array.isArray(requests) ? requests.filter(req => req && selectedRequests.includes(req.id)) : [];
            
            if (selectedRequestsData.length < 2) {
                Alert.alert('Error', 'Please select at least 2 requests to consolidate');
                return;
            }

            // Calculate consolidation data
            const consolidationData = {
                fromLocation: selectedRequestsData[0].fromLocation, // Use first request as base
                toLocation: selectedRequestsData[0].toLocation,
                productType: 'Mixed Products', // Since we're consolidating different products
                totalWeight: selectedRequestsData.reduce((sum, req) => {
                    const weight = parseFloat(req.weight) || 0;
                    return sum + weight;
                }, 0).toString(),
                urgency: selectedRequestsData.some(req => req.urgency === 'high') ? 'high' : 
                        selectedRequestsData.some(req => req.urgency === 'medium') ? 'medium' : 'low',
                description: `Consolidated request containing ${selectedRequestsData.length} individual requests`,
            };

            // Use unified booking service for consolidation
            const consolidatedBooking = await unifiedBookingService.consolidateBookings(
                selectedRequests,
                consolidationData
            );

            Alert.alert('Success', 'Requests consolidated successfully!');
            setSelectedRequests([]);
            setShowConsolidationModal(false);
            
            // Refresh requests list
            await loadRequests();
            
            // Navigate to consolidated request details
            navigation?.navigate?.('TrackingScreen', {
                booking: consolidatedBooking,
                isConsolidated: true,
                userType: 'broker',
            });
        } catch (error) {
            console.error('Error consolidating requests:', error);
            Alert.alert('Error', 'Failed to consolidate requests. Please try again.');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return colors.warning;
            case 'confirmed': return colors.secondary;
            case 'in_transit': return colors.primary;
            case 'delivered': return colors.success;
            case 'cancelled': return colors.error;
            default: return colors.text.light;
        }
    };

    const getUrgencyIcon = (urgency: string) => {
        switch (urgency) {
            case 'high': return 'fire';
            case 'medium': return 'clock-outline';
            case 'low': return 'walk';
            default: return 'clock-outline';
        }
    };

    const getUrgencyColor = (urgency: string) => {
        switch (urgency) {
            case 'high': return colors.error;
            case 'medium': return colors.warning;
            case 'low': return colors.success;
            default: return colors.text.light;
        }
    };

    const renderRequestItem = ({ item }: { item: RequestItem }) => (
        <View style={styles.requestCard}>
            <View style={styles.requestHeader}>
                <View style={styles.requestType}>
                    <MaterialCommunityIcons
                        name={item.type === 'instant' ? 'flash' : 'calendar-clock'}
                        size={20}
                        color={item.type === 'instant' ? colors.warning : colors.secondary}
                    />
                    <Text style={[styles.requestTypeText, {
                        color: item.type === 'instant' ? colors.warning : colors.secondary
                    }]}>
                        {item.type === 'instant' ? 'Instant' : 'Booking'}
                    </Text>
                </View>

                <View style={styles.requestStatus}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status.replace('_', ' ').toUpperCase()}
                    </Text>
                </View>
            </View>

            {/* Booking ID */}
            <View style={styles.bookingIdContainer}>
                <Text style={styles.bookingIdLabel}>ID:</Text>
                <Text style={styles.bookingIdValue}>{getDisplayBookingId(item)}</Text>
            </View>

            <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{item.client?.name || item.brokerData?.clientName || 'Client'}</Text>
                {!!(item.client?.company || item.client?.email || item.client?.phone) && (
                  <Text style={styles.clientCompany}>
                    {item.client?.company || item.client?.email || item.client?.phone}
                  </Text>
                )}
            </View>

            <View style={styles.routeInfo}>
                <View style={styles.routeItem}>
                    <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
                    <Text style={styles.routeText}>
                        {cleanLocationDisplay(item.fromLocation?.address || (item.fromLocation as any) || 'Unknown location')}
                    </Text>
                </View>
                <MaterialCommunityIcons name="arrow-right" size={16} color={colors.text.light} />
                <View style={styles.routeItem}>
                    <MaterialCommunityIcons name="map-marker-check" size={16} color={colors.success} />
                    <Text style={styles.routeText}>
                        {cleanLocationDisplay(item.toLocation?.address || (item.toLocation as any) || 'Unknown location')}
                    </Text>
                </View>
            </View>

            <View style={styles.cargoInfo}>
                <View style={styles.cargoItem}>
                    <MaterialCommunityIcons name="package-variant" size={16} color={colors.secondary} />
                    <Text style={styles.cargoText}>{item.productType}</Text>
                </View>
                <View style={styles.cargoItem}>
                    <MaterialCommunityIcons name="weight" size={16} color={colors.tertiary} />
                    <Text style={styles.cargoText}>{item.weight}</Text>
                </View>
                <View style={styles.cargoItem}>
                    <MaterialCommunityIcons
                        name={getUrgencyIcon(item.urgency)}
                        size={16}
                        color={getUrgencyColor(item.urgency)}
                    />
                    <Text style={[styles.cargoText, { color: getUrgencyColor(item.urgency) }]}>
                        {item.urgency}
                    </Text>
                </View>
            </View>

            {/* Shipping Cost - Always use backend-calculated cost: cost > price > estimatedCost */}
            {(item.cost || item.price || item.estimatedCost) && (
                <View style={styles.costInfo}>
                    <MaterialCommunityIcons name="currency-usd" size={16} color={colors.success} />
                    <Text style={styles.costLabel}>Shipping Cost:</Text>
                    <Text style={styles.costValue}>
                        KES {Number(item.cost || item.price || item.estimatedCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                </View>
            )}

            {item.estimatedValue && (
                <View style={styles.valueInfo}>
                    <Text style={styles.valueLabel}>Estimated Value:</Text>
                    <Text style={styles.valueAmount}>KES {item.estimatedValue.toLocaleString()}</Text>
                </View>
            )}

            {/* Transporter Information */}
            {(item.transporter?.id || item.transporter?.name) && (
                <View style={styles.transporterInfo}>
                    <View style={styles.transporterHeader}>
                        <MaterialCommunityIcons name="account-tie" size={16} color={colors.primary} />
                        <Text style={styles.transporterLabel}>Assigned Transporter:</Text>
                    </View>
                    <View style={styles.transporterDetails}>
                        <Text style={styles.transporterName}>
                            {item.transporter?.name || 'Unknown Transporter'}
                        </Text>
                        <Text style={styles.transporterPhone}>
                            {item.transporter?.phone || 'N/A'}
                        </Text>
                        {(item.transporterRating || item.transporter?.rating) && (
                            <View style={styles.ratingContainer}>
                                <MaterialCommunityIcons name="star" size={14} color={colors.warning} />
                                <Text style={styles.ratingText}>
                                    {item.transporterRating || item.transporter?.rating || 'N/A'}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* Vehicle Information */}
            {(item.vehicleId || item.vehicleMake || item.vehicleRegistration || item.vehicle?.make || item.vehicle?.registration || item.transporter?.assignedVehicle?.vehicleMake || item.transporter?.vehicleMake) && (
                <View style={styles.vehicleInfo}>
                    <View style={styles.vehicleHeader}>
                        <MaterialCommunityIcons name="truck" size={16} color={colors.secondary} />
                        <Text style={styles.vehicleLabel}>Vehicle Details:</Text>
                    </View>
                    <View style={styles.vehicleDetails}>
                        <Text style={styles.vehicleName}>
                            {item.vehicleMake || item.vehicle?.make || item.transporter?.assignedVehicle?.vehicleMake || item.transporter?.vehicleMake || 'Unknown'} {item.vehicleModel || item.vehicle?.model || item.transporter?.assignedVehicle?.vehicleModel || item.transporter?.vehicleModel || ''} ({item.vehicleYear || item.vehicle?.year || item.transporter?.assignedVehicle?.vehicleYear || item.transporter?.vehicleYear || 'N/A'})
                        </Text>
                        <Text style={styles.vehicleRegistration}>
                            {item.vehicleRegistration || item.vehicle?.registration || item.transporter?.assignedVehicle?.vehicleRegistration || item.transporter?.vehicleRegistration || 'N/A'}
                        </Text>
                        <Text style={styles.vehicleType}>
                            {item.vehicleType || item.vehicle?.type || item.transporter?.assignedVehicle?.vehicleType || item.transporter?.vehicleType || 'N/A'} • {item.vehicleCapacity || item.vehicle?.capacity || item.transporter?.assignedVehicle?.vehicleCapacity || item.transporter?.vehicleCapacity || 'N/A'}
                        </Text>
                        <Text style={styles.vehicleColor}>
                            {item.vehicleColor || item.vehicle?.color || item.transporter?.assignedVehicle?.vehicleColor || item.transporter?.vehicleColor || 'N/A'}
                        </Text>
                    </View>
                </View>
            )}

            <View style={styles.requestActions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleTrackRequest(item)}
                >
                    <MaterialCommunityIcons name="map-marker-path" size={16} color={colors.primary} />
                    <Text style={styles.actionButtonText}>Track</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.mapButton]}
                    onPress={() => handleViewMap(item)}
                >
                    <MaterialCommunityIcons name="map" size={16} color={colors.secondary} />
                    <Text style={[styles.actionButtonText, { color: colors.secondary }]}>Map</Text>
                </TouchableOpacity>

                {item.transporter && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.chatButton]}
                        onPress={() => handleContactTransporter(item)}
                    >
                        <MaterialCommunityIcons name="message" size={16} color={colors.success} />
                        <Text style={[styles.actionButtonText, { color: colors.success }]}>Chat</Text>
                    </TouchableOpacity>
                )}

                {activeTab === 'consolidation' && (
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            selectedRequests.includes(item.id) ? styles.selectedButton : styles.selectButton
                        ]}
                        onPress={() => handleRequestSelection(item.id)}
                    >
                        <MaterialCommunityIcons
                            name={selectedRequests.includes(item.id) ? "check-circle" : "circle-outline"}
                            size={16}
                            color={selectedRequests.includes(item.id) ? colors.white : colors.primary}
                        />
                        <Text style={[
                            styles.actionButtonText,
                            { color: selectedRequests.includes(item.id) ? colors.white : colors.primary }
                        ]}>
                            {selectedRequests.includes(item.id) ? 'Selected' : 'Select'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            <Text style={styles.requestTime}>{item.createdAt}</Text>
        </View>
    );

    const handleClientPress = (client: Client) => {
        setSelectedClient(client);
        // If client has requests, show them in a modal or navigate to client requests
        if (client.requests && client.requests.length > 0) {
            // You can add navigation to client requests screen here
            console.log('Client requests:', client.requests);
        }
    };

    const renderClientItem = ({ item }: { item: Client }) => (
        <TouchableOpacity
            style={styles.clientCard}
            onPress={() => handleClientPress(item)}
        >
            <View style={styles.clientHeader}>
                <View style={styles.clientAvatar}>
                    <Text style={styles.clientInitials}>
                        {(item?.name || 'U').split(' ').filter(n => n).map(n => n?.[0] || '').filter(c => c).join('') || 'U'}
                    </Text>
                    {item.isVerified && (
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                        </View>
                    )}
                </View>

                <View style={styles.clientCardInfo}>
                    <Text style={styles.clientCardName}>{item.name}</Text>
                    <Text style={styles.clientCardCompany}>{item.company}</Text>
                </View>

                <View style={styles.clientStats}>
                    {/* Primary Stats Row */}
                    <View style={styles.clientStatsRow}>
                        <Text style={styles.clientRequests}>{item.activeRequests} active</Text>
                        <Text style={styles.clientTotal}>{item.totalRequests} total</Text>
                    </View>
                    
                    {/* Request Type Breakdown */}
                    <View style={styles.clientStatsRow}>
                        <Text style={styles.clientInstant}>{item.instantRequests} instant</Text>
                        <Text style={styles.clientBooking}>{item.bookingRequests} booking</Text>
                    </View>
                    
                    {/* Status Breakdown */}
                    <View style={styles.clientStatusBreakdown}>
                        {item.pendingRequests > 0 && (
                            <View style={styles.statusBadge}>
                                <Text style={[styles.statusBadgeText, { color: colors.warning }]}>
                                    {item.pendingRequests} pending
                                </Text>
                            </View>
                        )}
                        {item.inTransitRequests > 0 && (
                            <View style={styles.statusBadge}>
                                <Text style={[styles.statusBadgeText, { color: colors.secondary }]}>
                                    {item.inTransitRequests} in transit
                                </Text>
                            </View>
                        )}
                        {item.deliveredRequests > 0 && (
                            <View style={styles.statusBadge}>
                                <Text style={[styles.statusBadgeText, { color: colors.success }]}>
                                    {item.deliveredRequests} delivered
                                </Text>
                            </View>
                        )}
                        {item.consolidatedRequests > 0 && (
                            <View style={styles.statusBadge}>
                                <Text style={[styles.statusBadgeText, { color: colors.primary }]}>
                                    {item.consolidatedRequests} consolidated
                                </Text>
                            </View>
                        )}
                    </View>
                    
                    {/* Performance Metrics */}
                    {(item.successRate || item.averageResponseTime || item.totalValue) && (
                        <View style={styles.clientPerformance}>
                            {item.successRate && (
                                <Text style={styles.performanceText}>
                                    Success: {item.successRate}%
                                </Text>
                            )}
                            {item.averageResponseTime && (
                                <Text style={styles.performanceText}>
                                    Avg Response: {item.averageResponseTime}h
                                </Text>
                            )}
                            {item.totalValue && (
                                <Text style={styles.performanceText}>
                                    Total Value: KES {item.totalValue.toLocaleString()}
                                </Text>
                            )}
                        </View>
                    )}
                    
                    {item.latestRequestStatus && (
                        <View style={styles.latestRequestInfo}>
                            <Text style={styles.latestRequestText}>
                                Latest: {item.latestRequestType} - {item.latestRequestStatus}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.clientContact}>
                <View style={styles.contactItem}>
                    <MaterialCommunityIcons name="phone" size={16} color={colors.text.secondary} />
                    <Text style={styles.contactText}>{item.phone}</Text>
                </View>
                <View style={styles.contactItem}>
                    <MaterialCommunityIcons name="email" size={16} color={colors.text.secondary} />
                    <Text style={styles.contactText}>{item.email}</Text>
                </View>
            </View>

            <View style={styles.clientActions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation?.navigate?.('BrokerRequestScreen', {
                        clientId: item?.id,
                        selectedClient: item
                    })}
                >
                    <MaterialCommunityIcons name="plus-circle" size={16} color={colors.primary} />
                    <Text style={styles.actionButtonText}>New Request</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.viewButton]}
                    onPress={() => {
                        setActiveTab('tracking');
                        setSelectedClient(item);
                    }}
                >
                    <MaterialCommunityIcons name="eye" size={16} color={colors.secondary} />
                    <Text style={[styles.actionButtonText, { color: colors.secondary }]}>View</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case 'requests':
                return (
                    <View style={styles.tabContent}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>All Requests</Text>
                            <TouchableOpacity
                                style={styles.newRequestButton}
                                onPress={() => navigation?.navigate?.('BrokerRequestScreen')}
                            >
                                <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
                                <Text style={styles.newRequestButtonText}>New Request</Text>
                            </TouchableOpacity>
                        </View>

                        {(!Array.isArray(requests) || requests.length === 0) ? (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="clipboard-list-outline" size={48} color={colors.text.light} />
                                <Text style={styles.emptyStateTitle}>No Requests Yet</Text>
                                <Text style={styles.emptyStateText}>
                                    {loading ? 'Loading your requests...' : 'Create your first request to get started with managing client transportation needs.'}
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={requests}
                                renderItem={renderRequestItem}
                                keyExtractor={(item) => item.id}
                                showsVerticalScrollIndicator={false}
                                scrollEnabled={false}
                                contentContainerStyle={{ paddingBottom: spacing.xxl }}
                            />
                        )}
                    </View>
                );

            case 'consolidation':
                const pendingRequests = Array.isArray(requests) ? requests.filter(r => r && r.status === 'pending') : [];
                return (
                    <View style={styles.tabContent}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Consolidation</Text>
                            <View style={styles.headerActions}>
                                {pendingRequests.length > 0 && (
                                    <View style={styles.selectionActions}>
                                        <TouchableOpacity
                                            style={styles.selectionButton}
                                            onPress={() => setSelectedRequests(pendingRequests.map(r => r.id))}
                                        >
                                            <MaterialCommunityIcons name="select-all" size={16} color={colors.primary} />
                                            <Text style={styles.selectionButtonText}>Select All</Text>
                                        </TouchableOpacity>
                                        {selectedRequests.length > 0 && (
                                            <TouchableOpacity
                                                style={styles.selectionButton}
                                                onPress={() => setSelectedRequests([])}
                                            >
                                                <MaterialCommunityIcons name="close-circle" size={16} color={colors.error} />
                                                <Text style={[styles.selectionButtonText, { color: colors.error }]}>Clear</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                                {selectedRequests.length > 0 && (
                                    <TouchableOpacity
                                        style={styles.consolidateButton}
                                        onPress={handleConsolidate}
                                    >
                                        <MaterialCommunityIcons name="layers" size={20} color={colors.white} />
                                        <Text style={styles.consolidateButtonText}>
                                            Consolidate ({selectedRequests.length})
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        <View style={styles.consolidationInfoCard}>
                            <MaterialCommunityIcons name="information" size={20} color={colors.primary} />
                            <Text style={styles.consolidationInfo}>
                                Select multiple requests to consolidate them into a single transport request for cost savings.
                            </Text>
                        </View>

                        {selectedRequests.length > 0 && (
                            <View style={styles.selectedRequestsCard}>
                                <Text style={styles.selectedRequestsTitle}>
                                    Selected Requests ({selectedRequests.length})
                                </Text>
                                <Text style={styles.selectedRequestsSubtitle}>
                                    Tap "Consolidate" to merge these requests
                                </Text>
                            </View>
                        )}

                        {pendingRequests.length === 0 ? (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="package-variant" size={48} color={colors.text.light} />
                                <Text style={styles.emptyStateTitle}>No Pending Requests</Text>
                                <Text style={styles.emptyStateText}>
                                    There are no pending requests available for consolidation.
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={pendingRequests}
                                renderItem={renderRequestItem}
                                keyExtractor={(item) => item.id}
                                showsVerticalScrollIndicator={false}
                                scrollEnabled={false}
                                contentContainerStyle={{ paddingBottom: spacing.xxl }}
                            />
                        )}
                    </View>
                );

            case 'tracking':
                return (
                    <View style={styles.tabContent}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Track Requests</Text>
                            {selectedClient && (
                                <TouchableOpacity
                                    style={styles.clientFilter}
                                    onPress={() => setSelectedClient(null)}
                                >
                                    <Text style={styles.clientFilterText}>Clear Filter</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {selectedClient && (
                            <View style={styles.clientFilterCard}>
                                <Text style={styles.clientFilterTitle}>Filtering by: {selectedClient.name}</Text>
                                <Text style={styles.clientFilterSubtitle}>{selectedClient.company}</Text>
                            </View>
                        )}

                        <FlatList
                            data={selectedClient
                                ? (Array.isArray(requests) ? requests.filter(r => {
                                    if (!r) return false;
                                    const cid = (r as any)?.brokerData?.clientId || r?.client?.id;
                                    return cid && cid === selectedClient?.id;
                                  }) : [])
                                : (Array.isArray(requests) ? requests : [])
                            }
                            renderItem={renderRequestItem}
                            keyExtractor={(item) => item?.id || Math.random().toString()}
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={false}
                            contentContainerStyle={{ paddingBottom: spacing.xxl }}
                        />
                    </View>
                );

            case 'clients':
                return (
                    <View style={styles.tabContent}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Client Management</Text>
                            <TouchableOpacity
                                style={styles.addClientButton}
                                onPress={() => navigation?.navigate?.('Home')}
                            >
                                <MaterialCommunityIcons name="account-plus" size={20} color={colors.white} />
                                <Text style={styles.addClientButtonText}>Add Client</Text>
                            </TouchableOpacity>
                        </View>

                        {(!Array.isArray(clients) || clients.length === 0) ? (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="account-group" size={48} color={colors.text.secondary} />
                                <Text style={styles.emptyStateText}>No clients found</Text>
                                <Text style={styles.emptyStateSubtext}>Add your first client to get started</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={clients}
                                renderItem={renderClientItem}
                                keyExtractor={(item) => item.id}
                                showsVerticalScrollIndicator={false}
                                scrollEnabled={false}
                            />
                        )}
                    </View>
                );

            default:
                return null;
        }
    };

    
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
                <Text style={styles.headerTitle}>Management</Text>
                <View style={styles.headerSpacer} />
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
                        onPress={() => setActiveTab('requests')}
                    >
                        <MaterialCommunityIcons
                            name="clipboard-list"
                            size={20}
                            color={activeTab === 'requests' ? colors.white : colors.text.secondary}
                        />
                        <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
                            Requests
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'consolidation' && styles.activeTab]}
                        onPress={() => setActiveTab('consolidation')}
                    >
                        <MaterialCommunityIcons
                            name="layers"
                            size={20}
                            color={activeTab === 'consolidation' ? colors.white : colors.text.secondary}
                        />
                        <Text style={[styles.tabText, activeTab === 'consolidation' && styles.activeTabText]}>
                            Consolidation
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'tracking' && styles.activeTab]}
                        onPress={() => setActiveTab('tracking')}
                    >
                        <MaterialCommunityIcons
                            name="map-marker-path"
                            size={20}
                            color={activeTab === 'tracking' ? colors.white : colors.text.secondary}
                        />
                        <Text style={[styles.tabText, activeTab === 'tracking' && styles.activeTabText]}>
                            Tracking
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'clients' && styles.activeTab]}
                        onPress={() => setActiveTab('clients')}
                    >
                        <MaterialCommunityIcons
                            name="account-group"
                            size={20}
                            color={activeTab === 'clients' ? colors.white : colors.text.secondary}
                        />
                        <Text style={[styles.tabText, activeTab === 'clients' && styles.activeTabText]}>
                            Clients
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* Tab Content */}
            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: spacing.xxl * 2 }} showsVerticalScrollIndicator={false}>
                {renderTabContent()}
            </ScrollView>

            {/* Consolidation Modal */}
            <Modal
                visible={showConsolidationModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowConsolidationModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Consolidate Requests</Text>
                            <TouchableOpacity onPress={() => setShowConsolidationModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text.secondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalDescription}>
                            You are about to consolidate {selectedRequests.length} requests into a single transport request.
                            This will help reduce costs and improve efficiency.
                        </Text>

                        <View style={styles.consolidationPreview}>
                            <Text style={styles.previewTitle}>Selected Requests:</Text>
                            {requests
                                .filter(r => r && selectedRequests.includes(r.id))
                                .map(request => {
                                    if (!request) return null;
                                    try {
                                        return (
                                            <View key={request.id || Math.random()} style={styles.previewItem}>
                                                <Text style={styles.previewText}>
                                                    • {formatRoute(request.fromLocation, request.toLocation)} ({request.productType || 'N/A'})
                                                </Text>
                                            </View>
                                        );
                                    } catch (e) {
                                        console.warn('Error rendering preview item:', e);
                                        return null;
                                    }
                                })
                                .filter(item => item != null)
                            }
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowConsolidationModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmButton}
                                onPress={confirmConsolidation}
                            >
                                <Text style={styles.confirmButtonText}>Consolidate</Text>
                            </TouchableOpacity>
                        </View>
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
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: spacing.sm,
    },
    headerTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginLeft: spacing.md,
    },
    headerSpacer: {
        width: 44,
    },
    tabContainer: {
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingVertical: spacing.sm,
        elevation: 2,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        minHeight: 60, // Ensure minimum height
        zIndex: 1, // Ensure it's above other content
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginHorizontal: spacing.xs,
        borderRadius: 20,
        gap: spacing.xs,
        minWidth: 100,
        justifyContent: 'center',
    },
    activeTab: {
        backgroundColor: colors.primary,
    },
    tabText: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.secondary,
    },
    activeTabText: {
        color: colors.white,
    },
    content: {
        flex: 1,
        padding: spacing.lg,
    },
    tabContent: {
        flex: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    newRequestButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        gap: spacing.xs,
    },
    newRequestButtonText: {
        color: colors.white,
        fontSize: fonts.size.sm,
        fontWeight: '600',
    },
    consolidateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.success,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        gap: spacing.xs,
    },
    consolidateButtonText: {
        color: colors.white,
        fontSize: fonts.size.sm,
        fontWeight: '600',
    },
    consolidationInfoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.primary + '10',
        padding: spacing.md,
        borderRadius: 8,
        marginBottom: spacing.md,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    consolidationInfo: {
        flex: 1,
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginLeft: spacing.sm,
        lineHeight: 20,
    },
    selectedRequestsCard: {
        backgroundColor: colors.success + '10',
        padding: spacing.md,
        borderRadius: 8,
        marginBottom: spacing.md,
        borderLeftWidth: 3,
        borderLeftColor: colors.success,
    },
    selectedRequestsTitle: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.success,
        marginBottom: spacing.xs,
    },
    selectedRequestsSubtitle: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.xl * 2,
    },
    emptyStateTitle: {
        fontSize: fonts.size.lg,
        fontWeight: '600',
        color: colors.text.primary,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    emptyStateText: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        textAlign: 'center',
        paddingHorizontal: spacing.lg,
        lineHeight: 22,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    selectionActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    selectionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 16,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.xs,
    },
    selectionButtonText: {
        fontSize: fonts.size.xs,
        fontWeight: '600',
        color: colors.primary,
    },
    addClientButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.secondary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        gap: spacing.xs,
    },
    addClientButtonText: {
        color: colors.white,
        fontSize: fonts.size.sm,
        fontWeight: '600',
    },
    consolidationInfo: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginBottom: spacing.lg,
        lineHeight: 20,
    },
    clientFilter: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: 16,
    },
    clientFilterText: {
        fontSize: fonts.size.sm,
        color: colors.primary,
        fontWeight: '600',
    },
    clientFilterCard: {
        backgroundColor: colors.primary + '10',
        padding: spacing.md,
        borderRadius: 12,
        marginBottom: spacing.lg,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    clientFilterTitle: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.primary,
        marginBottom: 2,
    },
    clientFilterSubtitle: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
    },

    // Request Card Styles
    requestCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.md,
        shadowColor: colors.black,
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    bookingIdContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
        padding: spacing.xs,
        backgroundColor: colors.background,
        borderRadius: 6,
        flex: 1,
        flexShrink: 1,
        marginRight: spacing.sm,
    },
    bookingIdLabel: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginRight: spacing.xs,
    },
    bookingIdValue: {
        fontSize: fonts.size.sm,
        fontWeight: fonts.weight.bold,
        color: colors.primary,
        flexShrink: 1,
        maxWidth: '75%',
    },
    requestType: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    requestTypeText: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
    },
    requestStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: fonts.size.xs,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    clientInfo: {
        marginBottom: spacing.md,
    },
    clientName: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 2,
    },
    clientCompany: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
    },
    routeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
        paddingHorizontal: spacing.sm,
    },
    routeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: spacing.xs,
    },
    routeText: {
        fontSize: fonts.size.sm,
        fontWeight: '500',
        color: colors.text.primary,
    },
    cargoInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    cargoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    cargoText: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        textTransform: 'capitalize',
    },
    costInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        backgroundColor: colors.success + '10',
        borderRadius: 6,
        gap: spacing.xs,
    },
    costLabel: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    costValue: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.success,
    },
    valueInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: 8,
    },
    valueLabel: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
    },
    valueAmount: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.primary,
    },
    // Transporter Information Styles
    transporterInfo: {
        marginBottom: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    transporterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    transporterLabel: {
        fontSize: fonts.size.sm,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginLeft: spacing.xs,
    },
    transporterDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    transporterName: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.primary,
    },
    transporterPhone: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingText: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginLeft: 2,
    },
    chatButton: {
        backgroundColor: colors.success + '10',
        borderColor: colors.success,
    },
    // Vehicle Information Styles
    vehicleInfo: {
        marginBottom: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: colors.secondary,
    },
    vehicleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    vehicleLabel: {
        fontSize: fonts.size.sm,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginLeft: spacing.xs,
    },
    vehicleDetails: {
        flexDirection: 'column',
        gap: spacing.xs,
    },
    vehicleName: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.primary,
    },
    vehicleRegistration: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    vehicleType: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
    },
    vehicleColor: {
        fontSize: fonts.size.xs,
        color: colors.text.light,
    },
    // Consolidation Tab Styles
    consolidationTabs: {
        flexDirection: 'row',
        marginBottom: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: 4,
    },
    consolidationTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 6,
    },
    activeConsolidationTab: {
        backgroundColor: colors.primary,
    },
    consolidationTabText: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.secondary,
        marginLeft: spacing.xs,
    },
    activeConsolidationTabText: {
        color: colors.white,
    },
    // Enhanced Selection Actions
    selectionActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: 8,
    },
    selectionInfo: {
        flex: 1,
    },
    selectionCount: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    selectionSubtext: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginTop: 2,
    },
    selectionButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    requestActions: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        backgroundColor: colors.surface,
        gap: spacing.xs,
        flex: 1,
        justifyContent: 'center',
    },
    mapButton: {
        backgroundColor: colors.secondary + '20',
    },
    selectButton: {
        backgroundColor: colors.primary + '20',
    },
    selectedButton: {
        backgroundColor: colors.primary,
    },
    actionButtonText: {
        fontSize: fonts.size.xs,
        fontWeight: '600',
        color: colors.primary,
    },
    requestTime: {
        fontSize: fonts.size.xs,
        color: colors.text.light,
        textAlign: 'right',
    },

    // Client Card Styles
    clientCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.md,
        shadowColor: colors.black,
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    clientHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    clientAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
        position: 'relative',
    },
    clientInitials: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.primary,
    },
    verifiedBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: colors.white,
        borderRadius: 10,
    },
    clientCardInfo: {
        flex: 1,
    },
    clientCardName: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 2,
    },
    clientCardCompany: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
    },
    clientStats: {
        alignItems: 'flex-end',
        flex: 1,
    },
    clientStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    clientStatusBreakdown: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        marginTop: 4,
        gap: 4,
    },
    statusBadge: {
        backgroundColor: colors.background.light,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    statusBadgeText: {
        fontSize: fonts.size.xs,
        fontWeight: '500',
    },
    clientPerformance: {
        marginTop: 4,
        alignItems: 'flex-end',
    },
    performanceText: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginBottom: 1,
    },
    clientRequests: {
        fontSize: fonts.size.sm,
        color: colors.primary,
        fontWeight: '600',
        marginRight: spacing.sm,
    },
    clientTotal: {
        fontSize: fonts.size.xs,
        color: colors.text.light,
    },
    clientInstant: {
        fontSize: fonts.size.xs,
        color: colors.warning,
        marginRight: spacing.sm,
    },
    clientBooking: {
        fontSize: fonts.size.xs,
        color: colors.secondary,
    },
    latestRequestInfo: {
        marginTop: spacing.xs,
        paddingTop: spacing.xs,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    latestRequestText: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        fontStyle: 'italic',
    },
    clientContact: {
        flexDirection: 'row',
        gap: spacing.lg,
        marginBottom: spacing.md,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    contactText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
    },
    clientActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    viewButton: {
        backgroundColor: colors.secondary + '20',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.black + '50',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: spacing.xl,
        width: '90%',
        maxWidth: 400,
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
    modalDescription: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        lineHeight: 20,
        marginBottom: spacing.lg,
    },
    consolidationPreview: {
        marginBottom: spacing.lg,
    },
    previewTitle: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    previewItem: {
        marginBottom: spacing.xs,
    },
    previewText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
    },
    modalActions: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.secondary,
    },
    confirmButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: 12,
        backgroundColor: colors.success,
        alignItems: 'center',
    },
    confirmButtonText: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.white,
    },

    // Empty State Styles
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyStateText: {
        fontSize: fonts.size.lg,
        fontWeight: '600',
        color: colors.text.primary,
        marginTop: spacing.md,
        marginBottom: spacing.xs,
    },
    emptyStateSubtext: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
    },
});

export default BrokerManagementScreen;
