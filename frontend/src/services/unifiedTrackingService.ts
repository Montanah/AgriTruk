/**
 * Unified Real-Time Tracking Service
 * Provides consistent real-time tracking across all user roles
 */

import { API_ENDPOINTS } from '../constants/api';
import { getAuth } from 'firebase/auth';
import { unifiedBookingService, UnifiedBooking, LocationData } from './unifiedBookingService';

export interface TrackingUpdate {
  bookingId: string;
  location: LocationData;
  status: string;
  timestamp: string;
  speed?: number;
  heading?: number;
  accuracy?: number;
}

export interface RouteDeviation {
  bookingId: string;
  originalRoute: LocationData[];
  currentRoute: LocationData[];
  deviation: {
    distance: number; // in meters
    reason: string;
    severity: 'low' | 'medium' | 'high';
  };
  timestamp: string;
}

export interface TrafficAlert {
  bookingId: string;
  type: 'congestion' | 'accident' | 'road_closure' | 'weather' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  location: LocationData;
  estimatedDelay: number; // in minutes
  timestamp: string;
  alternativeRoutes?: LocationData[][];
}

export interface TrackingData {
  bookingId: string;
  currentLocation: LocationData;
  status: string;
  lastUpdate: string;
  estimatedArrival: string;
  route: LocationData[];
  progress: {
    percentage: number;
    distanceRemaining: number; // in km
    timeRemaining: number; // in minutes
  };
  deviations: RouteDeviation[];
  trafficAlerts: TrafficAlert[];
  isActive: boolean;
}

type TrackingCallback = (data: TrackingData) => void;
type LocationCallback = (location: LocationData) => void;
type DeviationCallback = (deviation: RouteDeviation) => void;
type TrafficCallback = (alert: TrafficAlert) => void;

class UnifiedTrackingService {
  private static instance: UnifiedTrackingService;
  private trackingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private callbacks: Map<string, {
    onLocationUpdate?: LocationCallback;
    onStatusUpdate?: TrackingCallback;
    onRouteDeviation?: DeviationCallback;
    onTrafficAlert?: TrafficCallback;
  }> = new Map();
  private activeTrackings: Set<string> = new Set();

  static getInstance(): UnifiedTrackingService {
    if (!UnifiedTrackingService.instance) {
      UnifiedTrackingService.instance = new UnifiedTrackingService();
    }
    return UnifiedTrackingService.instance;
  }

  /**
   * Get authentication token
   */
  private async getAuthToken(): Promise<string> {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    return await user.getIdToken();
  }

  /**
   * Start real-time tracking for a booking
   */
  async startTracking(
    bookingId: string,
    callbacks?: {
      onLocationUpdate?: LocationCallback;
      onStatusUpdate?: TrackingCallback;
      onRouteDeviation?: DeviationCallback;
      onTrafficAlert?: TrafficCallback;
    }
  ): Promise<boolean> {
    try {
      if (this.activeTrackings.has(bookingId)) {
        console.log(`Tracking already active for booking ${bookingId}`);
        return true;
      }

      // Store callbacks
      if (callbacks) {
        this.callbacks.set(bookingId, callbacks);
      }

      // Start tracking interval
      const interval = setInterval(async () => {
        await this.updateTracking(bookingId);
      }, 10000); // Update every 10 seconds

      this.trackingIntervals.set(bookingId, interval);
      this.activeTrackings.add(bookingId);

      // Initial tracking data fetch
      await this.updateTracking(bookingId);

      console.log(`Started tracking for booking ${bookingId}`);
      return true;
    } catch (error) {
      console.error('Error starting tracking:', error);
      return false;
    }
  }

  /**
   * Stop real-time tracking for a booking
   */
  stopTracking(bookingId: string): void {
    const interval = this.trackingIntervals.get(bookingId);
    if (interval) {
      clearInterval(interval);
      this.trackingIntervals.delete(bookingId);
    }
    
    this.activeTrackings.delete(bookingId);
    this.callbacks.delete(bookingId);
    
    console.log(`Stopped tracking for booking ${bookingId}`);
  }

