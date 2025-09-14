import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';
import EnhancedLocationPicker from './EnhancedLocationPicker';
import { googleMapsService } from '../../services/googleMapsService';

interface LocationType {
    latitude: number;
    longitude: number;
    address?: string;
    placeId?: string;
}

interface CompactLocationSectionProps {
    pickupLocation?: string;
    deliveryLocation?: string;
    onPickupLocationChange?: (address: string) => void;
    onDeliveryLocationChange?: (address: string) => void;
    onPickupLocationSelected?: (location: LocationType) => void;
    onDeliveryLocationSelected?: (location: LocationType) => void;
    style?: any;
    disabled?: boolean;
    showMap?: boolean;
    onMapPress?: () => void;
    useCurrentLocation?: boolean;
    showTitle?: boolean;
}

const CompactLocationSection: React.FC<CompactLocationSectionProps> = ({
    pickupLocation = '',
    deliveryLocation = '',
    onPickupLocationChange,
    onDeliveryLocationChange,
    onPickupLocationSelected,
    onDeliveryLocationSelected,
    style,
    disabled = false,
    showMap = false,
    onMapPress,
    useCurrentLocation = true,
    showTitle = true,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [distance, setDistance] = useState<string>('');
    const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
    const distanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hasBothLocations = pickupLocation.trim().length >= 3 && deliveryLocation.trim().length >= 3;

    // Calculate distance between pickup and delivery locations with debouncing
    useEffect(() => {
        // Clear any existing timeout
        if (distanceTimeoutRef.current) {
            clearTimeout(distanceTimeoutRef.current);
        }

        if (!hasBothLocations) {
            setDistance('');
            return;
        }

        // Debounce distance calculation to prevent excessive API calls
        distanceTimeoutRef.current = setTimeout(async () => {
            setIsCalculatingDistance(true);
            try {
                // Calculating route distance
                // Get coordinates for both locations using geocoding for consistency
                const pickupCoords = await getCoordinatesForAddress(pickupLocation);
                const deliveryCoords = await getCoordinatesForAddress(deliveryLocation);
                // Coordinates retrieved

                if (pickupCoords && deliveryCoords) {
                    // Use route distance (same as FindTransporters) for consistency
                    const route = await googleMapsService.getDirections(pickupCoords, deliveryCoords);
                    const routeDistanceText = route.distance;
                    
                    // Extract numeric value from route distance text (e.g., "55.0 km" -> 55.0)
                    const numericDistance = parseFloat(routeDistanceText.replace(/[^\d.]/g, ''));
                    
                    if (isNaN(numericDistance) || numericDistance < 0) {
                        console.error('Invalid route distance:', routeDistanceText);
                        setDistance('Distance unavailable');
                    } else {
                        // Use the formatted distance from the route API for consistency
                        setDistance(routeDistanceText);
                    }
                } else {
                    console.error('Missing coordinates:', { pickupCoords, deliveryCoords });
                    setDistance('Distance unavailable');
                }
            } catch (error) {
                console.error('Error calculating route distance:', error);
                setDistance('Distance unavailable');
            } finally {
                setIsCalculatingDistance(false);
            }
        }, 500); // Wait 500ms after user stops typing

        // Cleanup timeout on unmount
        return () => {
            if (distanceTimeoutRef.current) {
                clearTimeout(distanceTimeoutRef.current);
            }
        };
    }, [pickupLocation, deliveryLocation, hasBothLocations]);

    // Helper function to get coordinates for an address using geocoding for consistency
    const getCoordinatesForAddress = async (address: string) => {
        try {
            const location = await googleMapsService.geocodeAddress(address);
            return {
                latitude: location.latitude,
                longitude: location.longitude
            };
        } catch (error) {
            console.error('Error getting coordinates for address:', error);
        }
        return null;
    };

    return (
        <View style={[styles.container, style]}>
            {/* Header */}
            {showTitle && (
                <View style={styles.header}>
                    <Text style={styles.title}>Location Details</Text>
                    {hasBothLocations && (
                        <Text style={styles.subtitle}>Both locations selected</Text>
                    )}
                </View>
            )}

            {/* Compact View when both locations are selected */}
            {hasBothLocations && !isExpanded ? (
                <View style={styles.compactView}>
                    {/* Pickup Location Card */}
                    <View style={[styles.locationCard, styles.pickupCard]}>
                        <View style={styles.locationHeader}>
                            <View style={styles.locationIconContainer}>
                                <Text style={styles.locationIcon}>📦</Text>
                            </View>
                            <View style={styles.locationInfo}>
                                <Text style={styles.locationLabel}>PICKUP LOCATION</Text>
                                <Text style={styles.locationAddress} numberOfLines={2}>
                                    {pickupLocation}
                                </Text>
                            </View>
                            <View style={styles.changeButton}>
                                <Text style={styles.changeButtonText}>Change</Text>
                            </View>
                        </View>
                    </View>

                    {/* Arrow */}
                    <View style={styles.arrowContainer}>
                        <View style={styles.arrowLine} />
                        <View style={styles.arrowHead}>
                            <Text style={styles.arrowText}>↓</Text>
                        </View>
                    </View>

                    {/* Distance Display */}
                    {distance && (
                        <View style={styles.distanceContainer}>
                            <Text style={styles.distanceText}>
                                {isCalculatingDistance ? 'Calculating...' : `Distance: ${distance}`}
                            </Text>
                        </View>
                    )}

                    {/* Delivery Location Card */}
                    <View style={[styles.locationCard, styles.deliveryCard]}>
                        <View style={styles.locationHeader}>
                            <View style={styles.locationIconContainer}>
                                <Text style={styles.locationIcon}>📍</Text>
                            </View>
                            <View style={styles.locationInfo}>
                                <Text style={styles.locationLabel}>DELIVERY LOCATION</Text>
                                <Text style={styles.locationAddress} numberOfLines={2}>
                                    {deliveryLocation}
                                </Text>
                            </View>
                            <View style={styles.changeButton}>
                                <Text style={styles.changeButtonText}>Change</Text>
                            </View>
                        </View>
                    </View>

                    {/* Edit Button */}
                    <View style={styles.editButtonContainer}>
                        <Text 
                            style={styles.editButton}
                            onPress={() => setIsExpanded(true)}
                        >
                            Edit Locations
                        </Text>
                    </View>
                </View>
            ) : (
                /* Expanded View */
                <View style={styles.expandedView}>
                    {/* Pickup Location */}
                    <View style={styles.locationField}>
                        <Text style={styles.fieldLabel}>Pickup Location *</Text>
                        <EnhancedLocationPicker
                            placeholder="Enter pickup location"
                            value={pickupLocation}
                            onAddressChange={(address) => {
                                // Pickup location address changed
                                if (onPickupLocationChange) {
                                    onPickupLocationChange(address);
                                }
                            }}
                            onLocationSelected={(location) => {
                                // Pickup location selected
                                if (onPickupLocationSelected) {
                                    onPickupLocationSelected(location);
                                }
                            }}
                            useCurrentLocation={useCurrentLocation}
                            isPickupLocation={true}
                            isCompact={true}
                            disabled={disabled}
                            showMap={showMap}
                            onMapPress={onMapPress}
                        />
                    </View>

                    {/* Arrow between locations */}
                    <View style={styles.arrowBetweenFields}>
                        <Text style={styles.arrowText}>↓</Text>
                    </View>

                    {/* Delivery Location */}
                    <View style={styles.locationField}>
                        <Text style={styles.fieldLabel}>Delivery Location *</Text>
                        <EnhancedLocationPicker
                            placeholder="Enter delivery location"
                            value={deliveryLocation}
                            onAddressChange={(address) => {
                                // Delivery location address changed
                                if (onDeliveryLocationChange) {
                                    onDeliveryLocationChange(address);
                                }
                            }}
                            onLocationSelected={(location) => {
                                // Delivery location selected
                                if (onDeliveryLocationSelected) {
                                    onDeliveryLocationSelected(location);
                                }
                            }}
                            isPickupLocation={false}
                            useCurrentLocation={false}
                            isCompact={true}
                            disabled={disabled}
                            showMap={showMap}
                            onMapPress={onMapPress}
                        />
                    </View>

                    {/* Collapse Button when both locations are selected */}
                    {hasBothLocations && (
                        <View style={styles.collapseButtonContainer}>
                            <Text 
                                style={styles.collapseButton}
                                onPress={() => setIsExpanded(false)}
                            >
                                Collapse View
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    title: {
        fontSize: fonts.size.lg,
        fontFamily: fonts.family.bold,
        color: colors.text.primary,
    },
    subtitle: {
        fontSize: fonts.size.sm,
        fontFamily: fonts.family.medium,
        color: colors.success,
        backgroundColor: colors.success + '15',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 12,
    },
    compactView: {
        gap: spacing.sm,
    },
    locationCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.md,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.text.light + '20',
    },
    pickupCard: {
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    deliveryCard: {
        borderLeftWidth: 4,
        borderLeftColor: colors.secondary,
    },
    locationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    locationIcon: {
        fontSize: 20,
    },
    locationInfo: {
        flex: 1,
        marginRight: spacing.sm,
    },
    locationLabel: {
        fontSize: fonts.size.xs,
        fontFamily: fonts.family.bold,
        color: colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: spacing.xs,
    },
    locationAddress: {
        fontSize: fonts.size.md,
        fontFamily: fonts.family.medium,
        color: colors.text.primary,
        lineHeight: 20,
    },
    changeButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 8,
    },
    changeButtonText: {
        fontSize: fonts.size.sm,
        fontFamily: fonts.family.medium,
        color: colors.white,
    },
    arrowContainer: {
        alignItems: 'center',
        marginVertical: spacing.xs,
    },
    arrowLine: {
        width: 2,
        height: 20,
        backgroundColor: colors.primary + '30',
    },
    arrowHead: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -2,
    },
    arrowText: {
        fontSize: 12,
        color: colors.white,
        fontWeight: 'bold',
    },
    editButtonContainer: {
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    editButton: {
        fontSize: fonts.size.sm,
        fontFamily: fonts.family.medium,
        color: colors.primary,
        textDecorationLine: 'underline',
    },
    expandedView: {
        gap: spacing.sm,
    },
    locationField: {
        marginBottom: spacing.sm,
    },
    fieldLabel: {
        fontSize: fonts.size.md,
        fontFamily: fonts.family.medium,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    arrowBetweenFields: {
        alignItems: 'center',
        marginVertical: spacing.xs,
    },
    collapseButtonContainer: {
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    collapseButton: {
        fontSize: fonts.size.sm,
        fontFamily: fonts.family.medium,
        color: colors.text.secondary,
        textDecorationLine: 'underline',
    },
    distanceContainer: {
        alignItems: 'center',
        marginVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.primary + '10',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.primary + '20',
    },
    distanceText: {
        fontSize: fonts.size.sm,
        fontFamily: fonts.family.medium,
        color: colors.primary,
        textAlign: 'center',
    },
});

export default CompactLocationSection;