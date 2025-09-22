import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../../constants';
import { useNotification } from './NotificationContext';
import { EnhancedNotificationType, NotificationPriority } from '../../services/enhancedNotificationService';

interface NotificationCenterProps {
  onNotificationPress?: (notification: any) => void;
  onMarkAllRead?: () => void;
  showMarkAllRead?: boolean;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onNotificationPress,
  onMarkAllRead,
  showMarkAllRead = true,
}) => {
  const { notifications, markAsRead, markAllRead, refreshNotifications, loading } = useNotification();
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'urgent':
        return notification.priority === 'urgent' || notification.priority === 'critical';
      default:
        return true;
    }
  });

  const handleNotificationPress = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    onNotificationPress?.(notification);
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    onMarkAllRead?.();
  };

  const getNotificationIcon = (type: string, priority: NotificationPriority): string => {
    if (priority === 'critical') return 'alert-circle';
    if (priority === 'urgent') return 'alert';
    if (priority === 'high') return 'exclamation';
    
    switch (type) {
      case 'booking_accepted':
      case 'instant_request_accepted':
        return 'check-circle';
      case 'booking_rejected':
      case 'instant_request_rejected':
        return 'close-circle';
      case 'chat_message_received':
        return 'message';
      case 'voice_call_incoming':
        return 'phone';
      case 'payment_received':
        return 'cash';
      case 'payment_failed':
        return 'alert-circle';
      case 'trip_started':
        return 'play-circle';
      case 'trip_completed':
        return 'check-circle';
      case 'near_pickup':
      case 'near_delivery':
        return 'map-marker';
      default:
        return 'information';
    }
  };

  const getNotificationColor = (type: string, priority: NotificationPriority): string => {
    if (priority === 'critical') return colors.error;
    if (priority === 'urgent') return '#FF5722';
    if (priority === 'high') return '#FF9800';
    
    switch (type) {
      case 'booking_accepted':
      case 'instant_request_accepted':
      case 'trip_completed':
      case 'payment_received':
        return colors.success;
      case 'booking_rejected':
      case 'instant_request_rejected':
      case 'payment_failed':
        return colors.error;
      case 'chat_message_received':
        return colors.primary;
      case 'voice_call_incoming':
        return colors.success;
      case 'trip_started':
        return colors.info;
      case 'near_pickup':
      case 'near_delivery':
        return '#FF9800';
      default:
        return colors.text.secondary;
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  };

  const renderNotification = ({ item }: { item: any }) => {
    const icon = getNotificationIcon(item.type, item.priority);
    const color = getNotificationColor(item.type, item.priority);
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.read && styles.unreadNotification,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
            <MaterialCommunityIcons name={icon} size={20} color={color} />
          </View>
          
          <View style={styles.textContent}>
            <Text style={[styles.title, !item.read && styles.unreadText]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.message} numberOfLines={2}>
              {item.message}
            </Text>
            <Text style={styles.timestamp}>
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>
          
          {!item.read && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterButton = (filterType: 'all' | 'unread' | 'urgent', label: string, count?: number) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === filterType && styles.activeFilterButton]}
      onPress={() => setFilter(filterType)}
    >
      <Text style={[styles.filterButtonText, filter === filterType && styles.activeFilterButtonText]}>
        {label}
        {count !== undefined && ` (${count})`}
      </Text>
    </TouchableOpacity>
  );

  const unreadCount = notifications.filter(n => !n.read).length;
  const urgentCount = notifications.filter(n => n.priority === 'urgent' || n.priority === 'critical').length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {showMarkAllRead && unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllReadButton}>
            <Text style={styles.markAllReadText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {renderFilterButton('all', 'All', notifications.length)}
        {renderFilterButton('unread', 'Unread', unreadCount)}
        {renderFilterButton('urgent', 'Urgent', urgentCount)}
      </View>

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refreshNotifications}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="bell-outline"
              size={64}
              color={colors.text.light}
            />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'unread' 
                ? 'You\'re all caught up!'
                : filter === 'urgent'
                ? 'No urgent notifications'
                : 'You don\'t have any notifications yet'
              }
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fonts.size.xl,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  markAllReadButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  markAllReadText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.primary,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeFilterButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  activeFilterButtonText: {
    color: colors.white,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: spacing.lg,
  },
  notificationItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  notificationContent: {
    flexDirection: 'row',
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  unreadText: {
    fontFamily: fonts.family.bold,
  },
  message: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.regular,
    color: colors.text.light,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default NotificationCenter;

