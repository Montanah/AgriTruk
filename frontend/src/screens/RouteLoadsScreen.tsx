import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { API_ENDPOINTS } from '../constants/api';

interface RouteLoad {
    id: string;
    route: {
        from: string;
        to: string;
        distance: number;
        estimatedTime: string;
        waypoints?: string[];
    };
    loads: {
        id: string;
        type: string;
        productType: string;
        weight: number;
        volume: number;
        specialRequirements: string[];
        client: {
            name: string;
            phone: string;
            rating: number;
        };
        pricing: {
            basePrice: number;
            total: number;
        };
        pickupDate: string;
        deliveryDate: string;
        status: 'available' | 'booked' | 'in-transit' | 'delivered';
    }[];
    totalCapacity: number;
    usedCapacity: number;
    availableCapacity: number;
    totalRevenue: number;
    efficiency: number;
    createdAt: string;
}

const RouteLoadsScreen = () => {
    const navigation = useNavigation();
    const [routeLoads, setRouteLoads] = useState<RouteLoad[]>([]);
    const [filteredRouteLoads, setFilteredRouteLoads] = useState<RouteLoad[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        fromLocation: '',
        toLocation: '',
        cargoType: 'all',
        minRevenue: '',
        maxRevenue: '',
        status: 'all'
    });

    const fetchRouteLoads = async () => {
        try {
            setError(null);
            const { getAuth } = require('firebase/auth');
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();
            const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/transporters/route-loads`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                const loads = data.routeLoads || [];
                setRouteLoads(loads);
                setFilteredRouteLoads(loads);
            } else {
                throw new Error('Failed to fetch route loads');
            }
        } catch (err: any) {
            console.error('Error fetching route loads:', err);
            setError(err.message || 'Failed to fetch route loads');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchRouteLoads();
        setRefreshing(false);
    };

    useEffect(() => {
        fetchRouteLoads();
    }, []);

    // Apply filters whenever filters or routeLoads change
    useEffect(() => {
        applyFilters();
    }, [filters, routeLoads]);

    const applyFilters = () => {
        let filtered = [...routeLoads];

        if (filters.fromLocation) {
            filtered = filtered.filter(load => 
                load.route.from.toLowerCase().includes(filters.fromLocation.toLowerCase())
            );
        }

        if (filters.toLocation) {
            filtered = filtered.filter(load => 
                load.route.to.toLowerCase().includes(filters.toLocation.toLowerCase())
            );
        }

        if (filters.cargoType !== 'all') {
            filtered = filtered.filter(load => 
                load.loads.some(loadItem => 
                    loadItem.productType.toLowerCase().includes(filters.cargoType.toLowerCase())
                )
            );
        }

        if (filters.minRevenue) {
            const minRev = parseFloat(filters.minRevenue);
            filtered = filtered.filter(load => load.totalRevenue >= minRev);
        }

        if (filters.maxRevenue) {
            const maxRev = parseFloat(filters.maxRevenue);
            filtered = filtered.filter(load => load.totalRevenue <= maxRev);
        }

        if (filters.status !== 'all') {
            filtered = filtered.filter(load => 
                load.loads.some(loadItem => loadItem.status === filters.status)
            );
        }

        setFilteredRouteLoads(filtered);
    };

    const clearFilters = () => {
        setFilters({
            fromLocation: '',
            toLocation: '',
            cargoType: 'all',
            minRevenue: '',
            maxRevenue: '',
            status: 'all'
        });
    };

    const bookLoad = async (routeLoadId: string, loadId: string) => {
        try {
            const { getAuth } = require('firebase/auth');
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();
            const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${loadId}/book`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ routeLoadId }),
            });

            if (response.ok) {
                Alert.alert('Success', 'Load booked successfully!');
                // Refresh the route loads
                fetchRouteLoads();
            } else {
                throw new Error('Failed to book load');
            }
        } catch (err: any) {
            console.error('Error booking load:', err);
            Alert.alert('Error', err.message || 'Failed to book load');
        }
    };

    const formatCurrency = (amount: number) => {
        return `KES ${amount.toLocaleString()}`;
    };

    const formatDistance = (distance: number) => {
        return `${distance.toFixed(1)} km`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-KE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getCapacityColor = (used: number, total: number) => {
        const percentage = (used / total) * 100;
        if (percentage >= 90) return colors.error;
        if (percentage >= 70) return colors.warning;
        return colors.success;
    };

    const getLoadStatusColor = (status: string) => {
        switch (status) {
            case 'available': return colors.success;
            case 'booked': return colors.primary;
            case 'in-transit': return colors.warning;
            case 'delivered': return colors.text.secondary;
            default: return colors.text.secondary;
        }
    };

    const renderLoadItem = ({ item }: { item: RouteLoad['loads'][0] }) => (
        <View style={styles.loadCard}>
            <View style={styles.loadHeader}>
                <View style={styles.loadInfo}>
                    <Text style={styles.loadType}>{item.type}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getLoadStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getLoadStatusColor(item.status) }]}>
                            {item.status.toUpperCase()}
                        </Text>
                    </View>
                </View>
                <Text style={styles.loadPrice}>{formatCurrency(item.pricing.total)}</Text>
            </View>

            <View style={styles.loadDetails}>
                <View style={styles.specRow}>
                    <MaterialCommunityIcons name="package-variant" size={14} color={colors.text.secondary} />
                    <Text style={styles.specText}>{item.productType}</Text>
                </View>
                <View style={styles.specRow}>
                    <MaterialCommunityIcons name="weight" size={14} color={colors.text.secondary} />
                    <Text style={styles.specText}>{item.weight} kg</Text>
                </View>
                <View style={styles.specRow}>
                    <MaterialCommunityIcons name="cube-outline" size={14} color={colors.text.secondary} />
                    <Text style={styles.specText}>{item.volume} m³</Text>
                </View>
            </View>

            <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{item.client.name}</Text>
                <Text style={styles.clientPhone}>{item.client.phone}</Text>
                <View style={styles.ratingRow}>
                    <MaterialCommunityIcons name="star" size={12} color={colors.warning} />
                    <Text style={styles.ratingText}>{item.client.rating.toFixed(1)}</Text>
                </View>
            </View>

            <View style={styles.loadDates}>
                <Text style={styles.dateText}>Pickup: {formatDate(item.pickupDate)}</Text>
                <Text style={styles.dateText}>Delivery: {formatDate(item.deliveryDate)}</Text>
            </View>

            {item.status === 'available' && (
                <TouchableOpacity
                    style={styles.bookButton}
                    onPress={() => bookLoad('', item.id)}
                >
                    <Text style={styles.bookButtonText}>Book Load</Text>
                </TouchableOpacity>
            )}

            {item.specialRequirements.length > 0 && (
                <View style={styles.requirementsContainer}>
                    <Text style={styles.requirementsTitle}>Special Requirements:</Text>
                    {item.specialRequirements.map((req, index) => (
                        <Text key={index} style={styles.requirementText}>• {req}</Text>
                    ))}
                </View>
            )}
        </View>
    );

    const renderRouteLoadItem = ({ item }: { item: RouteLoad }) => (
        <View style={styles.routeCard}>
            <View style={styles.routeHeader}>
                <View style={styles.routeInfo}>
                    <Text style={styles.routeTitle}>
                        {item.route.from} → {item.route.to}
                    </Text>
                    <Text style={styles.routeDistance}>
                        {formatDistance(item.route.distance)} • {item.route.estimatedTime}
                    </Text>
                </View>
                <View style={styles.routeStats}>
                    <Text style={styles.revenueText}>{formatCurrency(item.totalRevenue)}</Text>
                    <Text style={styles.efficiencyText}>{item.efficiency.toFixed(1)}% efficiency</Text>
                </View>
            </View>

            <View style={styles.capacityContainer}>
                <View style={styles.capacityHeader}>
                    <Text style={styles.capacityTitle}>Capacity Usage</Text>
                    <Text style={styles.capacityText}>
                        {item.usedCapacity}/{item.totalCapacity} ({item.availableCapacity} available)
                    </Text>
                </View>
                <View style={styles.capacityBar}>
                    <View
                        style={[
                            styles.capacityFill,
                            {
                                width: `${(item.usedCapacity / item.totalCapacity) * 100}%`,
                                backgroundColor: getCapacityColor(item.usedCapacity, item.totalCapacity),
                            }
                        ]}
                    />
                </View>
            </View>

            <View style={styles.loadsContainer}>
                <Text style={styles.loadsTitle}>Available Loads ({item.loads.length})</Text>
                <FlatList
                    data={item.loads}
                    renderItem={renderLoadItem}
                    keyExtractor={(load) => load.id}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                />
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Route Loads</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading route loads...</Text>
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Route Loads</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={styles.errorContainer}>
                    <MaterialCommunityIcons name="alert-circle" size={48} color={colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={fetchRouteLoads}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Route Loads</Text>
                <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
                    <MaterialCommunityIcons 
                        name={showFilters ? "filter-remove" : "filter"} 
                        size={24} 
                        color={colors.primary} 
                    />
                </TouchableOpacity>
            </View>

            {/* Enhanced Filter Section */}
            {showFilters && (
                <View style={styles.filterContainer}>
                    <View style={styles.filterHeader}>
                        <View style={styles.filterTitleContainer}>
                            <MaterialCommunityIcons name="filter-variant" size={20} color={colors.primary} />
                            <Text style={styles.filterTitle}>Smart Filters</Text>
                        </View>
                        <TouchableOpacity onPress={clearFilters} style={styles.clearButton}>
                            <MaterialCommunityIcons name="refresh" size={16} color={colors.text.secondary} />
                            <Text style={styles.clearFiltersText}>Reset</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {/* Location Filters */}
                    <View style={styles.filterSection}>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="map-marker" size={16} color={colors.text.primary} />
                            <Text style={styles.sectionTitle}>Route</Text>
                        </View>
                        <View style={styles.locationRow}>
                            <View style={styles.locationInputContainer}>
                                <Text style={styles.inputLabel}>From</Text>
                                <View style={styles.inputWrapper}>
                                    <MaterialCommunityIcons name="map-marker-outline" size={16} color={colors.text.secondary} />
                                    <TextInput
                                        style={styles.locationInput}
                                        placeholder="Origin location"
                                        value={filters.fromLocation}
                                        onChangeText={(text) => setFilters(prev => ({ ...prev, fromLocation: text }))}
                                        placeholderTextColor={colors.text.light}
                                    />
                                </View>
                            </View>
                            <View style={styles.locationInputContainer}>
                                <Text style={styles.inputLabel}>To</Text>
                                <View style={styles.inputWrapper}>
                                    <MaterialCommunityIcons name="map-marker" size={16} color={colors.text.secondary} />
                                    <TextInput
                                        style={styles.locationInput}
                                        placeholder="Destination"
                                        value={filters.toLocation}
                                        onChangeText={(text) => setFilters(prev => ({ ...prev, toLocation: text }))}
                                        placeholderTextColor={colors.text.light}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Cargo Type Filters */}
                    <View style={styles.filterSection}>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="package-variant" size={16} color={colors.text.primary} />
                            <Text style={styles.sectionTitle}>Cargo Type</Text>
                        </View>
                        <View style={styles.chipContainer}>
                            {[
                                { key: 'all', label: 'All', icon: 'view-grid' },
                                { key: 'perishable', label: 'Perishable', icon: 'clock-fast' },
                                { key: 'special', label: 'Special', icon: 'star' },
                                { key: 'general', label: 'General', icon: 'package' }
                            ].map((type) => (
                                <TouchableOpacity
                                    key={type.key}
                                    style={[
                                        styles.chip,
                                        filters.cargoType === type.key && styles.chipActive
                                    ]}
                                    onPress={() => setFilters(prev => ({ ...prev, cargoType: type.key }))}
                                >
                                    <MaterialCommunityIcons 
                                        name={type.icon} 
                                        size={14} 
                                        color={filters.cargoType === type.key ? colors.white : colors.text.secondary} 
                                    />
                                    <Text style={[
                                        styles.chipText,
                                        filters.cargoType === type.key && styles.chipTextActive
                                    ]}>
                                        {type.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Revenue Range */}
                    <View style={styles.filterSection}>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="cash" size={16} color={colors.text.primary} />
                            <Text style={styles.sectionTitle}>Revenue Range</Text>
                        </View>
                        <View style={styles.rangeContainer}>
                            <View style={styles.rangeInputContainer}>
                                <Text style={styles.rangeLabel}>Min (KES)</Text>
                                <View style={styles.rangeInputWrapper}>
                                    <TextInput
                                        style={styles.rangeInput}
                                        placeholder="0"
                                        value={filters.minRevenue}
                                        onChangeText={(text) => setFilters(prev => ({ ...prev, minRevenue: text }))}
                                        keyboardType="numeric"
                                        placeholderTextColor={colors.text.light}
                                    />
                                </View>
                            </View>
                            <View style={styles.rangeSeparator}>
                                <Text style={styles.rangeSeparatorText}>to</Text>
                            </View>
                            <View style={styles.rangeInputContainer}>
                                <Text style={styles.rangeLabel}>Max (KES)</Text>
                                <View style={styles.rangeInputWrapper}>
                                    <TextInput
                                        style={styles.rangeInput}
                                        placeholder="10000"
                                        value={filters.maxRevenue}
                                        onChangeText={(text) => setFilters(prev => ({ ...prev, maxRevenue: text }))}
                                        keyboardType="numeric"
                                        placeholderTextColor={colors.text.light}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Status Filters */}
                    <View style={styles.filterSection}>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="flag" size={16} color={colors.text.primary} />
                            <Text style={styles.sectionTitle}>Status</Text>
                        </View>
                        <View style={styles.statusChipContainer}>
                            {[
                                { key: 'all', label: 'All', color: colors.text.secondary },
                                { key: 'available', label: 'Available', color: colors.success },
                                { key: 'booked', label: 'Booked', color: colors.primary },
                                { key: 'in-transit', label: 'In Transit', color: colors.warning },
                                { key: 'delivered', label: 'Delivered', color: colors.text.secondary }
                            ].map((status) => (
                                <TouchableOpacity
                                    key={status.key}
                                    style={[
                                        styles.statusChip,
                                        filters.status === status.key && styles.statusChipActive,
                                        { borderColor: status.color }
                                    ]}
                                    onPress={() => setFilters(prev => ({ ...prev, status: status.key }))}
                                >
                                    <View style={[
                                        styles.statusIndicator,
                                        { backgroundColor: status.color },
                                        filters.status === status.key && styles.statusIndicatorActive
                                    ]} />
                                    <Text style={[
                                        styles.statusChipText,
                                        filters.status === status.key && styles.statusChipTextActive
                                    ]}>
                                        {status.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Results Count */}
                    <View style={styles.resultsContainer}>
                        <Text style={styles.resultsText}>
                            {filteredRouteLoads.length} of {routeLoads.length} loads match your criteria
                        </Text>
                    </View>
                </View>
            )}

            {filteredRouteLoads.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="map-marker-path" size={48} color={colors.text.light} />
                    <Text style={styles.emptyTitle}>No Route Loads Available</Text>
                    <Text style={styles.emptyText}>
                        There are currently no route loads available. Check back later for new opportunities.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredRouteLoads}
                    renderItem={renderRouteLoadItem}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colors.primary]}
                        />
                    }
                    contentContainerStyle={styles.routeLoadsList}
                />
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
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    filterContainer: {
        backgroundColor: colors.white,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    filterHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    filterTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    filterTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 8,
        backgroundColor: colors.background,
    },
    clearFiltersText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    filterSection: {
        marginBottom: spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.sm,
    },
    sectionTitle: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.primary,
    },
    locationRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    locationInputContainer: {
        flex: 1,
    },
    inputLabel: {
        fontSize: fonts.size.sm,
        fontWeight: '500',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: spacing.sm,
        backgroundColor: colors.background,
        gap: spacing.xs,
    },
    locationInput: {
        flex: 1,
        paddingVertical: spacing.sm,
        fontSize: fonts.size.sm,
        color: colors.text.primary,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
        gap: spacing.xs,
    },
    chipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    chipText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    chipTextActive: {
        color: colors.white,
    },
    rangeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    rangeInputContainer: {
        flex: 1,
    },
    rangeLabel: {
        fontSize: fonts.size.sm,
        fontWeight: '500',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    rangeInputWrapper: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        backgroundColor: colors.background,
    },
    rangeInput: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        textAlign: 'center',
    },
    rangeSeparator: {
        paddingTop: spacing.lg,
    },
    rangeSeparatorText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    statusChipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 16,
        borderWidth: 1,
        backgroundColor: colors.background,
        gap: spacing.xs,
    },
    statusChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusIndicatorActive: {
        backgroundColor: colors.white,
    },
    statusChipText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    statusChipTextActive: {
        color: colors.white,
    },
    resultsContainer: {
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    resultsText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        fontWeight: '500',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: spacing.md,
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    errorText: {
        marginTop: spacing.md,
        fontSize: fonts.size.sm,
        color: colors.error,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: colors.primary,
        borderRadius: 8,
    },
    retryButtonText: {
        color: colors.white,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    emptyTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginTop: spacing.md,
    },
    emptyText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    routeLoadsList: {
        padding: spacing.lg,
    },
    routeCard: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.lg,
        shadowColor: colors.black,
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    routeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    routeInfo: {
        flex: 1,
    },
    routeTitle: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: 4,
    },
    routeDistance: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
    },
    routeStats: {
        alignItems: 'flex-end',
    },
    revenueText: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.primary,
    },
    efficiencyText: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginTop: 2,
    },
    capacityContainer: {
        marginBottom: spacing.md,
    },
    capacityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    capacityTitle: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.primary,
    },
    capacityText: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
    },
    capacityBar: {
        height: 8,
        backgroundColor: colors.background,
        borderRadius: 4,
        overflow: 'hidden',
    },
    capacityFill: {
        height: '100%',
        borderRadius: 4,
    },
    loadsContainer: {
        marginTop: spacing.sm,
    },
    loadsTitle: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    loadCard: {
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: spacing.sm,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    loadHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    },
    loadInfo: {
        flex: 1,
    },
    loadType: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 4,
    },
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    statusText: {
        fontSize: fonts.size.xs,
        fontWeight: '600',
    },
    loadPrice: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.primary,
    },
    loadDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: spacing.sm,
    },
    specRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: spacing.md,
        marginBottom: 4,
    },
    specText: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginLeft: 4,
    },
    clientInfo: {
        marginBottom: spacing.sm,
    },
    clientName: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.primary,
    },
    clientPhone: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginTop: 2,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    ratingText: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginLeft: 4,
    },
    loadDates: {
        marginBottom: spacing.sm,
    },
    dateText: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginBottom: 2,
    },
    bookButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 6,
        alignItems: 'center',
    },
    bookButtonText: {
        color: colors.white,
        fontSize: fonts.size.sm,
        fontWeight: '600',
    },
    requirementsContainer: {
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    requirementsTitle: {
        fontSize: fonts.size.xs,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 4,
    },
    requirementText: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginBottom: 2,
    },
});

export default RouteLoadsScreen;
