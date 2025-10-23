import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../../constants';

interface EnhancedSubscriptionProgressBarProps {
  daysRemaining: number;
  totalDays: number;
  isTrial: boolean;
  statusColor: string;
  onPress?: () => void;
  showDetails?: boolean;
  animated?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

const EnhancedSubscriptionProgressBar: React.FC<EnhancedSubscriptionProgressBarProps> = ({
  daysRemaining,
  totalDays,
  isTrial,
  statusColor,
  onPress,
  showDetails = true,
  animated = true,
}) => {
  const [progressWidth] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [glowAnim] = useState(new Animated.Value(0));
  const [showTooltip, setShowTooltip] = useState(false);

  const progressPercentage = Math.max(0, Math.min(1, daysRemaining / totalDays));
  const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;
  const isExpired = daysRemaining <= 0;
  const isAlmostFull = daysRemaining >= totalDays * 0.9;

  useEffect(() => {
    if (animated) {
      // Animate progress bar fill
      Animated.timing(progressWidth, {
        toValue: progressPercentage,
        duration: 1000,
        useNativeDriver: false,
      }).start();

      // Add pulse animation for expiring soon
      if (isExpiringSoon) {
        const pulseAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        );
        pulseAnimation.start();

        // Add glow effect
        const glowAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: false,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: false,
            }),
          ])
        );
        glowAnimation.start();
      }
    } else {
      progressWidth.setValue(progressPercentage);
    }
  }, [progressPercentage, isExpiringSoon, animated]);

  const getProgressColor = () => {
    if (isExpired) return colors.error;
    if (isExpiringSoon) return '#FF9800';
    if (isAlmostFull) return colors.success;
    return statusColor;
  };

  const getProgressIcon = () => {
    if (isExpired) return 'alert-circle';
    if (isExpiringSoon) return 'clock-alert';
    if (isAlmostFull) return 'check-circle';
    return isTrial ? 'star' : 'shield-check';
  };

  const getProgressMessage = () => {
    if (isExpired) {
      return isTrial ? 'Trial expired' : 'Subscription expired';
    }
    if (isExpiringSoon) {
      return isTrial ? `Trial expires in ${daysRemaining} days` : `Renews in ${daysRemaining} days`;
    }
    if (isAlmostFull) {
      return isTrial ? 'Trial just started' : 'Subscription active';
    }
    return isTrial ? 'Free trial active' : 'Subscription active';
  };

  const getUrgencyLevel = () => {
    if (isExpired) return 'critical';
    if (isExpiringSoon) return 'warning';
    if (isAlmostFull) return 'success';
    return 'normal';
  };

  const renderMilestones = () => {
    const milestones = [
      { label: '25%', position: 0.25, color: colors.text.light },
      { label: '50%', position: 0.5, color: colors.text.light },
      { label: '75%', position: 0.75, color: colors.text.light },
    ];

    return milestones.map((milestone, index) => (
      <View
        key={index}
        style={[
          styles.milestone,
          {
            left: `${milestone.position * 100}%`,
            backgroundColor: progressPercentage >= milestone.position ? getProgressColor() : milestone.color,
          },
        ]}
      />
    ));
  };

  const renderTooltip = () => {
    if (!showTooltip || !showDetails) return null;

    return (
      <View style={styles.tooltip}>
        <Text style={styles.tooltipText}>
          {isTrial ? 'Free Trial' : 'Subscription'} Progress
        </Text>
        <Text style={styles.tooltipSubtext}>
          {daysRemaining} of {totalDays} days remaining
        </Text>
        <View style={styles.tooltipArrow} />
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onPressIn={() => setShowTooltip(true)}
      onPressOut={() => setShowTooltip(false)}
      activeOpacity={0.8}
    >
      {/* Progress Bar Container */}
      <View style={styles.progressContainer}>
        {/* Background Bar */}
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          {/* Animated Progress Fill */}
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: getProgressColor(),
                transform: [{ scaleY: pulseAnim }],
              },
            ]}
          >
            {/* Glow Effect for Expiring Soon */}
            {isExpiringSoon && (
              <Animated.View
                style={[
                  styles.glowEffect,
                  {
                    opacity: glowAnim,
                    backgroundColor: getProgressColor(),
                  },
                ]}
              />
            )}
          </Animated.View>

          {/* Milestones */}
          {showDetails && renderMilestones()}

          {/* Progress Icon */}
          <View
            style={[
              styles.progressIcon,
              {
                left: `${Math.min(95, Math.max(5, progressPercentage * 100))}%`,
                backgroundColor: getProgressColor(),
              },
            ]}
          >
            <MaterialCommunityIcons
              name={getProgressIcon()}
              size={16}
              color={colors.white}
            />
          </View>
        </View>

        {/* Progress Text */}
        <View style={styles.progressTextContainer}>
          <Text style={[styles.progressText, { color: getProgressColor() }]}>
            {getProgressMessage()}
          </Text>
          {showDetails && (
            <Text style={styles.progressPercentage}>
              {Math.round(progressPercentage * 100)}%
            </Text>
          )}
        </View>
      </View>

      {/* Tooltip */}
      {renderTooltip()}

      {/* Urgency Indicator */}
      {getUrgencyLevel() !== 'normal' && (
        <View style={[styles.urgencyIndicator, { backgroundColor: getProgressColor() }]}>
          <MaterialCommunityIcons
            name={getUrgencyLevel() === 'critical' ? 'alert' : 'clock-alert'}
            size={12}
            color={colors.white}
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  progressContainer: {
    marginVertical: spacing.sm,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 6,
    opacity: 0.3,
  },
  milestone: {
    position: 'absolute',
    top: -2,
    width: 4,
    height: 12,
    borderRadius: 2,
    zIndex: 2,
  },
  progressIcon: {
    position: 'absolute',
    top: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  progressText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    flex: 1,
  },
  progressPercentage: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.bold,
    color: colors.text.secondary,
  },
  tooltip: {
    position: 'absolute',
    top: -60,
    left: '50%',
    marginLeft: -60,
    backgroundColor: colors.text.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    zIndex: 10,
    minWidth: 120,
  },
  tooltipText: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.bold,
    color: colors.white,
    textAlign: 'center',
  },
  tooltipSubtext: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.regular,
    color: colors.white,
    textAlign: 'center',
    marginTop: 2,
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    marginLeft: -4,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.text.primary,
  },
  urgencyIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 4,
  },
});

export default EnhancedSubscriptionProgressBar;





