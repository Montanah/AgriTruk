/**
 * Simple Location Display Utility
 * Converts coordinates to readable place names using Google Maps Geocoding API
 */

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  formattedAddress?: string;
  placeName?: string;
  city?: string;
  country?: string;
}

interface GeocodingResult {
  formatted_address: string;
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

class LocationDisplayService {
  private cache = new Map<string, string>();
  private pendingRequests = new Map<string, Promise<string>>();

  /**
   * Get readable location name from various input formats
   */
  async getLocationName(location: any): Promise<string> {
    if (!location) return 'Unknown Location';

    // Handle string input
    if (typeof location === 'string') {
      // If it's already a readable string, return it
      if (!this.isCoordinateString(location)) {
        return location;
      }
      // If it's a coordinate string, parse it
      const coords = this.parseCoordinateString(location);
      if (coords) {
        return this.getLocationNameFromCoords(coords.latitude, coords.longitude);
      }
      return location;
    }

    // Handle object input
    if (typeof location === 'object') {
      // If it has coordinates, geocode them first (this takes priority)
      if (location.latitude && location.longitude) {
        return this.getLocationNameFromCoords(location.latitude, location.longitude);
      }
      
      // If it already has readable text (not coordinates), use it
      if (location.address && !this.isCoordinateString(location.address)) return location.address;
      if (location.formattedAddress && !this.isCoordinateString(location.formattedAddress)) return location.formattedAddress;
      if (location.placeName) return location.placeName;
      if (location.city) return location.city;
      
      // If address contains coordinates, process them
      if (location.address && this.isCoordinateString(location.address)) {
        const coords = this.parseCoordinateString(location.address);
        if (coords) {
          return this.getLocationNameFromCoords(coords.latitude, coords.longitude);
        }
      }
    }

    return 'Unknown Location';
  }

  /**
   * Get location name from coordinates using Google Maps Geocoding
   */
  private async getLocationNameFromCoords(latitude: number, longitude: number): Promise<string> {
    const cacheKey = `${latitude},${longitude}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    // Create new request
    const request = this.geocodeCoordinates(latitude, longitude);
    this.pendingRequests.set(cacheKey, request);

    try {
      const result = await request;
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Geocoding error:', error);
      return `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Geocode coordinates using Google Maps API
   */
  private async geocodeCoordinates(latitude: number, longitude: number): Promise<string> {
    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyCXdOCFJZUxcJMDn7Alip-JfIgOrHpT_Q4';
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0] as GeocodingResult;
        return this.formatAddress(result);
      }

      return `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
    } catch (error) {
      console.error('Geocoding API error:', error);
      return `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
    }
  }

  /**
   * Format geocoding result into readable address
   */
  private formatAddress(result: GeocodingResult): string {
    // Try to get a concise, readable address
    const components = result.address_components;
    
    // Look for locality, administrative_area_level_1, and country
    let city = '';
    let state = '';
    let country = '';

    for (const component of components) {
      if (component.types.includes('locality')) {
        city = component.long_name;
      } else if (component.types.includes('administrative_area_level_1')) {
        state = component.long_name;
      } else if (component.types.includes('country')) {
        country = component.long_name;
      }
    }

    // Build readable address
    if (city && state) {
      return `${city}, ${state}`;
    } else if (city) {
      return city;
    } else if (state) {
      return state;
    } else {
      return result.formatted_address;
    }
  }

  /**
   * Check if string is a coordinate string
   */
  private isCoordinateString(str: string): boolean {
    // Match simple coordinates like "-1.2921, 36.8219"
    const simpleCoordPattern = /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/;
    // Match "Location (lat, lng)" format (including truncated with ...)
    const locationCoordPattern = /^Location\s*\([-+]?\d+\.?\d*,\s*[-+]?\d+\.?\d*[.)]/;
    return simpleCoordPattern.test(str.trim()) || locationCoordPattern.test(str.trim());
  }

  /**
   * Parse coordinate string into lat/lng
   */
  private parseCoordinateString(str: string): { latitude: number; longitude: number } | null {
    // Handle "Location (lat, lng)" format (including truncated with ...)
    const locationMatch = str.match(/Location\s*\(([^,]+),\s*([^.)]+)/);
    if (locationMatch) {
      const lat = parseFloat(locationMatch[1]);
      const lng = parseFloat(locationMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
    
    // Handle simple "lat, lng" format
    const coords = str.split(',').map(coord => parseFloat(coord.trim()));
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      return { latitude: coords[0], longitude: coords[1] };
    }
    return null;
  }

  /**
   * Synchronous fallback for location display
   */
  getLocationNameSync(location: any): string {
    if (!location) return 'Unknown Location';

    if (typeof location === 'string') {
      if (!this.isCoordinateString(location)) {
        return location;
      }
      return location; // Return coordinate string as fallback
    }

    if (typeof location === 'object') {
      if (location.address) return location.address;
      if (location.formattedAddress) return location.formattedAddress;
      if (location.placeName) return location.placeName;
      if (location.city) return location.city;
      if (location.latitude && location.longitude) {
        return `Location (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`;
      }
    }

    return 'Unknown Location';
  }

  /**
   * Format route from two locations
   */
  async formatRoute(fromLocation: any, toLocation: any): Promise<string> {
    const from = await this.getLocationName(fromLocation);
    const to = await this.getLocationName(toLocation);
    return `${from} → ${to}`;
  }

  /**
   * Synchronous route formatting
   */
  formatRouteSync(fromLocation: any, toLocation: any): string {
    const from = this.getLocationNameSync(fromLocation);
    const to = this.getLocationNameSync(toLocation);
    return `${from} → ${to}`;
  }
}

// Export singleton instance
export const locationDisplay = new LocationDisplayService();

// Export convenience functions
export const getLocationName = (location: any) => locationDisplay.getLocationName(location);
export const getLocationNameSync = (location: any) => locationDisplay.getLocationNameSync(location);
export const formatRoute = (from: any, to: any) => locationDisplay.formatRoute(from, to);
export const formatRouteSync = (from: any, to: any) => locationDisplay.formatRouteSync(from, to);