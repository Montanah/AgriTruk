import { EXPO_PUBLIC_GOOGLE_MAPS_API_KEY } from '@env';
import { GOOGLE_MAPS_ENDPOINTS, buildGoogleMapsUrl } from '../constants/googleMaps';

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface Route {
  distance: string;
  duration: string;
  polyline: string;
  steps: RouteStep[];
}

export interface RouteStep {
  distance: string;
  duration: string;
  instruction: string;
  polyline: string;
}

export interface DistanceMatrixResult {
  origin: string;
  destination: string;
  distance: string;
  duration: string;
  status: string;
}

export interface Place {
  placeId: string;
  name: string;
  address: string;
  location: Location;
  types: string[];
  rating?: number;
  photos?: string[];
}

class GoogleMapsService {
  /**
   * Test if the API key is working
   */
  async testApiKey(): Promise<boolean> {
    try {
      console.log('🧪 Testing Google Maps API key...');

      // Try a simple geocoding request to test the API key
      const testParams = {
        address: 'Nairobi, Kenya',
        language: 'en',
        region: 'ke',
      };

      const url = buildGoogleMapsUrl(GOOGLE_MAPS_ENDPOINTS.GEOCODING, testParams);
      console.log('🧪 Test URL:', url);

      const response = await fetch(url);
      const data = await response.json();

      console.log('🧪 Test response:', data);

      if (data.status === 'OK') {
        console.log('✅ API key is working correctly');
        return true;
      } else {
        console.error('❌ API key test failed:', data.status, data.error_message);
        return false;
      }
    } catch (error) {
      console.error('❌ API key test error:', error);
      return false;
    }
  }

  /**
   * Get directions between two points
   */
  async getDirections(
    origin: Location | string,
    destination: Location | string,
    waypoints?: (Location | string)[],
    mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving',
  ): Promise<Route> {
    try {
      const originStr =
        typeof origin === 'string' ? origin : `${origin.latitude},${origin.longitude}`;
      const destinationStr =
        typeof destination === 'string'
          ? destination
          : `${destination.latitude},${destination.longitude}`;

      const params: Record<string, any> = {
        origin: originStr,
        destination: destinationStr,
        mode,
        units: 'metric',
        language: 'en',
      };

      if (waypoints && waypoints.length > 0) {
        params.waypoints = waypoints
          .map((wp) => (typeof wp === 'string' ? wp : `${wp.latitude},${wp.longitude}`))
          .join('|');
      }

      const url = buildGoogleMapsUrl(GOOGLE_MAPS_ENDPOINTS.DIRECTIONS, params);
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Directions API error: ${data.status}`);
      }

      const route = data.routes[0];
      const leg = route.legs[0];

      return {
        distance: leg.distance.text,
        duration: leg.duration.text,
        polyline: route.overview_polyline.points,
        steps: leg.steps.map((step: any) => ({
          distance: step.distance.text,
          duration: step.duration.text,
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
          polyline: step.polyline.points,
        })),
      };
    } catch (error) {
      console.error('Error getting directions:', error);
      throw error;
    }
  }

  /**
   * Get distance and duration between multiple origins and destinations
   */
  async getDistanceMatrix(
    origins: (Location | string)[],
    destinations: (Location | string)[],
    mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving',
  ): Promise<DistanceMatrixResult[]> {
    try {
      const originsStr = origins
        .map((origin) =>
          typeof origin === 'string' ? origin : `${origin.latitude},${origin.longitude}`,
        )
        .join('|');

      const destinationsStr = destinations
        .map((dest) => (typeof dest === 'string' ? dest : `${dest.latitude},${dest.longitude}`))
        .join('|');

      const params = {
        origins: originsStr,
        destinations: destinationsStr,
        mode,
        units: 'metric',
        language: 'en',
      };

      const url = buildGoogleMapsUrl(GOOGLE_MAPS_ENDPOINTS.DISTANCE_MATRIX, params);
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Distance Matrix API error: ${data.status}`);
      }

      const results: DistanceMatrixResult[] = [];

      data.rows.forEach((row: any, rowIndex: number) => {
        row.elements.forEach((element: any, elementIndex: number) => {
          if (element.status === 'OK') {
            results.push({
              origin: data.origin_addresses[rowIndex],
              destination: data.destination_addresses[elementIndex],
              distance: element.distance.text,
              duration: element.duration.text,
              status: element.status,
            });
          }
        });
      });

