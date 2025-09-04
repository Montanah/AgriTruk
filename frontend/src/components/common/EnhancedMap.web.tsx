import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';

interface EnhancedMapProps {
    origin?: any;
    destination?: any;
    waypoints?: any[];
    showDirections?: boolean;
    showCurrentLocation?: boolean;
    onRouteCalculated?: (route: any) => void;
    onLocationSelected?: (location: any) => void;
    style?: any;
    height?: number;
}

const EnhancedMap: React.FC<EnhancedMapProps> = ({
    origin,
    destination,
    waypoints = [],
    showDirections = false,
    showCurrentLocation = false,
    onRouteCalculated,
    onLocationSelected,
    style,
    height = 300,
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Simulate route calculation for web
        if (showDirections && origin && destination) {
            setIsLoading(true);
            setTimeout(() => {
                setIsLoading(false);
                if (onRouteCalculated) {
                    onRouteCalculated({
                        distance: '5.2 km',
                        duration: '12 min',
                        polyline: '',
                        steps: []
                    });
                }
            }, 1000);
        }
    }, [origin, destination, showDirections, onRouteCalculated]);

    const handleLocationPress = (location: any) => {
        if (onLocationSelected) {
            onLocationSelected(location);
        }
    };

    if (error) {
        return (
            <View style={[styles.container, { height }, style]}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Map Error: {error}</Text>
                    <TouchableOpacity 
                        style={styles.retryButton}
                        onPress={() => setError(null)}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { height }, style]}>
            <View style={styles.mapPlaceholder}>
                <Text style={styles.mapTitle}>🗺️ Interactive Map</Text>
                <Text style={styles.mapSubtitle}>Web version - Full map functionality available in mobile app</Text>
                
                {isLoading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.loadingText}>Calculating route...</Text>
                    </View>
                )}

                {origin && (
                    <View style={styles.locationInfo}>
                        <Text style={styles.locationLabel}>📍 Origin:</Text>
                        <Text style={styles.locationText}>
                            {typeof origin === 'string' ? origin : `${origin.latitude}, ${origin.longitude}`}
                        </Text>
                    </View>
                )}

                {destination && (
                    <View style={styles.locationInfo}>
                        <Text style={styles.locationLabel}>🎯 Destination:</Text>
                        <Text style={styles.locationText}>
                            {typeof destination === 'string' ? destination : `${destination.latitude}, ${destination.longitude}`}
                        </Text>
                    </View>
                )}

                {waypoints.length > 0 && (
                    <View style={styles.locationInfo}>
                        <Text style={styles.locationLabel}>🛣️ Waypoints:</Text>
                        {waypoints.map((waypoint, index) => (
                            <Text key={index} style={styles.locationText}>
                                {index + 1}. {typeof waypoint === 'string' ? waypoint : `${waypoint.latitude}, ${waypoint.longitude}`}
                            </Text>
                        ))}
                    </View>
                )}

                <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleLocationPress(origin || destination)}
                >
                    <Text style={styles.actionButtonText}>Select Location</Text>
                </TouchableOpacity>

                <Text style={styles.noteText}>
                    💡 For full map functionality, use the mobile app version
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    mapPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.background,
    },
    mapTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    mapSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    loadingContainer: {
        alignItems: 'center',
        marginVertical: spacing.md,
    },
    loadingText: {
        marginTop: spacing.sm,
        fontSize: 16,
        color: colors.primary,
    },
    locationInfo: {
        width: '100%',
        marginBottom: spacing.md,
        padding: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    locationLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
        marginBottom: spacing.xs,
    },
    locationText: {
        fontSize: 12,
        color: colors.text,
        lineHeight: 16,
    },
    actionButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 8,
        marginTop: spacing.md,
    },
    actionButtonText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    noteText: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.md,
        fontStyle: 'italic',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    errorText: {
        fontSize: 16,
        color: colors.error,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    retryButton: {
        backgroundColor: colors.error,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 8,
    },
    retryButtonText: {
        color: colors.white,
        fontSize: 14,
        fontWeight: '600',
    },
});

export default EnhancedMap;
