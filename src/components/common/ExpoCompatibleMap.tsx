import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../constants/colors';

interface ExpoCompatibleMapProps {
    initialRegion?: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    };
    markers?: Array<{
        id: string;
        coordinate: {
            latitude: number;
            longitude: number;
        };
        title?: string;
        description?: string;
        pinColor?: string;
    }>;
    showUserLocation?: boolean;
    onRegionChange?: (region: any) => void;
    onMarkerPress?: (marker: any) => void;
    style?: any;
    zoomEnabled?: boolean;
    scrollEnabled?: boolean;
    rotateEnabled?: boolean;
}

const ExpoCompatibleMap: React.FC<ExpoCompatibleMapProps> = ({
    initialRegion,
    markers = [],
    showUserLocation = true,
    onRegionChange,
    onMarkerPress,
    style,
    zoomEnabled = true,
    scrollEnabled = true,
    rotateEnabled = true,
}) => {
    const [userLocation, setUserLocation] = useState<any>(null);
    const [hasLocationPermission, setHasLocationPermission] = useState(false);
    const [currentRegion, setCurrentRegion] = useState(initialRegion || {
        latitude: -1.2921, // Nairobi
        longitude: 36.8219,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    });

    useEffect(() => {
        requestLocationPermission();
    }, []);

    const requestLocationPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                setHasLocationPermission(true);
                getCurrentLocation();
            }
        } catch (error) {
            console.log('Location permission error:', error);
        }
    };

    const getCurrentLocation = async () => {
        try {
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            const newRegion = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
            };

            setUserLocation(newRegion);
            setCurrentRegion(newRegion);

            if (onRegionChange) {
                onRegionChange(newRegion);
            }
        } catch (error) {
            console.log('Get current location error:', error);
        }
    };

    const handleMarkerPress = (marker: any) => {
        if (onMarkerPress) {
            onMarkerPress(marker);
        }
    };

    const openInGoogleMaps = () => {
        const { latitude, longitude } = currentRegion;
        const url = `https://www.google.com/maps?q=${latitude},${longitude}`;

        if (Platform.OS === 'web') {
            window.open(url, '_blank');
        } else {
            // For mobile, you can use Linking.openURL
            console.log('Open in Google Maps:', url);
        }
    };

    const openInAppleMaps = () => {
        const { latitude, longitude } = currentRegion;
        const url = `http://maps.apple.com/?q=${latitude},${longitude}`;

        if (Platform.OS === 'web') {
            window.open(url, '_blank');
        } else {
            console.log('Open in Apple Maps:', url);
        }
    };

    return (
        <View style={[styles.container, style]}>
            {/* Map Header */}
            <View style={styles.mapHeader}>
                <View style={styles.locationInfo}>
                    <MaterialCommunityIcons name="map-marker" size={20} color={colors.primary} />
                    <Text style={styles.locationText}>
                        {currentRegion.latitude.toFixed(4)}, {currentRegion.longitude.toFixed(4)}
                    </Text>
                </View>

                <View style={styles.mapActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={openInGoogleMaps}>
                        <MaterialCommunityIcons name="google-maps" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    {Platform.OS === 'ios' && (
                        <TouchableOpacity style={styles.actionButton} onPress={openInAppleMaps}>
                            <MaterialCommunityIcons name="apple" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Map Content */}
            <View style={styles.mapContent}>
                <MaterialCommunityIcons name="map" size={80} color={colors.text.light} />
                <Text style={styles.mapTitle}>Interactive Map</Text>
                <Text style={styles.mapSubtitle}>
                    {Platform.OS === 'web'
                        ? 'Click the map icons above to open in Google Maps or Apple Maps'
                        : 'Use the buttons above to open in your preferred maps app'
                    }
                </Text>

                {/* User Location */}
                {userLocation && showUserLocation && (
                    <View style={styles.userLocationCard}>
                        <MaterialCommunityIcons name="crosshairs-gps" size={24} color={colors.primary} />
                        <View style={styles.userLocationInfo}>
                            <Text style={styles.userLocationTitle}>Your Location</Text>
                            <Text style={styles.userLocationCoords}>
                                {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Markers */}
                {markers.length > 0 && (
                    <View style={styles.markersContainer}>
                        <Text style={styles.markersTitle}>Location Markers:</Text>
                        {markers.map((marker) => (
                            <TouchableOpacity
                                key={marker.id}
                                style={styles.markerItem}
                                onPress={() => handleMarkerPress(marker)}
                            >
                                <MaterialCommunityIcons
                                    name="map-marker"
                                    size={24}
                                    color={marker.pinColor || colors.secondary}
                                />
                                <View style={styles.markerInfo}>
                                    <Text style={styles.markerTitle}>{marker.title || 'Location'}</Text>
                                    <Text style={styles.markerDescription}>
                                        {marker.description || 'Location point'}
                                    </Text>
                                    <Text style={styles.markerCoords}>
                                        {marker.coordinate.latitude.toFixed(4)}, {marker.coordinate.longitude.toFixed(4)}
                                    </Text>
                                </View>
                                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.text.light} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Map Controls */}
                <View style={styles.mapControls}>
                    <TouchableOpacity style={styles.controlButton} onPress={getCurrentLocation}>
                        <Ionicons name="locate" size={20} color={colors.primary} />
                        <Text style={styles.controlText}>My Location</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.controlButton} onPress={openInGoogleMaps}>
                        <MaterialCommunityIcons name="google-maps" size={20} color={colors.secondary} />
                        <Text style={styles.controlText}>Google Maps</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
        borderRadius: 16,
        overflow: 'hidden',
    },
    mapHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    locationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationText: {
        marginLeft: 8,
        fontSize: 14,
        color: colors.text.primary,
        fontWeight: '500',
    },
    mapActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.border,
    },
    mapContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    mapTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginTop: 16,
        marginBottom: 8,
    },
    mapSubtitle: {
        fontSize: 14,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    userLocationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary + '10',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        width: '100%',
    },
    userLocationInfo: {
        marginLeft: 12,
        flex: 1,
    },
    userLocationTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.primary,
    },
    userLocationCoords: {
        fontSize: 12,
        color: colors.text.secondary,
        marginTop: 2,
    },
    markersContainer: {
        width: '100%',
        marginBottom: 20,
    },
    markersTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 12,
        textAlign: 'center',
    },
    markerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    markerInfo: {
        marginLeft: 12,
        flex: 1,
    },
    markerTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text.primary,
    },
    markerDescription: {
        fontSize: 12,
        color: colors.text.secondary,
        marginTop: 2,
    },
    markerCoords: {
        fontSize: 10,
        color: colors.text.light,
        marginTop: 2,
        fontFamily: 'monospace',
    },
    mapControls: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'center',
    },
    controlButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    controlText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
        color: colors.text.primary,
    },
});

export default ExpoCompatibleMap;
