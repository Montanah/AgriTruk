import { getReadableLocationName as originalGetReadableLocationName } from './locationUtils';

/**
 * Enhanced location utilities with reverse geocoding
 */

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  formattedAddress?: string;
  placeName?: string;
  city?: string;
  country?: string;
}

// Cache for reverse geocoding results
const locationCache = new Map<string, LocationData>();

/**
 * Generate cache key for coordinates
 */
function getCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

/**
 * Check if coordinates are valid
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Parse coordinate string like "Location (-1.2921, 36.8219)"
 */
export function parseCoordinateString(coordinateStr: string): { lat: number; lng: number } | null {
  if (!coordinateStr) return null;

  // Handle "Location (-1.2921, 36.8219)" format
  const locationMatch = coordinateStr.match(/Location\s*\(([^,]+),\s*([^)]+)\)/);
  if (locationMatch) {
    const lat = parseFloat(locationMatch[1]);
    const lng = parseFloat(locationMatch[2]);
    if (isValidCoordinates(lat, lng)) {
      return { lat, lng };
    }
  }

  // Handle simple coordinate pairs like "-1.2921, 36.8219"
  const coordMatch = coordinateStr.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (isValidCoordinates(lat, lng)) {
      return { lat, lng };
    }
  }

  return null;
}

/**
 * Reverse geocode coordinates to get place name
 * This is a simplified version - in production, you'd use Google Maps API or similar
 */
export async function reverseGeocode(lat: number, lng: number): Promise<LocationData | null> {
  if (!isValidCoordinates(lat, lng)) {
    return null;
  }

  const cacheKey = getCacheKey(lat, lng);
  
  // Check cache first
  if (locationCache.has(cacheKey)) {
    return locationCache.get(cacheKey)!;
  }

  try {
    // For now, we'll use a simple approach
    // In production, you'd integrate with Google Maps Geocoding API or similar
    const locationData: LocationData = {
      latitude: lat,
      longitude: lng,
      address: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      formattedAddress: await getPlaceNameFromCoordinates(lat, lng),
      placeName: await getPlaceNameFromCoordinates(lat, lng),
    };

    // Cache the result
    locationCache.set(cacheKey, locationData);
    
    return locationData;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return {
      latitude: lat,
      longitude: lng,
      address: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      formattedAddress: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    };
  }
}

/**
 * Get place name from coordinates
 * Enhanced with more comprehensive location mapping
 */
async function getPlaceNameFromCoordinates(lat: number, lng: number): Promise<string> {
  // Check for invalid coordinates
  if (lat === 0 && lng === 0 || isNaN(lat) || isNaN(lng)) {
    return 'Unknown Location';
  }

  // Comprehensive known locations in Kenya
  const knownLocations = [
    // Nairobi and surrounding areas
    { lat: -1.2921, lng: 36.8219, name: 'Nairobi' },
    { lat: -1.2622, lng: 36.8059, name: 'Nairobi Area' },
    { lat: -1.1667, lng: 36.8333, name: 'Thika' },
    { lat: -1.0333, lng: 37.0833, name: 'Machakos' },
    { lat: -1.3000, lng: 36.8000, name: 'Nairobi CBD' },
    { lat: -1.3500, lng: 36.7500, name: 'Westlands' },
    { lat: -1.2500, lng: 36.8500, name: 'Eastleigh' },
    
    // Coastal region
    { lat: -4.0437, lng: 39.6682, name: 'Mombasa' },
    { lat: -4.0000, lng: 39.6000, name: 'Mombasa Area' },
    { lat: -3.2000, lng: 40.1000, name: 'Malindi' },
    { lat: -3.4000, lng: 39.9000, name: 'Kilifi' },
    
    // Western Kenya
    { lat: -0.0917, lng: 34.768, name: 'Kisumu' },
    { lat: -0.1000, lng: 34.8000, name: 'Kisumu Area' },
    { lat: 0.0236, lng: 37.9062, name: 'Nakuru' },
    { lat: 0.0000, lng: 37.9000, name: 'Nakuru Area' },
    { lat: -0.4167, lng: 36.9500, name: 'Nyeri' },
    { lat: -0.5167, lng: 35.2833, name: 'Kericho' },
    { lat: 0.1000, lng: 35.0000, name: 'Eldoret' },
    { lat: 0.3000, lng: 36.0000, name: 'Isiolo' },
    
    // Central Kenya
    { lat: -0.3000, lng: 36.1000, name: 'Nanyuki' },
    { lat: -0.2000, lng: 36.3000, name: 'Meru' },
    { lat: -0.5000, lng: 36.5000, name: 'Embu' },
    
    // Rift Valley
    { lat: 0.5000, lng: 35.5000, name: 'Kitale' },
    { lat: 0.8000, lng: 35.2000, name: 'Lodwar' },
    { lat: -0.8000, lng: 36.2000, name: 'Kitui' },
  ];

  // Check if coordinates match known locations (with tolerance)
  const tolerance = 0.15; // Increased tolerance for better matching
  for (const location of knownLocations) {
    if (
      Math.abs(lat - location.lat) < tolerance &&
      Math.abs(lng - location.lng) < tolerance
    ) {
      return location.name;
    }
  }

  // If coordinates are in Kenya (rough bounds), return generic location
  if (lat >= -4.8 && lat <= 5.5 && lng >= 33.9 && lng <= 41.9) {
    return 'Kenya Location';
  }

  // If no known location found, return formatted coordinates
  return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}

/**
 * Enhanced function to get readable location name
 */
