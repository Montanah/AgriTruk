import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal,
} from 'react-native';
import * as Location from 'expo-location';
import ExpoCompatibleMap from '../components/common/ExpoCompatibleMap';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { driverAvailabilityService } from '../services/driverAvailabilityService';
import { unifiedTrackingService } from '../services/unifiedTrackingService';

interface TrafficAlert {
    id: string;
    type: 'congestion' | 'accident' | 'road_closure' | 'weather' | 'other';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    location: { latitude: number; longitude: number };
    estimatedDelay: number;
    timestamp: string;
    alternativeRoutes?: Array<{
        route: Array<{ latitude: number; longitude: number }>;
        distance: number;
        duration: number;
        delay: number;
    }>;
}

interface RouteAnalysis {
    fromLocation: { latitude: number; longitude: number };
    toLocation: { latitude: number; longitude: number };
    currentRoute: Array<{ latitude: number; longitude: number }>;
    trafficConditions: TrafficAlert[];
    alternativeRoutes: Array<{
        route: Array<{ latitude: number; longitude: number }>;
        distance: number;
        duration: number;
        delay: number;
        reason: string;
    }>;
    recommendations: Array<{
        type: 'route_change' | 'delay_start' | 'wait';
        message: string;
        impact: 'low' | 'medium' | 'high';
    }>;
}

