import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getLocationName, getLocationNameSync } from '../../utils/locationDisplay';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';

interface LocationDisplayProps {
  location: any;
  style?: any;
  showIcon?: boolean;
  iconColor?: string;
  loadingColor?: string;
  fallbackToSync?: boolean;
  numberOfLines?: number;
}

const LocationDisplay: React.FC<LocationDisplayProps> = ({
  location,
  style,
  showIcon = true,
  iconColor = colors.primary,
  loadingColor = colors.text.secondary,
  fallbackToSync = true,
  numberOfLines,
}) => {
  const [locationName, setLocationName] = useState<string>('Unknown Location');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocationName = async () => {
      if (!location) {
        setLocationName('Unknown Location');
        return;
      }

      console.log('LocationDisplay - Processing location:', location);

      // If location has an address field, check if it's a coordinate string
      if (location.address) {
        console.log('LocationDisplay - Address found:', location.address);
        // Check if it's a coordinate string like "Location (-1.0707, 34.4753)"
        if (location.address.startsWith('Location (')) {
          console.log('LocationDisplay - Detected coordinate string, will geocode');
          setIsLoading(true);
          setError(null);
          try {
            const name = await getLocationName(location);
            console.log('LocationDisplay - Geocoded result:', name);
            setLocationName(name);
          } catch (err: any) {
            console.error('LocationDisplay - Geocoding error:', err);
            setError(err.message || 'Failed to get location name');
            setLocationName(getLocationNameSync(location));
          } finally {
            setIsLoading(false);
          }
        } else {
          console.log('LocationDisplay - Using address directly:', location.address);
          setLocationName(location.address);
        }
        return;
      }

      // If it's already a string, use it
      if (typeof location === 'string') {
        setLocationName(location);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const name = await getLocationName(location);
        setLocationName(name);
      } catch (err: any) {
        console.error('Error getting location name:', err);
        setError(err.message || 'Failed to get location name');
        
        // Fallback to synchronous method if enabled
        if (fallbackToSync) {
          setLocationName(getLocationNameSync(location));
        } else {
          setLocationName('Unknown Location');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocationName();
  }, [location, fallbackToSync]);

  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        {showIcon && (
          <MaterialCommunityIcons 
            name="map-marker" 
            size={16} 
            color={loadingColor} 
            style={styles.icon}
          />
        )}
        <ActivityIndicator size="small" color={loadingColor} style={styles.loader} />
        <Text style={[styles.text, style, { color: loadingColor }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {showIcon && (
        <MaterialCommunityIcons 
          name="map-marker" 
          size={16} 
          color={iconColor} 
          style={styles.icon}
        />
      )}
      <Text style={[styles.text, style]} numberOfLines={numberOfLines || 2}>
        {locationName}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    flex: 1,
  },
  loader: {
    marginRight: 4,
  },
});

export default LocationDisplay;