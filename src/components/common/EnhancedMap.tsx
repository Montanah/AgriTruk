import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import { GOOGLE_MAPS_CONFIG } from '../../constants/googleMaps';
import spacing from '../../constants/spacing';
import { googleMapsService, Location as LocationType, Route } from '../../services/googleMapsService';

interface EnhancedMapProps {
    origin?: LocationType | string;
    destination?: LocationType | string;
    waypoints?: (LocationType | string)[];
    showDirections?: boolean;
    showCurrentLocation?: boolean;
    onRouteCalculated?: (route: Route) => void;
    onLocationSelected?: (location: LocationType) => void;
    style?: any;
    height?: number;
}

const EnhancedMap: React.FC<EnhancedMapProps> = ({
    origin,
    destination,
    waypoints = [],
    showDirections = false,
    showCurrentLocation = true,
    onRouteCalculated,
    onLocationSelected,
    style,
    height = 300,
}) => {
    const mapRef = useRef<MapView>(null);
    const [currentLocation, setCurrentLocation] = useState<LocationType | null>(null);
    const [route, setRoute] = useState<Route | null>(null);
    const [loading, setLoading] = useState(false);
    const [region, setRegion] = useState(GOOGLE_MAPS_CONFIG.DEFAULT_REGION);
    const [markers, setMarkers] = useState<any[]>([]);

    // Get current location
    useEffect(() => {
        if (showCurrentLocation) {
            getCurrentLocation();
        }
    }, [showCurrentLocation]);

    // Calculate route when origin and destination change
    useEffect(() => {
        if (showDirections && origin && destination) {
            calculateRoute();
        }
    }, [origin, destination, waypoints, showDirections]);

    // Update markers when locations change
    useEffect(() => {
        updateMarkers();
    }, [origin, destination, waypoints, currentLocation]);

    const getCurrentLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Location permission is required to show your current location.');
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const currentLoc: LocationType = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };

            setCurrentLocation(currentLoc);

            // Update region to include current location
            if (!origin && !destination) {
                setRegion({
                    latitude: currentLoc.latitude,
                    longitude: currentLoc.longitude,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                });
            }
        } catch (error) {
            console.error('Error getting current location:', error);
        }
    };

    const calculateRoute = async () => {
        if (!origin || !destination) return;

        try {
            setLoading(true);
            const calculatedRoute = await googleMapsService.getDirections(origin, destination, waypoints);
            setRoute(calculatedRoute);

            if (onRouteCalculated) {
                onRouteCalculated(calculatedRoute);
            }

            // Fit map to show entire route
            fitMapToRoute();
        } catch (error) {
            console.error('Error calculating route:', error);
            Alert.alert('Error', 'Failed to calculate route. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fitMapToRoute = () => {
        if (!mapRef.current || !origin || !destination) return;

        const coordinates = [];

        // Add origin
        if (typeof origin === 'string') {
            // If origin is a string, we need to geocode it first
            // For now, we'll skip this and use the current region
        } else {
            coordinates.push(origin);
        }

        // Add waypoints
        waypoints.forEach(waypoint => {
            if (typeof waypoint !== 'string') {
                coordinates.push(waypoint);
            }
        });

        // Add destination
        if (typeof destination === 'string') {
            // If destination is a string, we need to geocode it first
            // For now, we'll skip this and use the current region
        } else {
            coordinates.push(destination);
        }

        if (coordinates.length > 0) {
            mapRef.current.fitToCoordinates(coordinates, {
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                animated: true,
            });
        }
    };

    const updateMarkers = () => {
        const newMarkers = [];

        // Add origin marker
        if (origin) {
            if (typeof origin === 'string') {
                // Handle string origin (address) - would need geocoding
                console.log('String origin detected, geocoding needed');
            } else {
                newMarkers.push({
                    id: 'origin',
                    coordinate: origin,
                    title: 'Origin',
                    description: origin.address || 'Starting point',
                    pinColor: colors.primary,
                });
            }
        }

        // Add waypoint markers
        waypoints.forEach((waypoint, index) => {
            if (typeof waypoint !== 'string') {
                newMarkers.push({
                    id: `waypoint-${index}`,
                    coordinate: waypoint,
                    title: `Waypoint ${index + 1}`,
                    description: waypoint.address || `Stop ${index + 1}`,
                    pinColor: colors.warning,
                });
            }
        });

        // Add destination marker
        if (destination) {
            if (typeof destination === 'string') {
                // Handle string destination (address) - would need geocoding
                console.log('String destination detected, geocoding needed');
            } else {
                newMarkers.push({
                    id: 'destination',
                    coordinate: destination,
                    title: 'Destination',
                    description: destination.address || 'End point',
                    pinColor: colors.secondary,
                });
            }
        }

        // Add current location marker
        if (currentLocation && showCurrentLocation) {
            newMarkers.push({
                id: 'current',
                coordinate: currentLocation,
                title: 'Your Location',
                description: 'Current location',
                pinColor: colors.success,
            });
        }

        setMarkers(newMarkers);
    };

    const handleMapPress = async (event: any) => {
        const { coordinate } = event.nativeEvent;
        const location: LocationType = {
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
        };

        // Reverse geocode to get address
        try {
            const address = await googleMapsService.reverseGeocode(location);
            location.address = address;
        } catch (error) {
            console.error('Error reverse geocoding:', error);
        }

        if (onLocationSelected) {
            onLocationSelected(location);
        }
    };

    const centerOnCurrentLocation = () => {
        if (currentLocation && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
            });
        }
    };

    return (
        <View style={[styles.container, { height }, style]}>
            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={region}
                onPress={handleMapPress}
                showsUserLocation={showCurrentLocation}
                showsMyLocationButton={false}
                customMapStyle={GOOGLE_MAPS_CONFIG.MAP_STYLES}
            >
                {/* Render markers */}
                {markers.map((marker) => (
                    <Marker
                        key={marker.id}
                        coordinate={marker.coordinate}
                        title={marker.title}
                        description={marker.description}
                        pinColor={marker.pinColor}
                    />
                ))}

                {/* Render route polyline */}
                {route && route.polyline && (
                    <Polyline
                        coordinates={decodePolyline(route.polyline)}
                        strokeColor={colors.primary}
                        strokeWidth={3}
                        lineDashPattern={[1]}
                    />
                )}
            </MapView>

            {/* Loading overlay */}
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Calculating route...</Text>
                </View>
            )}

            {/* Current location button */}
            {showCurrentLocation && currentLocation && (
                <TouchableOpacity
                    style={styles.currentLocationButton}
                    onPress={centerOnCurrentLocation}
                >
                    <MaterialCommunityIcons name="crosshairs-gps" size={24} color={colors.white} />
                </TouchableOpacity>
            )}

            {/* Route info */}
            {route && (
                <View style={styles.routeInfo}>
                    <Text style={styles.routeText}>
                        Distance: {route.distance} • Duration: {route.duration}
                    </Text>
                </View>
            )}
        </View>
    );
};

// Helper function to decode Google's polyline format
const decodePolyline = (encoded: string) => {
    const poly = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
        let shift = 0, result = 0;

        do {
            let b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (result >= 0x20);

        let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;

        do {
            let b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (result >= 0x20);

        let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        poly.push({
            latitude: lat / 1E5,
            longitude: lng / 1E5,
        });
    }

    return poly;
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    map: {
        flex: 1,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: spacing.sm,
        fontSize: fonts.sizes.md,
        color: colors.text.primary,
    },
    currentLocationButton: {
        position: 'absolute',
        bottom: spacing.lg,
        right: spacing.lg,
        backgroundColor: colors.primary,
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    routeInfo: {
        position: 'absolute',
        top: spacing.md,
        left: spacing.md,
        right: spacing.md,
        backgroundColor: colors.white,
        padding: spacing.sm,
        borderRadius: spacing.sm,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    routeText: {
        fontSize: fonts.sizes.sm,
        color: colors.text.primary,
        textAlign: 'center',
        fontFamily: fonts.family.medium,
    },
});

export default EnhancedMap;









