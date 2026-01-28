/**
 * Driver Availability Service
 * Manages driver online/offline status and availability for accepting requests
 */

import { API_ENDPOINTS } from '../constants/api';
import { getAuth } from 'firebase/auth';

export interface DriverAvailability {
  isOnline: boolean;
  isAcceptingRequests: boolean;
  currentLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  lastSeen: string;
  statusMessage?: string;
  workingHours?: {
    start: string;
    end: string;
  };
}

export interface RouteLoad {
  id: string;
  fromLocation: string;
  toLocation: string;
  productType: string;
  weight: string;
  pickupDate: string;
  deliveryDate: string;
  price: number;
  distance: number;
  client: {
    id: string;
    name: string;
    type: 'shipper' | 'broker' | 'business';
  };
  status: 'pending' | 'accepted' | 'in_progress' | 'completed';
  isConsolidatable: boolean;
  route: {
    coordinates: Array<{ latitude: number; longitude: number }>;
    distance: number;
    duration: number;
  };
}

class DriverAvailabilityService {
  private static instance: DriverAvailabilityService;
  private availability: DriverAvailability | null = null;
  private listeners: Array<(availability: DriverAvailability) => void> = [];

  static getInstance(): DriverAvailabilityService {
    if (!DriverAvailabilityService.instance) {
      DriverAvailabilityService.instance = new DriverAvailabilityService();
    }
    return DriverAvailabilityService.instance;
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
   * Set driver availability status
   */
  async setAvailability(
    isOnline: boolean,
    isAcceptingRequests: boolean,
    currentLocation?: { latitude: number; longitude: number; address: string },
    statusMessage?: string
  ): Promise<boolean> {
    try {
      const token = await this.getAuthToken();
      
      const payload = {
        isOnline,
        isAcceptingRequests,
        currentLocation,
        statusMessage,
        lastSeen: new Date().toISOString(),
      };

      const response = await fetch(`${API_ENDPOINTS.DRIVERS}/availability`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to update availability: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.availability = data.availability;
      
      // Notify listeners
      this.listeners.forEach(listener => listener(this.availability!));
      
      console.log(`🔍 Driver availability updated: ${isOnline ? 'Online' : 'Offline'}, ${isAcceptingRequests ? 'Accepting' : 'Not accepting'} requests`);
      return true;
    } catch (error) {
      console.error('Error updating driver availability:', error);
      return false;
    }
  }

  /**
   * Get current driver availability
   */
  async getAvailability(): Promise<DriverAvailability | null> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${API_ENDPOINTS.DRIVERS}/availability`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch availability: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.availability = data.availability;
      return this.availability;
    } catch (error) {
      console.error('Error fetching driver availability:', error);
      return null;
    }
  }

  /**
   * Get available route loads for driver
   */
  async getRouteLoads(filters?: {
    fromLocation?: string;
    toLocation?: string;
    productType?: string;
    maxDistance?: number;
    dateRange?: { start: string; end: string };
    priceRange?: { min: number; max: number };
  }): Promise<RouteLoad[]> {
    try {
      const token = await this.getAuthToken();
      
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (typeof value === 'object') {
              queryParams.append(key, JSON.stringify(value));
            } else {
              queryParams.append(key, value.toString());
            }
          }
        });
      }

      const response = await fetch(`${API_ENDPOINTS.DRIVERS}/route-loads?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch route loads: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.routeLoads || [];
    } catch (error) {
      console.error('Error fetching route loads:', error);
      return [];
    }
  }

  /**
   * Accept a route load
   */
  async acceptRouteLoad(loadId: string): Promise<boolean> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${API_ENDPOINTS.DRIVERS}/route-loads/${loadId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to accept route load: ${response.status} ${response.statusText}`);
      }

      console.log(`🔍 Route load ${loadId} accepted successfully`);
      return true;
    } catch (error) {
      console.error('Error accepting route load:', error);
      return false;
    }
  }

  /**
   * Consolidate multiple route loads
   */
  async consolidateRouteLoads(loadIds: string[]): Promise<boolean> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${API_ENDPOINTS.DRIVERS}/consolidate-loads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ loadIds }),
      });

      if (!response.ok) {
        throw new Error(`Failed to consolidate loads: ${response.status} ${response.statusText}`);
      }

      console.log(`🔍 Consolidated ${loadIds.length} route loads successfully`);
      return true;
    } catch (error) {
      console.error('Error consolidating route loads:', error);
      return false;
    }
  }

  /**
   * Get optimal route for multiple loads
   */
  async getOptimalRoute(loadIds: string[]): Promise<{
    route: Array<{ latitude: number; longitude: number }>;
    totalDistance: number;
    totalDuration: number;
    waypoints: Array<{ loadId: string; location: { latitude: number; longitude: number } }>;
  } | null> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${API_ENDPOINTS.DRIVERS}/optimal-route`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ loadIds }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get optimal route: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.route;
    } catch (error) {
      console.error('Error getting optimal route:', error);
      return null;
    }
  }

  /**
   * Send traffic alert to clients
   */
  async sendTrafficAlert(
    bookingId: string,
    alert: {
      type: 'congestion' | 'accident' | 'road_closure' | 'weather' | 'other';
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      location: { latitude: number; longitude: number };
      estimatedDelay: number;
      alternativeRoute?: Array<{ latitude: number; longitude: number }>;
    }
  ): Promise<boolean> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${API_ENDPOINTS.DRIVERS}/traffic-alert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          alert: {
            ...alert,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send traffic alert: ${response.status} ${response.statusText}`);
      }

      console.log(`🔍 Traffic alert sent for booking ${bookingId}`);
      return true;
    } catch (error) {
      console.error('Error sending traffic alert:', error);
      return false;
    }
  }

  /**
   * Get traffic conditions for a route
   */
  async getTrafficConditions(
    fromLocation: { latitude: number; longitude: number },
    toLocation: { latitude: number; longitude: number }
  ): Promise<{
    conditions: Array<{
      type: string;
      severity: string;
      message: string;
      location: { latitude: number; longitude: number };
      estimatedDelay: number;
    }>;
    alternativeRoutes: Array<{
      route: Array<{ latitude: number; longitude: number }>;
      distance: number;
      duration: number;
      delay: number;
    }>;
  } | null> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${API_ENDPOINTS.DRIVERS}/traffic-conditions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fromLocation, toLocation }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get traffic conditions: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.traffic;
    } catch (error) {
      console.error('Error getting traffic conditions:', error);
      return null;
    }
  }

  /**
   * Subscribe to availability changes
   */
  subscribe(listener: (availability: DriverAvailability) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current availability state
   */
  getCurrentAvailability(): DriverAvailability | null {
    return this.availability;
  }
}

export const driverAvailabilityService = DriverAvailabilityService.getInstance();