  /**
   * Update tracking data for a booking
   */
  private async updateTracking(bookingId: string): Promise<void> {
    try {
      const trackingData = await this.getTrackingData(bookingId);
      if (!trackingData) return;

      const callbacks = this.callbacks.get(bookingId);
      if (callbacks) {
        // Notify location update
        if (callbacks.onLocationUpdate && trackingData.currentLocation) {
          callbacks.onLocationUpdate(trackingData.currentLocation);
        }

        // Notify status update
        if (callbacks.onStatusUpdate) {
          callbacks.onStatusUpdate(trackingData);
        }

        // Notify route deviations
        if (callbacks.onRouteDeviation && trackingData.deviations.length > 0) {
          trackingData.deviations.forEach(deviation => {
            callbacks.onRouteDeviation(deviation);
          });
        }

        // Notify traffic alerts
        if (callbacks.onTrafficAlert && trackingData.trafficAlerts.length > 0) {
          trackingData.trafficAlerts.forEach(alert => {
            callbacks.onTrafficAlert(alert);
          });
        }
      }
    } catch (error) {
      console.error(`Error updating tracking for booking ${bookingId}:`, error);
    }
  }

  /**
   * Get current tracking data for a booking
   */
  async getTrackingData(bookingId: string): Promise<TrackingData | null> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${bookingId}/tracking`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tracking data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.normalizeTrackingData(data);
    } catch (error) {
      console.error('Error fetching tracking data:', error);
      return null;
    }
  }

  /**
   * Send location update (for transporters/drivers)
   */
  async sendLocationUpdate(
    bookingId: string,
    location: LocationData,
    metadata?: {
      speed?: number;
      heading?: number;
      accuracy?: number;
    }
  ): Promise<boolean> {
    try {
      const token = await this.getAuthToken();
      
      const update: TrackingUpdate = {
        bookingId,
        location,
        timestamp: new Date().toISOString(),
        ...metadata,
      };

      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${bookingId}/location`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(update),
      });

      if (!response.ok) {
        throw new Error(`Failed to send location update: ${response.status} ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error sending location update:', error);
      return false;
    }
  }

  /**
   * Update booking status with location context
   */
  async updateStatusWithLocation(
    bookingId: string,
    status: string,
    location?: LocationData,
    message?: string
  ): Promise<boolean> {
    try {
      const token = await this.getAuthToken();
      
      const payload: any = {
        status,
        message,
        timestamp: new Date().toISOString(),
      };

      if (location) {
        payload.location = location;
      }

      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.status} ${response.statusText}`);
      }

      // Trigger tracking update
      await this.updateTracking(bookingId);

      return true;
    } catch (error) {
      console.error('Error updating status with location:', error);
      return false;
    }
  }

  /**
   * Get traffic conditions for a route
   */
  async getTrafficConditions(
    fromLocation: LocationData,
    toLocation: LocationData
  ): Promise<TrafficAlert[]> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${API_ENDPOINTS.TRAFFIC}/conditions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromLocation,
          to: toLocation,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch traffic conditions: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.alerts || [];
    } catch (error) {
      console.error('Error fetching traffic conditions:', error);
      return [];
    }
  }

  /**
   * Get alternative routes
   */
  async getAlternativeRoutes(
    fromLocation: LocationData,
    toLocation: LocationData,
    avoidTraffic: boolean = true
  ): Promise<LocationData[][]> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${API_ENDPOINTS.TRAFFIC}/routes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromLocation,
          to: toLocation,
          avoidTraffic,
          alternatives: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch alternative routes: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.routes || [];
    } catch (error) {
      console.error('Error fetching alternative routes:', error);
      return [];
    }
  }

  /**
   * Calculate distance between two locations
   */
  calculateDistance(location1: LocationData, location2: LocationData): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(location2.latitude - location1.latitude);
    const dLon = this.deg2rad(location2.longitude - location1.longitude);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(location1.latitude)) * Math.cos(this.deg2rad(location2.latitude)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  /**
   * Calculate estimated time of arrival
   */
  calculateETA(
    currentLocation: LocationData,
    destination: LocationData,
    averageSpeed: number = 50 // km/h
  ): number {
    const distance = this.calculateDistance(currentLocation, destination);
    return Math.round((distance / averageSpeed) * 60); // in minutes
  }

  /**
   * Check if location is on route
   */
  isLocationOnRoute(
    location: LocationData,
    route: LocationData[],
    tolerance: number = 0.5 // km
  ): boolean {
    for (let i = 0; i < route.length - 1; i++) {
      const segmentStart = route[i];
      const segmentEnd = route[i + 1];
      
      // Calculate distance from point to line segment
      const distance = this.distanceToLineSegment(location, segmentStart, segmentEnd);
      
      if (distance <= tolerance) {
        return true;
      }
    }
    return false;
  }

  /**
   * Calculate distance from point to line segment
   */
  private distanceToLineSegment(
    point: LocationData,
    lineStart: LocationData,
    lineEnd: LocationData
  ): number {
    const A = point.latitude - lineStart.latitude;
    const B = point.longitude - lineStart.longitude;
    const C = lineEnd.latitude - lineStart.latitude;
    const D = lineEnd.longitude - lineStart.longitude;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = lineStart.latitude;
      yy = lineStart.longitude;
    } else if (param > 1) {
      xx = lineEnd.latitude;
      yy = lineEnd.longitude;
    } else {
      xx = lineStart.latitude + param * C;
      yy = lineStart.longitude + param * D;
    }

    const dx = point.latitude - xx;
    const dy = point.longitude - yy;
    return Math.sqrt(dx * dx + dy * dy) * 111; // Convert to km (rough approximation)
  }

  /**
   * Convert degrees to radians
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  /**
   * Normalize tracking data from API response
   */
  private normalizeTrackingData(data: any): TrackingData {
    return {
      bookingId: data.bookingId || data.id,
      currentLocation: this.normalizeLocation(data.currentLocation || data.location),
      status: data.status || 'unknown',
      lastUpdate: data.lastUpdate || data.timestamp || new Date().toISOString(),
      estimatedArrival: data.estimatedArrival || data.eta || 'Unknown',
      route: (data.route || []).map((point: any) => this.normalizeLocation(point)),
      progress: {
        percentage: data.progress?.percentage || 0,
        distanceRemaining: data.progress?.distanceRemaining || 0,
        timeRemaining: data.progress?.timeRemaining || 0,
      },
      deviations: (data.deviations || []).map((dev: any) => ({
        bookingId: data.bookingId || data.id,
        originalRoute: (dev.originalRoute || []).map((point: any) => this.normalizeLocation(point)),
        currentRoute: (dev.currentRoute || []).map((point: any) => this.normalizeLocation(point)),
        deviation: {
          distance: dev.deviation?.distance || 0,
          reason: dev.deviation?.reason || 'Unknown',
          severity: dev.deviation?.severity || 'low',
        },
        timestamp: dev.timestamp || new Date().toISOString(),
      })),
      trafficAlerts: (data.trafficAlerts || []).map((alert: any) => ({
        bookingId: data.bookingId || data.id,
        type: alert.type || 'other',
        severity: alert.severity || 'low',
        message: alert.message || 'Traffic alert',
        location: this.normalizeLocation(alert.location),
        estimatedDelay: alert.estimatedDelay || 0,
        timestamp: alert.timestamp || new Date().toISOString(),
        alternativeRoutes: alert.alternativeRoutes || [],
      })),
      isActive: data.isActive || false,
    };
  }

  /**
   * Normalize location data
   */
  private normalizeLocation(location: any): LocationData {
    if (typeof location === 'string') {
      return {
        latitude: 0,
        longitude: 0,
        address: location,
      };
    }
    
    if (location && typeof location === 'object') {
      return {
        latitude: location.latitude || location.lat || 0,
        longitude: location.longitude || location.lng || location.lon || 0,
        address: location.address || location.name || 'Unknown Location',
        city: location.city,
        region: location.region || location.state,
        country: location.country,
      };
    }
    
    return {
      latitude: 0,
      longitude: 0,
      address: 'Unknown Location',
    };
  }

  /**
   * Stop all active tracking
   */
  stopAllTracking(): void {
    this.trackingIntervals.forEach((interval, bookingId) => {
      clearInterval(interval);
    });
    this.trackingIntervals.clear();
    this.activeTrackings.clear();
    this.callbacks.clear();
  }

  /**
   * Get active tracking count
   */
  getActiveTrackingCount(): number {
    return this.activeTrackings.size;
  }

  /**
   * Check if tracking is active for a booking
   */
  isTrackingActive(bookingId: string): boolean {
    return this.activeTrackings.has(bookingId);
  }
}

export const unifiedTrackingService = UnifiedTrackingService.getInstance();
