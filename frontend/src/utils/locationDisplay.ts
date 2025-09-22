// Import the geocoding function
import { convertCoordinatesToPlaceName } from './locationUtils';

// Cache for converted locations to avoid repeated API calls
const locationNameCache = new Map<string, string>();

// Common Kenyan locations lookup table
const kenyanLocations: { [key: string]: string } = {
  '-1.2921,36.8219': 'Nairobi, Kenya',
  '-1.2921,36.8219': 'Nairobi, Kenya',
  '-3.3199,40.0730': 'Mombasa, Kenya',
  '0.0236,37.9062': 'Nakuru, Kenya',
  '-0.0917,34.7680': 'Kisumu, Kenya',
  '0.5167,35.2833': 'Eldoret, Kenya',
  '-1.0333,37.0833': 'Machakos, Kenya',
  '-0.3600,36.2800': 'Thika, Kenya',
  '-0.5167,35.2833': 'Nyeri, Kenya',
  '0.5167,35.2833': 'Kitale, Kenya',
  '-0.3667,36.0833': 'Meru, Kenya',
  '0.2833,34.7667': 'Kakamega, Kenya',
  '-0.5167,35.2833': 'Kericho, Kenya',
  '0.5167,35.2833': 'Malindi, Kenya',
  '-3.3199,40.0730': 'Watamu, Kenya',
  '-1.0333,37.0833': 'Kitui, Kenya',
  '0.2833,34.7667': 'Bungoma, Kenya',
  '-0.5167,35.2833': 'Garissa, Kenya',
  '0.2833,34.7667': 'Busia, Kenya',
  '-1.0333,37.0833': 'Embu, Kenya',
};

// Async function to convert coordinates to place names
export const convertLocationToPlaceName = async (location: string): Promise<string> => {
  if (!location) return 'Unknown location';
  
  // Check if it's a coordinate string like "Location (-3.3199, 40.0730)"
  const coordinateMatch = location.match(/Location\s*\(([-+]?\d+\.?\d*),\s*([-+]?\d+\.?\d*)\)/);
  if (coordinateMatch) {
    const lat = parseFloat(coordinateMatch[1]);
    const lng = parseFloat(coordinateMatch[2]);
    
    // Check cache first
    const cacheKey = `${lat},${lng}`;
    if (locationNameCache.has(cacheKey)) {
      return locationNameCache.get(cacheKey)!;
    }
    
    try {
      // Convert coordinates to place name
      const placeName = await convertCoordinatesToPlaceName({ latitude: lat, longitude: lng });
      locationNameCache.set(cacheKey, placeName);
      return placeName;
    } catch (error) {
      console.warn('Failed to convert coordinates to place name:', error);
      const coordinateString = `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      locationNameCache.set(cacheKey, coordinateString);
      return coordinateString;
    }
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
    
    try {
      // Convert coordinates to place name
      const placeName = await convertCoordinatesToPlaceName({ latitude: lat, longitude: lng });
      locationNameCache.set(cacheKey, placeName);
      return placeName;
    } catch (error) {
      console.warn('Failed to convert coordinates to place name:', error);
      const coordinateString = `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      locationNameCache.set(cacheKey, coordinateString);
      return coordinateString;
    }
  }
  
  // If it's not coordinates, just clean and return
  return cleanLocationDisplay(location);
};

// Utility functions for cleaning up location display
export const cleanLocationDisplay = (location: string): string => {
  if (!location) return 'Unknown location';
  
  // Check if it's a coordinate string like "Location (-3.3199, 40.0730)"
  const coordinateMatch = location.match(/Location\s*\(([-+]?\d+\.?\d*),\s*([-+]?\d+\.?\d*)\)/);
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
    
    return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }
  
  // Remove common prefixes that are not user-friendly
  const prefixesToRemove = [
    /^[A-Z0-9+]{6,}\s*,?\s*/, // Remove codes like M3HC+XXW
    /^Near\s+/, // Remove "Near " prefix
    /^Location\s*\(/, // Remove "Location (" prefix
    /^\([^)]+\)\s*/, // Remove coordinate-like prefixes in parentheses
  ];
  
  let cleaned = location;
  
  // Apply all prefix removals
  prefixesToRemove.forEach(regex => {
    cleaned = cleaned.replace(regex, '');
  });
  
  // Clean up common location patterns
  cleaned = cleaned
    .replace(/,\s*Kenya\s*$/i, '') // Remove trailing ", Kenya"
    .replace(/,\s*KE\s*$/i, '') // Remove trailing ", KE"
    .replace(/\s*,\s*$/, '') // Remove trailing commas
    .trim();
  
  // If the result is empty or too short, return the original
  if (cleaned.length < 3) {
    return location;
  }
  
  return cleaned;
};

export const formatLocationForCard = (location: string | { address?: string; latitude?: number; longitude?: number }): string => {
  if (typeof location === 'string') {
    return cleanLocationDisplay(location);
  }
  
  if (location?.address) {
    return cleanLocationDisplay(location.address);
  }
  
  if (location?.latitude && location?.longitude) {
    // For coordinates, try to extract meaningful location info
    const lat = location.latitude;
    const lng = location.longitude;
    
    // Simple fallback - in a real app, you'd use reverse geocoding
    return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }
  
  return 'Unknown location';
};

export const getLocationShortName = (location: string): string => {
  const cleaned = cleanLocationDisplay(location);
  
  // Extract city/town name (usually the last meaningful part)
  const parts = cleaned.split(',').map(part => part.trim());
  
  // Return the last non-empty part (usually the city)
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i] && parts[i].length > 2) {
      return parts[i];
    }
  }
  
  return cleaned;
};

// Test the function with common location formats
export const testLocationCleaning = () => {
  const testLocations = [
    'M3HC+XXW, Watamu, Kenya',
    'Haile Selassie Ave, Nairobi, Kenya',
    'Near -1.2921, 36.8219',
    'Location (-1.2921, 36.8219)',
    'Nairobi',
    'Kisumu',
    'Mombasa, Kenya',
  ];
  
  console.log('Location cleaning test:');
  testLocations.forEach(loc => {
    console.log(`"${loc}" -> "${cleanLocationDisplay(loc)}"`);
  });
};
