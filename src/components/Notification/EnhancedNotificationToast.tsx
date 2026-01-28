import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  PanGestureHandler,
  State,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../../constants';
import { EnhancedNotificationType, NotificationPriority } from '../../services/enhancedNotificationService';

interface NotificationToastProps {
  id: string;
  type: EnhancedNotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  icon?: string;
  color?: string;
  requiresAction?: boolean;
  actionText?: string;
  onPress?: () => void;
  onAction?: () => void;
  onDismiss?: () => void;
  duration?: number;
  autoHide?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

const EnhancedNotificationToast: React.FC<NotificationToastProps> = ({
  id,
  type,
  priority,
  title,
  message,
  icon,
  color,
  requiresAction,
  actionText,
  onPress,
  onAction,
  onDismiss,
  duration = 5000,
  autoHide = true,
}) => {
  const translateX = useRef(new Animated.Value(screenWidth)).current;
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide timer
    if (autoHide && duration > 0) {
      const timer = setTimeout(() => {
        hideNotification();
      }, duration);

      // Progress bar animation
      Animated.timing(progress, {
        toValue: 0,
        duration,
        useNativeDriver: false,
      }).start();

      return () => clearTimeout(timer);
    }
  }, []);

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: screenWidth,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  };

  const handlePress = () => {
    onPress?.();
    if (!requiresAction) {
      hideNotification();
    }
  };

  const handleAction = () => {
    onAction?.();
    hideNotification();
  };

  const getPriorityColor = (priority: NotificationPriority): string => {
    switch (priority) {
      case 'critical':
        return colors.error;
      case 'urgent':
        return '#FF5722';
      case 'high':
        return '#FF9800';
      case 'normal':
        return colors.primary;
      case 'low':
        return colors.text.secondary;
      default:
        return colors.primary;
    }
  };

  const getPriorityIcon = (priority: NotificationPriority): string => {
    switch (priority) {
      case 'critical':
        return 'alert-circle';
      case 'urgent':
        return 'alert';
      case 'high':
        return 'exclamation';
      case 'normal':
        return 'information';
      case 'low':
        return 'information-outline';
      default:
        return 'information';
    }
  };

  const notificationColor = color || getPriorityColor(priority);
  const priorityIcon = getPriorityIcon(priority);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX },
            { translateY },
            { scale },
          ],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.toast,
          { borderLeftColor: notificationColor },
          priority === 'critical' && styles.criticalToast,
          priority === 'urgent' && styles.urgentToast,
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {/* Progress bar */}
        {autoHide && duration > 0 && (
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: notificationColor,
              },
            ]}
          />
        )}

        <View style={styles.content}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: notificationColor + '20' }]}>
            <MaterialCommunityIcons
              name={icon || priorityIcon}
              size={24}
              color={notificationColor}
            />
          </View>

          {/* Text content */}
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: notificationColor }]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.message} numberOfLines={2}>
              {message}
            </Text>
          </View>

          {/* Action button */}
          {requiresAction && actionText && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: notificationColor }]}
              onPress={handleAction}
            >
              <Text style={styles.actionText}>{actionText}</Text>
            </TouchableOpacity>
          )}

          {/* Dismiss button */}
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={hideNotification}
          >
            <MaterialCommunityIcons
              name="close"
              size={20}
              color={colors.text.light}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
  },
  toast: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  criticalToast: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: colors.error,
  },
  urgentToast: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  progressBar: {
    height: 3,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    marginBottom: 2,
  },
  message: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    lineHeight: 18,
  },
  actionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  actionText: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  dismissButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default EnhancedNotificationToast;

