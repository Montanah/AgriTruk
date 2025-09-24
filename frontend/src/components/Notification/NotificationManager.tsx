import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useNotification } from './NotificationContext';
import EnhancedNotificationToast from './EnhancedNotificationToast';
import { enhancedNotificationService, EnhancedNotificationType, NotificationPriority } from '../../services/enhancedNotificationService';

interface NotificationItem {
  id: string;
  type: EnhancedNotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  icon?: string;
  color?: string;
  requiresAction?: boolean;
  actionText?: string;
  data?: any;
  timestamp: number;
}

const { height: screenHeight } = Dimensions.get('window');
const MAX_VISIBLE_NOTIFICATIONS = 3;
const NOTIFICATION_SPACING = 8;

const NotificationManager: React.FC = () => {
  const { notifications, markAsRead } = useNotification();
  const [visibleNotifications, setVisibleNotifications] = useState<NotificationItem[]>([]);
  const [notificationQueue, setNotificationQueue] = useState<NotificationItem[]>([]);

  // Convert context notifications to enhanced format
  useEffect(() => {
    const enhancedNotifications: NotificationItem[] = notifications
      .filter(notification => !notification.read)
      .map(notification => ({
        id: notification.id,
        type: 'booking_created' as EnhancedNotificationType, // Default type
        priority: 'normal' as NotificationPriority,
        title: notification.title,
        message: notification.message,
        requiresAction: false,
        data: notification.data,
        timestamp: notification.timestamp,
      }))
      .sort((a, b) => b.timestamp - a.timestamp);

    setNotificationQueue(prev => {
      const newNotifications = enhancedNotifications.filter(
        newNotif => !prev.some(existing => existing.id === newNotif.id)
      );
      return [...newNotifications, ...prev];
    });
  }, [notifications]);

  // Process notification queue
  useEffect(() => {
    if (notificationQueue.length > 0 && visibleNotifications.length < MAX_VISIBLE_NOTIFICATIONS) {
      const nextNotification = notificationQueue[0];
      setVisibleNotifications(prev => [...prev, nextNotification]);
      setNotificationQueue(prev => prev.slice(1));
    }
  }, [notificationQueue, visibleNotifications.length]);

  const handleNotificationPress = useCallback((notification: NotificationItem) => {
    // Mark as read
    markAsRead(notification.id);
    
    // Handle different notification types
    switch (notification.type) {
      case 'booking_accepted':
      case 'instant_request_accepted':
        // Navigate to chat or trip details
        break;
      case 'chat_message_received':
        // Navigate to chat
        break;
      case 'voice_call_incoming':
        // Handle incoming call
        break;
      case 'payment_failed':
        // Navigate to payment settings
        break;
      case 'document_expired':
        // Navigate to document upload
        break;
      default:
        // Default action or no action
        break;
    }
  }, [markAsRead]);

  const handleNotificationAction = useCallback((notification: NotificationItem) => {
    // Handle action based on notification type
    switch (notification.type) {
      case 'booking_accepted':
      case 'instant_request_accepted':
        // Start chat or view trip details
        break;
      case 'voice_call_incoming':
        // Answer call
        break;
      case 'payment_failed':
        // Update payment method
        break;
      case 'document_expired':
        // Upload new document
        break;
      case 'emergency_alert':
        // Handle emergency
        break;
      default:
        break;
    }
  }, []);

  const handleNotificationDismiss = useCallback((notificationId: string) => {
    setVisibleNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  }, []);

  const getNotificationConfig = (type: EnhancedNotificationType) => {
    const template = enhancedNotificationService.getTemplate(type);
    return {
      icon: template?.icon,
      color: template?.color,
      requiresAction: template?.requiresAction,
      actionText: template?.requiresAction ? 'View' : undefined,
    };
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {visibleNotifications.map((notification, index) => {
        const config = getNotificationConfig(notification.type);
        const topOffset = 50 + (index * (120 + NOTIFICATION_SPACING));
        
        return (
          <View
            key={notification.id}
            style={[
              styles.notificationWrapper,
              {
                top: Math.min(topOffset, screenHeight - 200),
                zIndex: 1000 - index,
              },
            ]}
          >
            <EnhancedNotificationToast
              id={notification.id}
              type={notification.type}
              priority={notification.priority}
              title={notification.title}
              message={notification.message}
              icon={config.icon}
              color={config.color}
              requiresAction={config.requiresAction}
              actionText={config.actionText}
              onPress={() => handleNotificationPress(notification)}
              onAction={() => handleNotificationAction(notification)}
              onDismiss={() => handleNotificationDismiss(notification.id)}
              duration={notification.priority === 'critical' ? 0 : 5000}
              autoHide={notification.priority !== 'critical'}
            />
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  notificationWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});

export default NotificationManager;

