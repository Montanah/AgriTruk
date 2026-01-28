import { API_ENDPOINTS } from '../constants/api';
import { notificationService } from './notificationService';

export interface InstantRequest {
  id: string;
  shipperId: string;
  transporterId: string;
  requestData: any;
  createdAt: Date;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

class InstantRequestService {
  private activeRequests: Map<string, InstantRequest> = new Map();
  private notificationInterval: NodeJS.Timeout | null = null;

  /**
   * Send instant request to selected transporter
   */
  async sendInstantRequest(
    shipperId: string,
    transporterId: string,
    requestData: any
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      // Get shipper token for API calls
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.uid !== shipperId) {
        throw new Error('Unauthorized: Invalid shipper');
      }

      const token = await currentUser.getIdToken();

      // Create instant request
      const requestPayload = {
        shipperId,
        transporterId,
        requestData: {
          ...requestData,
          type: 'instant',
          urgency: requestData.urgency || 'high',
          expiresIn: 300, // 5 minutes
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
      };

      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/instant-request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (response.ok) {
        const data = await response.json();
        const requestId = data.requestId;

        // Store locally for tracking
        const instantRequest: InstantRequest = {
          id: requestId,
          shipperId,
          transporterId,
          requestData: requestPayload.requestData,
          createdAt: new Date(requestPayload.createdAt),
          expiresAt: new Date(requestPayload.expiresAt),
          status: 'pending',
        };

        this.activeRequests.set(requestId, instantRequest);

        // Send push notification to transporter
        await this.notifyTransporter(transporterId, instantRequest);

        // Start monitoring for response
        this.startMonitoring(requestId);

        return { success: true, requestId };
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send instant request');
      }
    } catch (error: any) {
      console.error('Error sending instant request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notify transporter about new instant request
   */
  private async notifyTransporter(transporterId: string, request: InstantRequest): Promise<void> {
    try {
      // Send push notification
      await notificationService.send({
        to: transporterId,
        channel: 'push',
        audience: 'transporter',
        type: 'request_allocated',
        subject: 'New Instant Request!',
        message: `You have a new urgent request from ${request.requestData.client?.name || 'a shipper'}. Respond within 5 minutes.`,
        data: {
          type: 'instant_request',
          requestId: request.id,
          shipperId: request.shipperId,
          urgency: request.requestData.urgency,
          expiresAt: request.expiresAt.toISOString(),
        }
      });

      // Send in-app notification
      await notificationService.sendInApp(
        transporterId,
        `New instant request: ${request.requestData.fromLocation} → ${request.requestData.toLocation}`,
        'transporter',
        'instant_request',
        {
          requestId: request.id,
          shipperId: request.shipperId,
          requestData: request.requestData,
          expiresAt: request.expiresAt.toISOString(),
        }
      );

      // Send SMS if transporter has phone number
      if (request.requestData.transporterPhone) {
        await notificationService.send({
          to: request.requestData.transporterPhone,
          channel: 'sms',
          audience: 'transporter',
          type: 'request_allocated',
          message: `URGENT: New instant request from ${request.requestData.client?.name || 'a shipper'}. Check TRUKAPP now!`,
          data: {
            requestId: request.id,
            shipperId: request.shipperId,
          }
        });
      }
    } catch (error) {
      console.error('Error notifying transporter:', error);
    }
  }

  /**
   * Start monitoring request for response or expiration
   */
  private startMonitoring(requestId: string): void {
    const request = this.activeRequests.get(requestId);
    if (!request) return;

    // Check every 30 seconds
    this.notificationInterval = setInterval(async () => {
      try {
        // Check if request has expired
        if (new Date() > request.expiresAt) {
          await this.handleExpiredRequest(requestId);
          return;
        }

        // Check for transporter response
        const response = await this.checkRequestStatus(requestId);
        if (response) {
          await this.handleRequestResponse(requestId, response);
        }
      } catch (error) {
        console.error('Error monitoring request:', error);
      }
    }, 30000);
  }

  /**
   * Check request status with backend
   */
  private async checkRequestStatus(requestId: string): Promise<any> {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return null;

      const token = await currentUser.getIdToken();

      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/instant-request/${requestId}/status`, {
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
      console.error('Error checking request status:', error);
      return null;
    }
  }

  /**
   * Handle request response from transporter
   */
  private async handleRequestResponse(requestId: string, response: any): Promise<void> {
    const request = this.activeRequests.get(requestId);
    if (!request) return;

    // Update local status
    request.status = response.status;
    this.activeRequests.set(requestId, request);

    // Notify shipper about response
    await this.notifyShipper(request.shipperId, request, response);

    // Clear monitoring
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
      this.notificationInterval = null;
    }

    // Remove from active requests
    this.activeRequests.delete(requestId);
  }

  /**
   * Handle expired request
   */
  private async handleExpiredRequest(requestId: string): Promise<void> {
    const request = this.activeRequests.get(requestId);
    if (!request) return;

    // Update status
    request.status = 'expired';
    this.activeRequests.set(requestId, request);

    // Notify shipper about expiration
    await this.notifyShipper(request.shipperId, request, { status: 'expired' });

    // Clear monitoring
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
      this.notificationInterval = null;
    }

    // Remove from active requests
    this.activeRequests.delete(requestId);
  }

  /**
   * Notify shipper about request response
   */
  private async notifyShipper(shipperId: string, request: InstantRequest, response: any): Promise<void> {
    try {
      const statusMessage = response.status === 'accepted' 
        ? 'Your instant request has been accepted!'
        : response.status === 'rejected'
        ? 'Your instant request was declined.'
        : 'Your instant request has expired.';

      // Send push notification
      await notificationService.send({
        to: shipperId,
        channel: 'push',
        audience: 'shipper',
        type: 'request_status',
        subject: 'Instant Request Update',
        message: statusMessage,
        data: {
          type: 'instant_request_response',
          requestId: request.id,
          status: response.status,
        }
      });

      // Send in-app notification
      await notificationService.sendInApp(
        shipperId,
        statusMessage,
        'shipper',
        'instant_request_response',
        {
          requestId: request.id,
          status: response.status,
          transporterId: request.transporterId,
        }
      );
    } catch (error) {
      console.error('Error notifying shipper:', error);
    }
  }

  /**
   * Get active requests for a user
   */
  getActiveRequests(userId: string): InstantRequest[] {
    return Array.from(this.activeRequests.values()).filter(
      request => request.shipperId === userId || request.transporterId === userId
    );
  }

  /**
   * Cancel an active request
   */
  async cancelRequest(requestId: string, userId: string): Promise<boolean> {
    try {
      const request = this.activeRequests.get(requestId);
      if (!request || request.shipperId !== userId) {
        return false;
      }

      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return false;

      const token = await currentUser.getIdToken();

      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/instant-request/${requestId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Remove from active requests
        this.activeRequests.delete(requestId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error canceling request:', error);
      return false;
    }
  }

  /**
   * Cleanup on app close
   */
  cleanup(): void {
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
      this.notificationInterval = null;
    }
    this.activeRequests.clear();
  }
}

export const instantRequestService = new InstantRequestService();
