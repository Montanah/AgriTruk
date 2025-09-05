// /services/notificationService.ts
// Centralized notification service for TRUKAPP

export type NotificationChannel = 'email' | 'sms' | 'in-app';
export type NotificationAudience = 'driver' | 'transporter' | 'customer' | 'broker' | 'admin';
export type NotificationType =
  | 'driver_recruited'
  | 'vehicle_assigned'
  | 'request_allocated'
  | 'request_status'
  | 'tracking_near_pickup'
  | 'tracking_wrong_route'
  | 'admin_alert';

export interface NotificationPayload {
  to: string; // email, phone, or userId
  channel: NotificationChannel;
  audience: NotificationAudience;
  type: NotificationType;
  subject?: string;
  message: string;
  data?: any;
}

export interface BackendNotification {
  id: string;
  type: string;
  message: string;
  userId: string;
  userType: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: any;
}

import { pushInAppNotification } from '../src/components/Notification/NotificationContextSingleton';
import { API_ENDPOINTS } from '../src/constants/api';

class NotificationService {
  private async getAuthToken(): Promise<string> {
    const { getAuth } = await import('firebase/auth');
    const { auth } = await import('../src/firebaseConfig');
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    return await user.getIdToken();
  }

  /**
   * Get all notifications from backend
   */
  async getNotifications(): Promise<{ success: boolean; data?: BackendNotification[]; message?: string }> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(API_ENDPOINTS.NOTIFICATIONS, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get notifications');
      }

      return { success: true, data: data.data || data };
    } catch (error) {
      console.error('Error getting notifications:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to mark notification as read');
      }

      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}/${notificationId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete notification');
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Send notification (legacy method for in-app notifications)
   */
  async send(payload: NotificationPayload) {
    const { to, channel, audience, type, subject, message, data } = payload;
    if (channel === 'in-app') {
      pushInAppNotification({
        title: subject || (type ? type.replace(/_/g, ' ').toUpperCase() : 'Notification'),
        message,
        type,
      });
    }
    // In production, integrate with SendGrid, Twilio, FCM, etc. for email and sms
  }

  // Convenience methods
  async sendEmail(to: string, subject: string, message: string, audience: NotificationAudience, type: NotificationType, data?: any) {
    return this.send({ to, channel: 'email', audience, type, subject, message, data });
  }

  async sendSMS(to: string, message: string, audience: NotificationAudience, type: NotificationType, data?: any) {
    return this.send({ to, channel: 'sms', audience, type, message, data });
  }

  async sendInApp(to: string, message: string, audience: NotificationAudience, type: NotificationType, data?: any) {
    return this.send({ to, channel: 'in-app', audience, type, message, data });
  }
}

export const notificationService = new NotificationService();
