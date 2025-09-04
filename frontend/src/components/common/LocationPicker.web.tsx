import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';

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
    onTextChange?: (text: string) => void;
    showCurrentLocation?: boolean;
    style?: any;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
    placeholder = "Enter location...",
    value = "",
    onLocationSelected,
    onTextChange,
    showCurrentLocation = true,
    style,
}) => {
    const [searchText, setSearchText] = useState(value);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<LocationType | null>(null);

    useEffect(() => {
        setSearchText(value);
    }, [value]);

    const handleTextChange = (text: string) => {
        setSearchText(text);
        if (onTextChange) {
            onTextChange(text);
        }
        
        // Simulate search suggestions for web
        if (text.length > 2) {
            setIsLoading(true);
            setTimeout(() => {
                const mockSuggestions = [
                    {
                        placeId: '1',
                        description: `${text} - Nairobi, Kenya`,
                        formatted_address: `${text}, Nairobi, Kenya`,
                        geometry: {
                            location: {
                                lat: -1.2921 + Math.random() * 0.1,
                                lng: 36.8219 + Math.random() * 0.1,
                            }
                        }
                    },
                    {
                        placeId: '2',
                        description: `${text} - Mombasa, Kenya`,
                        formatted_address: `${text}, Mombasa, Kenya`,
                        geometry: {
                            location: {
                                lat: -4.0437 + Math.random() * 0.1,
                                lng: 39.6682 + Math.random() * 0.1,
                            }
                        }
                    }
                ];
                setSuggestions(mockSuggestions);
                setIsLoading(false);
            }, 500);
        } else {
            setSuggestions([]);
        }
    };

    const handleSuggestionPress = (suggestion: any) => {
        const location: LocationType = {
            latitude: suggestion.geometry.location.lat,
            longitude: suggestion.geometry.location.lng,
            address: suggestion.formatted_address,
            placeId: suggestion.placeId,
        };
        
        setSearchText(suggestion.description);
        setSuggestions([]);
        
        if (onLocationSelected) {
            onLocationSelected(location);
        }
    };

    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            Alert.alert('Error', 'Geolocation is not supported by this browser.');
            return;
        }

        setIsLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location: LocationType = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    address: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
                };
                
                setCurrentLocation(location);
                setSearchText(location.address);
                
                if (onLocationSelected) {
                    onLocationSelected(location);
                }
                
                setIsLoading(false);
            },
            (error) => {
                Alert.alert('Error', 'Unable to get current location. Please enter manually.');
                setIsLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000,
            }
        );
    };

    const clearLocation = () => {
        setSearchText('');
        setSuggestions([]);
        setCurrentLocation(null);
        if (onTextChange) {
            onTextChange('');
        }
    };

    return (
        <View style={[styles.container, style]}>
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    value={searchText}
                    onChangeText={handleTextChange}
                    placeholderTextColor={colors.textSecondary}
                />
                
                {searchText.length > 0 && (
                    <TouchableOpacity style={styles.clearButton} onPress={clearLocation}>
                        <Text style={styles.clearButtonText}>✕</Text>
                    </TouchableOpacity>
                )}
                
                {showCurrentLocation && (
                    <TouchableOpacity 
                        style={styles.locationButton} 
                        onPress={getCurrentLocation}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <Text style={styles.locationButtonText}>📍</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>

            {isLoading && suggestions.length === 0 && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadingText}>Searching...</Text>
                </View>
            )}

            {suggestions.length > 0 && (
                <ScrollView style={styles.suggestionsContainer}>
                    {suggestions.map((suggestion, index) => (
                        <TouchableOpacity
                            key={suggestion.placeId || index}
                            style={styles.suggestionItem}
                            onPress={() => handleSuggestionPress(suggestion)}
                        >
                            <Text style={styles.suggestionText}>
                                {suggestion.description}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            {currentLocation && (
                <View style={styles.currentLocationContainer}>
                    <Text style={styles.currentLocationLabel}>📍 Current Location:</Text>
                    <Text style={styles.currentLocationText}>
                        {currentLocation.address}
                    </Text>
                </View>
            )}

            <View style={styles.noteContainer}>
                <Text style={styles.noteText}>
                    💡 Web version - Full location features available in mobile app
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.sm,
    },
    input: {
        flex: 1,
        height: 48,
        fontSize: 16,
        color: colors.text,
        fontFamily: fonts.regular,
    },
    clearButton: {
        padding: spacing.xs,
        marginLeft: spacing.xs,
    },
    clearButtonText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    locationButton: {
        padding: spacing.xs,
        marginLeft: spacing.xs,
    },
    locationButtonText: {
        fontSize: 16,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.sm,
        backgroundColor: colors.background,
    },
    loadingText: {
        marginLeft: spacing.xs,
        fontSize: 14,
        color: colors.textSecondary,
    },
    suggestionsContainer: {
        maxHeight: 200,
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        marginTop: spacing.xs,
    },
    suggestionItem: {
        padding: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    suggestionText: {
        fontSize: 14,
        color: colors.text,
        fontFamily: fonts.regular,
    },
    currentLocationContainer: {
        marginTop: spacing.sm,
        padding: spacing.sm,
        backgroundColor: colors.primaryLight,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    currentLocationLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
        marginBottom: spacing.xs,
    },
    currentLocationText: {
        fontSize: 14,
        color: colors.text,
        fontFamily: fonts.regular,
    },
    noteContainer: {
        marginTop: spacing.sm,
        padding: spacing.xs,
    },
    noteText: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
});

export default LocationPicker;
