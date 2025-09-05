import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import notificationService from '../services/notificationService';
import { BackendNotification } from '../services/notificationService';

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<BackendNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const response = await notificationService.getNotifications();
      if (response.success && response.data) {
        // Sort notifications by creation date (newest first)
        const sortedNotifications = response.data.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setNotifications(sortedNotifications);
      } else {
        console.error('Failed to fetch notifications:', response.message);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const loadNotifications = async () => {
    setLoading(true);
    await fetchNotifications();
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await notificationService.markAsRead(notificationId);
      if (response.success) {
        // Update local state
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === notificationId
              ? { ...notification, isRead: true }
              : notification
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await notificationService.deleteNotification(notificationId);
              if (response.success) {
                // Remove from local state
                setNotifications(prev =>
                  prev.filter(notification => notification.id !== notificationId)
                );
              } else {
                Alert.alert('Error', response.message || 'Failed to delete notification');
              }
            } catch (error) {
              console.error('Error deleting notification:', error);
              Alert.alert('Error', 'Failed to delete notification');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'booking':
        return 'car-outline';
      case 'payment':
        return 'card-outline';
      case 'subscription':
        return 'star-outline';
      case 'dispute':
        return 'warning-outline';
      case 'rating':
        return 'star-outline';
      default:
        return 'notifications-outline';
    }
  };

  const renderNotification = ({ item }: { item: BackendNotification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.isRead && styles.unreadNotification,
      ]}
      onPress={() => handleMarkAsRead(item.id)}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={getNotificationIcon(item.type)}
              size={24}
              color={item.isRead ? '#666' : '#007AFF'}
            />
          </View>
          <View style={styles.notificationText}>
            <Text
              style={[
                styles.notificationMessage,
                !item.isRead && styles.unreadText,
              ]}
            >
              {item.message}
            </Text>
            <Text style={styles.notificationTime}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteNotification(item.id)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
        {!item.isRead && <View style={styles.unreadIndicator} />}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-outline" size={64} color="#CCCCCC" />
      <Text style={styles.emptyStateTitle}>No Notifications</Text>
      <Text style={styles.emptyStateText}>
        You're all caught up! New notifications will appear here.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  notificationItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  notificationContent: {
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  notificationText: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: '600',
  },
  notificationTime: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
});

export default NotificationsScreen;
