import { API_ENDPOINTS } from '../constants/api';
import { enhancedNotificationService } from './enhancedNotificationService';

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

export interface RouteDeviation {
  id: string;
  bookingId: string;
  timestamp: string;
  originalRoute: Array<{ latitude: number; longitude: number }>;
  actualRoute: Array<{ latitude: number; longitude: number }>;
  deviationDistance: number; // in meters
  reason: 'traffic' | 'road_closure' | 'accident' | 'weather' | 'driver_choice' | 'unknown';
  severity: 'minor' | 'major';
  alternativeRoutes?: Array<{
    id: string;
    coordinates: Array<{ latitude: number; longitude: number }>;
    estimatedTime: number; // in minutes
    distance: number; // in km
    trafficLevel: 'low' | 'medium' | 'high';
  }>;
}

export interface TrafficAlert {
  id: string;
  type: 'congestion' | 'accident' | 'road_closure' | 'weather' | 'construction';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  radius: number; // in meters
  estimatedDuration: number; // in minutes
  alternativeRoutes?: Array<{
    id: string;
    coordinates: Array<{ latitude: number; longitude: number }>;
    estimatedTime: number;
    distance: number;
    trafficLevel: 'low' | 'medium' | 'high';
  }>;
  createdAt: string;
  expiresAt: string;
}

export interface TrackingData {
  bookingId: string;
  status: 'pending' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  transporter: {
    id: string;
    name: string;
    phone: string;
    email: string;
    profilePhoto?: string;
    rating: number;
    vehicle: {
      make: string;
      model: string;
      registration: string;
      color: string;
      capacity: number;
    };
  };
  route: {
    pickup: {
      latitude: number;
      longitude: number;
      address: string;
    };
    delivery: {
      latitude: number;
      longitude: number;
      address: string;
    };
    plannedRoute: Array<{ latitude: number; longitude: number }>;
    actualRoute: Array<{ latitude: number; longitude: number }>;
  };
  currentLocation?: LocationUpdate;
  estimatedArrival: string;
  distance: number;
  progress: number; // percentage (0-100)
  trafficAlerts: TrafficAlert[];
  routeDeviations: RouteDeviation[];
  lastUpdate: string;
}

class RealTimeTrackingService {
  private trackingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private locationUpdateCallbacks: Map<string, (location: LocationUpdate) => void> = new Map();
  private deviationCallbacks: Map<string, (deviation: RouteDeviation) => void> = new Map();
  private trafficAlertCallbacks: Map<string, (alert: TrafficAlert) => void> = new Map();

  /**
   * Start real-time tracking for a booking
   */
  async startTracking(bookingId: string, userId: string): Promise<void> {
    try {
      // Clear any existing tracking for this booking
      this.stopTracking(bookingId);

      // Start location polling
      const interval = setInterval(async () => {
        await this.updateLocation(bookingId, userId);
        await this.checkRouteDeviations(bookingId);
        await this.checkTrafficAlerts(bookingId);
      }, 30000); // Update every 30 seconds

      this.trackingIntervals.set(bookingId, interval);

      console.log(`Started real-time tracking for booking ${bookingId}`);
    } catch (error) {
      console.error('Error starting tracking:', error);
      throw error;
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
      console.log(`Stopped tracking for booking ${bookingId}`);
    }
  }

  /**
   * Update transporter location
   */
  private async updateLocation(bookingId: string, userId: string): Promise<void> {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) return;

