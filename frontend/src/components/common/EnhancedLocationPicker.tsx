import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

interface EnhancedLocationPickerProps {
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
    isCompact?: boolean; // New prop for compact mode
    showArrow?: boolean; // New prop to show arrow between locations
}

const EnhancedLocationPicker: React.FC<EnhancedLocationPickerProps> = ({
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
    isCompact = false,
    showArrow = false,
}) => {
    const [selectedLocation, setSelectedLocation] = useState<LocationType | null>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState(value);
    const [hasError, setHasError] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<LocationType | null>(null);
    const [isGettingCurrentLocation, setIsGettingCurrentLocation] = useState(false);
    const [, setLocationPermission] = useState<Location.PermissionStatus | null>(null);
    const [, setSearchResultsKey] = useState(0);
    const [isFocused, setIsFocused] = useState(false);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const addressChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
            } catch {
                // ignore
            }
        })();
    }, []);

    const saveRecentLocation = async (loc: LocationType) => {
        try {
            const existing = await AsyncStorage.getItem('recent_locations');
            const locations = existing ? JSON.parse(existing) : [];
            const filtered = locations.filter((l: LocationType) => l.placeId !== loc.placeId);
            const updated = [loc, ...filtered].slice(0, 5); // Keep only 5 recent locations
            await AsyncStorage.setItem('recent_locations', JSON.stringify(updated));
            setRecentLocations(updated);
        } catch {
            // ignore
        }
    };

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

            // Prefer human-readable address via reverse geocoding; fallback to coordinates
            try {
                const formatted = await googleMapsService.reverseGeocode(currentLoc);
                currentLoc.address = formatted;
            } catch {
                currentLoc.address = `${currentLoc.latitude.toFixed(6)}, ${currentLoc.longitude.toFixed(6)}`;
            }

            setCurrentLocation(currentLoc);

            // Only set as default if no location is selected AND no search query exists
            if (!selectedLocation && !searchQuery.trim()) {
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
            setIsGettingCurrentLocation(false);
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

        // Debounce onAddressChange to prevent excessive calls during typing
        // Only call onAddressChange if text is at least 3 characters long
        if (addressChangeTimeoutRef.current) {
            clearTimeout(addressChangeTimeoutRef.current);
        }
        addressChangeTimeoutRef.current = setTimeout(() => {
            if (onAddressChange && text.length >= 3) {
                onAddressChange(text);
            }
        }, 500); // Wait longer for user to stop typing before calling onAddressChange

        // Clear previous search results when starting a new search
        if (text.length <= 3) {
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
        }, 800); // Increased delay to allow more natural typing
    };

    const searchPlaces = async (query: string) => {
        if (!query.trim()) {
            clearSearchResults();
            return;
        }

        try {
            setIsSearching(true);
            setHasError(false);

            const places = await googleMapsService.searchPlaces(query);
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
            if (addressChangeTimeoutRef.current) {
                clearTimeout(addressChangeTimeoutRef.current);
            }
        };
    }, []);

    const handlePlaceSelect = async (place: any) => {
        try {
            // Validate place object structure
            if (!place) {
                console.error('Place object is null or undefined');
                return;
            }

            // Handle both Google Maps service format and raw Google Places API format
            let latitude: number;
            let longitude: number;
            let address: string;
            let placeId: string | null;

            if (place.location) {
                // This is from our Google Maps service (already processed)
                latitude = place.location.latitude;
                longitude = place.location.longitude;
                address = place.address || place.name || 'Unknown address';
                placeId = place.placeId || null;
            } else if (place.geometry && place.geometry.location) {
                // This is raw Google Places API format
                latitude = place.geometry.location.lat || place.geometry.location.latitude || 0;
                longitude = place.geometry.location.lng || place.geometry.location.longitude || 0;
                address = place.formatted_address || place.name || 'Unknown address';
                placeId = place.place_id || place.placeId || null;
            } else {
                console.error('Place data structure is invalid:', place);
                Alert.alert(
                    'Invalid Location Data',
                    'The selected location data is incomplete. Please try selecting a different location.',
                    [{ text: 'OK' }]
                );
                return;
            }

            // Validate coordinates
            if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
                isNaN(latitude) || isNaN(longitude) || 
                latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
                console.error('Invalid coordinates:', { latitude, longitude });
                Alert.alert(
                    'Invalid Coordinates',
                    'The selected location has invalid coordinates. Please try selecting a different location.',
                    [{ text: 'OK' }]
                );
                return;
            }

            const location: LocationType = {
                latitude,
                longitude,
                address,
                placeId: placeId || undefined,
            };

            setSelectedLocation(location);
            setSearchQuery(location.address || '');
            clearSearchResults();
            setHasError(false);

            if (onLocationSelected) {
                onLocationSelected(location);
            }
            if (onAddressChange) {
                onAddressChange(location.address || '');
            }

            // Save to recent locations
            await saveRecentLocation(location);
        } catch (error) {
            console.error('Error selecting place:', error);
            Alert.alert(
                'Selection Error',
                'There was an error selecting this location. Please try again.',
                [{ text: 'OK' }]
            );
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

    const resetCurrentLocation = () => {
        setSelectedLocation(null);
        setSearchQuery('');
        clearSearchResults();
        if (onAddressChange) {
            onAddressChange('');
        }
    };

    const renderSearchResults = () => {
        if (searchResults.length === 0 && !isSearching) {
            return null;
        }

        return (
            <View style={[styles.searchResultsContainer, isCompact && styles.searchResultsContainerCompact]}>
                {isSearching ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.loadingText}>Searching...</Text>
                    </View>
                ) : (
                    <ScrollView
                        style={styles.searchResultsContainer}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {searchResults.map((item, index) => (
                            <TouchableOpacity
                                key={`${item.place_id || index}`}
                                style={styles.searchResultItem}
                                onPress={() => handlePlaceSelect(item)}
                            >
                                <View style={styles.searchResultIconContainer}>
                                    <MaterialCommunityIcons
                                        name="map-marker"
                                        size={20}
                                        color={colors.primary}
                                    />
                                </View>
                                <View style={styles.searchResultText}>
                                    <Text style={styles.searchResultName} numberOfLines={1}>
                                        {item.name}
                                    </Text>
                                    <Text style={styles.searchResultAddress} numberOfLines={1}>
                                        {item.formatted_address}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
            </View>
        );
    };

    const renderQuickActions = () => {
        if (recentLocations.length === 0) {
            return null;
        }

        return (
            <View style={[styles.quickActionsContainer, isCompact && styles.quickActionsContainerCompact]}>
                <Text style={styles.quickActionsTitle}>Recent Locations</Text>
                <View style={styles.quickActionsRow}>
                    {recentLocations.slice(0, 3).map((location, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.quickActionChip}
                            onPress={() => handlePlaceSelect({
                                geometry: {
                                    location: {
                                        lat: location.latitude,
                                        lng: location.longitude
                                    }
                                },
                                formatted_address: location.address,
                                place_id: location.placeId,
                                name: location.address
                            })}
                        >
                            <MaterialCommunityIcons name="history" size={16} color={colors.primary} />
                            <Text style={styles.quickActionText} numberOfLines={1}>
                                {location.address?.split(',')[0]}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, style]}>
            {/* Main Input Container */}
            <View style={[
                styles.inputContainer,
                isCompact && styles.inputContainerCompact,
                isFocused && styles.inputContainerFocused,
                hasError && styles.inputContainerError
            ]}>
                {/* Location Icon */}
                <View style={[styles.locationIcon, isCompact && styles.locationIconCompact]}>
                    <MaterialCommunityIcons
                        name={isPickupLocation ? "package-variant" : "map-marker"}
                        size={isCompact ? 18 : 20}
                        color={isPickupLocation ? colors.primary : colors.secondary}
                    />
                </View>

                {/* Current Location Button (for pickup locations) */}
                {isPickupLocation && useCurrentLocation && (
                    <TouchableOpacity
                        style={[
                            styles.currentLocationButton,
                            isCompact && styles.currentLocationButtonCompact,
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
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <MaterialCommunityIcons name="crosshairs-gps" size={isCompact ? 16 : 18} color={colors.primary} />
                        )}
                    </TouchableOpacity>
                )}

                {/* Input Field */}
                <TextInput
                    style={[
                        styles.input,
                        isCompact && styles.inputCompact,
                        isPickupLocation && useCurrentLocation && styles.inputWithCurrentLocation,
                        isPickupLocation && useCurrentLocation && isCompact && styles.inputWithCurrentLocationCompact
                    ]}
                    value={searchQuery}
                    onChangeText={handleTextChange}
                    onFocus={() => {
                        setIsFocused(true);
                        if (searchQuery.trim()) {
                            searchPlaces(searchQuery);
                        }
                    }}
                    onBlur={() => {
                        setIsFocused(false);
                        // Only call onAddressChange if user has typed something meaningful
                        // and there's no active search happening
                        if (onAddressChange && searchQuery.length >= 3 && !isSearching) {
                            onAddressChange(searchQuery);
                        }
                    }}
                    placeholder={placeholder}
                    placeholderTextColor={colors.text.light}
                    editable={!disabled}
                    autoCorrect={false}
                    autoCapitalize="none"
                />

                {/* Search Indicator */}
                {isSearching && (
                    <View style={[styles.searchIndicator, isCompact && styles.searchIndicatorCompact]}>
                        <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                )}

                {/* Clear Button */}
                {searchQuery.length > 0 && (
                    <TouchableOpacity
                        style={[styles.clearButton, isCompact && styles.clearButtonCompact]}
                        onPress={clearLocation}
                    >
                        <MaterialCommunityIcons name="close-circle" size={isCompact ? 18 : 20} color={colors.text.light} />
                    </TouchableOpacity>
                )}

                {/* Map Button */}
                {showMap && onMapPress && (
                    <TouchableOpacity
                        style={[styles.mapButton, isCompact && styles.mapButtonCompact]}
                        onPress={onMapPress}
                    >
                        <MaterialCommunityIcons name="map" size={isCompact ? 18 : 20} color={colors.primary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Arrow between locations */}
            {showArrow && (
                <View style={styles.arrowContainer}>
                    <MaterialCommunityIcons name="arrow-down" size={24} color={colors.primary} />
                </View>
            )}

            {/* Error Message */}
            {hasError && (
                <View style={[styles.errorContainer, isCompact && styles.errorContainerCompact]}>
                    <MaterialCommunityIcons name="alert-circle" size={16} color={colors.error} />
                    <Text style={styles.errorText}>Unable to search locations. Please try again.</Text>
                </View>
            )}

            {/* Search Results */}
            {renderSearchResults()}

            {/* Quick Actions */}
            {renderQuickActions()}

            {/* Current Location Indicator */}
            {isPickupLocation && useCurrentLocation && currentLocation && selectedLocation && (
                <View style={[
                    styles.currentLocationIndicator,
                    isCompact && styles.currentLocationIndicatorCompact,
                    selectedLocation.address === currentLocation.address
                        ? styles.currentLocationActive
                        : styles.customLocationActive
                ]}>
                    <MaterialCommunityIcons
                        name={selectedLocation.address === currentLocation.address ? "crosshairs-gps" : "map-marker"}
                        size={isCompact ? 14 : 16}
                        color={selectedLocation.address === currentLocation.address ? colors.success : colors.primary}
                    />
                    <Text style={[
                        styles.currentLocationText,
                        isCompact && styles.currentLocationTextCompact,
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
        minHeight: 56,
    },
    inputContainerCompact: {
        borderRadius: 12,
        minHeight: 48,
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
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
    locationIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: spacing.sm,
        marginRight: spacing.xs,
    },
    locationIconCompact: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginLeft: spacing.xs,
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
    inputCompact: {
        height: 48,
        fontSize: fonts.size.sm,
        paddingHorizontal: spacing.sm,
    },
    inputWithCurrentLocation: {
        paddingLeft: 60,
    },
    inputWithCurrentLocationCompact: {
        paddingLeft: 50,
    },
    currentLocationButton: {
        position: 'absolute',
        left: spacing.sm,
        top: '50%',
        transform: [{ translateY: -20 }],
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
    currentLocationButtonCompact: {
        width: 32,
        height: 32,
        borderRadius: 16,
        transform: [{ translateY: -16 }],
    },
    currentLocationButtonLoading: {
        opacity: 0.7,
        backgroundColor: colors.primary + '25',
    },
    searchIndicator: {
        position: 'absolute',
        right: 50,
        top: '50%',
        transform: [{ translateY: -8 }],
        zIndex: 1001,
    },
    searchIndicatorCompact: {
        right: 40,
    },
    clearButton: {
        position: 'absolute',
        right: spacing.sm,
        top: '50%',
        transform: [{ translateY: -20 }],
        zIndex: 1001,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.text.light + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    clearButtonCompact: {
        width: 32,
        height: 32,
        borderRadius: 16,
        transform: [{ translateY: -16 }],
    },
    mapButton: {
        position: 'absolute',
        right: 50,
        top: '50%',
        transform: [{ translateY: -20 }],
        zIndex: 1001,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapButtonCompact: {
        width: 32,
        height: 32,
        borderRadius: 16,
        transform: [{ translateY: -16 }],
    },
    arrowContainer: {
        alignItems: 'center',
        marginVertical: spacing.sm,
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
    errorContainerCompact: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: 8,
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
    searchResultsContainerCompact: {
        borderRadius: 12,
        maxHeight: 200,
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
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
    },
    loadingText: {
        marginLeft: spacing.sm,
        fontSize: fonts.size.md,
        color: colors.text.primary,
        fontFamily: fonts.family.medium,
    },
    quickActionsContainer: {
        backgroundColor: colors.white,
        borderRadius: 16,
        marginTop: spacing.sm,
        borderWidth: 1,
        borderColor: colors.text.light + '20',
    },
    quickActionsContainerCompact: {
        borderRadius: 12,
    },
    quickActionsTitle: {
        fontSize: fonts.size.sm,
        fontFamily: fonts.family.medium,
        color: colors.text.secondary,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        paddingBottom: spacing.xs,
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
        flex: 1,
    },
    quickActionText: {
        marginLeft: spacing.xs,
        fontSize: fonts.size.sm,
        fontFamily: fonts.family.medium,
        color: colors.primary,
    },
    currentLocationIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.success + '10',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 12,
        marginTop: spacing.sm,
        borderWidth: 1,
        borderColor: colors.success + '20',
    },
    currentLocationIndicatorCompact: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: 8,
    },
    currentLocationActive: {
        backgroundColor: colors.success + '10',
        borderColor: colors.success + '20',
    },
    customLocationActive: {
        backgroundColor: colors.primary + '10',
        borderColor: colors.primary + '20',
    },
    currentLocationText: {
        marginLeft: spacing.sm,
        fontSize: fonts.size.sm,
        fontFamily: fonts.family.medium,
        color: colors.success,
    },
    currentLocationTextCompact: {
        fontSize: fonts.size.xs,
    },
    resetLocationButton: {
        marginLeft: 'auto',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        backgroundColor: colors.success + '20',
        borderRadius: 6,
    },
    resetLocationText: {
        fontSize: fonts.size.xs,
        fontFamily: fonts.family.medium,
        color: colors.success,
    },
});

export default EnhancedLocationPicker;
