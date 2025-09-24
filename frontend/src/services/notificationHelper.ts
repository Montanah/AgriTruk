// Temporary notification helper stub to fix build issues
export interface NotificationData {
  userId: string;
  role: string;
  [key: string]: any;
}

export class NotificationHelper {
  static async sendAuthNotification(type: string, data: NotificationData) {
    console.log('Auth notification:', type, data);
  }

  static async sendBookingNotification(type: string, data: NotificationData) {
    console.log('Booking notification:', type, data);
  }

  static async sendSubscriptionNotification(type: string, data: NotificationData) {
    console.log('Subscription notification:', type, data);
  }

  static async sendProfileNotification(type: string, data: NotificationData) {
    console.log('Profile notification:', type, data);
  }

  static async sendPaymentNotification(type: string, data: NotificationData) {
    console.log('Payment notification:', type, data);
  }

  static async sendSystemNotification(type: string, data: NotificationData) {
    console.log('System notification:', type, data);
  }
}