      const token = await user.getIdToken();

      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${bookingId}/location`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const locationUpdate: LocationUpdate = {
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: data.timestamp,
          accuracy: data.accuracy,
          speed: data.speed,
          heading: data.heading,
        };

        // Notify subscribers
        const callback = this.locationUpdateCallbacks.get(bookingId);
        if (callback) {
          callback(locationUpdate);
        }

        // Send location update notification to client
        await this.sendLocationUpdateNotification(bookingId, userId, locationUpdate);
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  }

  /**
   * Check for route deviations
   */
  private async checkRouteDeviations(bookingId: string): Promise<void> {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) return;

      const token = await user.getIdToken();

      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${bookingId}/route-deviations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.deviations && data.deviations.length > 0) {
          const latestDeviation = data.deviations[0];
          
          // Notify subscribers
          const callback = this.deviationCallbacks.get(bookingId);
          if (callback) {
            callback(latestDeviation);
          }

          // Send deviation notification
          await this.sendDeviationNotification(bookingId, latestDeviation);
        }
      }
    } catch (error) {
      console.error('Error checking route deviations:', error);
    }
  }

  /**
   * Check for traffic alerts
   */
  private async checkTrafficAlerts(bookingId: string): Promise<void> {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) return;

      const token = await user.getIdToken();

      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${bookingId}/traffic-alerts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.alerts && data.alerts.length > 0) {
          const latestAlert = data.alerts[0];
          
          // Notify subscribers
          const callback = this.trafficAlertCallbacks.get(bookingId);
          if (callback) {
            callback(latestAlert);
          }

          // Send traffic alert notification
          await this.sendTrafficAlertNotification(bookingId, latestAlert);
        }
      }
    } catch (error) {
      console.error('Error checking traffic alerts:', error);
    }
  }

  /**
   * Subscribe to location updates
   */
  onLocationUpdate(bookingId: string, callback: (location: LocationUpdate) => void): void {
    this.locationUpdateCallbacks.set(bookingId, callback);
  }

  /**
   * Subscribe to route deviation alerts
   */
  onRouteDeviation(bookingId: string, callback: (deviation: RouteDeviation) => void): void {
    this.deviationCallbacks.set(bookingId, callback);
  }

  /**
   * Subscribe to traffic alerts
   */
  onTrafficAlert(bookingId: string, callback: (alert: TrafficAlert) => void): void {
    this.trafficAlertCallbacks.set(bookingId, callback);
  }

  /**
   * Unsubscribe from all callbacks for a booking
   */
  unsubscribe(bookingId: string): void {
    this.locationUpdateCallbacks.delete(bookingId);
    this.deviationCallbacks.delete(bookingId);
    this.trafficAlertCallbacks.delete(bookingId);
  }

  /**
   * Send location update notification to client
   */
  private async sendLocationUpdateNotification(
    bookingId: string,
    userId: string,
    location: LocationUpdate
  ): Promise<void> {
    try {
      await enhancedNotificationService.sendNotification(
        'location_update',
        userId,
        {
          bookingId,
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: location.timestamp,
          accuracy: location.accuracy,
        }
      );
    } catch (error) {
      console.error('Error sending location update notification:', error);
    }
  }

  /**
   * Send route deviation notification to client
   */
  private async sendDeviationNotification(
    bookingId: string,
    deviation: RouteDeviation
  ): Promise<void> {
    try {
      // Get client ID from booking
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) return;

      const token = await user.getIdToken();

      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const booking = await response.json();
        
        // Create user-friendly deviation message for clients
        const deviationMessage = this.getClientFriendlyDeviationMessage(deviation);
        
        await enhancedNotificationService.sendNotification(
          'route_deviation',
          booking.userId,
          {
            bookingId,
            deviationReason: deviationMessage,
            severity: deviation.severity,
            // Don't send alternative routes to clients - they don't need to choose
          }
        );
      }
    } catch (error) {
      console.error('Error sending deviation notification:', error);
    }
  }

  /**
   * Convert technical deviation reason to client-friendly message
   */
  private getClientFriendlyDeviationMessage(deviation: RouteDeviation): string {
    switch (deviation.reason) {
      case 'traffic':
        return 'Your transporter is taking an alternative route to avoid heavy traffic';
      case 'road_closure':
        return 'Your transporter is taking a detour due to a road closure';
      case 'accident':
        return 'Your transporter is taking an alternative route due to an accident ahead';
      case 'weather':
        return 'Your transporter is taking a safer route due to weather conditions';
      case 'driver_choice':
        return 'Your transporter is taking a more efficient route';
      default:
        return 'Your transporter is taking an alternative route for better delivery time';
    }
  }

  /**
   * Send traffic alert notification to client
   */
  private async sendTrafficAlertNotification(
    bookingId: string,
    alert: TrafficAlert
  ): Promise<void> {
    try {
      // Get client ID from booking
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) return;

      const token = await user.getIdToken();

      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const booking = await response.json();
        await enhancedNotificationService.sendNotification(
          'traffic_alert',
          booking.userId,
          {
            bookingId,
            alertType: alert.type,
            severity: alert.severity,
            message: alert.message,
            location: alert.location,
            alternativeRoutes: alert.alternativeRoutes,
          }
        );
      }
    } catch (error) {
      console.error('Error sending traffic alert notification:', error);
    }
  }

  /**
   * Get current tracking data for a booking
   */
  async getTrackingData(bookingId: string): Promise<TrackingData | null> {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) return null;

      const token = await user.getIdToken();

      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${bookingId}/tracking`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error fetching tracking data:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Calculate estimated time of arrival
   */
  calculateETA(
    currentLocation: LocationUpdate,
    destination: { latitude: number; longitude: number },
    averageSpeed: number = 30 // km/h
  ): number {
    const distance = this.calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      destination.latitude,
      destination.longitude
    );
    return (distance / averageSpeed) * 60; // return in minutes
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
}

export const realTimeTrackingService = new RealTimeTrackingService();
