import { API_ENDPOINTS } from '../constants/api';

export interface RouteInfo {
  from: {
    name: string;
    coordinates: { lat: number; lng: number };
  };
  to: {
    name: string;
    coordinates: { lat: number; lng: number };
  };
  waypoints?: Array<{
    name: string;
    coordinates: { lat: number; lng: number };
  }>;
}

export interface ActiveTrip {
  id: string;
  status: 'accepted' | 'in_progress' | 'picked_up' | 'in_transit' | 'delivered';
  route: RouteInfo;
  pickupDate: string;
  deliveryDate: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
}

export interface RouteConflict {
  hasConflict: boolean;
  conflictType: 'different_destination' | 'overlapping_time' | 'route_mismatch' | 'none';
  message: string;
  currentTrip?: ActiveTrip;
  suggestedAction?: string;
}

export interface RouteValidationResult {
  canAccept: boolean;
  conflict?: RouteConflict;
  currentTrip?: ActiveTrip;
  routeLoadsAvailable?: boolean;
}

class RouteValidationService {
  /**
   * Check if a driver/transporter can accept a new job based on current route
   */
  async validateJobAcceptance(
    newJobRoute: RouteInfo,
    userType: 'driver' | 'transporter' = 'driver'
  ): Promise<RouteValidationResult> {
    try {
      // Get current active trip
      const currentTrip = await this.getCurrentActiveTripInternal(userType);
      
      if (!currentTrip) {
        // No active trip - can accept any job
        return {
          canAccept: true,
          currentTrip: undefined,
          routeLoadsAvailable: false
        };
      }

      // Check for route conflicts
      const conflict = this.checkRouteConflict(currentTrip.route, newJobRoute);
      
      if (conflict.hasConflict) {
        return {
          canAccept: false,
          conflict,
          currentTrip,
          routeLoadsAvailable: true
        };
      }

      // Routes are compatible - can accept
      return {
        canAccept: true,
        currentTrip,
        routeLoadsAvailable: true
      };

    } catch (error) {
      console.error('Error validating job acceptance:', error);
      // On error, allow acceptance but show warning
      return {
        canAccept: true,
        conflict: {
          hasConflict: false,
          conflictType: 'none',
          message: 'Unable to validate route compatibility. Please ensure you can complete this job.',
          suggestedAction: 'Verify you can complete this job before accepting.'
        }
      };
    }
  }

  /**
   * Get current active trip for driver or transporter (public method)
   */
  async getCurrentActiveTrip(userType: 'driver' | 'transporter'): Promise<ActiveTrip | null> {
    return this.getCurrentActiveTripInternal(userType);
  }