export async function getReadableLocationName(location: any): Promise<string> {
  if (!location) return 'Unknown Location';

  // If it's already a readable string, return it
  if (typeof location === 'string') {
    // Check if it's a coordinate string
    const coords = parseCoordinateString(location);
    if (coords) {
      const locationData = await reverseGeocode(coords.lat, coords.lng);
      return locationData?.formattedAddress || location;
    }
    return location;
  }

  // If it's an object with coordinates
  if (typeof location === 'object') {
    // Check for address first
    if (location.address && typeof location.address === 'string') {
      const coords = parseCoordinateString(location.address);
      if (coords) {
        const locationData = await reverseGeocode(coords.lat, coords.lng);
        return locationData?.formattedAddress || location.address;
      }
      return location.address;
    }

    // Check for coordinates
    if (location.latitude && location.longitude) {
      const locationData = await reverseGeocode(location.latitude, location.longitude);
      return locationData?.formattedAddress || `Location (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`;
    }

    // Check for other address fields
    if (location.formattedAddress) return location.formattedAddress;
    if (location.placeName) return location.placeName;
    if (location.city) return location.city;
  }

  return 'Unknown Location';
}

/**
 * Synchronous version for immediate display (uses cache)
 */
export function getReadableLocationNameSync(location: any): string {
  if (!location) return 'Unknown Location';

  // If it's already a readable string, return it
  if (typeof location === 'string') {
    // Check if it's a coordinate string
    const coords = parseCoordinateString(location);
    if (coords) {
      // Check for invalid coordinates
      if (coords.lat === 0 && coords.lng === 0 || isNaN(coords.lat) || isNaN(coords.lng)) {
        return 'Unknown Location';
      }
      const cacheKey = getCacheKey(coords.lat, coords.lng);
      const cached = locationCache.get(cacheKey);
      return cached?.formattedAddress || getLocationNameFromCoordsSync(coords.lat, coords.lng);
    }
    return location;
  }

  // If it's an object with coordinates
  if (typeof location === 'object') {
    // Check for address first
    if (location.address && typeof location.address === 'string') {
      const coords = parseCoordinateString(location.address);
      if (coords) {
        // Check for invalid coordinates
        if (coords.lat === 0 && coords.lng === 0 || isNaN(coords.lat) || isNaN(coords.lng)) {
          return 'Unknown Location';
        }
        const cacheKey = getCacheKey(coords.lat, coords.lng);
        const cached = locationCache.get(cacheKey);
        return cached?.formattedAddress || getLocationNameFromCoordsSync(coords.lat, coords.lng);
      }
      return location.address;
    }

    // Check for coordinates
    if (location.latitude !== undefined && location.longitude !== undefined) {
      // Check for invalid coordinates
      if (location.latitude === 0 && location.longitude === 0 || isNaN(location.latitude) || isNaN(location.longitude)) {
        return 'Unknown Location';
      }
      const cacheKey = getCacheKey(location.latitude, location.longitude);
      const cached = locationCache.get(cacheKey);
      return cached?.formattedAddress || getLocationNameFromCoordsSync(location.latitude, location.longitude);
    }

    // Check for other address fields
    if (location.formattedAddress) return location.formattedAddress;
    if (location.placeName) return location.placeName;
    if (location.city) return location.city;
  }

  return 'Unknown Location';
}

/**
 * Synchronous location name from coordinates
 */
function getLocationNameFromCoordsSync(lat: number, lng: number): string {
  // Check for invalid coordinates
  if (lat === 0 && lng === 0 || isNaN(lat) || isNaN(lng)) {
    return 'Unknown Location';
  }

  // Known locations in Kenya (same as async version)
  const knownLocations = [
    { lat: -1.2921, lng: 36.8219, name: 'Nairobi' },
    { lat: -1.2622, lng: 36.8059, name: 'Nairobi Area' },
    { lat: -1.1667, lng: 36.8333, name: 'Thika' },
    { lat: -1.0333, lng: 37.0833, name: 'Machakos' },
    { lat: -4.0437, lng: 39.6682, name: 'Mombasa' },
    { lat: -0.0917, lng: 34.768, name: 'Kisumu' },
    { lat: 0.0236, lng: 37.9062, name: 'Nakuru' },
    { lat: -0.4167, lng: 36.9500, name: 'Nyeri' },
    { lat: -0.5167, lng: 35.2833, name: 'Kericho' },
  ];

  // Check if coordinates match known locations
  const tolerance = 0.15;
  for (const location of knownLocations) {
    if (
      Math.abs(lat - location.lat) < tolerance &&
      Math.abs(lng - location.lng) < tolerance
    ) {
      return location.name;
    }
  }

  // If coordinates are in Kenya, return generic location
  if (lat >= -4.8 && lat <= 5.5 && lng >= 33.9 && lng <= 41.9) {
    return 'Kenya Location';
  }

  // Return formatted coordinates
  return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}

/**
 * Format route for display
 */
export function formatRoute(fromLocation: any, toLocation: any): string {
  const from = getReadableLocationNameSync(fromLocation);
  const to = getReadableLocationNameSync(toLocation);
  return `${from} → ${to}`;
}

/**
 * Clean location display (remove "Location (" prefix if present)
 */
export function cleanLocationDisplay(location: any): string {
  const locationStr = getReadableLocationNameSync(location);
  return locationStr.replace(/^Location\s*\([^)]+\)\s*/, '');
}

// Re-export original function for backward compatibility
export { originalGetReadableLocationName };