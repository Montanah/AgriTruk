// Location utilities for converting coordinates to place names
import { API_ENDPOINTS } from '../constants/api';

interface Location {
  latitude: number | string;
  longitude: number | string;
}

interface PlaceName {
  name: string;
  address: string;
  city?: string;
  country?: string;
}

// Cache for location names to avoid repeated API calls
const locationCache = new Map<string, PlaceName>();

export const convertCoordinatesToPlaceName = async (location: Location): Promise<string> => {
  // Convert to numbers if they're strings
  const lat = typeof location.latitude === 'string' ? parseFloat(location.latitude) : location.latitude;
  const lng = typeof location.longitude === 'string' ? parseFloat(location.longitude) : location.longitude;
  
  // Check if conversion was successful
  if (isNaN(lat) || isNaN(lng)) {
    console.warn('Invalid coordinates:', { latitude: location.latitude, longitude: location.longitude });
    return 'Invalid coordinates';
  }
  
  const cacheKey = `${lat},${lng}`;
  
  console.log('Converting coordinates to place name:', { latitude: lat, longitude: lng });
  
  // Check cache first
  if (locationCache.has(cacheKey)) {
    const cached = locationCache.get(cacheKey)!;
    console.log('Using cached location name:', cached.name);
    return cached.name || cached.address;
  }

  try {
    // Use Google Maps Geocoding API
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyCXdOCFJZUxcJMDn7Alip-JfIgOrHpT_Q4";
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log('Geocoding API response:', data);
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const placeName: PlaceName = {
          name: result.formatted_address,
          address: result.formatted_address,
          city: result.address_components?.find((component: any) => 
            component.types.includes('locality')
          )?.long_name,
          country: result.address_components?.find((component: any) => 
            component.types.includes('country')
          )?.long_name,
        };
        
        // Cache the result
        locationCache.set(cacheKey, placeName);
        
        return placeName.name;
      }
    }
  } catch (error) {
    console.error('Error converting coordinates to place name:', error);
  }

  // Fallback: return a more user-friendly format
  console.warn('Geocoding failed, using fallback format');
  return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
};

export const convertCoordinatesArrayToPlaceNames = async (locations: Location[]): Promise<string[]> => {
  const promises = locations.map(location => convertCoordinatesToPlaceName(location));
  return Promise.all(promises);
};

// Helper function to get a short location name (city, area)
export const getShortLocationName = async (location: Location): Promise<string> => {
  // Convert to numbers if they're strings
  const lat = typeof location.latitude === 'string' ? parseFloat(location.latitude) : location.latitude;
  const lng = typeof location.longitude === 'string' ? parseFloat(location.longitude) : location.longitude;
  
  // Check if conversion was successful
  if (isNaN(lat) || isNaN(lng)) {
    console.warn('Invalid coordinates:', { latitude: location.latitude, longitude: location.longitude });
    return 'Invalid coordinates';
  }
  
  const cacheKey = `${lat},${lng}`;
  
  // Check cache first
  if (locationCache.has(cacheKey)) {
    const cached = locationCache.get(cacheKey)!;
    return cached.city || cached.name || cached.address;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}`
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log('Geocoding API response:', data);
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const city = result.address_components?.find((component: any) => 
          component.types.includes('locality')
        )?.long_name;
        
        const area = result.address_components?.find((component: any) => 
          component.types.includes('sublocality') || component.types.includes('neighborhood')
        )?.long_name;
        
        const placeName: PlaceName = {
          name: city || area || result.formatted_address,
          address: result.formatted_address,
          city,
          country: result.address_components?.find((component: any) => 
            component.types.includes('country')
          )?.long_name,
        };
        
        // Cache the result
        locationCache.set(cacheKey, placeName);
        
        return placeName.name;
      }
    }
  } catch (error) {
    console.error('Error getting short location name:', error);
  }

  // Fallback: return coordinates if geocoding fails
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
};

// Helper function to format location for display
export const formatLocationForDisplay = (location: Location | string): string => {
  if (typeof location === 'string') {
    return location;
  }
  
  // Handle cases where latitude/longitude might be strings or undefined
  if (!location || typeof location.latitude === 'undefined' || typeof location.longitude === 'undefined') {
    return 'Unknown location';
  }
  
  // Check if location has an address field first
  if ((location as any).address) {
    return (location as any).address;
  }
  
  // Convert to numbers if they're strings
  const lat = typeof location.latitude === 'string' ? parseFloat(location.latitude) : location.latitude;
  const lng = typeof location.longitude === 'string' ? parseFloat(location.longitude) : location.longitude;
  
  // Check if conversion was successful
  if (isNaN(lat) || isNaN(lng)) {
    return 'Invalid coordinates';
  }
  
  // Try to get a short location name asynchronously
  // For now, return coordinates as fallback
  // In a real app, you'd want to use the geocoding functions above
  return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
};

// Helper function to get distance between two locations
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

// Helper function to format distance
export const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
};