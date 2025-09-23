import React from 'react';
import { Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useLocationObjectDisplay from '../../hooks/useLocationObjectDisplay';
import { cleanLocationDisplay } from '../../utils/locationUtils';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';

interface LocationDisplayProps {
  location: string | { latitude: number; longitude: number; address?: string };
  style?: any;
  showIcon?: boolean;
  iconName?: string;
  iconColor?: string;
  iconSize?: number;
  showLoading?: boolean;
}

const LocationDisplay: React.FC<LocationDisplayProps> = ({
  location,
  style,
  showIcon = true,
  iconName = 'map-marker',
  iconColor = colors.primary,
  iconSize = 16,
  showLoading = true,
}) => {
  // Handle undefined/null location
  if (!location) {
    return (
      <View style={styles.container}>
        {showIcon && (
          <MaterialCommunityIcons 
            name={iconName} 
            size={iconSize} 
            color={iconColor} 
            style={styles.icon}
          />
        )}
        <Text style={[styles.locationText, style]}>Unknown location</Text>
      </View>
    );
  }

  // Use the new hook that handles both strings and objects
  const { displayLocation, isLoading, error } = useLocationObjectDisplay(location);

  return (
    <View style={styles.container}>
      {showIcon && (
        <MaterialCommunityIcons 
          name={iconName} 
          size={iconSize} 
          color={iconColor} 
          style={styles.icon}
        />
      )}
      <View style={styles.textContainer}>
        {isLoading && showLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, style]}>Loading location...</Text>
          </View>
        ) : (
          <Text style={[styles.locationText, style]}>
            {displayLocation || 'Location not available'}
          </Text>
        )}
      </View>
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
    marginRight: spacing.xs,
  },
  textContainer: {
    flex: 1,
  },
  locationText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
});

export default LocationDisplay;
