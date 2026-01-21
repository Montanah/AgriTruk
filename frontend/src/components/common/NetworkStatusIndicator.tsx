import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../../constants';
import { checkNetworkConnectivity } from '../../utils/networkUtils';

interface NetworkStatusIndicatorProps {
  onRetry?: () => void;
  showWhenConnected?: boolean;
  style?: any;
}

const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  onRetry,
  showWhenConnected = false,
  style,
}) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const connected = await checkNetworkConnectivity();
      setIsConnected(connected);
      
      if (connected) {
        Animated.timing(fadeAnim, {
          toValue: showWhenConnected ? 1 : 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      console.error('Network check error:', error);
      setIsConnected(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } finally {
      setIsChecking(false);
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
    checkConnection();
  };

  if (isConnected === null || (isConnected && !showWhenConnected)) {
    return null;
  }

  const getStatusProps = () => {
    if (isConnected) {
      return {
        icon: 'wifi',
        color: colors.success,
        message: 'Connected',
        backgroundColor: colors.success + '10',
      };
    } else {
      return {
        icon: 'wifi-off',
        color: colors.error,
        message: 'No internet connection',
        backgroundColor: colors.error + '10',
      };
    }
  };

  const statusProps = getStatusProps();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          backgroundColor: statusProps.backgroundColor,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        <MaterialCommunityIcons
          name={statusProps.icon}
          size={16}
          color={statusProps.color}
        />
        <Text style={[styles.message, { color: statusProps.color }]}>
          {statusProps.message}
        </Text>
        {isChecking && (
          <MaterialCommunityIcons
            name="loading"
            size={16}
            color={statusProps.color}
            style={styles.loadingIcon}
          />
        )}
      </View>
      
      {!isConnected && onRetry && (
        <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
          <Text style={[styles.retryText, { color: statusProps.color }]}>
            Retry
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  message: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    marginLeft: spacing.xs,
  },
  loadingIcon: {
    marginLeft: spacing.xs,
  },
  retryButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.error,
  },
  retryText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.bold,
  },
});

export default NetworkStatusIndicator;





