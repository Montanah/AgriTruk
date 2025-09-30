/**
 * Distance Utilities - Accurate Road Distance Calculation
 * Uses Google Maps Directions API for consistent and accurate distance calculations
 */

import { googleMapsService } from '../services/googleMapsService';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface DistanceResult {
  distance: string; // Formatted distance like "280.5 km"
  distanceKm: number; // Numeric distance in kilometers
  duration: string; // Formatted duration like "4 hours 30 minutes"
  durationMinutes: number; // Numeric duration in minutes
  success: boolean;
  error?: string;
}

/**
 * Calculate accurate road distance between two locations using Google Maps Directions API
 * This is the same method used in RequestForm for consistency
 */
export async function calculateRoadDistance(
  fromLocation: LocationCoords | string,
  toLocation: LocationCoords | string
): Promise<DistanceResult> {
  try {
    // Convert string addresses to coordinates if needed
    let fromCoords: LocationCoords;
    let toCoords: LocationCoords;

    if (typeof fromLocation === 'string') {
      const geocoded = await googleMapsService.geocodeAddress(fromLocation);
      fromCoords = {
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        address: fromLocation
      };
    } else {
      fromCoords = fromLocation;
    }

    if (typeof toLocation === 'string') {
      const geocoded = await googleMapsService.geocodeAddress(toLocation);
      toCoords = {
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        address: toLocation
      };
    } else {
      toCoords = toLocation;
    }

    // Get directions using Google Maps API
    const route = await googleMapsService.getDirections(fromCoords, toCoords);

    // Extract numeric distance from formatted string (e.g., "280.5 km" -> 280.5)
    const distanceKm = parseFloat(route.distance.replace(/[^\d.]/g, ''));

    // Extract numeric duration from formatted string (e.g., "4 hours 30 minutes" -> 270)
    const durationMatch = route.duration.match(/(\d+)\s*hours?\s*(\d+)?\s*minutes?/);
    let durationMinutes = 0;
    if (durationMatch) {
      const hours = parseInt(durationMatch[1]) || 0;
      const minutes = parseInt(durationMatch[2]) || 0;
      durationMinutes = hours * 60 + minutes;
    }

    return {
      distance: route.distance,
      distanceKm,
      duration: route.duration,
      durationMinutes,
      success: true
    };
  } catch (error) {
    console.error('Error calculating road distance:', error);
    return {
      distance: 'Distance unavailable',
      distanceKm: 0,
      duration: 'Duration unavailable',
      durationMinutes: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Calculate road distance with fallback to haversine calculation
 * This provides a more robust solution when Google Maps API fails
 */
export async function calculateRoadDistanceWithFallback(
  fromLocation: LocationCoords | string,
  toLocation: LocationCoords | string
): Promise<DistanceResult> {
  try {
    // Try Google Maps API first
    const result = await calculateRoadDistance(fromLocation, toLocation);
    if (result.success) {
      return result;
    }
  } catch (error) {
    console.warn('Google Maps API failed, falling back to haversine calculation:', error);
  }

  // Fallback to haversine calculation
  try {
    let fromCoords: LocationCoords;
    let toCoords: LocationCoords;

    if (typeof fromLocation === 'string') {
      const geocoded = await googleMapsService.geocodeAddress(fromLocation);
      fromCoords = {
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        address: fromLocation
      };
    } else {
      fromCoords = fromLocation;
    }

    if (typeof toLocation === 'string') {
      const geocoded = await googleMapsService.geocodeAddress(toLocation);
      toCoords = {
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        address: toLocation
      };
    } else {
      toCoords = toLocation;
    }

    // Calculate haversine distance
    const haversineDistance = getHaversineDistance(fromCoords, toCoords);
    
    // Add 30% to haversine distance to approximate road distance
    const estimatedRoadDistance = haversineDistance * 1.3;
    
    // Estimate duration based on average speed (50 km/h for trucks)
    const estimatedDurationMinutes = Math.round((estimatedRoadDistance / 50) * 60);
    const hours = Math.floor(estimatedDurationMinutes / 60);
    const minutes = estimatedDurationMinutes % 60;
    const formattedDuration = hours > 0 ? `${hours} hours ${minutes} minutes` : `${minutes} minutes`;

    return {
      distance: `${estimatedRoadDistance.toFixed(1)} km`,
      distanceKm: estimatedRoadDistance,
      duration: formattedDuration,
      durationMinutes: estimatedDurationMinutes,
      success: true
    };
  } catch (error) {
    console.error('Error in fallback distance calculation:', error);
    return {
      distance: 'Distance unavailable',
      distanceKm: 0,
      duration: 'Duration unavailable',
      durationMinutes: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Haversine distance calculation (straight-line distance)
 * Used as fallback when Google Maps API is unavailable
 */
function getHaversineDistance(
  location1: LocationCoords,
  location2: LocationCoords
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (location2.latitude - location1.latitude) * Math.PI / 180;
  const dLon = (location2.longitude - location1.longitude) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(location1.latitude * Math.PI / 180) * Math.cos(location2.latitude * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km`;
  } else {
    return `${Math.round(distanceKm)} km`;
  }
}

/**
 * Format duration for display
 */
export function formatDuration(durationMinutes: number): string {
  if (durationMinutes < 60) {
    return `${durationMinutes} minutes`;
  } else {
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return minutes > 0 ? `${hours} hours ${minutes} minutes` : `${hours} hours`;
  }
}
