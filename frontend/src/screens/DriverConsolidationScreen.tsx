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
    TouchableOpacity,
    View,
    Modal,
} from 'react-native';
import ExpoCompatibleMap from '../components/common/ExpoCompatibleMap';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { driverAvailabilityService, RouteLoad } from '../services/driverAvailabilityService';
import LocationDisplay from '../components/common/LocationDisplay';
import { getDisplayBookingId } from '../utils/unifiedIdSystem';

interface ConsolidatedRoute {
    id: string;
    loads: RouteLoad[];
    totalDistance: number;
    totalDuration: number;
    totalEarnings: number;
    waypoints: Array<{
        loadId: string;
        location: { latitude: number; longitude: number };
        type: 'pickup' | 'delivery';
    }>;
    route: Array<{ latitude: number; longitude: number }>;
}

const DriverConsolidationScreen = () => {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [availableLoads, setAvailableLoads] = useState<RouteLoad[]>([]);
    const [selectedLoads, setSelectedLoads] = useState<RouteLoad[]>([]);
    const [consolidatedRoute, setConsolidatedRoute] = useState<ConsolidatedRoute | null>(null);
    const [mapVisible, setMapVisible] = useState(false);
    const [optimizationModalVisible, setOptimizationModalVisible] = useState(false);

    useEffect(() => {
        loadAvailableLoads();
    }, []);

    const loadAvailableLoads = async () => {
        try {
            setLoading(true);
            const loads = await driverAvailabilityService.getRouteLoads({
                maxDistance: 100, // Within 100km
            });
            // Filter for consolidatable loads only
            const consolidatableLoads = loads.filter(load => load.isConsolidatable);
            setAvailableLoads(consolidatableLoads);
        } catch (error) {
            console.error('Error loading available loads:', error);
            Alert.alert('Error', 'Failed to load available loads');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadAvailableLoads();
        setRefreshing(false);
    };

    const toggleLoadSelection = (load: RouteLoad) => {
        setSelectedLoads(prev => {
            const isSelected = prev.some(selected => selected.id === load.id);
            if (isSelected) {
                return prev.filter(selected => selected.id !== load.id);
            } else {
                return [...prev, load];
            }
        });
    };

    const optimizeRoute = async () => {
        if (selectedLoads.length < 2) {
            Alert.alert('Error', 'Please select at least 2 loads to optimize route');
            return;
        }

        try {
            setOptimizationModalVisible(true);
            
            const loadIds = selectedLoads.map(load => load.id);
            const routeData = await driverAvailabilityService.getOptimalRoute(loadIds);
            
            if (routeData) {
                const consolidated: ConsolidatedRoute = {
                    id: `consolidated-${Date.now()}`,
                    loads: selectedLoads,
                    totalDistance: routeData.totalDistance,
                    totalDuration: routeData.totalDuration,
                    totalEarnings: selectedLoads.reduce((sum, load) => sum + load.price, 0),
                    waypoints: routeData.waypoints.map(wp => ({
                        loadId: wp.loadId,
                        location: wp.location,
                        type: 'pickup', // This would be determined by the load data
                    })),
                    route: routeData.route,
                };
                
                setConsolidatedRoute(consolidated);
                setMapVisible(true);
            } else {
                Alert.alert('Error', 'Failed to calculate optimal route');
            }
        } catch (error) {
            console.error('Error optimizing route:', error);
            Alert.alert('Error', 'Failed to optimize route');
        } finally {
            setOptimizationModalVisible(false);
        }
    };

    const acceptConsolidatedRoute = async () => {
        if (!consolidatedRoute) return;

        try {
            const loadIds = consolidatedRoute.loads.map(load => load.id);
            const success = await driverAvailabilityService.consolidateRouteLoads(loadIds);
            
            if (success) {
                Alert.alert(
                    'Success', 
                    `Consolidated ${consolidatedRoute.loads.length} loads successfully!\n\nTotal Earnings: KSh ${consolidatedRoute.totalEarnings.toLocaleString()}\nTotal Distance: ${consolidatedRoute.totalDistance}km\nEstimated Duration: ${Math.round(consolidatedRoute.totalDuration / 60)} minutes`,
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                setSelectedLoads([]);
                                setConsolidatedRoute(null);
                                setMapVisible(false);
                                loadAvailableLoads();
                            }
                        }
                    ]
                );
            } else {
                Alert.alert('Error', 'Failed to accept consolidated route');
            }
        } catch (error) {
            console.error('Error accepting consolidated route:', error);
            Alert.alert('Error', 'Failed to accept consolidated route');
        }
    };

    const clearSelection = () => {
        setSelectedLoads([]);
        setConsolidatedRoute(null);
        setMapVisible(false);
    };

    const renderLoadItem = ({ item }: { item: RouteLoad }) => (
        <TouchableOpacity
            style={[
                styles.loadItem,
                selectedLoads.some(selected => selected.id === item.id) && styles.selectedLoadItem
            ]}
            onPress={() => toggleLoadSelection(item)}
        >
            <View style={styles.loadHeader}>
                <View style={styles.loadIdContainer}>
                    <Text style={styles.loadId}>#{item.id.slice(-6)}</Text>
                    <Text style={styles.loadPrice}>KSh {item.price.toLocaleString()}</Text>
                </View>
                <View style={styles.loadStatus}>
                    <MaterialCommunityIcons name="package-variant-closed" size={16} color={colors.tertiary} />
                    <Text style={styles.loadStatusText}>Consolidatable</Text>
                </View>
            </View>

            <View style={styles.loadRoute}>
                <View style={styles.loadLocationContainer}>
                    <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
                    <LocationDisplay 
                        location={item.fromLocation} 
                        style={styles.loadLocation}
                        showIcon={false}
                    />
                </View>
                <MaterialCommunityIcons name="arrow-right" size={16} color={colors.text.secondary} />
                <View style={styles.loadLocationContainer}>
                    <MaterialCommunityIcons name="map-marker-check" size={16} color={colors.success} />
                    <LocationDisplay 
                        location={item.toLocation} 
                        style={styles.loadLocation}
                        showIcon={false}
                    />
                </View>
            </View>

            <View style={styles.loadDetails}>
                <View style={styles.loadDetail}>
                    <MaterialCommunityIcons name="package-variant" size={14} color={colors.text.secondary} />
                    <Text style={styles.loadDetailText}>{item.productType}</Text>
                </View>
                <View style={styles.loadDetail}>
                    <MaterialCommunityIcons name="weight-kilogram" size={14} color={colors.text.secondary} />
                    <Text style={styles.loadDetailText}>{item.weight}</Text>
                </View>
                <View style={styles.loadDetail}>
                    <MaterialCommunityIcons name="map-marker-distance" size={14} color={colors.text.secondary} />
                    <Text style={styles.loadDetailText}>{item.distance}km</Text>
                </View>
                <View style={styles.loadDetail}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color={colors.text.secondary} />
                    <Text style={styles.loadDetailText}>{Math.round(item.route.duration / 60)}min</Text>
                </View>
            </View>

            <View style={styles.loadFooter}>
                <View style={styles.loadClient}>
                    <MaterialCommunityIcons name="account" size={14} color={colors.text.secondary} />
                    <Text style={styles.loadClientText}>{item.client.name} ({item.client.type})</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading consolidatable loads...</Text>
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
                <Text style={styles.headerTitle}>Consolidate Loads</Text>
                <TouchableOpacity
                    style={styles.clearButton}
                    onPress={clearSelection}
                >
                    <MaterialCommunityIcons name="close-circle" size={24} color={colors.error} />
                </TouchableOpacity>
            </View>

            {/* Selection Summary */}
            {selectedLoads.length > 0 && (
                <View style={styles.selectionSummary}>
                    <View style={styles.selectionInfo}>
                        <MaterialCommunityIcons name="package-variant-closed" size={20} color={colors.tertiary} />
                        <Text style={styles.selectionText}>
                            {selectedLoads.length} load{selectedLoads.length > 1 ? 's' : ''} selected
                        </Text>
                    </View>
                    <View style={styles.selectionStats}>
                        <Text style={styles.selectionStat}>
                            Total: KSh {selectedLoads.reduce((sum, load) => sum + load.price, 0).toLocaleString()}
                        </Text>
                        <Text style={styles.selectionStat}>
                            Distance: {selectedLoads.reduce((sum, load) => sum + load.distance, 0)}km
                        </Text>
                    </View>
                </View>
            )}

            {/* Action Buttons */}
            {selectedLoads.length > 0 && (
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={styles.optimizeButton}
                        onPress={optimizeRoute}
                    >
                        <MaterialCommunityIcons name="map-marker-path" size={20} color={colors.white} />
                        <Text style={styles.optimizeButtonText}>Optimize Route</Text>
                    </TouchableOpacity>
                    
                    {consolidatedRoute && (
                        <TouchableOpacity
                            style={styles.acceptButton}
                            onPress={acceptConsolidatedRoute}
                        >
                            <MaterialCommunityIcons name="check-circle" size={20} color={colors.white} />
                            <Text style={styles.acceptButtonText}>Accept Route</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Map View */}
            {mapVisible && consolidatedRoute && (
                <View style={styles.mapContainer}>
                    <View style={styles.mapHeader}>
                        <Text style={styles.mapTitle}>Optimized Route</Text>
                        <TouchableOpacity onPress={() => setMapVisible(false)}>
                            <MaterialCommunityIcons name="close" size={24} color={colors.text.secondary} />
                        </TouchableOpacity>
                    </View>
                    
                    <ExpoCompatibleMap
                        style={styles.map}
                        showUserLocation={true}
                        markers={[
                            // Waypoint markers
                            ...consolidatedRoute.waypoints.map((waypoint, index) => ({
                                id: `waypoint-${index}`,
                                coordinate: waypoint.location,
                                title: `Stop ${index + 1}`,
                                description: `Load ${waypoint.loadId.slice(-6)}`,
                                pinColor: waypoint.type === 'pickup' ? colors.primary : colors.success,
                            })),
                        ]}
                        polylines={[
                            {
                                coordinates: consolidatedRoute.route,
                                strokeColor: colors.primary,
                                strokeWidth: 4,
                            }
                        ]}
                        initialRegion={{
                            latitude: consolidatedRoute.route[0]?.latitude || -1.2921,
                            longitude: consolidatedRoute.route[0]?.longitude || 36.8219,
                            latitudeDelta: 0.5,
                            longitudeDelta: 0.5,
                        }}
                    />
                    
                    <View style={styles.routeInfo}>
                        <View style={styles.routeInfoItem}>
                            <MaterialCommunityIcons name="map-marker-distance" size={16} color={colors.primary} />
                            <Text style={styles.routeInfoText}>{consolidatedRoute.totalDistance}km</Text>
                        </View>
                        <View style={styles.routeInfoItem}>
                            <MaterialCommunityIcons name="clock-outline" size={16} color={colors.secondary} />
                            <Text style={styles.routeInfoText}>{Math.round(consolidatedRoute.totalDuration / 60)}min</Text>
                        </View>
                        <View style={styles.routeInfoItem}>
                            <MaterialCommunityIcons name="currency-usd" size={16} color={colors.success} />
                            <Text style={styles.routeInfoText}>KSh {consolidatedRoute.totalEarnings.toLocaleString()}</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Loads List */}
            <FlatList
                data={availableLoads}
                renderItem={renderLoadItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="package-variant-closed" size={64} color={colors.text.light} />
                        <Text style={styles.emptyStateText}>No consolidatable loads available</Text>
                        <Text style={styles.emptyStateSubtext}>
                            Check back later for loads that can be consolidated along your route
                        </Text>
                    </View>
                }
            />

            {/* Optimization Loading Modal */}
            <Modal visible={optimizationModalVisible} animationType="fade" transparent>
                <View style={styles.modalBg}>
                    <View style={styles.loadingModal}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.loadingModalText}>Optimizing route...</Text>
                        <Text style={styles.loadingModalSubtext}>
                            Calculating the best path for {selectedLoads.length} loads
                        </Text>
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
    clearButton: {
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
    selectionSummary: {
        backgroundColor: colors.tertiary + '10',
        marginHorizontal: spacing.lg,
        marginVertical: spacing.md,
        padding: spacing.md,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: colors.tertiary,
    },
    selectionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    selectionText: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.tertiary,
        marginLeft: spacing.sm,
    },
    selectionStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    selectionStat: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    optimizeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: 12,
    },
    optimizeButtonText: {
        color: colors.white,
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        marginLeft: spacing.sm,
    },
    acceptButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.success,
        paddingVertical: spacing.md,
        borderRadius: 12,
    },
    acceptButtonText: {
        color: colors.white,
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        marginLeft: spacing.sm,
    },
    mapContainer: {
        height: 300,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        backgroundColor: colors.white,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    mapHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    mapTitle: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    map: {
        flex: 1,
    },
    routeInfo: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    routeInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    routeInfoText: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        marginLeft: spacing.xs,
        fontWeight: '500',
    },
    listContainer: {
        padding: spacing.lg,
    },
    loadItem: {
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
    selectedLoadItem: {
        borderColor: colors.tertiary,
        backgroundColor: colors.tertiary + '05',
    },
    loadHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    loadIdContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    loadId: {
        fontSize: fonts.size.sm,
        fontWeight: 'bold',
        color: colors.primary,
    },
    loadPrice: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.success,
    },
    loadStatus: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loadStatusText: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginLeft: spacing.xs,
    },
    loadRoute: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    loadLocationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    loadLocation: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        fontWeight: '500',
        marginLeft: spacing.xs,
        flex: 1,
    },
    loadDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    loadDetail: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loadDetailText: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginLeft: spacing.xs,
    },
    loadFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    loadClient: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    loadClientText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginLeft: spacing.xs,
        fontWeight: '500',
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
    modalBg: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingModal: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.xl,
        alignItems: 'center',
        minWidth: 280,
    },
    loadingModalText: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginTop: spacing.md,
    },
    loadingModalSubtext: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginTop: spacing.sm,
        textAlign: 'center',
    },
});

export default DriverConsolidationScreen;


