import { apiRequest } from '../utils/api';

export interface TripLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

export interface TripStatus {
  status: 'pending' | 'accepted' | 'in_progress' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  timestamp: string;
  location?: TripLocation;
  message?: string;
}

export interface TripUpdate {
  tripId: string;
  status: TripStatus;
  currentLocation?: TripLocation;
  eta?: string;
  distanceRemaining?: number;
  progressPercentage?: number;
}

export interface CommunicationMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
  type: 'text' | 'image' | 'location' | 'voice';
  metadata?: any;
}

export interface CallSession {
  id: string;
  participants: string[];
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'initiated' | 'ringing' | 'connected' | 'ended' | 'missed';
  type: 'voice' | 'video';
}

class TripTrackingService {
  private static instance: TripTrackingService;
  private tripUpdates = new Map<string, TripUpdate[]>();
  private updateCallbacks = new Map<string, (update: TripUpdate) => void>();
  private pollingIntervals = new Map<string, NodeJS.Timeout>();

  static getInstance(): TripTrackingService {
    if (!TripTrackingService.instance) {
      TripTrackingService.instance = new TripTrackingService();
    }
    return TripTrackingService.instance;
  }

  /**
   * Start tracking a trip
   */
  async startTracking(tripId: string, onUpdate?: (update: TripUpdate) => void): Promise<void> {
    try {
      if (onUpdate) {
        this.updateCallbacks.set(tripId, onUpdate);
      }

      // Start polling for updates
      this.startPolling(tripId);

      // Get initial trip data
      const initialUpdate = await this.getTripStatus(tripId);
      if (initialUpdate) {
        this.tripUpdates.set(tripId, [initialUpdate]);
        if (onUpdate) {
          onUpdate(initialUpdate);
        }
      }
    } catch (error) {
      console.error('Error starting trip tracking:', error);
    }
  }

  /**
   * Stop tracking a trip
   */
  stopTracking(tripId: string): void {
    this.stopPolling(tripId);
    this.updateCallbacks.delete(tripId);
  }

  /**
   * Get current trip status
   */
  async getTripStatus(tripId: string): Promise<TripUpdate | null> {
    try {
      const response = await apiRequest(`/trips/${tripId}/status`, {
        method: 'GET',
      });

      if (response.success) {
        return response.tripUpdate;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting trip status:', error);
      return null;
    }
  }

  /**
   * Get trip history
   */
  async getTripHistory(tripId: string): Promise<TripUpdate[]> {
    try {
      const response = await apiRequest(`/trips/${tripId}/history`, {
        method: 'GET',
      });

      if (response.success) {
        return response.history || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting trip history:', error);
      return [];
    }
  }

  /**
   * Send location update
   */
  async sendLocationUpdate(tripId: string, location: TripLocation): Promise<boolean> {
    try {
      const response = await apiRequest(`/trips/${tripId}/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location }),
      });

      return response.success || false;
    } catch (error) {
      console.error('Error sending location update:', error);
      return false;
    }
  }

  /**
   * Update trip status
   */
  async updateTripStatus(tripId: string, status: string, message?: string): Promise<boolean> {
    try {
      const response = await apiRequest(`/trips/${tripId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, message }),
      });

      return response.success || false;
    } catch (error) {
      console.error('Error updating trip status:', error);
      return false;
    }
  }

  /**
   * Send message in trip chat
   */
  async sendMessage(tripId: string, message: string, type: 'text' | 'image' | 'location' | 'voice' = 'text', metadata?: any): Promise<boolean> {
    try {
      const response = await apiRequest(`/trips/${tripId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, type, metadata }),
      });

      return response.success || false;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  /**
   * Get trip messages
   */
  async getMessages(tripId: string, limit: number = 50, offset: number = 0): Promise<CommunicationMessage[]> {
    try {
      const response = await apiRequest(`/trips/${tripId}/messages?limit=${limit}&offset=${offset}`, {
        method: 'GET',
      });

      if (response.success) {
        return response.messages || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  /**
   * Initiate a call
   */
  async initiateCall(tripId: string, type: 'voice' | 'video' = 'voice'): Promise<CallSession | null> {
    try {
      const response = await apiRequest(`/trips/${tripId}/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });

      if (response.success) {
        return response.callSession;
      }
      
      return null;
    } catch (error) {
      console.error('Error initiating call:', error);
      return null;
    }
  }

  /**
   * End a call
   */
  async endCall(callId: string): Promise<boolean> {
    try {
      const response = await apiRequest(`/calls/${callId}/end`, {
        method: 'POST',
      });

      return response.success || false;
    } catch (error) {
      console.error('Error ending call:', error);
      return false;
    }
  }

  /**
   * Get call history for a trip
   */
  async getCallHistory(tripId: string): Promise<CallSession[]> {
    try {
      const response = await apiRequest(`/trips/${tripId}/calls`, {
        method: 'GET',
      });

      if (response.success) {
        return response.calls || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting call history:', error);
      return [];
    }
  }

  /**
   * Start polling for trip updates
   */
  private startPolling(tripId: string): void {
    // Poll every 10 seconds for updates
    const interval = setInterval(async () => {
      try {
        const update = await this.getTripStatus(tripId);
        if (update) {
          // Update local cache
          const existingUpdates = this.tripUpdates.get(tripId) || [];
          this.tripUpdates.set(tripId, [...existingUpdates, update]);

          // Notify callback
          const callback = this.updateCallbacks.get(tripId);
          if (callback) {
            callback(update);
          }
        }
      } catch (error) {
        console.error('Error polling for trip updates:', error);
      }
    }, 10000);

    this.pollingIntervals.set(tripId, interval);
  }

  /**
   * Stop polling for a trip
   */
  private stopPolling(tripId: string): void {
    const interval = this.pollingIntervals.get(tripId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(tripId);
    }
  }

  /**
   * Get cached trip updates
   */
  getCachedUpdates(tripId: string): TripUpdate[] {
    return this.tripUpdates.get(tripId) || [];
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Clear all polling intervals
    this.pollingIntervals.forEach((interval) => clearInterval(interval));
    this.pollingIntervals.clear();
    
    // Clear callbacks and updates
    this.updateCallbacks.clear();
    this.tripUpdates.clear();
  }
}

export default TripTrackingService.getInstance();
