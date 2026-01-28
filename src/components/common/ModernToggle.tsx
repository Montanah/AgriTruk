import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../../constants';

interface ModernToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  description?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'success' | 'warning' | 'error';
}

const ModernToggle: React.FC<ModernToggleProps> = ({
  value,
  onValueChange,
  disabled = false,
  loading = false,
  label,
  description,
  size = 'medium',
  variant = 'default',
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const toValue = value ? 1 : 0;
    Animated.spring(translateX, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [value, translateX]);

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
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

    onValueChange(!value);
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return {
          trackWidth: 40,
          trackHeight: 20,
          thumbSize: 16,
          fontSize: 12,
        };
      case 'large':
        return {
          trackWidth: 60,
          trackHeight: 30,
          thumbSize: 24,
          fontSize: 16,
        };
      default:
        return {
          trackWidth: 50,
          trackHeight: 25,
          thumbSize: 20,
          fontSize: 14,
        };
    }
  };

  const getVariantConfig = () => {
    switch (variant) {
      case 'success':
        return {
          activeColor: colors.success,
          inactiveColor: colors.text.light,
        };
      case 'warning':
        return {
          activeColor: colors.warning,
          inactiveColor: colors.text.light,
        };
      case 'error':
        return {
          activeColor: colors.error,
          inactiveColor: colors.text.light,
        };
      default:
        return {
          activeColor: colors.primary,
          inactiveColor: colors.text.light,
        };
    }
  };

  const sizeConfig = getSizeConfig();
  const variantConfig = getVariantConfig();

  const trackWidth = sizeConfig.trackWidth;
  const thumbSize = sizeConfig.thumbSize;
  const maxTranslateX = trackWidth - thumbSize - 4; // 4 is padding

  return (
    <View style={styles.container}>
      {(label || description) && (
        <View style={styles.labelContainer}>
          {label && (
            <Text style={[styles.label, { fontSize: sizeConfig.fontSize }]}>
              {label}
            </Text>
          )}
          {description && (
            <Text style={[styles.description, { fontSize: sizeConfig.fontSize - 2 }]}>
              {description}
            </Text>
          )}
        </View>
      )}

      <Animated.View
        style={[
          styles.toggleContainer,
          {
            transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.track,
            {
              width: trackWidth,
              height: sizeConfig.trackHeight,
              backgroundColor: value
                ? variantConfig.activeColor
                : variantConfig.inactiveColor,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
          onPress={handlePress}
          disabled={disabled || loading}
          activeOpacity={0.8}
        >
          <Animated.View
            style={[
              styles.thumb,
              {
                width: thumbSize,
                height: thumbSize,
                transform: [
                  {
                    translateX: translateX.interpolate({
                      inputRange: [0, 1],
                      outputRange: [2, maxTranslateX],
                    }),
                  },
                ],
              },
            ]}
          >
            {loading ? (
              <MaterialCommunityIcons
                name="loading"
                size={thumbSize * 0.6}
                color={colors.white}
              />
            ) : (
              <MaterialCommunityIcons
                name={value ? 'check' : 'close'}
                size={thumbSize * 0.6}
                color={colors.white}
              />
            )}
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  label: {
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginBottom: 2,
  },
  description: {
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  toggleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    borderRadius: 15,
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  thumb: {
    backgroundColor: colors.white,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
});

export default ModernToggle;

