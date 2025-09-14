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
  
  // Coastal region (including the problematic coordinate)
  '-3.3199,40.0730': 'Malindi',
  '-3.2199,40.1230': 'Kilifi',
  '-2.5199,40.3230': 'Mtwapa',
  '-4.0437,39.6682': 'Mombasa Port',
  
  // Central region
  '-1.1921,36.7772': 'Thika',
  '-0.4167,36.9500': 'Nyeri',
  '-0.3667,36.0833': 'Nakuru',
  '-0.5167,36.1833': 'Naivasha',
  
  // Western region
  '0.2833,34.7500': 'Kakamega',
  '0.5167,35.2833': 'Eldoret',
  '0.0167,34.5833': 'Bungoma',
  
  // Eastern region
  '-0.5167,37.4500': 'Embu',
  '-0.4167,37.6667': 'Meru',
  '0.5167,37.4500': 'Isiolo',
  
  // Northern region
  '1.2833,36.8167': 'Garissa',
  '2.2833,37.9000': 'Wajir',
  '3.1167,35.6000': 'Lodwar',
  
  // Rift Valley
  '0.2833,35.2833': 'Kericho',
  '0.0167,35.2833': 'Bomet',
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
    
    // Try approximate matching with tolerance
    const lat = location.latitude;
    const lng = location.longitude;
    
    // Find the closest known location within reasonable distance
    let closestLocation = '';
    let minDistance = Infinity;
    
    for (const [coords, name] of Object.entries(KNOWN_LOCATIONS)) {
      const [knownLat, knownLng] = coords.split(',').map(Number);
      const distance = Math.sqrt(
        Math.pow(lat - knownLat, 2) + Math.pow(lng - knownLng, 2)
      );
      
      if (distance < minDistance && distance < 0.5) { // Within ~50km
        minDistance = distance;
        closestLocation = name;
      }
    }
    
    if (closestLocation) {
      return closestLocation;
    }
    
    // If no close match, try to determine region
    if (lat > 0.5) return 'Northern Kenya';
    if (lat < -3.5) return 'Coastal Kenya';
    if (lng > 37.5) return 'Eastern Kenya';
    if (lng < 34.5) return 'Western Kenya';
    if (lat > -1.5 && lat < 0.5 && lng > 35.5 && lng < 37.5) return 'Central Kenya';
    
    // Last resort - return a generic location name instead of coordinates
    return 'Kenya';
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
