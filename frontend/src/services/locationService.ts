import * as Location from 'expo-location';
import { API_ENDPOINTS } from '../constants/api';

interface LocationUpdate {
  latitude: number;
  longitude: number;
  timestamp: number;
}

class LocationService {
  private watchId: Location.LocationSubscription | null = null;
  private isTracking = false;
  private updateInterval = 30000; // 30 seconds
  private lastUpdate = 0;
  private minDistanceInterval = 100; // 100 meters
  private onLocationUpdateCallback?: (location: LocationUpdate) => void;

  /**
   * Start automatic location tracking for transporters
   */
  async startLocationTracking(): Promise<boolean> {
    try {
      console.log('Starting location tracking...');

      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Location permission denied');
        return false;
      }

      // Request background permissions for continuous tracking
      const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus.status !== 'granted') {
        console.warn('Background location permission denied - tracking may be limited');
      }

      // Start watching location
      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: this.updateInterval,
          distanceInterval: this.minDistanceInterval,
        },
        (location) => this.handleLocationUpdate(location),
      );

      this.isTracking = true;
      console.log('Location tracking started successfully');
      return true;
    } catch (error) {
      console.error('Failed to start location tracking:', error);
      return false;
    }
  }

  /**
   * Stop location tracking
   */
  async stopLocationTracking(): Promise<void> {
    try {
      if (this.watchId) {
        this.watchId.remove();
        this.watchId = null;
      }
      this.isTracking = false;
      console.log('Location tracking stopped');
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  }

  /**
   * Get current location once
   */
  async getCurrentLocation(): Promise<LocationUpdate | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Set callback for location updates
   */
  setLocationUpdateCallback(callback: (location: LocationUpdate) => void): void {
    this.onLocationUpdateCallback = callback;
  }

  /**
   * Check if location tracking is active
   */
  isLocationTrackingActive(): boolean {
    return this.isTracking;
  }

  /**
   * Update location tracking settings
   */
  updateSettings(settings: { updateInterval?: number; minDistanceInterval?: number }): void {
    if (settings.updateInterval) {
      this.updateInterval = settings.updateInterval;
    }
    if (settings.minDistanceInterval) {
      this.minDistanceInterval = settings.minDistanceInterval;
    }
  }

  /**
   * Handle location updates from the device
   */
  private async handleLocationUpdate(location: Location.LocationObject): Promise<void> {
    const now = Date.now();

    // Throttle updates to prevent excessive API calls
    if (now - this.lastUpdate < this.updateInterval) {
      return;
    }

    const locationUpdate: LocationUpdate = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: now,
    };

    // Call the callback if set
    if (this.onLocationUpdateCallback) {
      this.onLocationUpdateCallback(locationUpdate);
    }

    // Update transporter location on backend
    await this.updateTransporterLocation(locationUpdate);
  }

  /**
   * Update transporter location on the backend
   */
  private async updateTransporterLocation(location: LocationUpdate): Promise<void> {
    try {
      const token = await this.getAuthToken();

      const requestData = {
        latitude: location.latitude,
        longitude: location.longitude,
      };

      console.log('='.repeat(80));
      console.log('🚀 LOCATION UPDATE REQUEST FOR BACKEND ENGINEER');
      console.log('='.repeat(80));
      console.log('📍 Endpoint:', API_ENDPOINTS.TRANSPORTERS + '/update-location');
      console.log('📋 Method: POST');
      console.log('⏰ Request Timestamp:', new Date().toISOString());
      console.log('🔑 Auth Token Present:', token ? 'YES' : 'NO');
      if (token) {
        console.log('🔑 Token Preview:', `${token.substring(0, 30)}...`);
      }
      console.log('👤 User UID:', user?.uid || 'No user');
      console.log('📦 Request Body:', JSON.stringify(requestData, null, 2));
      console.log('='.repeat(80));

      const response = await fetch(API_ENDPOINTS.TRANSPORTERS + '/update-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });

      console.log('='.repeat(80));
      console.log('📊 LOCATION UPDATE RESPONSE FOR BACKEND ENGINEER');
      console.log('='.repeat(80));
      console.log('📍 Endpoint:', API_ENDPOINTS.TRANSPORTERS + '/update-location');
      console.log(`📋 Response Status: ${response.status} ${response.statusText}`);
      console.log('⏰ Response Timestamp:', new Date().toISOString());
      console.log(
        '📋 Response Headers:',
        JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2),
      );

      if (response.ok) {
        this.lastUpdate = location.timestamp;
        const responseData = await response.json();
        console.log('✅ Location updated successfully on backend');
        console.log('📦 Response Data:', JSON.stringify(responseData, null, 2));
      } else {
        const errorData = await response.json();
        console.log('❌ Failed to update location on backend');
        console.log('📦 Error Response Data:', JSON.stringify(errorData, null, 2));
      }
      console.log('='.repeat(80));
    } catch (error) {
      console.error('Location update error:', error);
    }
  }

  /**
   * Get Firebase authentication token
   */
  private async getAuthToken(): Promise<string> {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error('User not authenticated');
      }

      return await user.getIdToken();
    } catch (error) {
      console.error('Error getting auth token:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two points
   */
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export default new LocationService();