const DriverTrafficScreen = () => {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [trafficAlerts, setTrafficAlerts] = useState<TrafficAlert[]>([]);
    const [routeAnalysis, setRouteAnalysis] = useState<RouteAnalysis | null>(null);
    const [selectedAlert, setSelectedAlert] = useState<TrafficAlert | null>(null);
    const [alertModalVisible, setAlertModalVisible] = useState(false);
    const [analysisModalVisible, setAnalysisModalVisible] = useState(false);

    useEffect(() => {
        initializeLocation();
        loadTrafficData();
    }, []);

    const initializeLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            
            if (status === 'granted') {
                const location = await Location.getCurrentPositionAsync({});
                setCurrentLocation({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });
            }
        } catch (error) {
            console.error('Error getting current location:', error);
        }
    };

    const loadTrafficData = async () => {
        try {
            setLoading(true);
            
            // Load traffic alerts for current area
            if (currentLocation) {
                const alerts = await loadTrafficAlerts(currentLocation);
                setTrafficAlerts(alerts);
            }
            
            // Load route analysis if we have a destination
            // This would typically come from an active booking
            const analysis = await loadRouteAnalysis();
            setRouteAnalysis(analysis);
            
        } catch (error) {
            console.error('Error loading traffic data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTrafficAlerts = async (location: { latitude: number; longitude: number }): Promise<TrafficAlert[]> => {
        try {
            // Get real traffic alerts from API
            const response = await fetch(`${API_ENDPOINTS.TRAFFIC}/alerts?lat=${location.latitude}&lng=${location.longitude}`, {
                headers: {
                    'Authorization': `Bearer ${await getAuthToken()}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                console.log('No traffic alerts available from API');
                return [];
            }

            const data = await response.json();
            return data.alerts || [];
        } catch (error) {
            console.error('Error loading traffic alerts:', error);
            return [];
        }
    };

    const loadRouteAnalysis = async (): Promise<RouteAnalysis | null> => {
        try {
            // Get real route analysis from API
            const response = await fetch(`${API_ENDPOINTS.TRAFFIC}/route-analysis`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${await getAuthToken()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fromLocation: currentLocation,
                    toLocation: destination,
                }),
            });

            if (!response.ok) {
                console.log('No route analysis available from API');
                return null;
            }

            const data = await response.json();
            return data.analysis || null;
        } catch (error) {
            console.error('Error loading route analysis:', error);
            return null;
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadTrafficData();
        setRefreshing(false);
    };

    const sendTrafficAlert = async (alert: TrafficAlert) => {
        try {
            // This would send the alert to clients
            const success = await driverAvailabilityService.sendTrafficAlert('booking-id', {
                type: alert.type,
                severity: alert.severity,
                message: alert.message,
                location: alert.location,
                estimatedDelay: alert.estimatedDelay,
                alternativeRoute: alert.alternativeRoutes?.[0]?.route,
            });
            
            if (success) {
                Alert.alert('Success', 'Traffic alert sent to clients');
            } else {
                Alert.alert('Error', 'Failed to send traffic alert');
            }
        } catch (error) {
            console.error('Error sending traffic alert:', error);
            Alert.alert('Error', 'Failed to send traffic alert');
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'low': return colors.success;
            case 'medium': return colors.warning;
            case 'high': return colors.error;
            case 'critical': return colors.error;
            default: return colors.text.secondary;
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'low': return 'information';
            case 'medium': return 'alert-circle';
            case 'high': return 'alert';
            case 'critical': return 'alert-octagon';
            default: return 'information';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'congestion': return 'car-multiple';
            case 'accident': return 'car-crash';
            case 'road_closure': return 'road-variant';
            case 'weather': return 'weather-cloudy';
            case 'other': return 'alert-circle';
            default: return 'information';
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading traffic information...</Text>
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
                <Text style={styles.headerTitle}>Traffic Monitor</Text>
                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={onRefresh}
                >
                    <MaterialCommunityIcons name="refresh" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Current Location Status */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialCommunityIcons name="crosshairs-gps" size={24} color={colors.primary} />
                        <Text style={styles.cardTitle}>Current Location</Text>
                    </View>
                    
                    {currentLocation ? (
                        <View style={styles.locationInfo}>
                            <Text style={styles.locationText}>
                                Lat: {currentLocation.latitude.toFixed(6)}
                            </Text>
                            <Text style={styles.locationText}>
                                Lng: {currentLocation.longitude.toFixed(6)}
                            </Text>
                            <View style={styles.locationStatus}>
                                <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                                <Text style={styles.statusText}>GPS Active</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.noLocationInfo}>
                            <MaterialCommunityIcons name="map-marker-off" size={32} color={colors.text.light} />
                            <Text style={styles.noLocationText}>Location not available</Text>
                        </View>
                    )}
                </View>

                {/* Traffic Alerts */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialCommunityIcons name="traffic-light" size={24} color={colors.warning} />
                        <Text style={styles.cardTitle}>Traffic Alerts</Text>
                        <Text style={styles.alertCount}>{trafficAlerts.length}</Text>
                    </View>
                    
                    {trafficAlerts.length > 0 ? (
                        <View style={styles.alertsList}>
                            {trafficAlerts.map((alert) => (
                                <TouchableOpacity
                                    key={alert.id}
                                    style={styles.alertItem}
                                    onPress={() => {
                                        setSelectedAlert(alert);
                                        setAlertModalVisible(true);
                                    }}
                                >
                                    <View style={styles.alertHeader}>
                                        <View style={styles.alertType}>
                                            <MaterialCommunityIcons 
                                                name={getTypeIcon(alert.type) as any} 
                                                size={20} 
                                                color={getSeverityColor(alert.severity)} 
                                            />
                                            <Text style={styles.alertTypeText}>
                                                {alert.type.replace('_', ' ').toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={[
                                            styles.severityBadge,
                                            { backgroundColor: getSeverityColor(alert.severity) + '15' }
                                        ]}>
                                            <MaterialCommunityIcons 
                                                name={getSeverityIcon(alert.severity) as any} 
                                                size={14} 
                                                color={getSeverityColor(alert.severity)} 
                                            />
                                            <Text style={[
                                                styles.severityText,
                                                { color: getSeverityColor(alert.severity) }
                                            ]}>
                                                {alert.severity.toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                    
                                    <Text style={styles.alertMessage}>{alert.message}</Text>
                                    
                                    <View style={styles.alertFooter}>
                                        <View style={styles.alertDelay}>
                                            <MaterialCommunityIcons name="clock-outline" size={14} color={colors.text.secondary} />
                                            <Text style={styles.alertDelayText}>
                                                +{alert.estimatedDelay} min delay
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.sendAlertButton}
                                            onPress={() => sendTrafficAlert(alert)}
                                        >
                                            <MaterialCommunityIcons name="send" size={14} color={colors.primary} />
                                            <Text style={styles.sendAlertText}>Send Alert</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="check-circle" size={48} color={colors.success} />
                            <Text style={styles.emptyStateText}>No traffic alerts</Text>
                            <Text style={styles.emptyStateSubtext}>Clear roads ahead!</Text>
                        </View>
                    )}
                </View>

                {/* Route Analysis */}
                {routeAnalysis && (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="map-marker-path" size={24} color={colors.secondary} />
                            <Text style={styles.cardTitle}>Route Analysis</Text>
                            <TouchableOpacity onPress={() => setAnalysisModalVisible(true)}>
                                <Text style={styles.viewDetailsText}>View Details</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.analysisSummary}>
                            <View style={styles.analysisItem}>
                                <MaterialCommunityIcons name="map-marker-distance" size={20} color={colors.primary} />
                                <Text style={styles.analysisLabel}>Distance</Text>
                                <Text style={styles.analysisValue}>25km</Text>
                            </View>
                            <View style={styles.analysisItem}>
                                <MaterialCommunityIcons name="clock-outline" size={20} color={colors.secondary} />
                                <Text style={styles.analysisLabel}>Duration</Text>
                                <Text style={styles.analysisValue}>45min</Text>
                            </View>
                            <View style={styles.analysisItem}>
                                <MaterialCommunityIcons name="traffic-light" size={20} color={colors.warning} />
                                <Text style={styles.analysisLabel}>Traffic</Text>
                                <Text style={styles.analysisValue}>Medium</Text>
                            </View>
                        </View>
                        
                        {routeAnalysis.recommendations.length > 0 && (
                            <View style={styles.recommendations}>
                                <Text style={styles.recommendationsTitle}>Recommendations:</Text>
                                {routeAnalysis.recommendations.map((rec, index) => (
                                    <View key={index} style={styles.recommendationItem}>
                                        <MaterialCommunityIcons 
                                            name="lightbulb-outline" 
                                            size={16} 
                                            color={colors.warning} 
                                        />
                                        <Text style={styles.recommendationText}>{rec.message}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* Quick Actions */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialCommunityIcons name="lightning-bolt" size={24} color={colors.warning} />
                        <Text style={styles.cardTitle}>Quick Actions</Text>
                    </View>
                    
                    <View style={styles.quickActionsGrid}>
                        <TouchableOpacity
                            style={styles.quickActionButton}
                            onPress={() => {
                                // Navigate to route planning
                                Alert.alert('Route Planning', 'Route planning feature coming soon');
                            }}
                        >
                            <MaterialCommunityIcons name="map-marker-path" size={24} color={colors.primary} />
                            <Text style={styles.quickActionText}>Plan Route</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={styles.quickActionButton}
                            onPress={() => {
                                // Send custom alert
                                Alert.alert('Custom Alert', 'Custom alert feature coming soon');
                            }}
                        >
                            <MaterialCommunityIcons name="alert-circle" size={24} color={colors.warning} />
                            <Text style={styles.quickActionText}>Send Alert</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={styles.quickActionButton}
                            onPress={() => {
                                // View alternative routes
                                Alert.alert('Alternative Routes', 'Alternative routes feature coming soon');
                            }}
                        >
                            <MaterialCommunityIcons name="map-marker-multiple" size={24} color={colors.secondary} />
                            <Text style={styles.quickActionText}>Alternatives</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={styles.quickActionButton}
                            onPress={() => {
                                // Weather information
                                Alert.alert('Weather Info', 'Weather information feature coming soon');
                            }}
                        >
                            <MaterialCommunityIcons name="weather-cloudy" size={24} color={colors.tertiary} />
                            <Text style={styles.quickActionText}>Weather</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Alert Detail Modal */}
            <Modal visible={alertModalVisible} animationType="slide" transparent>
                <View style={styles.modalBg}>
                    <View style={styles.alertModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Traffic Alert Details</Text>
                            <TouchableOpacity onPress={() => setAlertModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text.secondary} />
                            </TouchableOpacity>
                        </View>
                        
                        {selectedAlert && (
                            <ScrollView style={styles.alertDetails}>
                                <View style={styles.alertDetailSection}>
                                    <Text style={styles.alertDetailTitle}>Alert Information</Text>
                                    <View style={styles.alertDetailRow}>
                                        <Text style={styles.alertDetailLabel}>Type:</Text>
                                        <Text style={styles.alertDetailValue}>
                                            {selectedAlert.type.replace('_', ' ').toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={styles.alertDetailRow}>
                                        <Text style={styles.alertDetailLabel}>Severity:</Text>
                                        <Text style={[
                                            styles.alertDetailValue,
                                            { color: getSeverityColor(selectedAlert.severity) }
                                        ]}>
                                            {selectedAlert.severity.toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={styles.alertDetailRow}>
                                        <Text style={styles.alertDetailLabel}>Message:</Text>
                                        <Text style={styles.alertDetailValue}>{selectedAlert.message}</Text>
                                    </View>
                                    <View style={styles.alertDetailRow}>
                                        <Text style={styles.alertDetailLabel}>Estimated Delay:</Text>
                                        <Text style={styles.alertDetailValue}>
                                            {selectedAlert.estimatedDelay} minutes
                                        </Text>
                                    </View>
                                </View>
                                
                                <View style={styles.alertDetailSection}>
                                    <Text style={styles.alertDetailTitle}>Location</Text>
                                    <Text style={styles.alertDetailValue}>
                                        Lat: {selectedAlert.location.latitude.toFixed(6)}
                                    </Text>
                                    <Text style={styles.alertDetailValue}>
                                        Lng: {selectedAlert.location.longitude.toFixed(6)}
                                    </Text>
                                </View>
                                
                                {selectedAlert.alternativeRoutes && selectedAlert.alternativeRoutes.length > 0 && (
                                    <View style={styles.alertDetailSection}>
                                        <Text style={styles.alertDetailTitle}>Alternative Routes</Text>
                                        {selectedAlert.alternativeRoutes.map((route, index) => (
                                            <View key={index} style={styles.alternativeRoute}>
                                                <Text style={styles.alternativeRouteText}>
                                                    Route {index + 1}: {route.distance}km, {Math.round(route.duration / 60)}min
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </ScrollView>
                        )}
                        
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setAlertModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.sendButton}
                                onPress={() => {
                                    if (selectedAlert) {
                                        sendTrafficAlert(selectedAlert);
                                        setAlertModalVisible(false);
                                    }
                                }}
                            >
                                <Text style={styles.sendButtonText}>Send to Clients</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Route Analysis Modal */}
            <Modal visible={analysisModalVisible} animationType="slide" transparent>
                <View style={styles.modalBg}>
                    <View style={styles.analysisModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Route Analysis</Text>
                            <TouchableOpacity onPress={() => setAnalysisModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text.secondary} />
                            </TouchableOpacity>
                        </View>
                        
                        {routeAnalysis && (
                            <ScrollView style={styles.analysisDetails}>
                                <View style={styles.analysisDetailSection}>
                                    <Text style={styles.analysisDetailTitle}>Current Route</Text>
                                    <View style={styles.analysisDetailRow}>
                                        <Text style={styles.analysisDetailLabel}>Distance:</Text>
                                        <Text style={styles.analysisDetailValue}>25km</Text>
                                    </View>
                                    <View style={styles.analysisDetailRow}>
                                        <Text style={styles.analysisDetailLabel}>Duration:</Text>
                                        <Text style={styles.analysisDetailValue}>45 minutes</Text>
                                    </View>
                                    <View style={styles.analysisDetailRow}>
                                        <Text style={styles.analysisDetailLabel}>Traffic Level:</Text>
                                        <Text style={styles.analysisDetailValue}>Medium</Text>
                                    </View>
                                </View>
                                
                                {routeAnalysis.alternativeRoutes.length > 0 && (
                                    <View style={styles.analysisDetailSection}>
                                        <Text style={styles.analysisDetailTitle}>Alternative Routes</Text>
                                        {routeAnalysis.alternativeRoutes.map((route, index) => (
                                            <View key={index} style={styles.alternativeRouteItem}>
                                                <Text style={styles.alternativeRouteTitle}>
                                                    Route {index + 1}
                                                </Text>
                                                <Text style={styles.alternativeRouteDetails}>
                                                    Distance: {route.distance}km
                                                </Text>
                                                <Text style={styles.alternativeRouteDetails}>
                                                    Duration: {Math.round(route.duration / 60)} minutes
                                                </Text>
                                                <Text style={styles.alternativeRouteDetails}>
                                                    Delay: {route.delay} minutes
                                                </Text>
                                                <Text style={styles.alternativeRouteReason}>
                                                    {route.reason}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                                
                                {routeAnalysis.recommendations.length > 0 && (
                                    <View style={styles.analysisDetailSection}>
                                        <Text style={styles.analysisDetailTitle}>Recommendations</Text>
                                        {routeAnalysis.recommendations.map((rec, index) => (
                                            <View key={index} style={styles.recommendationItem}>
                                                <MaterialCommunityIcons 
                                                    name="lightbulb-outline" 
                                                    size={16} 
                                                    color={colors.warning} 
                                                />
                                                <Text style={styles.recommendationText}>{rec.message}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </ScrollView>
                        )}
                        
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setAnalysisModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Close</Text>
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
    refreshButton: {
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
    content: {
        flex: 1,
        padding: spacing.lg,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.lg,
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
        flex: 1,
    },
    alertCount: {
        fontSize: fonts.size.sm,
        color: colors.primary,
        fontWeight: 'bold',
        backgroundColor: colors.primary + '15',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 12,
    },
    locationInfo: {
        gap: spacing.sm,
    },
    locationText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        fontFamily: 'monospace',
    },
    locationStatus: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: spacing.xs,
    },
    statusText: {
        fontSize: fonts.size.sm,
        color: colors.success,
        fontWeight: '500',
    },
    noLocationInfo: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
    },
    noLocationText: {
        fontSize: fonts.size.md,
        color: colors.text.light,
        marginTop: spacing.sm,
    },
    alertsList: {
        gap: spacing.md,
    },
    alertItem: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: colors.warning,
    },
    alertHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    alertType: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    alertTypeText: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        marginLeft: spacing.xs,
        fontWeight: '500',
    },
    severityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 12,
    },
    severityText: {
        fontSize: fonts.size.xs,
        fontWeight: 'bold',
        marginLeft: spacing.xs,
    },
    alertMessage: {
        fontSize: fonts.size.md,
        color: colors.text.primary,
        marginBottom: spacing.sm,
        lineHeight: 20,
    },
    alertFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    alertDelay: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    alertDelayText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginLeft: spacing.xs,
    },
    sendAlertButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary + '15',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 8,
    },
    sendAlertText: {
        fontSize: fonts.size.sm,
        color: colors.primary,
        marginLeft: spacing.xs,
        fontWeight: '500',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    emptyStateText: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.secondary,
        marginTop: spacing.sm,
        textAlign: 'center',
    },
    emptyStateSubtext: {
        fontSize: fonts.size.sm,
        color: colors.text.light,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    analysisSummary: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: spacing.md,
    },
    analysisItem: {
        alignItems: 'center',
    },
    analysisLabel: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginTop: spacing.xs,
    },
    analysisValue: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginTop: spacing.xs,
    },
    recommendations: {
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    recommendationsTitle: {
        fontSize: fonts.size.sm,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    recommendationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    recommendationText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginLeft: spacing.sm,
        flex: 1,
    },
    viewDetailsText: {
        fontSize: fonts.size.sm,
        color: colors.primary,
        fontWeight: '600',
    },
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    quickActionButton: {
        flex: 1,
        minWidth: '45%',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.primary + '20',
    },
    quickActionText: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        marginTop: spacing.xs,
        fontWeight: '500',
        textAlign: 'center',
    },
    modalBg: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertModal: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        width: '90%',
        maxHeight: '80%',
    },
    analysisModal: {
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
    alertDetails: {
        maxHeight: 400,
    },
    analysisDetails: {
        maxHeight: 400,
    },
    alertDetailSection: {
        marginBottom: spacing.lg,
    },
    analysisDetailSection: {
        marginBottom: spacing.lg,
    },
    alertDetailTitle: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    analysisDetailTitle: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    alertDetailRow: {
        flexDirection: 'row',
        marginBottom: spacing.sm,
    },
    analysisDetailRow: {
        flexDirection: 'row',
        marginBottom: spacing.sm,
    },
    alertDetailLabel: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        fontWeight: '500',
        minWidth: 120,
    },
    analysisDetailLabel: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        fontWeight: '500',
        minWidth: 120,
    },
    alertDetailValue: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        flex: 1,
    },
    analysisDetailValue: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        flex: 1,
    },
    alternativeRoute: {
        backgroundColor: colors.background,
        padding: spacing.sm,
        borderRadius: 8,
        marginBottom: spacing.sm,
    },
    alternativeRouteItem: {
        backgroundColor: colors.background,
        padding: spacing.md,
        borderRadius: 8,
        marginBottom: spacing.sm,
    },
    alternativeRouteText: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
    },
    alternativeRouteTitle: {
        fontSize: fonts.size.sm,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    alternativeRouteDetails: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginBottom: spacing.xs,
    },
    alternativeRouteReason: {
        fontSize: fonts.size.sm,
        color: colors.text.light,
        fontStyle: 'italic',
    },
    modalActions: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.lg,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    sendButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: 8,
        backgroundColor: colors.primary,
        alignItems: 'center',
    },
    sendButtonText: {
        fontSize: fonts.size.md,
        color: colors.white,
        fontWeight: 'bold',
    },
});

export default DriverTrafficScreen;
