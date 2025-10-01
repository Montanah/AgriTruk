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

interface RequestItem {
    id: string;
    type: 'instant' | 'booking';
    status: string;
    clientName: string;
    clientCompany: string;
    fromLocation: string;
    toLocation: string;
    productType: string;
    weight: string;
    urgency: string;
    createdAt: string;
    estimatedValue?: number;
    description?: string;
    clientRating?: number;
    price?: number;
    isConsolidated?: boolean;
    consolidatedRequests?: RequestItem[];
}

interface Client {
    id: string;
    name: string;
    company: string;
    phone: string;
    email: string;
    totalRequests: number;
    activeRequests: number;
    lastRequest: string;
    isVerified: boolean;
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
            const { getAuth } = require('firebase/auth');
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;
            
            const token = await user.getIdToken();
            const res = await fetch(`${API_ENDPOINTS.BROKERS}/requests`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            
            if (res.ok) {
                const data = await res.json();
                setRequests(data.requests || []);
            }
        } catch (error) {
            console.error('Error loading requests:', error);
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
            const res = await fetch(`${API_ENDPOINTS.BROKERS}/clients`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            
            if (res.ok) {
                const data = await res.json();
                setClients(data.data || []);
            }
        } catch (error) {
            console.error('Error loading clients:', error);
        }
    };

    const handleTrackRequest = (request: RequestItem) => {
        if (request.type === 'instant') {
            navigation.navigate('TripDetailsScreen', {
                booking: request,
                isInstant: true,
                userType: 'broker',
            });
        } else {
            navigation.navigate('TrackingScreen', {
                booking: request,
                isConsolidated: false,
                userType: 'broker',
            });
        }
    };

    const handleViewMap = (request: RequestItem) => {
        navigation.navigate('MapViewScreen', {
            booking: request,
            userType: 'broker',
        });
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
            const { getAuth } = require('firebase/auth');
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();
            
            const response = await fetch(`${API_ENDPOINTS.BROKERS}/requests/consolidate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    requestIds: selectedRequests,
                }),
            });
            
            if (response.ok) {
                const data = await response.json();
                Alert.alert('Success', 'Requests consolidated successfully!');
                setSelectedRequests([]);
                setShowConsolidationModal(false);
                // Refresh requests list
                await loadRequests();
            } else {
                const errorData = await response.json();
                console.error('Consolidation failed:', errorData);
                Alert.alert('Error', errorData.message || 'Failed to consolidate requests');
            }
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
                <Text style={styles.clientName}>{item.clientName}</Text>
                <Text style={styles.clientCompany}>{item.clientCompany}</Text>
            </View>

            <View style={styles.routeInfo}>
                <View style={styles.routeItem}>
                    <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
                    <Text style={styles.routeText}>
                        {cleanLocationDisplay(item.fromLocation || 'Unknown location')}
                    </Text>
                </View>
                <MaterialCommunityIcons name="arrow-right" size={16} color={colors.text.light} />
                <View style={styles.routeItem}>
                    <MaterialCommunityIcons name="map-marker-check" size={16} color={colors.success} />
                    <Text style={styles.routeText}>
                        {cleanLocationDisplay(item.toLocation || 'Unknown location')}
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

            {item.estimatedValue && (
                <View style={styles.valueInfo}>
                    <Text style={styles.valueLabel}>Estimated Value:</Text>
                    <Text style={styles.valueAmount}>KES {item.estimatedValue.toLocaleString()}</Text>
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
                    <Text style={[styles.actionButtonText, { color: colors.secondary }]}>View Map</Text>
                </TouchableOpacity>

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

    const renderClientItem = ({ item }: { item: Client }) => (
        <TouchableOpacity
            style={styles.clientCard}
            onPress={() => setSelectedClient(item)}
        >
            <View style={styles.clientHeader}>
                <View style={styles.clientAvatar}>
                    <Text style={styles.clientInitials}>
                        {item.name.split(' ').map(n => n[0]).join('')}
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
                    <Text style={styles.clientRequests}>{item.activeRequests} active</Text>
                    <Text style={styles.clientTotal}>{item.totalRequests} total</Text>
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
                    onPress={() => navigation.navigate('BrokerRequestScreen', {
                        clientId: item.id,
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
                                onPress={() => navigation.navigate('BrokerRequestScreen')}
                            >
                                <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
                                <Text style={styles.newRequestButtonText}>New Request</Text>
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={requests}
                            renderItem={renderRequestItem}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={false}
                        />
                    </View>
                );

            case 'consolidation':
                const pendingRequests = requests.filter(r => r.status === 'pending');
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
                                ? requests.filter(r => r.clientName === selectedClient.name)
                                : requests
                            }
                            renderItem={renderRequestItem}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={false}
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
                                onPress={() => navigation.navigate('Home')}
                            >
                                <MaterialCommunityIcons name="account-plus" size={20} color={colors.white} />
                                <Text style={styles.addClientButtonText}>Add Client</Text>
                            </TouchableOpacity>
                        </View>

                        {clients.length === 0 ? (
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
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                                .filter(r => selectedRequests.includes(r.id))
                                .map(request => (
                                    <View key={request.id} style={styles.previewItem}>
                                        <Text style={styles.previewText}>
                                            • {formatRoute(request.fromLocation, request.toLocation)} ({request.productType})
                                        </Text>
                                    </View>
                                ))
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
    },
    clientRequests: {
        fontSize: fonts.size.sm,
        color: colors.primary,
        fontWeight: '600',
    },
    clientTotal: {
        fontSize: fonts.size.xs,
        color: colors.text.light,
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
