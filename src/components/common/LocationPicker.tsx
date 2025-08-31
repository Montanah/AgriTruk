import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';
import { googleMapsService } from '../../services/googleMapsService';

interface LocationType {
    latitude: number;
    longitude: number;
    address?: string;
    placeId?: string;
}

interface LocationPickerProps {
    placeholder?: string;
    value?: string;
    onLocationSelected?: (location: LocationType) => void;
    onAddressChange?: (address: string) => void;
    style?: any;
    disabled?: boolean;
    showMap?: boolean;
    onMapPress?: () => void;
    useCurrentLocation?: boolean; // New prop to enable current location
    isPickupLocation?: boolean; // New prop to identify pickup location
}

const LocationPicker: React.FC<LocationPickerProps> = ({
    placeholder = 'Enter location',
    value = '',
    onLocationSelected,
    onAddressChange,
    style,
    disabled = false,
    showMap = false,
    onMapPress,
    useCurrentLocation = false,
    isPickupLocation = false,
}) => {
    const [selectedLocation, setSelectedLocation] = useState<LocationType | null>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState(value);
    const [hasError, setHasError] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<LocationType | null>(null);
    const [isGettingCurrentLocation, setIsGettingCurrentLocation] = useState(false);
    const [locationPermission, setLocationPermission] = useState<Location.PermissionStatus | null>(null);
    const [searchResultsKey, setSearchResultsKey] = useState(0); // Key to force re-render

    useEffect(() => {
        setSearchQuery(value);
    }, [value]);

    // Get current location for pickup locations
    useEffect(() => {
        if (useCurrentLocation && isPickupLocation && !currentLocation && !selectedLocation) {
            getCurrentLocation();
        }
    }, [useCurrentLocation, isPickupLocation, selectedLocation]);

    const getCurrentLocation = async () => {
        try {
            setIsGettingCurrentLocation(true);
            setHasError(false);

            // Check location permissions
            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationPermission(status);

            if (status !== 'granted') {
                Alert.alert(
                    'Location Permission Required',
                    'To set your current location as pickup point, please allow location access.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Settings', onPress: () => Location.requestForegroundPermissionsAsync() }
                    ]
                );
                return;
            }

            // Get current position
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
                timeInterval: 10000,
                distanceInterval: 10,
            });

            const currentLoc: LocationType = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                address: '',
            };

            // Get address from coordinates
            try {
                const address = await googleMapsService.reverseGeocode(currentLoc);
                currentLoc.address = address;
            } catch (error) {
                console.log('Could not get address for current location, using coordinates');
                currentLoc.address = `${currentLoc.latitude.toFixed(6)}, ${currentLoc.longitude.toFixed(6)}`;
            }

            setCurrentLocation(currentLoc);

            // Only set as default if no location is selected AND no search query exists
            if (isPickupLocation && !selectedLocation && !searchQuery.trim()) {
                setSelectedLocation(currentLoc);
                setSearchQuery(currentLoc.address);
                if (onLocationSelected) {
                    onLocationSelected(currentLoc);
                }
                if (onAddressChange) {
                    onAddressChange(currentLoc.address);
                }
            }

        } catch (error: any) {
            console.error('Error getting current location:', error);
            setHasError(true);

            if (error.message.includes('Location service is disabled')) {
                Alert.alert(
                    'Location Service Disabled',
                    'Please enable location services in your device settings to use current location.',
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert(
                    'Location Error',
                    'Could not get your current location. Please enter the pickup location manually.',
                    [{ text: 'OK' }]
                );
            }
        } finally {
            setIsGettingCurrentLocation(false);
        }
    };

    const resetCurrentLocation = () => {
        setCurrentLocation(null);
        setSelectedLocation(null);
        setSearchQuery('');
        clearSearchResults();
        setHasError(false);

        if (onLocationSelected) {
            onLocationSelected({ latitude: 0, longitude: 0, address: '' });
        }
        if (onAddressChange) {
            onAddressChange('');
        }
    };

    const clearSearchResults = () => {
        setSearchResults([]);
        setSearchResultsKey(prev => prev + 1); // Force re-render
    };

    const handleTextChange = (text: string) => {
        setSearchQuery(text);
        setHasError(false);

        // If user is manually typing, clear current location selection
        if (currentLocation && text !== currentLocation.address) {
            setSelectedLocation(null);
        }

        if (onAddressChange) {
            onAddressChange(text);
        }

        // Clear previous search results when starting a new search
        if (text.length <= 2) {
            clearSearchResults();
            return;
        }

        // Clear results before starting new search
        clearSearchResults();

        // Search places if text is long enough
        if (text.length > 2) {
            // Small delay to avoid too many API calls
            setTimeout(() => {
                if (text === searchQuery) { // Only search if text hasn't changed
                    searchPlaces(text);
                }
            }, 300);
        }
    };

    const searchPlaces = async (query: string) => {
        if (!query.trim()) {
            clearSearchResults();
            return;
        }

        setIsSearching(true);
        setHasError(false);

        try {
            console.log('🔍 Searching for places:', query);
            const places = await googleMapsService.searchPlaces(query);
            console.log('🔍 Found places:', places);

            if (places.length === 0) {
                // No results found - this is not an error
                clearSearchResults();
                setHasError(false);
                return;
            }

            setSearchResults(places);
        } catch (error: any) {
            console.error('Error searching places:', error);
            setHasError(true);
            clearSearchResults();

            // Log the full error for debugging
            console.log('🔍 Full error details:', {
                message: error.message,
                status: error.status,
                code: error.code,
                stack: error.stack
            });

            // Show user-friendly error message with more details
            if (error.message?.includes('REQUEST_DENIED')) {
                Alert.alert(
                    'Location Search Unavailable',
                    'Location search is temporarily unavailable. Please enter the address manually.\n\nError: REQUEST_DENIED - Check API key and billing.',
                    [{ text: 'OK' }]
                );
            } else if (error.message?.includes('OVER_QUERY_LIMIT')) {
                Alert.alert(
                    'Search Limit Reached',
                    'Location search limit reached. Please try again later.',
                    [{ text: 'OK' }]
                );
            } else if (error.message?.includes('INVALID_REQUEST')) {
                Alert.alert(
                    'Invalid Request',
                    'Invalid search request. Please try a different search term.',
                    [{ text: 'OK' }]
                );
            } else if (error.message?.includes('ZERO_RESULTS')) {
                // This is not really an error, just no results
                clearSearchResults();
                setHasError(false);
                return;
            } else {
                Alert.alert(
                    'Search Error',
                    `Unable to search for locations. Please enter the address manually.\n\nError: ${error.message || 'Unknown error'}`,
                    [{ text: 'OK' }]
                );
            }
        } finally {
            setIsSearching(false);
        }
    };

    const handlePlaceSelect = async (place: any) => {
        console.log('🔍 Selected place:', place);

        // Immediately clear search results and set loading state
        clearSearchResults();
        setIsSearching(true);

        try {
            const placeDetails = await googleMapsService.getPlaceDetails(place.placeId);
            console.log('🔍 Place details:', placeDetails);

            const location: LocationType = {
                latitude: placeDetails.location.latitude,
                longitude: placeDetails.location.longitude,
                address: placeDetails.address,
                placeId: placeDetails.placeId,
            };

            // Update all states
            setSelectedLocation(location);
            setSearchQuery(placeDetails.address);
            setHasError(false);

            // Clear search results again to ensure they're gone
            clearSearchResults();

            // Notify parent components
            if (onLocationSelected) {
                onLocationSelected(location);
            }
            if (onAddressChange) {
                onAddressChange(placeDetails.address);
            }

        } catch (error: any) {
            console.error('Error getting place details:', error);
            setHasError(true);

            // Fallback: use the basic place info we have
            const location: LocationType = {
                latitude: place.location?.latitude || 0,
                longitude: place.location?.longitude || 0,
                address: place.address || place.name,
                placeId: place.placeId,
            };

            setSelectedLocation(location);
            setSearchQuery(place.address || place.name);

            // Clear search results even on fallback
            clearSearchResults();

            if (onLocationSelected) {
                onLocationSelected(location);
            }
            if (onAddressChange) {
                onAddressChange(place.address || place.name);
            }

            Alert.alert(
                'Location Selected',
                'Location selected with basic information. Some details may be limited.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsSearching(false);
            // Final cleanup - ensure search results are cleared
            clearSearchResults();
        }
    };

    const clearLocation = () => {
        setSelectedLocation(null);
        setSearchQuery('');
        clearSearchResults();
        setHasError(false);

        if (onLocationSelected) {
            onLocationSelected({ latitude: 0, longitude: 0, address: '' });
        }
        if (onAddressChange) {
            onAddressChange('');
        }
    };

    return (
        <View style={[styles.container, style]}>
            <View style={styles.inputContainer}>
                <TextInput
                    style={[
                        styles.textInput,
                        hasError && styles.textInputError,
                        { paddingLeft: isPickupLocation && useCurrentLocation ? 50 : spacing.md }
                    ]}
                    value={searchQuery}
                    onChangeText={handleTextChange}
                    placeholder={placeholder}
                    placeholderTextColor={colors.text.light}
                    editable={!disabled}
                />

                {/* Current Location Button for Pickup Locations */}
                {isPickupLocation && useCurrentLocation && (
                    <TouchableOpacity
                        style={styles.currentLocationButton}
                        onPress={() => {
                            if (currentLocation) {
                                // If we already have current location, refresh it
                                getCurrentLocation();
                            } else {
                                // If no current location, get it
                                getCurrentLocation();
                            }
                        }}
                        disabled={isGettingCurrentLocation}
                    >
                        {isGettingCurrentLocation ? (
                            <ActivityIndicator size={16} color={colors.primary} />
                        ) : (
                            <MaterialCommunityIcons
                                name="crosshairs-gps"
                                size={20}
                                color={currentLocation ? colors.success : colors.primary}
                            />
                        )}
                    </TouchableOpacity>
                )}

                {/* Search Indicator */}
                {isSearching && (
                    <View style={styles.searchIndicator}>
                        <ActivityIndicator size={16} color={colors.primary} />
                    </View>
                )}

                {/* Clear Button */}
                {searchQuery.length > 0 && (
                    <TouchableOpacity style={styles.clearButton} onPress={clearLocation}>
                        <MaterialCommunityIcons
                            name="close-circle"
                            size={20}
                            color={colors.text.light}
                        />
                    </TouchableOpacity>
                )}
            </View>

            {/* Error Message */}
            {hasError && (
                <View style={styles.errorContainer}>
                    <MaterialCommunityIcons name="alert-circle" size={16} color={colors.error} />
                    <Text style={styles.errorText}>
                        Location search unavailable. Enter address manually.
                    </Text>
                </View>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
                <ScrollView
                    key={searchResultsKey}
                    style={styles.searchResultsContainer}
                    nestedScrollEnabled={false}
                >
                    {searchResults.map((place, index) => (
                        <TouchableOpacity
                            key={place.placeId || index}
                            style={styles.searchResultItem}
                            onPress={() => handlePlaceSelect(place)}
                        >
                            <MaterialCommunityIcons
                                name="map-marker"
                                size={20}
                                color={colors.primary}
                                style={styles.searchResultIcon}
                            />
                            <View style={styles.searchResultText}>
                                <Text style={styles.searchResultName}>{place.name}</Text>
                                <Text style={styles.searchResultAddress}>{place.address}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            {/* No Results Message */}
            {searchQuery.length > 2 && searchResults.length === 0 && !isSearching && !hasError && (
                <View style={styles.noResultsContainer}>
                    <MaterialCommunityIcons
                        name="map-marker-off"
                        size={24}
                        color={colors.text.light}
                    />
                    <Text style={styles.noResultsText}>
                        No locations found for "{searchQuery}"
                    </Text>
                    <Text style={styles.noResultsSubtext}>
                        Try a different search term or enter the address manually
                    </Text>
                </View>
            )}

            {showMap && onMapPress && (
                <TouchableOpacity style={styles.mapButton} onPress={onMapPress}>
                    <MaterialCommunityIcons name="map-marker" size={20} color={colors.primary} />
                    <Text style={styles.mapButtonText}>Pick on Map</Text>
                </TouchableOpacity>
            )}

            {selectedLocation && (
                <View style={styles.locationInfo}>
                    <MaterialCommunityIcons name="map-marker-check" size={16} color={colors.success} />
                    <Text style={styles.locationText}>
                        {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                    </Text>
                </View>
            )}

            {/* Current Location Indicator */}
            {isPickupLocation && useCurrentLocation && currentLocation && selectedLocation && (
                <View style={[
                    styles.currentLocationIndicator,
                    selectedLocation.address === currentLocation.address
                        ? styles.currentLocationActive
                        : styles.customLocationActive
                ]}>
                    <MaterialCommunityIcons
                        name={selectedLocation.address === currentLocation.address ? "map-marker-check" : "map-marker"}
                        size={16}
                        color={selectedLocation.address === currentLocation.address ? colors.success : colors.primary}
                    />
                    <Text style={styles.currentLocationText}>
                        {selectedLocation.address === currentLocation.address
                            ? `Current location: ${currentLocation.address}`
                            : `Custom location: ${selectedLocation.address}`
                        }
                    </Text>
                    <TouchableOpacity
                        style={styles.changeLocationButton}
                        onPress={resetCurrentLocation}
                    >
                        <Text style={styles.changeLocationText}>Change</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        position: 'relative',
    },
    inputContainer: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
    },
    textInput: {
        flex: 1,
        height: 50,
        borderWidth: 1,
        borderColor: colors.text.light + '30',
        borderRadius: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: fonts.size.md,
        fontFamily: fonts.family.regular,
        color: colors.text.primary,
        backgroundColor: colors.white,
    },
    textInputError: {
        borderColor: colors.error,
        backgroundColor: colors.error + '10',
    },
    searchIndicator: {
        position: 'absolute',
        right: 50,
        top: 15,
    },
    clearButton: {
        position: 'absolute',
        right: spacing.sm,
        top: 15,
        zIndex: 1002,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.error + '10',
        padding: spacing.sm,
        borderRadius: spacing.sm,
        marginTop: spacing.sm,
        borderWidth: 1,
        borderColor: colors.error + '20',
    },
    errorText: {
        marginLeft: spacing.xs,
        fontSize: fonts.size.sm,
        color: colors.error,
        flex: 1,
    },
    searchResultsContainer: {
        position: 'absolute',
        top: 55,
        left: 0,
        right: 0,
        backgroundColor: colors.white,
        borderRadius: spacing.sm,
        borderWidth: 1,
        borderColor: colors.text.light + '20',
        maxHeight: 200,
        zIndex: 1000,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    searchResultsList: {
        maxHeight: 200,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.text.light + '20',
    },
    searchResultText: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    searchResultName: {
        fontSize: fonts.size.md,
        fontFamily: fonts.family.medium,
        color: colors.text.primary,
        marginBottom: 2,
    },
    searchResultAddress: {
        fontSize: fonts.size.sm,
        fontFamily: fonts.family.regular,
        color: colors.text.secondary,
    },
    searchResultIcon: {
        marginRight: spacing.sm,
    },
    mapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.sm,
        marginTop: spacing.sm,
        borderWidth: 1,
        borderColor: colors.primary,
        borderRadius: spacing.sm,
        backgroundColor: colors.white,
    },
    mapButtonText: {
        marginLeft: spacing.xs,
        fontSize: fonts.size.sm,
        fontFamily: fonts.family.medium,
        color: colors.primary,
    },
    locationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.sm,
        padding: spacing.sm,
        backgroundColor: colors.success + '10',
        borderRadius: spacing.sm,
        borderWidth: 1,
        borderColor: colors.success + '20',
    },
    locationText: {
        marginLeft: spacing.xs,
        fontSize: fonts.size.sm,
        fontFamily: fonts.family.regular,
        color: colors.text.secondary,
    },
    noResultsContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        backgroundColor: colors.white,
        borderRadius: spacing.sm,
        borderWidth: 1,
        borderColor: colors.text.light + '20',
        marginTop: spacing.sm,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    noResultsText: {
        marginTop: spacing.sm,
        fontSize: fonts.size.md,
        color: colors.text.light,
        fontFamily: fonts.family.medium,
    },
    noResultsSubtext: {
        marginTop: spacing.xs,
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        fontFamily: fonts.family.regular,
    },
    currentLocationButton: {
        position: 'absolute',
        left: spacing.sm,
        top: 15,
        zIndex: 1002,
        padding: spacing.xs,
    },
    currentLocationIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.success + '10',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: spacing.sm,
        borderWidth: 1,
        borderColor: colors.success + '20',
        marginTop: spacing.sm,
    },
    currentLocationText: {
        flex: 1,
        marginLeft: spacing.sm,
        fontSize: fonts.size.sm,
        fontFamily: fonts.family.regular,
        color: colors.text.secondary,
    },
    changeLocationButton: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: spacing.xs,
        backgroundColor: colors.primary,
    },
    changeLocationText: {
        color: colors.white,
        fontSize: fonts.size.xs,
        fontFamily: fonts.family.medium,
    },
    currentLocationActive: {
        backgroundColor: colors.success + '20',
        borderColor: colors.success + '30',
    },
    customLocationActive: {
        backgroundColor: colors.primary + '20',
        borderColor: colors.primary + '30',
    },
});

export default LocationPicker;
