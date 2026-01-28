import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../../constants';

interface StatusIndicatorProps {
  isActive: boolean;
  loading?: boolean;
  onToggle: () => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  customLabel?: {
    active: string;
    inactive: string;
  };
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  isActive,
  loading = false,
  onToggle,
  disabled = false,
  size = 'medium',
  showLabel = true,
  customLabel,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (loading) {
      // Pulse animation while loading
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [loading, pulseAnim]);

  const handlePress = () => {
    if (disabled || loading) return;

    // Scale animation on press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onToggle();
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return {
          containerSize: 40,
          iconSize: 16,
          fontSize: 12,
        };
      case 'large':
        return {
          containerSize: 80,
          iconSize: 32,
          fontSize: 16,
        };
      default:
        return {
          containerSize: 60,
          iconSize: 24,
          fontSize: 14,
        };
    }
  };

  const sizeConfig = getSizeConfig();
  const activeLabel = customLabel?.active || (isActive ? 'Active' : 'Inactive');
  const inactiveLabel = customLabel?.inactive || (isActive ? 'Active' : 'Inactive');

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { scale: scaleAnim },
            { scale: pulseAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.statusButton,
          {
            width: sizeConfig.containerSize,
            height: sizeConfig.containerSize,
            backgroundColor: isActive ? colors.success : colors.error,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        onPress={handlePress}
        disabled={disabled || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <MaterialCommunityIcons
            name="loading"
            size={sizeConfig.iconSize}
            color={colors.white}
          />
        ) : (
          <MaterialCommunityIcons
            name={isActive ? 'check' : 'close'}
            size={sizeConfig.iconSize}
            color={colors.white}
          />
        )}
      </TouchableOpacity>

      {showLabel && (
        <Text
          style={[
            styles.label,
            {
              fontSize: sizeConfig.fontSize,
              color: isActive ? colors.success : colors.error,
            },
          ]}
        >
          {isActive ? activeLabel : inactiveLabel}
        </Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusButton: {
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  label: {
    marginTop: spacing.xs,
    fontFamily: fonts.family.medium,
    textAlign: 'center',
  },
});

export default StatusIndicator;

