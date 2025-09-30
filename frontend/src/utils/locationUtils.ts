/**
 * Location Utilities - Simple and Clean
 * Uses the new locationDisplay service for consistent location handling
 */

import { getLocationName, getLocationNameSync, formatRoute, formatRouteSync } from './locationDisplay';

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  formattedAddress?: string;
  placeName?: string;
  city?: string;
  country?: string;
}

/**
 * Get readable location name from various input formats
 * @deprecated Use getLocationName from locationDisplay instead
 */
export async function getReadableLocationName(location: any): Promise<string> {
  return getLocationName(location);
}

/**
 * Get readable location name synchronously
 * @deprecated Use getLocationNameSync from locationDisplay instead
 */
export function getReadableLocationNameSync(location: any): string {
  return getLocationNameSync(location);
}

/**
 * Format route from two locations
 * @deprecated Use formatRoute from locationDisplay instead
 */
export async function formatRouteDeprecated(fromLocation: any, toLocation: any): Promise<string> {
  return formatRoute(fromLocation, toLocation);
}

/**
 * Format route synchronously
 * @deprecated Use formatRouteSync from locationDisplay instead
 */
export function formatRouteSyncDeprecated(fromLocation: any, toLocation: any): string {
  return formatRouteSync(fromLocation, toLocation);
}

/**
 * Clean location display - removes "Location (" prefix and ")" suffix
 * @deprecated Use getLocationNameSync from locationDisplay instead
 */
export function cleanLocationDisplay(location: any): string {
  return getLocationNameSync(location);
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
 * Check if string is a coordinate string
 */
export function isCoordinateString(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  const coordPattern = /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/;
  return coordPattern.test(str.trim());
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function getDistanceBetweenLocations(
  location1: { latitude: number; longitude: number },
  location2: { latitude: number; longitude: number }
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (location2.latitude - location1.latitude) * Math.PI / 180;
  const dLon = (location2.longitude - location1.longitude) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(location1.latitude * Math.PI / 180) * Math.cos(location2.latitude * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

// Re-export the main functions for convenience
export { getLocationName, getLocationNameSync, formatRoute, formatRouteSync };

/**
 * Format location for display - convenience function
 */
export function formatLocationForDisplay(location: any): string {
  if (!location) return 'Unknown Location';
  
  // If it's already a readable string, return it
  if (typeof location === 'string') {
    return location;
  }
  
  // If it's an object with an address field, use that
  if (typeof location === 'object' && location.address) {
    return location.address;
  }
  
  // If it's an object with coordinates, try to get a readable name
  if (typeof location === 'object' && location.latitude && location.longitude) {
    return getLocationNameSync(location);
  }
  
  // Fallback to the original function
  return getLocationNameSync(location);
}