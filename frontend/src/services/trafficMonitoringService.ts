import { API_ENDPOINTS } from '../constants/api';

export interface TrafficCondition {
  id: string;
  type: 'congestion' | 'accident' | 'road_closure' | 'construction' | 'weather' | 'event';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    radius: number; // in meters
  };
  impact: {
    delay: number; // in minutes
    speed: number; // in km/h
    affectedLanes: number;
  };
  duration: {
    start: string;
    estimatedEnd: string;
    actualEnd?: string;
  };
  alternativeRoutes: AlternativeRoute[];
  createdAt: string;
  updatedAt: string;
}

export interface AlternativeRoute {
  id: string;
  name: string;
  coordinates: Array<{ latitude: number; longitude: number }>;
  distance: number; // in km
  estimatedTime: number; // in minutes
  trafficLevel: 'low' | 'medium' | 'high';
  tolls: boolean;
  roadType: 'highway' | 'arterial' | 'local';
  restrictions: string[];
  advantages: string[];
  disadvantages: string[];
}

export interface RouteOptimization {
  originalRoute: {
    coordinates: Array<{ latitude: number; longitude: number }>;
    distance: number;
    estimatedTime: number;
    trafficLevel: 'low' | 'medium' | 'high';
  };
  optimizedRoute: {
    coordinates: Array<{ latitude: number; longitude: number }>;
    distance: number;
    estimatedTime: number;
    trafficLevel: 'low' | 'medium' | 'high';
    timeSaved: number; // in minutes
    distanceChange: number; // in km (positive = longer, negative = shorter)
  };
  trafficConditions: TrafficCondition[];
  recommendations: {
    action: 'take_alternative' | 'wait' | 'proceed' | 'reschedule';
    reason: string;
    confidence: number; // 0-100
  };
}

class TrafficMonitoringService {
  private trafficCache: Map<string, TrafficCondition[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get traffic conditions for a specific area (client-focused)
   */
  async getTrafficConditions(
    centerLat: number,
    centerLon: number,
    radius: number = 5000 // 5km radius
  ): Promise<TrafficCondition[]> {
    const cacheKey = `${centerLat},${centerLon},${radius}`;
    
    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      return this.trafficCache.get(cacheKey) || [];
    }

    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) return [];

      const token = await user.getIdToken();

