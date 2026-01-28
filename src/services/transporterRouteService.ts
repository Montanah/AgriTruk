import { API_ENDPOINTS } from '../constants/api';

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
  trafficConditions: Array<{
    id: string;
    type: string;
    severity: string;
    description: string;
    location: { latitude: number; longitude: number; address: string };
  }>;
  recommendations: {
    action: 'take_alternative' | 'wait' | 'proceed' | 'reschedule';
    reason: string;
    confidence: number; // 0-100
  };
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

class TransporterRouteService {
  /**
   * Get alternative routes for transporters
   * This is for transporter use only - clients don't need route selection
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
   * Optimize route for transporters
   * This is for transporter use only - clients don't need route optimization
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
   * Get traffic forecast for transporters
   * This helps transporters plan their routes
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
  } | null> {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) return null;

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
      return null;
    } catch (error) {
      console.error('Error fetching traffic forecast:', error);
      return null;
    }
  }

  /**
   * Calculate route efficiency metrics
   * This helps transporters compare routes
   */
  calculateRouteEfficiency(
    route: AlternativeRoute,
    baseRoute: { distance: number; estimatedTime: number }
  ): {
    timeEfficiency: number; // percentage improvement
    distanceEfficiency: number; // percentage change
    overallScore: number; // 0-100
    recommendation: 'excellent' | 'good' | 'fair' | 'poor';
  } {
    const timeEfficiency = ((baseRoute.estimatedTime - route.estimatedTime) / baseRoute.estimatedTime) * 100;
    const distanceEfficiency = ((route.distance - baseRoute.distance) / baseRoute.distance) * 100;
    
    // Calculate overall score (weighted: 70% time, 30% distance)
    const overallScore = Math.max(0, Math.min(100, 
      (timeEfficiency * 0.7) - (Math.abs(distanceEfficiency) * 0.3)
    ));
    
    let recommendation: 'excellent' | 'good' | 'fair' | 'poor';
    if (overallScore >= 80) recommendation = 'excellent';
    else if (overallScore >= 60) recommendation = 'good';
    else if (overallScore >= 40) recommendation = 'fair';
    else recommendation = 'poor';
    
    return {
      timeEfficiency,
      distanceEfficiency,
      overallScore,
      recommendation
    };
  }

  /**
   * Get route recommendations based on current conditions
   * This helps transporters make informed decisions
   */
  getRouteRecommendations(
    routes: AlternativeRoute[],
    currentConditions: Array<{ type: string; severity: string; location: { latitude: number; longitude: number } }>
  ): {
    recommendedRoute: AlternativeRoute | null;
    reason: string;
    alternatives: AlternativeRoute[];
  } {
    if (routes.length === 0) {
      return {
        recommendedRoute: null,
        reason: 'No alternative routes available',
        alternatives: []
      };
    }

    // Sort routes by efficiency
    const sortedRoutes = routes.sort((a, b) => {
      const aScore = this.calculateRouteEfficiency(a, { distance: 0, estimatedTime: 0 }).overallScore;
      const bScore = this.calculateRouteEfficiency(b, { distance: 0, estimatedTime: 0 }).overallScore;
      return bScore - aScore;
    });

    const recommendedRoute = sortedRoutes[0];
    const alternatives = sortedRoutes.slice(1);

    // Determine reason for recommendation
    let reason = 'Best overall performance';
    if (recommendedRoute.trafficLevel === 'low') {
      reason = 'Lowest traffic conditions';
    } else if (recommendedRoute.estimatedTime < routes[0].estimatedTime) {
      reason = 'Fastest estimated time';
    } else if (recommendedRoute.distance < routes[0].distance) {
      reason = 'Shortest distance';
    }

    return {
      recommendedRoute,
      reason,
      alternatives
    };
  }
}

export const transporterRouteService = new TransporterRouteService();