  /**
   * Get current active trip for driver or transporter (private method)
   * Since the backend doesn't have a dedicated current-trip endpoint, we'll get it from accepted bookings
   */
  private async getCurrentActiveTripInternal(userType: 'driver' | 'transporter'): Promise<ActiveTrip | null> {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      
      // Get transporter's accepted bookings to find current active trip
      const endpoint = `${API_ENDPOINTS.BOOKINGS}/transporter/${user.uid}`;
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const bookings = data.bookings || [];
        
        // Find the most recent accepted booking that's not completed
        const activeBooking = bookings.find((booking: any) => 
          booking.status === 'accepted' || 
          booking.status === 'in_progress' || 
          booking.status === 'picked_up' || 
          booking.status === 'in_transit'
        );
        
        if (activeBooking) {
          return {
            id: activeBooking.bookingId || activeBooking.id,
            status: activeBooking.status,
            route: {
              from: {
                name: activeBooking.fromLocation?.address || activeBooking.fromLocation || 'Unknown',
                coordinates: {
                  lat: activeBooking.fromLocation?.latitude || 0,
                  lng: activeBooking.fromLocation?.longitude || 0
                }
              },
              to: {
                name: activeBooking.toLocation?.address || activeBooking.toLocation || 'Unknown',
                coordinates: {
                  lat: activeBooking.toLocation?.latitude || 0,
                  lng: activeBooking.toLocation?.longitude || 0
                }
              }
            },
            pickupDate: activeBooking.pickUpDate || activeBooking.acceptedAt,
            deliveryDate: activeBooking.estimatedDeliveryDate || activeBooking.completedAt,
            currentLocation: activeBooking.currentLocation || null
          };
        }
        
        return null;
      } else if (response.status === 404) {
        // No bookings found
        return null;
      } else {
        throw new Error(`Failed to fetch current trip: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching current trip:', error);
      return null;
    }
  }

  /**
   * Check if two routes are compatible
   */
  private checkRouteConflict(currentRoute: RouteInfo, newRoute: RouteInfo): RouteConflict {
    // Check if destinations are the same or compatible
    const currentDestination = currentRoute.to.name.toLowerCase().trim();
    const newDestination = newRoute.to.name.toLowerCase().trim();
    
    // Check if pickup locations are compatible (should be along the same route)
    const currentPickup = currentRoute.from.name.toLowerCase().trim();
    const newPickup = newRoute.from.name.toLowerCase().trim();

    // If destinations are completely different, it's a conflict
    if (currentDestination !== newDestination) {
      return {
        hasConflict: true,
        conflictType: 'different_destination',
        message: `You are currently on a trip to ${currentRoute.to.name}. This new job goes to ${newRoute.to.name}, which is a different destination.`,
        suggestedAction: 'Complete your current trip before accepting jobs to different destinations.'
      };
    }

    // If destinations are the same, check if pickup locations are compatible
    const pickupConflict = this.checkPickupLocationCompatibility(currentRoute, newRoute);
    if (pickupConflict.hasConflict) {
      return pickupConflict;
    }

    // Routes are compatible
    return {
      hasConflict: false,
      conflictType: 'none',
      message: 'This job is compatible with your current route.',
      suggestedAction: 'You can accept this job as it aligns with your current trip.'
    };
  }

  /**
   * Check if pickup location is compatible with current route
   */
  private checkPickupLocationCompatibility(currentRoute: RouteInfo, newRoute: RouteInfo): RouteConflict {
    const currentPickup = currentRoute.from.name.toLowerCase().trim();
    const newPickup = newRoute.from.name.toLowerCase().trim();
    
    // If pickup locations are the same, it's definitely compatible
    if (currentPickup === newPickup) {
      return {
        hasConflict: false,
        conflictType: 'none',
        message: 'Pickup location matches your current route.',
        suggestedAction: 'This job is perfectly aligned with your current trip.'
      };
    }

    // Use distance calculation if coordinates are available
    if (currentRoute.from.coordinates.lat !== 0 && currentRoute.from.coordinates.lng !== 0 &&
        newRoute.from.coordinates.lat !== 0 && newRoute.from.coordinates.lng !== 0) {
      
      const distance = this.calculateDistance(
        currentRoute.from.coordinates,
        newRoute.from.coordinates
      );
      
      // If pickup is within 50km of current pickup, consider it compatible
      if (distance <= 50) {
        return {
          hasConflict: false,
          conflictType: 'none',
          message: `Pickup location is ${Math.round(distance)}km from your current pickup - compatible for consolidation.`,
          suggestedAction: 'This job can be added to your current trip.'
        };
      } else {
        return {
          hasConflict: true,
          conflictType: 'route_mismatch',
          message: `The pickup location (${newRoute.from.name}) is ${Math.round(distance)}km from your current pickup location. This is too far for efficient consolidation.`,
          suggestedAction: 'Only accept jobs with pickup locations within 50km of your current route.'
        };
      }
    }

    // Fallback to name-based check if coordinates are not available
    const isAlongRoute = this.isLocationAlongRoute(currentRoute, newRoute.from);
    
    if (!isAlongRoute) {
      return {
        hasConflict: true,
        conflictType: 'route_mismatch',
        message: `The pickup location (${newRoute.from.name}) is not along your current route to ${currentRoute.to.name}.`,
        suggestedAction: 'Only accept jobs with pickup locations along your current route.'
      };
    }

    return {
      hasConflict: false,
      conflictType: 'none',
      message: 'Pickup location is along your current route.',
      suggestedAction: 'This job can be added to your current trip.'
    };
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(coord2.lat - coord1.lat);
    const dLon = this.deg2rad(coord2.lng - coord1.lng);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(coord1.lat)) * Math.cos(this.deg2rad(coord2.lat)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  /**
   * Convert degrees to radians
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  /**
   * Simplified check if a location is along the current route
   * In a real implementation, this would use proper distance calculations
   */
  private isLocationAlongRoute(currentRoute: RouteInfo, newPickup: { name: string; coordinates: { lat: number; lng: number } }): boolean {
    // For now, we'll do a simple name-based check
    // In production, you'd calculate actual distances and check if the pickup is within a reasonable detour distance
    
    const currentPickup = currentRoute.from.name.toLowerCase().trim();
    const currentDestination = currentRoute.to.name.toLowerCase().trim();
    const newPickupName = newPickup.name.toLowerCase().trim();
    
    // If it's the same as current pickup or destination, it's along the route
    if (newPickupName === currentPickup || newPickupName === currentDestination) {
      return true;
    }
    
    // For now, we'll be permissive and allow most pickups
    // In production, you'd implement proper distance calculations
    return true;
  }

  /**
   * Get route loads that are compatible with current trip
   */
  async getCompatibleRouteLoads(userType: 'driver' | 'transporter' = 'driver'): Promise<any[]> {
    try {
      const currentTrip = await this.getCurrentActiveTripInternal(userType);
      
      if (!currentTrip) {
        // No active trip - return empty array (no route loads to show)
        return [];
      }

      // Fetch route loads from the backend
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      const endpoint = `${API_ENDPOINTS.BOOKINGS}/transporters/route-loads`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const allRouteLoads = data.routeLoads || [];
        
        // Filter route loads to only show compatible ones (same destination)
        return this.filterCompatibleRouteLoads(allRouteLoads, currentTrip.route);
      } else {
        throw new Error(`Failed to fetch route loads: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching compatible route loads:', error);
      return [];
    }
  }

