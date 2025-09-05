import { API_ENDPOINTS } from '../constants/api';

export interface Notification {
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

export interface NotificationResponse {
  success: boolean;
  message: string;
  data?: Notification[];
}

export interface NotificationUpdateResponse {
  success: boolean;
  message: string;
  data?: Notification;
}

class NotificationService {
  private async getAuthToken(): Promise<string> {
    const { getAuth } = await import('firebase/auth');
    const { auth } = await import('../firebaseConfig');
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    return await user.getIdToken();
  }

  /**
   * Get all notifications for the current user
   */
  async getNotifications(): Promise<NotificationResponse> {
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

      return { success: true, message: 'Notifications retrieved successfully', data };
    } catch (error) {
      console.error('Error getting notifications:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<NotificationUpdateResponse> {
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

      return { success: true, message: 'Notification marked as read', data };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<NotificationUpdateResponse> {
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

      return { success: true, message: 'Notification deleted successfully', data };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{ success: boolean; message: string }> {
    try {
      const notificationsResponse = await this.getNotifications();
      
      if (!notificationsResponse.success || !notificationsResponse.data) {
        return { success: false, message: 'Failed to get notifications' };
      }

      const unreadNotifications = notificationsResponse.data.filter(n => !n.isRead);
      
      const markPromises = unreadNotifications.map(notification => 
        this.markAsRead(notification.id)
      );

      await Promise.all(markPromises);

      return { success: true, message: 'All notifications marked as read' };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, message: error.message };
    }
  }
}

export default new NotificationService();
