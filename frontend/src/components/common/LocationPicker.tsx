import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
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
    useCurrentLocation?: boolean;
    isPickupLocation?: boolean;
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
    const [searchResultsKey, setSearchResultsKey] = useState(0);
    const [isFocused, setIsFocused] = useState(false);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [recentLocations, setRecentLocations] = useState<LocationType[]>([]);

    useEffect(() => {
        setSearchQuery(value);
    }, [value]);

    // Load recent locations
    useEffect(() => {
        (async () => {
            try {
                const raw = await AsyncStorage.getItem('recent_locations');
                if (raw) {
                    const parsed = JSON.parse(raw) as LocationType[];
                    setRecentLocations(parsed);
                }
            } catch (e) {
                // ignore
            }
        })();
    }, []);

    const saveRecentLocation = async (loc: LocationType) => {
        try {
            const normalizedAddress = (loc.address || '').trim();
            const exists = recentLocations.find(
                (r) => r.latitude === loc.latitude && r.longitude === loc.longitude || r.address === normalizedAddress,
            );
            const updated = [loc, ...recentLocations.filter((r) => r !== exists)].slice(0, 5);
            setRecentLocations(updated);
            await AsyncStorage.setItem('recent_locations', JSON.stringify(updated));
        } catch (e) {
            // ignore
        }
    };

    // Get current location for pickup locations - only if user hasn't selected anything
    useEffect(() => {
        if (useCurrentLocation && isPickupLocation && !currentLocation && !selectedLocation && !searchQuery.trim()) {
            getCurrentLocation();
        }
    }, [useCurrentLocation, isPickupLocation]);

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
                longitude: location.coords.longitude, // Fixed: was using latitude twice
                address: '',
            };

            // Prefer human-readable address via reverse geocoding; fallback to coordinates
            try {
                const formatted = await googleMapsService.reverseGeocode(currentLoc);
                currentLoc.address = formatted;
            } catch (e) {
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
                saveRecentLocation(currentLoc);
            }

        } catch (error: any) {
            console.error('Error getting current location:', error);
            setHasError(false); // Don't show error for current location issues

            if (error.message?.includes('Location service is disabled')) {
                Alert.alert(
                    'Location Service Disabled',
                    'Please enable location services in your device settings to use current location.',
                    [{ text: 'OK' }]
                );
            } else {
                // Silent fail for current location - user can still enter manually
                console.log('Current location unavailable, user can enter manually');
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
        setSearchResultsKey(prev => prev + 1);
    };

    const handleTextChange = (text: string) => {
        setSearchQuery(text);
        setHasError(false);

        // If user is manually typing, clear current location selection
        if (currentLocation && text !== currentLocation.address) {
            setSelectedLocation(null);
            // Don't clear currentLocation, just the selection
        }

        if (onAddressChange) {
            onAddressChange(text);
        }

        // Clear previous search results when starting a new search
        if (text.length <= 2) {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
                searchTimeoutRef.current = null;
            }
            clearSearchResults();
            return;
        }

        // Debounce: clear any pending search and schedule a new one
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        clearSearchResults();
        searchTimeoutRef.current = setTimeout(() => {
            searchPlaces(text);
        }, 300);
    };

    const searchPlaces = async (query: string) => {
        if (!query.trim()) {
            clearSearchResults();
            return;
        }

        setIsSearching(true);
        setHasError(false);

        try {
            let places = await googleMapsService.searchPlaces(query);

            // Fallback to autocomplete if text search returns no results
            if (!places || places.length === 0) {
                const suggestions = await googleMapsService.getPlaceAutocomplete(query);
                places = suggestions;
            }

            if (!places || places.length === 0) {
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
                    'Unable to search for locations. Please try again or enter the address manually.',
                    [{ text: 'OK' }]
                );
            }
        } finally {
            setIsSearching(false);
        }
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    const handlePlaceSelect = async (place: any) => {
        clearSearchResults();
        setIsSearching(true);

        try {
            const placeDetails = await googleMapsService.getPlaceDetails(place.placeId);

            const location: LocationType = {
                latitude: placeDetails.location.latitude,
                longitude: placeDetails.location.longitude,
                address: placeDetails.address,
                placeId: placeDetails.placeId,
            };

            setSelectedLocation(location);
            setSearchQuery(placeDetails.address || '');
            setHasError(false);
            clearSearchResults();
            await saveRecentLocation(location);

            if (onLocationSelected) {
                onLocationSelected(location);
            }
            if (onAddressChange) {
                onAddressChange(placeDetails.address || '');
            }
        } catch (error: any) {
            console.error('Error getting place details:', error);

            // Fallback: use the place data we have
            const location: LocationType = {
                latitude: place.location?.latitude || 0,
                longitude: place.location?.longitude || 0,
                address: place.address || place.name,
                placeId: place.placeId,
            };

            setSelectedLocation(location);
            setSearchQuery(location.address || '');
            setHasError(false);
            clearSearchResults();
            await saveRecentLocation(location);

            if (onLocationSelected) {
                onLocationSelected(location);
            }
            if (onAddressChange) {
                onAddressChange(location.address || '');
            }
        } finally {
            setIsSearching(false);
        }
    };

    const clearLocation = () => {
        setSearchQuery('');
        setSelectedLocation(null);
        // Don't clear currentLocation - keep it available for GPS button
        clearSearchResults();
        setHasError(false);
        if (onAddressChange) {
            onAddressChange('');
        }
    };

    return (
        <View style={[styles.container, style]}>
            {/* Main Input Container */}
            <View style={[
                styles.inputContainer,
                isFocused && styles.inputContainerFocused,
                hasError && styles.inputContainerError
            ]}>
                {/* Current Location Button (for pickup locations) */}
                {isPickupLocation && useCurrentLocation && (
                    <TouchableOpacity
                        style={[
                            styles.currentLocationButton,
                            isGettingCurrentLocation && styles.currentLocationButtonLoading
                        ]}
                        onPress={() => {
                            if (currentLocation && !isGettingCurrentLocation) {
                                // Use existing current location
                                setSelectedLocation(currentLocation);
                                setSearchQuery(currentLocation.address || '');
                                if (onLocationSelected) {
                                    onLocationSelected(currentLocation);
                                }
                                if (onAddressChange) {
                                    onAddressChange(currentLocation.address || '');
                                }
                            } else {
                                // Get new current location
                                getCurrentLocation();
                            }
                        }}
                        disabled={isGettingCurrentLocation}
                    >
                        {isGettingCurrentLocation ? (
                            <ActivityIndicator size={16} color={colors.white} />
                        ) : (
                            <MaterialCommunityIcons
                                name="crosshairs-gps"
                                size={20}
                                color={colors.white}
                            />
                        )}
                    </TouchableOpacity>
                )}

                {/* Search Input */}
                <TextInput
                    style={[
                        styles.input,
                        isPickupLocation && useCurrentLocation && styles.inputWithCurrentLocation
                    ]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.text.light}
                    value={searchQuery}
                    onChangeText={handleTextChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    editable={!disabled}
                    autoCorrect={false}
                    autoCapitalize="none"
                />

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

            {/* Error Message - Only show for search errors, not current location */}
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
                <View style={styles.searchResultsContainer}>
                    <ScrollView
                        key={searchResultsKey}
                        nestedScrollEnabled={false}
                        showsVerticalScrollIndicator={false}
                    >
                        {searchResults.map((place, index) => (
                            <TouchableOpacity
                                key={place.placeId || index}
                                style={styles.searchResultItem}
                                onPress={() => handlePlaceSelect(place)}
                            >
                                <View style={styles.searchResultIconContainer}>
                                    <MaterialCommunityIcons
                                        name="map-marker"
                                        size={20}
                                        color={colors.primary}
                                    />
                                </View>
                                <View style={styles.searchResultText}>
                                    <Text style={styles.searchResultName}>{place.name}</Text>
                                    <Text style={styles.searchResultAddress}>{place.address}</Text>
                                </View>
                                <MaterialCommunityIcons
                                    name="chevron-right"
                                    size={20}
                                    color={colors.text.light}
                                />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* No Results Message */}
            {searchQuery.length > 2 && searchResults.length === 0 && !isSearching && !hasError && !selectedLocation && (
                <View style={styles.noResultsContainer}>
                    <MaterialCommunityIcons
                        name="map-marker-off"
                        size={24}
                        color={colors.text.light}
                    />
                    <Text style={styles.noResultsText}>
                        No locations found for &quot;{searchQuery}&quot;
                    </Text>
                    <Text style={styles.noResultsSubtext}>
                        Try a different search term or enter the address manually
                    </Text>
                </View>
            )}

            {/* Quick Actions and Recent Locations */}
            {(!searchQuery || searchQuery.length < 3) && (
                <View style={styles.quickActionsContainer}>
                    <View style={styles.quickActionsRow}>
                        {isPickupLocation && useCurrentLocation && (
                            <TouchableOpacity
                                style={styles.quickActionChip}
                                onPress={() => {
                                    if (currentLocation) {
                                        setSelectedLocation(currentLocation);
                                        setSearchQuery(currentLocation.address || '');
                                        onLocationSelected && onLocationSelected(currentLocation);
                                        onAddressChange && onAddressChange(currentLocation.address || '');
                                    } else {
                                        getCurrentLocation();
                                    }
                                }}
                            >
                                <MaterialCommunityIcons name="crosshairs-gps" size={16} color={colors.primary} />
                                <Text style={styles.quickActionText}>Current location</Text>
                            </TouchableOpacity>
                        )}

                        {showMap && onMapPress && (
                            <TouchableOpacity style={styles.quickActionChip} onPress={onMapPress}>
                                <MaterialCommunityIcons name="map-search" size={16} color={colors.primary} />
                                <Text style={styles.quickActionText}>Pick on map</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {recentLocations.length > 0 && (
                        <View style={styles.recentContainer}>
                            <Text style={styles.recentTitle}>Recent</Text>
                            {recentLocations.map((r, idx) => (
                                <TouchableOpacity
                                    key={`${r.address}-${idx}`}
                                    style={styles.recentItem}
                                    onPress={() => {
                                        setSelectedLocation(r);
                                        setSearchQuery(r.address || '');
                                        onLocationSelected && onLocationSelected(r);
                                        onAddressChange && onAddressChange(r.address || '');
                                    }}
                                >
                                    <View style={styles.searchResultIconContainer}>
                                        <MaterialCommunityIcons name="history" size={20} color={colors.primary} />
                                    </View>
                                    <View style={styles.searchResultText}>
                                        <Text style={styles.searchResultName}>{r.address}</Text>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.text.light} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            )}

            {/* Map Button */}
            {showMap && onMapPress && (
                <TouchableOpacity style={styles.mapButton} onPress={onMapPress}>
                    <MaterialCommunityIcons name="map-marker" size={20} color={colors.primary} />
                    <Text style={styles.mapButtonText}>Pick on Map</Text>
                </TouchableOpacity>
            )}

            {/* Selected Location Display */}
            {selectedLocation && (
                <View style={styles.selectedLocationContainer}>
                    <View style={styles.selectedLocationIcon}>
                        <MaterialCommunityIcons name="map-marker-check" size={16} color={colors.white} />
                    </View>
                    <View style={styles.selectedLocationText}>
                        <Text style={styles.selectedLocationLabel}>
                            {isPickupLocation ? 'Pickup Location' : 'Delivery Location'}
                        </Text>
                        <Text style={styles.selectedLocationAddress} numberOfLines={2}>
                            {selectedLocation.address}
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.changeLocationButton} onPress={clearLocation}>
                        <Text style={styles.changeLocationText}>Change</Text>
                    </TouchableOpacity>
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
                        name={selectedLocation.address === currentLocation.address ? "crosshairs-gps" : "map-marker"}
                        size={16}
                        color={selectedLocation.address === currentLocation.address ? colors.success : colors.primary}
                    />
                    <Text style={[
                        styles.currentLocationText,
                        { color: selectedLocation.address === currentLocation.address ? colors.success : colors.primary }
                    ]}>
                        {selectedLocation.address === currentLocation.address
                            ? 'Current location'
                            : 'Custom location'
                        }
                    </Text>
                    {selectedLocation.address === currentLocation.address && (
                        <TouchableOpacity style={styles.resetLocationButton} onPress={resetCurrentLocation}>
                            <Text style={styles.resetLocationText}>Reset</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.text.light + '30',
        borderRadius: 16,
        backgroundColor: colors.white,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        position: 'relative',
    },
    inputContainerFocused: {
        borderColor: colors.primary + '50',
        borderWidth: 2,
        shadowColor: colors.primary,
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
    },
    inputContainerError: {
        borderColor: colors.error,
        borderWidth: 2,
        shadowColor: colors.error,
        shadowOpacity: 0.15,
    },
    input: {
        flex: 1,
        height: 56,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: fonts.size.md,
        fontFamily: fonts.family.regular,
        color: colors.text.primary,
        backgroundColor: 'transparent',
    },
    inputWithCurrentLocation: {
        paddingLeft: 60, // Increased padding to make space for GPS button
    },
    currentLocationButton: {
        position: 'absolute',
        left: spacing.sm,
        top: '50%',
        transform: [{ translateY: -20 }], // Center vertically (half of button height)
        zIndex: 1002,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.primary + '30',
    },
    currentLocationButtonLoading: {
        opacity: 0.7,
        backgroundColor: colors.primary + '25',
    },
    searchIndicator: {
        position: 'absolute',
        right: 50,
        top: '50%',
        transform: [{ translateY: -8 }], // Center vertically (half of indicator height)
        zIndex: 1001,
    },
    clearButton: {
        position: 'absolute',
        right: spacing.sm,
        top: '50%',
        transform: [{ translateY: -20 }], // Center vertically (half of button height)
        zIndex: 1001,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.text.light + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.error + '10',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 12,
        marginTop: spacing.sm,
        borderWidth: 1,
        borderColor: colors.error + '20',
    },
    errorText: {
        marginLeft: spacing.sm,
        fontSize: fonts.size.sm,
        fontFamily: fonts.family.medium,
        color: colors.error,
        flex: 1,
    },
    searchResultsContainer: {
        backgroundColor: colors.white,
        borderRadius: 16,
        marginTop: spacing.sm,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
        maxHeight: 300,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.text.light + '15',
        backgroundColor: colors.white,
    },
    searchResultIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    searchResultText: {
        flex: 1,
        marginRight: spacing.sm,
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
    noResultsContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        backgroundColor: colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.text.light + '20',
        marginTop: spacing.sm,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    noResultsText: {
        marginTop: spacing.sm,
        fontSize: fonts.size.md,
        color: colors.text.primary,
        fontFamily: fonts.family.medium,
        textAlign: 'center',
    },
    noResultsSubtext: {
        marginTop: spacing.xs,
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        fontFamily: fonts.family.regular,
        paddingHorizontal: spacing.md,
    },
    quickActionsContainer: {
        backgroundColor: colors.white,
        borderRadius: 16,
        marginTop: spacing.sm,
        borderWidth: 1,
        borderColor: colors.text.light + '20',
    },
    quickActionsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.text.light + '15',
    },
    quickActionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.primary + '10',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.primary + '25',
    },
    quickActionText: {
        marginLeft: spacing.xs,
        color: colors.primary,
        fontFamily: fonts.family.medium,
    },
    recentContainer: {
        paddingVertical: spacing.sm,
    },
    recentTitle: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        color: colors.text.secondary,
        fontFamily: fonts.family.medium,
        fontSize: fonts.size.sm,
        textTransform: 'uppercase',
    },
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.text.light + '10',
        backgroundColor: colors.white,
    },
    mapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        marginTop: spacing.md,
        borderWidth: 2,
        borderColor: colors.primary,
        borderRadius: 16,
        backgroundColor: colors.white,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    mapButtonText: {
        marginLeft: spacing.sm,
        fontSize: fonts.size.md,
        fontFamily: fonts.family.medium,
        color: colors.primary,
        fontWeight: '600',
    },
    selectedLocationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary + '10',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.primary + '20',
        marginTop: spacing.md,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    selectedLocationIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 2,
    },
    selectedLocationText: {
        flex: 1,
        marginLeft: spacing.md,
    },
    selectedLocationLabel: {
        fontSize: fonts.size.sm,
        fontFamily: fonts.family.medium,
        color: colors.text.secondary,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    selectedLocationAddress: {
        fontSize: fonts.size.md,
        fontFamily: fonts.family.medium,
        color: colors.text.primary,
        lineHeight: 20,
    },
    changeLocationButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 12,
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    changeLocationText: {
        color: colors.white,
        fontSize: fonts.size.sm,
        fontFamily: fonts.family.medium,
        fontWeight: '600',
    },
    currentLocationIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.success + '10',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.success + '20',
        marginTop: spacing.md,
        shadowColor: colors.success,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    currentLocationText: {
        flex: 1,
        marginLeft: spacing.sm,
        fontSize: fonts.size.sm,
        fontFamily: fonts.family.medium,
        fontWeight: '500',
    },
    resetLocationButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 12,
        backgroundColor: colors.error,
        shadowColor: colors.error,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    resetLocationText: {
        color: colors.white,
        fontSize: fonts.size.sm,
        fontFamily: fonts.family.medium,
        fontWeight: '600',
    },
    currentLocationActive: {
        backgroundColor: colors.success + '20',
        borderColor: colors.success + '30',
        shadowColor: colors.success,
    },
    customLocationActive: {
        backgroundColor: colors.primary + '20',
        borderColor: colors.primary + '30',
        shadowColor: colors.primary,
    },
});

export default LocationPicker;
