import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../constants';
import { checkNetworkStatus, checkApiHealth } from '../utils/networkErrorHandler';
import { API_BASE_URL } from '../constants/api';

interface NetworkStatusIndicatorProps {
  onRetry?: () => void;
  showDetails?: boolean;
}

const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  onRetry,
  showDetails = false,
}) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isApiHealthy, setIsApiHealthy] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [showIndicator, setShowIndicator] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    checkNetworkStatus();
    const interval = setInterval(checkNetworkStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkNetworkStatus = async () => {
    setIsChecking(true);
    
    try {
      // Check general internet connectivity
      const networkStatus = await checkNetworkStatus();
      setIsOnline(networkStatus);
      
      // Check API health if network is available
      if (networkStatus) {
        const apiStatus = await checkApiHealth(API_BASE_URL);
        setIsApiHealthy(apiStatus);
      } else {
        setIsApiHealthy(false);
      }
      
      // Show indicator if there are issues
      const shouldShow = !networkStatus || !apiStatus;
      setShowIndicator(shouldShow);
      
      if (shouldShow) {
        slideIn();
      } else {
        slideOut();
      }
    } catch (error) {
      console.error('Error checking network status:', error);
      setIsOnline(false);
      setIsApiHealthy(false);
      setShowIndicator(true);
      slideIn();
    } finally {
      setIsChecking(false);
    }
  };

  const slideIn = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const slideOut = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleRetry = () => {
    checkNetworkStatus();
    onRetry?.();
  };

  const getStatusMessage = () => {
    if (!isOnline) {
      return 'No internet connection. Please check your network settings.';
    }
    if (!isApiHealthy) {
      return 'Server is temporarily unavailable. Some features may not work.';
    }
    return 'Connection restored.';
  };

  const getStatusColor = () => {
    if (!isOnline) return colors.error;
    if (!isApiHealthy) return '#FF9800';
    return colors.success;
  };

  const getStatusIcon = () => {
    if (!isOnline) return 'wifi-off';
    if (!isApiHealthy) return 'wifi-alert';
    return 'wifi-check';
  };

  if (!showIndicator) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          backgroundColor: getStatusColor(),
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.statusInfo}>
          <MaterialCommunityIcons
            name={getStatusIcon()}
            size={20}
            color={colors.white}
          />
          <Text style={styles.statusText}>
            {getStatusMessage()}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleRetry}
          disabled={isChecking}
        >
          <MaterialCommunityIcons
            name={isChecking ? 'loading' : 'refresh'}
            size={16}
            color={colors.white}
          />
          <Text style={styles.retryText}>
            {isChecking ? 'Checking...' : 'Retry'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {showDetails && (
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsText}>
            Network: {isOnline ? 'Connected' : 'Disconnected'}
          </Text>
          <Text style={styles.detailsText}>
            API: {isApiHealthy ? 'Healthy' : 'Unavailable'}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingTop: 50, // Account for status bar
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.white,
    marginLeft: spacing.sm,
    flex: 1,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
  },
  retryText: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.medium,
    color: colors.white,
    marginLeft: 4,
  },
  detailsContainer: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  detailsText: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.regular,
    color: colors.white,
    opacity: 0.8,
  },
});

export default NetworkStatusIndicator;

