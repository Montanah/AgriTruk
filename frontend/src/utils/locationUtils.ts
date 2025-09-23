// Comprehensive location utilities for uniform location display and distance calculation
import { googleMapsService } from '../services/googleMapsService';

// Location type definition
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

// Cache for location names to avoid repeated API calls
const locationNameCache = new Map<string, string>();

// Kenyan locations lookup table for common places
const kenyanLocations: { [key: string]: string } = {
  // Major cities
  '-1.2921,36.8219': 'Nairobi, Kenya',
  '-4.0435,39.6682': 'Mombasa, Kenya',
  '-0.0917,34.7680': 'Kisumu, Kenya',
  '-0.3071,36.0800': 'Nakuru, Kenya',
  '0.5143,35.2698': 'Eldoret, Kenya',
  '-1.0333,37.0833': 'Thika, Kenya',
  '-1.5167,37.2667': 'Machakos, Kenya',
  '-3.3540,40.0139': 'Watamu, Kenya',
  '-3.3199,40.0730': 'Kenan Road, The One, Watamu Bay, Kenya', // Specific Watamu Bay coordinates
  '-3.2175,40.1191': 'Malindi, Kenya',
  '-2.2718,40.9020': 'Lamu, Kenya',
  '-0.4569,39.6583': 'Garissa, Kenya',
  '0.0463,37.6559': 'Meru, Kenya',
  '-0.4201,36.9476': 'Nyeri, Kenya',
  '-0.3677,35.2831': 'Kericho, Kenya',
  '0.2827,34.7519': 'Kakamega, Kenya',
  '1.0167,35.0000': 'Kitale, Kenya',
  '0.5667,34.5667': 'Bungoma, Kenya',
  '0.4600,34.1117': 'Busia, Kenya',
  '0.0392,34.7290': 'Vihiga, Kenya',
  '0.0607,34.2881': 'Siaya, Kenya',
  '-0.5167,34.4500': 'Homa Bay, Kenya',
  '-1.0667,34.4667': 'Migori, Kenya',
  '-0.6833,34.7667': 'Kisii, Kenya',
  '-0.5667,34.9500': 'Nyamira, Kenya',
};

/**
 * Convert coordinates to a user-friendly place name
 */
export const convertCoordinatesToPlaceName = async (latitude: number, longitude: number): Promise<string> => {
  // Validate coordinates - more comprehensive validation
  if (isNaN(latitude) || isNaN(longitude) || 
      latitude === 0 || longitude === 0 || 
      latitude === undefined || longitude === undefined ||
      latitude === null || longitude === null) {
    console.warn('Invalid coordinates provided:', { latitude, longitude });
    return 'Location not available';
  }

  try {
    // Check cache first
    const cacheKey = `${latitude},${longitude}`;
    if (locationNameCache.has(cacheKey)) {
      return locationNameCache.get(cacheKey)!;
    }

    // Check lookup table for common Kenyan locations
    const coordKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    console.log('🔍 Checking coordinates:', coordKey, 'in lookup table');
    if (kenyanLocations[coordKey]) {
      console.log('✅ Found in lookup table:', kenyanLocations[coordKey]);
      locationNameCache.set(cacheKey, kenyanLocations[coordKey]);
      return kenyanLocations[coordKey];
    }

    // Use Google Maps Geocoding API for other locations
    try {
      const placeName = await googleMapsService.reverseGeocode(latitude, longitude);
      if (placeName) {
        locationNameCache.set(cacheKey, placeName);
        return placeName;
      }
    } catch (error) {
      console.warn('Geocoding failed, using coordinates:', error);
    }

    // Fallback to coordinates
    const fallback = `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
    locationNameCache.set(cacheKey, fallback);
    return fallback;
  } catch (error) {
    console.error('Error converting coordinates to place name:', error);
    return `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
  }
};

/**
 * Clean and format location display string
 */
export const cleanLocationDisplay = (location: string | Location | any): string => {
  if (!location) return 'Location not specified';
  
  // Handle Location objects
  if (typeof location === 'object' && location !== null) {
    if (location.address && location.address !== 'Unknown location' && location.address !== 'Location not specified') {
      return location.address;
    }
    if (location.latitude && location.longitude) {
      return `Location (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`;
    }
    return 'Location not specified';
  }
  
  // Handle string locations
  if (typeof location !== 'string') return 'Location not specified';
  
  // Check if it's a coordinate string like "Location (-3.3199, 40.0730)" or "Near -3.3199, 40.0730"
  const coordinateMatch = location.match(/Location\s*\(([-+]?\d+\.?\d*),\s*([-+]?\d+\.?\d*)\)/) ||
                         location.match(/^Near\s+([-+]?\d+\.?\d*),\s*([-+]?\d+\.?\d*)$/);
  if (coordinateMatch) {
    const lat = parseFloat(coordinateMatch[1]);
    const lng = parseFloat(coordinateMatch[2]);
    
    // Check cache first
    const cacheKey = `${lat},${lng}`;
    if (locationNameCache.has(cacheKey)) {
      return locationNameCache.get(cacheKey)!;
    }
    
    // Check lookup table for common Kenyan locations
    const coordKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (kenyanLocations[coordKey]) {
      locationNameCache.set(cacheKey, kenyanLocations[coordKey]);
      return kenyanLocations[coordKey];
    }
    
    // Return coordinates if not found in lookup table
    return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }
  
  // Check if it's just coordinates without "Location" wrapper
  const simpleCoordinateMatch = location.match(/^([-+]?\d+\.?\d*),\s*([-+]?\d+\.?\d*)$/);
  if (simpleCoordinateMatch) {
    const lat = parseFloat(simpleCoordinateMatch[1]);
    const lng = parseFloat(simpleCoordinateMatch[2]);
    
    // Check cache first
    const cacheKey = `${lat},${lng}`;
    if (locationNameCache.has(cacheKey)) {
      return locationNameCache.get(cacheKey)!;
    }
    
    // Check lookup table for common Kenyan locations
    const coordKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (kenyanLocations[coordKey]) {
      locationNameCache.set(cacheKey, kenyanLocations[coordKey]);
      return kenyanLocations[coordKey];
    }
    
    // Return coordinates if not found in lookup table
    return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }
  
  // Check if it's a plus code (e.g., "M3HC+XXW")
  const plusCodeMatch = location.match(/^[A-Z0-9]{2,3}\+[A-Z0-9]{2,3}$/);
  if (plusCodeMatch) {
    return `Plus Code: ${location}`;
  }
  
  // Return the location as-is if it's already a readable string
  return location;
};

