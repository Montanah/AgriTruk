import { apiRequest } from '../utils/api';

export interface InstantRequestData {
  fromLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  toLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  productType: string;
  weightKg: number;
  urgencyLevel: 'Low' | 'Medium' | 'High';
  perishable: boolean;
  needsRefrigeration: boolean;
  specialCargo: string[];
  insured: boolean;
  value?: number;
  additionalNotes?: string;
  bookingType: 'Agri' | 'Cargo';
  priority: boolean;
}

export interface MatchedTransporter {
  id: string;
  transporterId: string;
  name: string;
  phone: string;
  email: string;
  rating: number;
  vehicleType: string;
  vehicleCapacity: number;
  vehicleRegistration: string;
  vehicleMake: string;
  vehicleColor: string;
  refrigerated: boolean;
  lastKnownLocation?: {
    latitude: number;
    longitude: number;
  };
  distance: number;
  estimatedCost: number;
  estimatedArrival: string;
  profilePhoto?: string;
  companyName?: string;
  isOnline: boolean;
  acceptingBooking: boolean;
}

export interface InstantRequestResponse {
  success: boolean;
  requestId: string;
  matchedTransporters: MatchedTransporter[];
  estimatedWaitTime: number;
  message: string;
}

class EnhancedInstantRequestService {
  private static instance: EnhancedInstantRequestService;
  private requestCache = new Map<string, InstantRequestResponse>();
  private pollingIntervals = new Map<string, NodeJS.Timeout>();

  static getInstance(): EnhancedInstantRequestService {
    if (!EnhancedInstantRequestService.instance) {
      EnhancedInstantRequestService.instance = new EnhancedInstantRequestService();
    }
    return EnhancedInstantRequestService.instance;
  }

  /**
   * Submit an instant request and get matching transporters
   */
  async submitInstantRequest(requestData: InstantRequestData): Promise<InstantRequestResponse> {
    try {
      const response = await apiRequest('/bookings/instant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...requestData,
          bookingMode: 'instant',
          status: 'pending',
          createdAt: new Date().toISOString(),
        }),
      });

      if (response.success) {
        // Cache the response
        this.requestCache.set(response.requestId, response);
        
        // Start polling for updates
        this.startPolling(response.requestId);
        
        return response;
      } else {
        throw new Error(response.message || 'Failed to submit instant request');
      }
    } catch (error) {
      console.error('Error submitting instant request:', error);
      throw error;
    }
  }

  /**
   * Get real-time updates for an instant request
   */
  async getRequestUpdates(requestId: string): Promise<InstantRequestResponse | null> {
    try {
      const response = await apiRequest(`/bookings/instant/${requestId}/updates`, {
        method: 'GET',
      });

      if (response.success) {
        // Update cache
        this.requestCache.set(requestId, response);
        return response;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting request updates:', error);
      return null;
    }
  }

  /**
   * Select a transporter for an instant request
   */
  async selectTransporter(requestId: string, transporterId: string): Promise<{ success: boolean; message: string; bookingId?: string }> {
    try {
      const response = await apiRequest(`/bookings/instant/${requestId}/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transporterId }),
      });

      if (response.success) {
        // Stop polling for this request
        this.stopPolling(requestId);
      }

      return response;
    } catch (error) {
      console.error('Error selecting transporter:', error);
      throw error;
    }
  }

  /**
   * Cancel an instant request
   */
  async cancelRequest(requestId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiRequest(`/bookings/instant/${requestId}/cancel`, {
        method: 'POST',
      });

      if (response.success) {
        // Stop polling and remove from cache
        this.stopPolling(requestId);
        this.requestCache.delete(requestId);
      }

      return response;
    } catch (error) {
      console.error('Error canceling request:', error);
      throw error;
    }
  }

  /**
   * Get cached request data
   */
  getCachedRequest(requestId: string): InstantRequestResponse | null {
    return this.requestCache.get(requestId) || null;
  }

  /**
   * Start polling for request updates
   */
  private startPolling(requestId: string): void {
    // Poll every 5 seconds for updates
    const interval = setInterval(async () => {
      try {
        const updates = await this.getRequestUpdates(requestId);
        if (updates) {
          // Emit update event (you can implement an event emitter here)
          this.emitUpdate(requestId, updates);
        }
      } catch (error) {
        console.error('Error polling for updates:', error);
      }
    }, 5000);

    this.pollingIntervals.set(requestId, interval);
  }

  /**
   * Stop polling for a request
   */
  private stopPolling(requestId: string): void {
    const interval = this.pollingIntervals.get(requestId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(requestId);
    }
  }

  /**
   * Emit update event (implement with your preferred event system)
   */
  private emitUpdate(requestId: string, updates: InstantRequestResponse): void {
    // You can implement an event emitter here
    // For now, we'll just log the update
    console.log(`Request ${requestId} updated:`, updates);
  }

  /**
   * Get nearby transporters for a location
   */
  async getNearbyTransporters(location: { latitude: number; longitude: number }, radius: number = 50): Promise<MatchedTransporter[]> {
    try {
      const response = await apiRequest('/transporters/nearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location,
          radius,
          status: 'approved',
          acceptingBooking: true,
        }),
      });

      return response.transporters || [];
    } catch (error) {
      console.error('Error getting nearby transporters:', error);
      return [];
    }
  }

  /**
   * Calculate estimated cost for a request
   */
  async calculateEstimatedCost(requestData: InstantRequestData): Promise<{ estimatedCost: number; costBreakdown: any }> {
    try {
      const response = await apiRequest('/bookings/calculate-cost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      return response;
    } catch (error) {
      console.error('Error calculating cost:', error);
      return { estimatedCost: 0, costBreakdown: {} };
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Clear all polling intervals
    this.pollingIntervals.forEach((interval) => clearInterval(interval));
    this.pollingIntervals.clear();
    
    // Clear cache
    this.requestCache.clear();
  }
}

export default EnhancedInstantRequestService.getInstance();
