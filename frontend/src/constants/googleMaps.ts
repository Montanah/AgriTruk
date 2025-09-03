import { EXPO_PUBLIC_GOOGLE_MAPS_API_KEY } from '@env';

// Google Maps API Configuration
export const GOOGLE_MAPS_CONFIG = {
  // Replace with your actual API key from Google Cloud Console
  API_KEY: EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY_HERE',

  // Default map settings
  DEFAULT_REGION: {
    latitude: -1.2921, // Nairobi, Kenya
    longitude: 36.8219,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },

  // Map styles
  MAP_STYLES: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],

  // Directions API settings
  DIRECTIONS_API: {
    language: 'en',
    units: 'metric',
    avoid: 'tolls',
  },

  // Places API settings
  PLACES_API: {
    types: ['establishment'],
    language: 'en',
  },

  // Geocoding API settings
  GEOCODING_API: {
    language: 'en',
    region: 'ke', // Kenya
  },
};

// API Endpoints
export const GOOGLE_MAPS_ENDPOINTS = {
  DIRECTIONS: 'https://maps.googleapis.com/maps/api/directions/json',
  GEOCODING: 'https://maps.googleapis.com/maps/api/geocode/json',
  PLACES_TEXT_SEARCH: 'https://maps.googleapis.com/maps/api/place/textsearch/json',
  PLACES_DETAILS: 'https://maps.googleapis.com/maps/api/place/details/json',
  PLACES_AUTOCOMPLETE: 'https://maps.googleapis.com/maps/api/place/autocomplete/json',
  DISTANCE_MATRIX: 'https://maps.googleapis.com/maps/api/distancematrix/json',
};

// Helper function to get API key
export const getGoogleMapsApiKey = () => {
  // In production, you should store this securely
  // For now, we'll use an environment variable or the config
  const apiKey = EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_CONFIG.API_KEY;

  // Better debugging
  if (apiKey && apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    console.log('🔑 Google Maps API Key loaded: ✅ Present');
    console.log('🔑 API Key preview:', apiKey.substring(0, 10) + '...');
  } else {
    console.log('🔑 Google Maps API Key loaded: ❌ Missing or Invalid');
    console.log('🔑 Environment variable:', EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);
    console.log('🔑 Config fallback:', GOOGLE_MAPS_CONFIG.API_KEY);
  }

  return apiKey;
};

// Helper function to build API URL with key
export const buildGoogleMapsUrl = (endpoint: string, params: Record<string, any>) => {
  const apiKey = getGoogleMapsApiKey();
  const queryString = new URLSearchParams({
    ...params,
    key: apiKey,
  }).toString();

  return `${endpoint}?${queryString}`;
};