      const response = await fetch(`${API_ENDPOINTS.TRAFFIC}/conditions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          center: { latitude: centerLat, longitude: centerLon },
          radius,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const conditions = data.conditions || [];
        
        // Filter and format conditions for client display
        const clientFriendlyConditions = conditions.map(condition => ({
          ...condition,
          message: this.getClientFriendlyTrafficMessage(condition),
          // Remove alternative routes - clients don't need them
          alternativeRoutes: undefined
        }));
        
        // Cache the results
        this.trafficCache.set(cacheKey, clientFriendlyConditions);
        this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);
        
        return clientFriendlyConditions;
      }
      return [];
    } catch (error) {
      console.error('Error fetching traffic conditions:', error);
      return [];
    }
  }

  /**
   * Convert technical traffic condition to client-friendly message
   */
  private getClientFriendlyTrafficMessage(condition: TrafficCondition): string {
    switch (condition.type) {
      case 'congestion':
        return `Heavy traffic on ${condition.location.address} - may cause delays`;
      case 'accident':
        return `Accident reported on ${condition.location.address} - expect delays`;
      case 'road_closure':
        return `Road closure on ${condition.location.address} - alternative route being used`;
      case 'construction':
        return `Road construction on ${condition.location.address} - reduced speed expected`;
      case 'weather':
        return `Weather conditions affecting ${condition.location.address} - delivery may be slower`;
      case 'event':
        return `Special event near ${condition.location.address} - traffic may be heavier`;
      default:
        return `Traffic condition on ${condition.location.address} - may affect delivery time`;
    }
  }

  /**
   * Get alternative routes for a given path
   */
  async getAlternativeRoutes(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    currentRoute?: Array<{ latitude: number; longitude: number }>
  ): Promise<AlternativeRoute[]> {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) return [];

      const token = await user.getIdToken();

      const response = await fetch(`${API_ENDPOINTS.TRAFFIC}/alternative-routes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin,
          destination,
          currentRoute,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.routes || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching alternative routes:', error);
      return [];
    }
  }

  /**
   * Optimize route based on current traffic conditions
   */
  async optimizeRoute(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    preferences: {
      avoidTolls?: boolean;
      avoidHighways?: boolean;
      preferHighways?: boolean;
      maxDistanceIncrease?: number; // in km
      maxTimeIncrease?: number; // in minutes
    } = {}
  ): Promise<RouteOptimization | null> {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) return null;

      const token = await user.getIdToken();

      const response = await fetch(`${API_ENDPOINTS.TRAFFIC}/optimize-route`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin,
          destination,
          preferences,
        }),
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error optimizing route:', error);
      return null;
    }
  }

  /**
   * Get real-time traffic alerts for a specific route
   */
  async getRouteTrafficAlerts(
    route: Array<{ latitude: number; longitude: number }>,
    buffer: number = 1000 // 1km buffer
  ): Promise<TrafficCondition[]> {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) return [];

      const token = await user.getIdToken();

      const response = await fetch(`${API_ENDPOINTS.TRAFFIC}/route-alerts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route,
          buffer,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.alerts || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching route traffic alerts:', error);
      return [];
    }
  }

  /**
   * Calculate traffic impact on route
   */
  calculateTrafficImpact(
    route: Array<{ latitude: number; longitude: number }>,
    trafficConditions: TrafficCondition[]
  ): {
    totalDelay: number; // in minutes
    averageSpeed: number; // in km/h
    severity: 'low' | 'medium' | 'high' | 'critical';
    affectedSegments: number;
    recommendations: string[];
  } {
    let totalDelay = 0;
    let affectedSegments = 0;
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const recommendations: string[] = [];

    // Check each traffic condition against the route
    trafficConditions.forEach(condition => {
      const isOnRoute = this.isConditionOnRoute(route, condition);
      if (isOnRoute) {
        totalDelay += condition.impact.delay;
        affectedSegments++;
        
        // Update severity
        if (this.getSeverityLevel(condition.severity) > this.getSeverityLevel(maxSeverity)) {
          maxSeverity = condition.severity;
        }

        // Add recommendations based on condition type
        switch (condition.type) {
          case 'congestion':
            recommendations.push('Consider taking alternative route to avoid congestion');
            break;
          case 'accident':
            recommendations.push('Accident reported - expect delays or take detour');
            break;
          case 'road_closure':
            recommendations.push('Road closure detected - alternative route required');
            break;
          case 'construction':
            recommendations.push('Construction zone - expect reduced speed and delays');
            break;
          case 'weather':
            recommendations.push('Weather conditions may affect travel time');
            break;
        }
      }
    });

    // Calculate average speed based on delays
    const baseSpeed = 50; // km/h
    const speedReduction = Math.min(totalDelay * 0.5, 30); // Reduce speed based on delay
    const averageSpeed = Math.max(baseSpeed - speedReduction, 10);

    return {
      totalDelay,
      averageSpeed,
      severity: maxSeverity,
      affectedSegments,
      recommendations: [...new Set(recommendations)], // Remove duplicates
    };
  }

  /**
   * Get traffic forecast for a specific time
   */
  async getTrafficForecast(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    departureTime: string
  ): Promise<{
    estimatedTime: number; // in minutes
    confidence: number; // 0-100
    factors: string[];
    recommendations: string[];
  }> {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) return {
        estimatedTime: 0,
        confidence: 0,
        factors: [],
        recommendations: [],
      };

      const token = await user.getIdToken();

      const response = await fetch(`${API_ENDPOINTS.TRAFFIC}/forecast`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin,
          destination,
          departureTime,
        }),
      });

      if (response.ok) {
        return await response.json();
      }
      return {
        estimatedTime: 0,
        confidence: 0,
        factors: [],
        recommendations: [],
      };
    } catch (error) {
      console.error('Error fetching traffic forecast:', error);
      return {
        estimatedTime: 0,
        confidence: 0,
        factors: [],
        recommendations: [],
      };
    }
  }

  /**
   * Check if a traffic condition affects the given route
   */
  private isConditionOnRoute(
    route: Array<{ latitude: number; longitude: number }>,
    condition: TrafficCondition
  ): boolean {
    const { latitude, longitude, radius } = condition.location;
    
    return route.some(point => {
      const distance = this.calculateDistance(
        point.latitude,
        point.longitude,
        latitude,
        longitude
      );
      return distance <= (radius / 1000); // Convert radius to km
    });
  }

  /**
   * Get severity level as number for comparison
   */
  private getSeverityLevel(severity: string): number {
    switch (severity) {
      case 'low': return 1;
      case 'medium': return 2;
      case 'high': return 3;
      case 'critical': return 4;
      default: return 0;
    }
  }

  /**
   * Calculate distance between two points in km
   */
  private calculateDistance(
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

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(cacheKey: string): boolean {
    const expiry = this.cacheExpiry.get(cacheKey);
    return expiry ? Date.now() < expiry : false;
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (now >= expiry) {
        this.trafficCache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
  }
}

export const trafficMonitoringService = new TrafficMonitoringService();
