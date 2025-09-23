/**
 * Location processing utilities to handle inconsistent location data from backend
 */

export interface ProcessedLocation {
  address: string;
  latitude: number;
  longitude: number;
  isValid: boolean;
}

/**
 * Process location data from backend to ensure consistent format
 */
export const processLocationData = (location: any): ProcessedLocation => {
  // Handle null/undefined
  if (!location) {
    return {
      address: 'Location not available',
      latitude: 0,
      longitude: 0,
      isValid: false
    };
  }

  // Handle string locations
  if (typeof location === 'string') {
    // Check if it's a coordinate string like "Location (-3.3199, 40.0730)"
    const coordMatch = location.match(/Location\s*\(([-+]?\d+\.?\d*),\s*([-+]?\d+\.?\d*)\)/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      console.log('📍 Processing coordinate string:', location, '-> lat:', lat, 'lng:', lng);
      return {
        address: location,
        latitude: lat,
        longitude: lng,
        isValid: !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0
      };
    }
    
    // It's a plain string address
    return {
      address: location,
      latitude: 0,
      longitude: 0,
      isValid: false
    };
  }

  // Handle object locations
  if (typeof location === 'object') {
    const { address, latitude, longitude } = location;
    
    // Check if coordinates are valid
    const hasValidCoords = latitude && longitude && 
                          !isNaN(latitude) && !isNaN(longitude) && 
                          latitude !== 0 && longitude !== 0;
    
    // If we have a good address, use it
    if (address && address !== 'Unknown location' && address !== 'Location not available') {
      return {
        address: address,
        latitude: latitude || 0,
        longitude: longitude || 0,
        isValid: hasValidCoords
      };
    }
    
    // If we have valid coordinates but no address, create a coordinate string
    if (hasValidCoords) {
      return {
        address: `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
        latitude: latitude,
        longitude: longitude,
        isValid: true
      };
    }
    
    // Invalid location
    return {
      address: 'Location not available',
      latitude: 0,
      longitude: 0,
      isValid: false
    };
  }

  // Fallback
  return {
    address: 'Location not available',
    latitude: 0,
    longitude: 0,
    isValid: false
  };
};

/**
 * Get a display-friendly location name
 */
export const getLocationDisplayName = (location: any): string => {
  const processed = processLocationData(location);
  return processed.address;
};

/**
 * Check if location has valid coordinates for geocoding
 */
export const hasValidCoordinates = (location: any): boolean => {
  const processed = processLocationData(location);
  return processed.isValid;
};
