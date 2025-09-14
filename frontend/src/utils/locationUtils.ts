// Utility functions for location handling

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface CoordinateLocation {
  latitude: number;
  longitude: number;
}

// Known locations mapping for better UX
const KNOWN_LOCATIONS: { [key: string]: string } = {
  // Kenya major cities
  '-0.0917016,34.7679568': 'Kisumu',
  '-1.2920659,36.8219462': 'Nairobi',
  '-4.0437401,39.6682065': 'Mombasa',
  '0.3475964,32.5825197': 'Kampala',
  '-1.9440727,30.0618851': 'Kigali',
  '-6.792354,39.2083284': 'Dar es Salaam',
  '0.3136111,32.5811111': 'Entebbe',
  '-0.023559,37.906193': 'Nakuru',
  '0.4244,33.2042': 'Jinja',
  '0.3163,32.5822': 'Wakiso',
  // Add more known locations as needed
};

/**
 * Converts coordinates to a readable location name
 * @param location - Can be a coordinate object, address string, or coordinate string
 * @returns Readable location name
 */
export function getReadableLocationName(location: any): string {
  if (!location) return 'Unknown Location';
  
  // If it's already a string (address), return it
  if (typeof location === 'string') {
    return location;
  }
  
  // If it's a coordinate object
  if (typeof location === 'object' && location.latitude && location.longitude) {
    // First check if it has an address property
    if (location.address) {
      return location.address;
    }
    
    // Create coordinate string and check known locations
    const coordString = `${location.latitude},${location.longitude}`;
    if (KNOWN_LOCATIONS[coordString]) {
      return KNOWN_LOCATIONS[coordString];
    }
    
    // If no known location, return formatted coordinates
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  }
  
  return 'Unknown Location';
}

/**
 * Formats a route display (from -> to)
 * @param fromLocation - Starting location
 * @param toLocation - Destination location
 * @returns Formatted route string
 */
export function formatRoute(fromLocation: any, toLocation: any): string {
  const from = getReadableLocationName(fromLocation);
  const to = getReadableLocationName(toLocation);
  return `${from} → ${to}`;
}

/**
 * Gets location coordinates for backend processing
 * @param location - Location data
 * @returns Coordinate object or null
 */
export function getLocationCoordinates(location: any): CoordinateLocation | null {
  if (!location) return null;
  
  if (typeof location === 'object' && location.latitude && location.longitude) {
    return {
      latitude: location.latitude,
      longitude: location.longitude
    };
  }
  
  return null;
}

/**
 * Gets location address for display
 * @param location - Location data
 * @returns Address string
 */
export function getLocationAddress(location: any): string {
  if (!location) return '';
  
  if (typeof location === 'string') {
    return location;
  }
  
  if (typeof location === 'object' && location.address) {
    return location.address;
  }
  
  return '';
}