/**
 * Format location for display with consistent styling
 */
export const formatLocationForDisplay = (location: string | Location | any): string => {
  return cleanLocationDisplay(location);
};

/**
 * Get short location name for compact display
 */
export const getShortLocationName = (location: string | Location | any): string => {
  const fullName = cleanLocationDisplay(location);
  
  // Extract city/town name from full address
  const parts = fullName.split(',');
  if (parts.length > 0) {
    return parts[0].trim();
  }
  
  return fullName;
};

/**
 * Calculate distance between two locations using Haversine formula
 */
export const getDistanceBetweenLocations = (location1: Location, location2: Location): number => {
  // Convert to numbers if they're strings
  const lat1 = typeof location1.latitude === 'string' ? parseFloat(location1.latitude) : location1.latitude;
  const lng1 = typeof location1.longitude === 'string' ? parseFloat(location1.longitude) : location1.longitude;
  const lat2 = typeof location2.latitude === 'string' ? parseFloat(location2.latitude) : location2.latitude;
  const lng2 = typeof location2.longitude === 'string' ? parseFloat(location2.longitude) : location2.longitude;
  
  // Check if conversion was successful
  if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
    return 0;
  }
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
};

/**
 * Format distance for display
 */
export const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  } else if (distance < 10) {
    return `${distance.toFixed(1)}km`;
  } else {
    return `${Math.round(distance)}km`;
  }
};

/**
 * Calculate route distance and duration using Google Maps API
 */
export const calculateRouteDistanceAndDuration = async (
  fromLocation: Location,
  toLocation: Location
): Promise<{ distance: string; duration: string; distanceKm: number }> => {
  try {
    const route = await googleMapsService.getDirections(fromLocation, toLocation);
    const distanceKm = parseFloat(route.distance.replace(/[^\d.]/g, '')) || 0;
    
    return {
      distance: route.distance,
      duration: route.duration,
      distanceKm
    };
  } catch (error) {
    console.error('Error calculating route:', error);
    // Fallback to straight-line distance
    const straightLineDistance = getDistanceBetweenLocations(fromLocation, toLocation);
    return {
      distance: formatDistance(straightLineDistance),
      duration: 'Unknown',
      distanceKm: straightLineDistance
    };
  }
};

/**
 * Validate location object
 */
export const isValidLocation = (location: any): location is Location => {
  return (
    location &&
    typeof location === 'object' &&
    typeof location.latitude === 'number' &&
    typeof location.longitude === 'number' &&
    !isNaN(location.latitude) &&
    !isNaN(location.longitude) &&
    location.latitude >= -90 &&
    location.latitude <= 90 &&
    location.longitude >= -180 &&
    location.longitude <= 180
  );
};

/**
 * Parse location from various formats
 */
export const parseLocation = (location: any): Location | null => {
  if (!location) return null;
  
  // Already a valid location object
  if (isValidLocation(location)) {
    return location;
  }
  
  // String coordinates
  if (typeof location === 'string') {
    const coordMatch = location.match(/([-+]?\d+\.?\d*),\s*([-+]?\d+\.?\d*)/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
  }
  
  return null;
};

/**
 * Format route for display
 */
export const formatRoute = (fromLocation: string | Location | any, toLocation: string | Location | any): string => {
  const from = cleanLocationDisplay(fromLocation);
  const to = cleanLocationDisplay(toLocation);
  return `${from} → ${to}`;
};

/**
 * Get readable location name (alias for cleanLocationDisplay)
 */
export const getReadableLocationName = (location: string | Location | any): string => {
  return cleanLocationDisplay(location);
};

/**
 * Convert coordinates array to place names
 */
export const convertCoordinatesArrayToPlaceNames = async (locations: Location[]): Promise<string[]> => {
  const promises = locations.map(location => 
    convertCoordinatesToPlaceName(location.latitude, location.longitude)
  );
  return Promise.all(promises);
};

/**
 * Clear location cache (useful for testing or memory management)
 */
export const clearLocationCache = (): void => {
  locationNameCache.clear();
};

/**
 * Get cache statistics
 */
export const getLocationCacheStats = (): { size: number; keys: string[] } => {
  return {
    size: locationNameCache.size,
    keys: Array.from(locationNameCache.keys())
  };
};