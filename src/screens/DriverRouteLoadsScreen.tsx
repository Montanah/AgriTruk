import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Modal,
} from 'react-native';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { driverAvailabilityService, RouteLoad } from '../services/driverAvailabilityService';
import LocationDisplay from '../components/common/LocationDisplay';
import { getDisplayBookingId } from '../utils/unifiedIdSystem';

interface FilterState {
    fromLocation: string;
    toLocation: string;
    productType: string;
    maxDistance: number;
    priceRange: { min: number; max: number };
    dateRange: { start: string; end: string };
}

const DriverRouteLoadsScreen = () => {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [routeLoads, setRouteLoads] = useState<RouteLoad[]>([]);
    const [filteredLoads, setFilteredLoads] = useState<RouteLoad[]>([]);
    const [selectedLoads, setSelectedLoads] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [consolidationModalVisible, setConsolidationModalVisible] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        fromLocation: '',
        toLocation: '',
        productType: '',
        maxDistance: 100,
        priceRange: { min: 0, max: 100000 },
        dateRange: { start: '', end: '' },
    });

    useEffect(() => {
        loadRouteLoads();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [routeLoads, filters, searchQuery]);

    const loadRouteLoads = async () => {
        try {
            setLoading(true);
            const loads = await driverAvailabilityService.getRouteLoads();
            setRouteLoads(loads);
        } catch (error) {
            console.error('Error loading route loads:', error);
            Alert.alert('Error', 'Failed to load route loads');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadRouteLoads();
        setRefreshing(false);
    };

    const applyFilters = () => {
        let filtered = [...routeLoads];

        // Apply search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(load =>
                load.fromLocation.toLowerCase().includes(query) ||
                load.toLocation.toLowerCase().includes(query) ||
                load.productType.toLowerCase().includes(query) ||
                load.client.name.toLowerCase().includes(query)
            );
        }

        // Apply filters
        if (filters.fromLocation) {
            filtered = filtered.filter(load =>
                load.fromLocation.toLowerCase().includes(filters.fromLocation.toLowerCase())
            );
        }

        if (filters.toLocation) {
            filtered = filtered.filter(load =>
                load.toLocation.toLowerCase().includes(filters.toLocation.toLowerCase())
            );
        }

        if (filters.productType) {
            filtered = filtered.filter(load =>
                load.productType.toLowerCase().includes(filters.productType.toLowerCase())
            );
        }

        if (filters.maxDistance > 0) {
            filtered = filtered.filter(load => load.distance <= filters.maxDistance);
        }

        if (filters.priceRange.min > 0 || filters.priceRange.max < 100000) {
            filtered = filtered.filter(load =>
                load.price >= filters.priceRange.min && load.price <= filters.priceRange.max
            );
        }

        setFilteredLoads(filtered);
    };

    const acceptRouteLoad = async (loadId: string) => {
        try {
            const success = await driverAvailabilityService.acceptRouteLoad(loadId);
            if (success) {
                Alert.alert('Success', 'Route load accepted successfully');
                loadRouteLoads(); // Refresh the list
            } else {
                Alert.alert('Error', 'Failed to accept route load');
            }
        } catch (error) {
            console.error('Error accepting route load:', error);
            Alert.alert('Error', 'Failed to accept route load');
        }
    };

    const toggleLoadSelection = (loadId: string) => {
        setSelectedLoads(prev =>
            prev.includes(loadId)
                ? prev.filter(id => id !== loadId)
                : [...prev, loadId]
        );
    };

    const consolidateSelectedLoads = async () => {
        if (selectedLoads.length < 2) {
            Alert.alert('Error', 'Please select at least 2 loads to consolidate');
            return;
        }

        try {
            const success = await driverAvailabilityService.consolidateRouteLoads(selectedLoads);
            if (success) {
                Alert.alert('Success', `${selectedLoads.length} loads consolidated successfully`);
                setSelectedLoads([]);
                setConsolidationModalVisible(false);
                loadRouteLoads(); // Refresh the list
            } else {
                Alert.alert('Error', 'Failed to consolidate loads');
            }
        } catch (error) {
            console.error('Error consolidating loads:', error);
            Alert.alert('Error', 'Failed to consolidate loads');
        }
    };

    const getOptimalRoute = async () => {
        if (selectedLoads.length < 2) {
            Alert.alert('Error', 'Please select at least 2 loads to get optimal route');
            return;
        }

        try {
            const route = await driverAvailabilityService.getOptimalRoute(selectedLoads);
            if (route) {
                Alert.alert(
                    'Optimal Route',
                    `Total Distance: ${route.totalDistance}km\nTotal Duration: ${Math.round(route.totalDuration / 60)} minutes\nWaypoints: ${route.waypoints.length}`
                );
            } else {
                Alert.alert('Error', 'Failed to calculate optimal route');
            }
        } catch (error) {
            console.error('Error getting optimal route:', error);
            Alert.alert('Error', 'Failed to calculate optimal route');
        }
    };

    const clearFilters = () => {
        setFilters({
            fromLocation: '',
            toLocation: '',
            productType: '',
            maxDistance: 100,
            priceRange: { min: 0, max: 100000 },
            dateRange: { start: '', end: '' },
        });
        setSearchQuery('');
    };

    const renderRouteLoad = ({ item }: { item: RouteLoad }) => (
        <TouchableOpacity
            style={[
                styles.routeLoadItem,
                selectedLoads.includes(item.id) && styles.selectedRouteLoadItem
            ]}
            onPress={() => toggleLoadSelection(item.id)}
        >
            <View style={styles.routeLoadHeader}>
                <View style={styles.routeLoadIdContainer}>
                    <Text style={styles.routeLoadId}>#{item.id.slice(-6)}</Text>
                    <Text style={styles.routeLoadPrice}>KSh {item.price.toLocaleString()}</Text>
                </View>
                <View style={styles.routeLoadStatus}>
                    <MaterialCommunityIcons
                        name={item.isConsolidatable ? "package-variant-closed" : "package-variant"}
                        size={16}
                        color={item.isConsolidatable ? colors.tertiary : colors.text.secondary}
                    />
                    <Text style={styles.routeLoadStatusText}>
                        {item.isConsolidatable ? 'Consolidatable' : 'Single'}
                    </Text>
                </View>
            </View>

            <View style={styles.routeLoadRoute}>
                <View style={styles.routeLoadLocationContainer}>
                    <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
                    <LocationDisplay 
                        location={item.fromLocation} 
                        style={styles.routeLoadLocation}
                        showIcon={false}
                    />
                </View>
                <MaterialCommunityIcons name="arrow-right" size={16} color={colors.text.secondary} />
                <View style={styles.routeLoadLocationContainer}>
                    <MaterialCommunityIcons name="map-marker-check" size={16} color={colors.success} />
                    <LocationDisplay 
                        location={item.toLocation} 
                        style={styles.routeLoadLocation}
                        showIcon={false}
                    />
                </View>
            </View>

            <View style={styles.routeLoadDetails}>
                <View style={styles.routeLoadDetail}>
                    <MaterialCommunityIcons name="package-variant" size={14} color={colors.text.secondary} />
                    <Text style={styles.routeLoadDetailText}>{item.productType}</Text>
                </View>
                <View style={styles.routeLoadDetail}>
                    <MaterialCommunityIcons name="weight-kilogram" size={14} color={colors.text.secondary} />
                    <Text style={styles.routeLoadDetailText}>{item.weight}</Text>
                </View>
                <View style={styles.routeLoadDetail}>
                    <MaterialCommunityIcons name="map-marker-distance" size={14} color={colors.text.secondary} />
                    <Text style={styles.routeLoadDetailText}>{item.distance}km</Text>
                </View>
                <View style={styles.routeLoadDetail}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color={colors.text.secondary} />
                    <Text style={styles.routeLoadDetailText}>{Math.round(item.route.duration / 60)}min</Text>
                </View>
            </View>

            <View style={styles.routeLoadFooter}>
                <View style={styles.routeLoadClient}>
                    <MaterialCommunityIcons name="account" size={14} color={colors.text.secondary} />
                    <Text style={styles.routeLoadClientText}>{item.client.name}</Text>
                    <Text style={styles.routeLoadClientType}>({item.client.type})</Text>
                </View>
                <View style={styles.routeLoadActions}>
                    <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => acceptRouteLoad(item.id)}
                    >
                        <Text style={styles.acceptButtonText}>Accept</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.routeLoadDates}>
                <Text style={styles.routeLoadDateText}>
                    Pickup: {new Date(item.pickupDate).toLocaleDateString()}
                </Text>
                <Text style={styles.routeLoadDateText}>
                    Delivery: {new Date(item.deliveryDate).toLocaleDateString()}
                </Text>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading route loads...</Text>
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
                <Text style={styles.headerTitle}>Route Loads</Text>
                <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setFilterModalVisible(true)}
                >
                    <MaterialCommunityIcons name="filter" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <MaterialCommunityIcons name="magnify" size={20} color={colors.text.secondary} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search route loads..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <MaterialCommunityIcons name="close-circle" size={20} color={colors.text.secondary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Selection Actions */}
            {selectedLoads.length > 0 && (
                <View style={styles.selectionActions}>
                    <Text style={styles.selectionText}>
                        {selectedLoads.length} load{selectedLoads.length > 1 ? 's' : ''} selected
                    </Text>
                    <View style={styles.selectionButtons}>
                        <TouchableOpacity
                            style={styles.selectionButton}
                            onPress={getOptimalRoute}
                        >
                            <MaterialCommunityIcons name="map-marker-path" size={16} color={colors.primary} />
                            <Text style={styles.selectionButtonText}>Route</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.selectionButton}
                            onPress={() => setConsolidationModalVisible(true)}
                        >
                            <MaterialCommunityIcons name="package-variant-closed" size={16} color={colors.tertiary} />
                            <Text style={styles.selectionButtonText}>Consolidate</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Route Loads List */}
            <FlatList
                data={filteredLoads}
                renderItem={renderRouteLoad}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="map-marker-off" size={64} color={colors.text.light} />
                        <Text style={styles.emptyStateText}>No route loads found</Text>
                        <Text style={styles.emptyStateSubtext}>
                            {searchQuery || Object.values(filters).some(f => f) 
                                ? 'Try adjusting your search or filters'
                                : 'Check back later for new opportunities'
                            }
                        </Text>
                        {(searchQuery || Object.values(filters).some(f => f)) && (
                            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
                                <Text style={styles.clearFiltersText}>Clear Filters</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
            />

            {/* Filter Modal */}
            <Modal visible={filterModalVisible} animationType="slide" transparent>
                <View style={styles.modalBg}>
                    <View style={styles.filterModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter Route Loads</Text>
                            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text.secondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
                            <View style={styles.filterSection}>
                                <Text style={styles.filterSectionTitle}>Location</Text>
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

                            <View style={styles.filterSection}>
                                <Text style={styles.filterSectionTitle}>Product Type</Text>
                                <TextInput
                                    style={styles.filterInput}
                                    placeholder="Product type"
                                    value={filters.productType}
                                    onChangeText={(text) => setFilters(prev => ({ ...prev, productType: text }))}
                                />
                            </View>

                            <View style={styles.filterSection}>
                                <Text style={styles.filterSectionTitle}>Distance (km)</Text>
                                <TextInput
                                    style={styles.filterInput}
                                    placeholder="Max distance"
                                    value={filters.maxDistance.toString()}
                                    onChangeText={(text) => setFilters(prev => ({ ...prev, maxDistance: parseInt(text) || 100 }))}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.filterSection}>
                                <Text style={styles.filterSectionTitle}>Price Range (KSh)</Text>
                                <View style={styles.priceRangeContainer}>
                                    <TextInput
                                        style={styles.priceInput}
                                        placeholder="Min"
                                        value={filters.priceRange.min.toString()}
                                        onChangeText={(text) => setFilters(prev => ({ 
                                            ...prev, 
                                            priceRange: { ...prev.priceRange, min: parseInt(text) || 0 }
                                        }))}
                                        keyboardType="numeric"
                                    />
                                    <Text style={styles.priceRangeSeparator}>-</Text>
                                    <TextInput
                                        style={styles.priceInput}
                                        placeholder="Max"
                                        value={filters.priceRange.max.toString()}
                                        onChangeText={(text) => setFilters(prev => ({ 
                                            ...prev, 
                                            priceRange: { ...prev.priceRange, max: parseInt(text) || 100000 }
                                        }))}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.clearButton}
                                onPress={clearFilters}
                            >
                                <Text style={styles.clearButtonText}>Clear All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.applyButton}
                                onPress={() => setFilterModalVisible(false)}
                            >
                                <Text style={styles.applyButtonText}>Apply Filters</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Consolidation Confirmation Modal */}
            <Modal visible={consolidationModalVisible} animationType="fade" transparent>
                <View style={styles.modalBg}>
                    <View style={styles.confirmationModal}>
                        <MaterialCommunityIcons name="package-variant-closed" size={48} color={colors.tertiary} />
                        <Text style={styles.confirmationTitle}>Consolidate Loads</Text>
                        <Text style={styles.confirmationText}>
                            Are you sure you want to consolidate {selectedLoads.length} route loads? 
                            This will create an optimized delivery route.
                        </Text>
                        <View style={styles.confirmationActions}>
                            <TouchableOpacity
                                style={styles.cancelConfirmButton}
                                onPress={() => setConsolidationModalVisible(false)}
                            >
                                <Text style={styles.cancelConfirmText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmButton}
                                onPress={consolidateSelectedLoads}
                            >
                                <Text style={styles.confirmText}>Consolidate</Text>
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
    filterButton: {
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        marginHorizontal: spacing.lg,
        marginVertical: spacing.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: {
        flex: 1,
        fontSize: fonts.size.md,
        color: colors.text.primary,
        marginLeft: spacing.sm,
    },
    selectionActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.primary + '10',
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 8,
    },
    selectionText: {
        fontSize: fonts.size.sm,
        color: colors.primary,
        fontWeight: '600',
    },
    selectionButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    selectionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.primary + '30',
    },
    selectionButtonText: {
        fontSize: fonts.size.xs,
        color: colors.primary,
        marginLeft: spacing.xs,
        fontWeight: '500',
    },
    listContainer: {
        padding: spacing.lg,
    },
    routeLoadItem: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.md,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedRouteLoadItem: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '05',
    },
    routeLoadHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    routeLoadIdContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    routeLoadId: {
        fontSize: fonts.size.sm,
        fontWeight: 'bold',
        color: colors.primary,
    },
    routeLoadPrice: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.success,
    },
    routeLoadStatus: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    routeLoadStatusText: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginLeft: spacing.xs,
    },
    routeLoadRoute: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    routeLoadLocationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    routeLoadLocation: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        fontWeight: '500',
        marginLeft: spacing.xs,
        flex: 1,
    },
    routeLoadDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    routeLoadDetail: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    routeLoadDetailText: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginLeft: spacing.xs,
    },
    routeLoadFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    routeLoadClient: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    routeLoadClientText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginLeft: spacing.xs,
        fontWeight: '500',
    },
    routeLoadClientType: {
        fontSize: fonts.size.xs,
        color: colors.text.light,
        marginLeft: spacing.xs,
    },
    routeLoadActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    acceptButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: 8,
    },
    acceptButtonText: {
        fontSize: fonts.size.sm,
        color: colors.white,
        fontWeight: 'bold',
    },
    routeLoadDates: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    routeLoadDateText: {
        fontSize: fonts.size.xs,
        color: colors.text.light,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xl * 2,
    },
    emptyStateText: {
        fontSize: fonts.size.lg,
        fontWeight: '600',
        color: colors.text.secondary,
        marginTop: spacing.md,
        textAlign: 'center',
    },
    emptyStateSubtext: {
        fontSize: fonts.size.md,
        color: colors.text.light,
        marginTop: spacing.sm,
        textAlign: 'center',
        lineHeight: 20,
    },
    clearFiltersButton: {
        marginTop: spacing.lg,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.primary,
        borderRadius: 8,
    },
    clearFiltersText: {
        fontSize: fonts.size.sm,
        color: colors.white,
        fontWeight: 'bold',
    },
    modalBg: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterModal: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        width: '90%',
        maxHeight: '80%',
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
    filterContent: {
        maxHeight: 400,
    },
    filterSection: {
        marginBottom: spacing.lg,
    },
    filterSectionTitle: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    filterInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: spacing.md,
        fontSize: fonts.size.md,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    priceRangeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    priceInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: spacing.md,
        fontSize: fonts.size.md,
        color: colors.text.primary,
    },
    priceRangeSeparator: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
    },
    modalActions: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.lg,
    },
    clearButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    clearButtonText: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    applyButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: 8,
        backgroundColor: colors.primary,
        alignItems: 'center',
    },
    applyButtonText: {
        fontSize: fonts.size.md,
        color: colors.white,
        fontWeight: 'bold',
    },
    confirmationModal: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.xl,
        alignItems: 'center',
        width: '90%',
        maxWidth: 400,
    },
    confirmationTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    confirmationText: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: spacing.lg,
    },
    confirmationActions: {
        flexDirection: 'row',
        gap: spacing.md,
        width: '100%',
    },
    cancelConfirmButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    cancelConfirmText: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    confirmButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: 8,
        backgroundColor: colors.tertiary,
        alignItems: 'center',
    },
    confirmText: {
        fontSize: fonts.size.md,
        color: colors.white,
        fontWeight: 'bold',
    },
});

export default DriverRouteLoadsScreen;