      return results;
    } catch (error) {
      console.error('Error getting distance matrix:', error);
      throw error;
    }
  }

  /**
   * Geocode an address to coordinates
   */
  async geocodeAddress(address: string): Promise<Location> {
    try {
      const params = {
        address,
        language: 'en',
        region: 'ke',
      };

      const url = buildGoogleMapsUrl(GOOGLE_MAPS_ENDPOINTS.GEOCODING, params);
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' || data.results.length === 0) {
        throw new Error(`Geocoding API error: ${data.status}`);
      }

      const result = data.results[0];
      const location = result.geometry.location;

      return {
        latitude: location.lat,
        longitude: location.lng,
        address: result.formatted_address,
      };
    } catch (error) {
      console.error('Error geocoding address:', error);
      throw error;
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(location: Location): Promise<string> {
    try {
      const params = {
        latlng: `${location.latitude},${location.longitude}`,
        language: 'en',
        region: 'ke',
      };

      const url = buildGoogleMapsUrl(GOOGLE_MAPS_ENDPOINTS.GEOCODING, params);
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        // Log detailed error information
        console.error('🔍 Reverse Geocoding API error details:', {
          status: data.status,
          error_message: data.error_message,
          status_code: data.status_code,
          url: url,
        });

        // Don't treat ZERO_RESULTS as an error - it's a normal response
        if (data.status === 'ZERO_RESULTS') {
          console.log('🔍 No address found for coordinates:', location);
          return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
        }

        throw new Error(
          `Reverse geocoding API error: ${data.status}${data.error_message ? ` - ${data.error_message}` : ''}`,
        );
      }

      if (data.results.length === 0) {
        console.log('🔍 No results from reverse geocoding for coordinates:', location);
        return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
      }

      return data.results[0].formatted_address;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      throw error;
    }
  }

  /**
   * Search for places using Google Places API
   */
  async searchPlaces(
    query: string,
    location?: Location,
    radius: number = 5000,
    types?: string[],
  ): Promise<Place[]> {
    try {
      const params: Record<string, any> = {
        query,
        language: 'en',
        region: 'ke',
      };

      if (location) {
        params.location = `${location.latitude},${location.longitude}`;
        params.radius = radius;
      }

      if (types && types.length > 0) {
        params.types = types.join('|');
      }

      const url = buildGoogleMapsUrl(GOOGLE_MAPS_ENDPOINTS.PLACES_TEXT_SEARCH, params);
      console.log('🔍 Searching places with URL:', url);

      const response = await fetch(url);
      const data = await response.json();

      console.log('🔍 Places API response status:', data.status);
      console.log('🔍 Places API response data:', data);

      if (data.status === 'OK' && data.results) {
        return data.results.map((place: any) => ({
          placeId: place.place_id,
          name: place.name,
          address: place.formatted_address,
          location: {
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
          },
          types: place.types || [],
          rating: place.rating,
          photos: place.photos?.map((photo: any) => photo.photo_reference) || [],
        }));
      } else if (data.status === 'ZERO_RESULTS') {
        console.log('🔍 No places found for query:', query);
        return [];
      } else {
        console.error('🔍 Places API error:', data.status, data.error_message);
        throw new Error(`Places API error: ${data.status} - ${data.error_message}`);
      }
    } catch (error: any) {
      console.error('🔍 Error searching places:', error);
      throw error;
    }
  }

  /**
   * Get place details
   */
  async getPlaceDetails(placeId: string): Promise<Place> {
    try {
      const params = {
        place_id: placeId,
        fields: 'place_id,name,formatted_address,geometry,types,rating,photos',
        language: 'en',
      };

      const url = buildGoogleMapsUrl(GOOGLE_MAPS_ENDPOINTS.PLACES_DETAILS, params);
      console.log('🔍 Getting place details with URL:', url);

      const response = await fetch(url);
      const data = await response.json();

      console.log('🔍 Place details API response:', data);

      if (data.status !== 'OK') {
        throw new Error(`Place Details API error: ${data.status}`);
      }

      const place = data.result;
      return {
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        location: {
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
        },
        types: place.types,
        rating: place.rating,
        photos: place.photos?.map(
          (photo: any) =>
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}`,
        ),
      };
    } catch (error) {
      console.error('Error getting place details:', error);
      throw error;
    }
  }

  /**
   * Get place autocomplete suggestions
   */
  async getPlaceAutocomplete(
    input: string,
    location?: Location,
    radius: number = 5000,
    types?: string[],
  ): Promise<Place[]> {
    try {
      const params: Record<string, any> = {
        input,
        language: 'en',
        region: 'ke',
      };

      if (location) {
        params.location = `${location.latitude},${location.longitude}`;
        params.radius = radius;
      }

      if (types && types.length > 0) {
        params.types = types.join('|');
      }

      const url = buildGoogleMapsUrl(GOOGLE_MAPS_ENDPOINTS.PLACES_AUTOCOMPLETE, params);
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Places Autocomplete API error: ${data.status}`);
      }

      return data.predictions.map((prediction: any) => ({
        placeId: prediction.place_id,
        name: prediction.structured_formatting?.main_text || prediction.description,
        address: prediction.description,
        location: { latitude: 0, longitude: 0 }, // Will be filled when place details are fetched
        types: prediction.types || [],
      }));
    } catch (error) {
      console.error('Error getting place autocomplete:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(point1: Location, point2: Location): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) *
        Math.cos(this.toRadians(point2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const googleMapsService = new GoogleMapsService();