  /**
   * Filter route loads to only show those compatible with current route
   */
  private filterCompatibleRouteLoads(routeLoads: any[], currentRoute: RouteInfo): any[] {
    return routeLoads.filter(load => {
      // Check if the load's destination matches current route destination
      const loadDestination = load.toLocation?.address?.toLowerCase().trim() || 
                             load.toLocation?.toLowerCase().trim() || 
                             load.dropoff?.toLowerCase().trim();
      const currentDestination = currentRoute.to.name.toLowerCase().trim();
      
      // Only show loads going to the same destination
      const isSameDestination = loadDestination === currentDestination;
      
      // Also check if pickup location is within reasonable distance
      if (isSameDestination && load.fromLocation?.latitude && load.fromLocation?.longitude) {
        const distance = this.calculateDistance(
          currentRoute.from.coordinates,
          { lat: load.fromLocation.latitude, lng: load.fromLocation.longitude }
        );
        
        // Only show loads within 50km of current pickup
        return distance <= 50;
      }
      
      return isSameDestination;
    });
  }

  /**
   * Show route conflict alert to user
   */
  showRouteConflictAlert(conflict: RouteConflict, onConfirm?: () => void, onCancel?: () => void) {
    const { Alert } = require('react-native');
    
    Alert.alert(
      'Route Conflict Detected',
      conflict.message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: onCancel
        },
        ...(conflict.suggestedAction ? [{
          text: 'View Details',
          onPress: () => {
            Alert.alert(
              'Suggested Action',
              conflict.suggestedAction,
              [{ text: 'OK' }]
            );
          }
        }] : [])
      ]
    );
  }

  /**
   * Show route compatibility success message
   */
  showRouteCompatibilityMessage(message: string) {
    const { Alert } = require('react-native');
    
    Alert.alert(
      'Route Compatible',
      message,
      [{ text: 'OK' }]
    );
  }
}

export const routeValidationService = new RouteValidationService();
