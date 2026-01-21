import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Share,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';
import { getDisplayBookingId, generateBookingId } from '../../utils/unifiedIdSystem';

const { width, height } = Dimensions.get('window');

interface SuccessBookingModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  booking?: any; // Booking data for generating user-friendly ID
  isConsolidated?: boolean;
  onViewBooking?: () => void;
  onContinue?: () => void;
}

const SuccessBookingModal: React.FC<SuccessBookingModalProps> = ({
  visible,
  onClose,
  bookingId,
  booking,
  isConsolidated = false,
  onViewBooking,
  onContinue,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      checkmarkScale.setValue(0);

      // Start entrance animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate checkmark with delay
      setTimeout(() => {
        Animated.spring(checkmarkScale, {
          toValue: 1,
          tension: 150,
          friction: 6,
          useNativeDriver: true,
        }).start();
      }, 200);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleShare = async () => {
    try {
      const message = `🚛 Booking Posted Successfully!\n\nBooking ID: ${bookingId}\n\nTrack your shipment in the TRUKapp.`;
      await Share.share({
        message,
        title: 'Booking Confirmation',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleViewBooking = () => {
    if (onViewBooking) {
      onViewBooking();
    } else {
      Alert.alert(
        'View Booking',
        'This feature will take you to your booking details.',
        [{ text: 'OK' }]
      );
    }
    handleClose();
  };

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    }
    handleClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={[colors.success, colors.success + 'DD']}
            style={styles.header}
          >
            <Animated.View
              style={[
                styles.iconContainer,
                { transform: [{ scale: checkmarkScale }] },
              ]}
            >
              <MaterialCommunityIcons
                name="check-circle"
                size={64}
                color={colors.white}
              />
            </Animated.View>
            <Text style={styles.title}>
              {isConsolidated ? 'Bookings Posted Successfully!' : 'Booking Posted Successfully!'}
            </Text>
            <Text style={styles.subtitle}>
              {isConsolidated 
                ? 'Your consolidated bookings have been posted and are now live.'
                : 'Your booking has been posted and is now live.'
              }
            </Text>
          </LinearGradient>

          <ScrollView 
            style={styles.contentScrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {/* Booking ID Section */}
            <View style={styles.bookingIdSection}>
              <View style={styles.bookingIdContainer}>
                <MaterialCommunityIcons
                  name="identifier"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.bookingIdLabel}>Booking ID</Text>
              </View>
              <View style={styles.bookingIdValueContainer}>
                <Text style={styles.bookingIdValue}>
                  {booking ? getDisplayBookingId(booking, bookingId) : bookingId}
                </Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => {
                    // Copy to clipboard functionality would go here
                    const displayId = booking ? getDisplayBookingId(booking, bookingId) : bookingId;
                    Alert.alert('Copied', `Booking ID ${displayId} copied to clipboard`);
                  }}
                >
                  <MaterialCommunityIcons
                    name="content-copy"
                    size={16}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Status Section */}
            <View style={styles.statusSection}>
              <View style={styles.statusItem}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={20}
                  color={colors.warning}
                />
                <Text style={styles.statusText}>Awaiting Transporter</Text>
              </View>
              <View style={styles.statusItem}>
                <MaterialCommunityIcons
                  name="bell-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.statusText}>Notifications Enabled</Text>
              </View>
            </View>

            {/* Next Steps */}
            <View style={styles.nextStepsSection}>
              <Text style={styles.nextStepsTitle}>What's Next?</Text>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepText}>
                  We'll notify you when a transporter accepts your request
                </Text>
              </View>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepText}>
                  Track your shipment in real-time
                </Text>
              </View>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepText}>
                  Receive updates on delivery status
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleShare}
              >
                <MaterialCommunityIcons
                  name="share"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.secondaryButtonText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleViewBooking}
              >
                <MaterialCommunityIcons
                  name="eye"
                  size={20}
                  color={colors.white}
                />
                <Text style={styles.primaryButtonText}>View Booking</Text>
              </TouchableOpacity>
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    backgroundColor: colors.white,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 20,
  },
  header: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 50,
    padding: spacing.md,
  },
  title: {
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fonts.size.md,
    color: colors.white + 'CC',
    textAlign: 'center',
    lineHeight: 22,
  },
  contentScrollView: {
    flexGrow: 0,
  },
  content: {
    padding: spacing.lg,
  },
  bookingIdSection: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bookingIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bookingIdLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  bookingIdValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookingIdValue: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.primary,
    fontFamily: 'monospace',
    flex: 1,
  },
  copyButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
    textAlign: 'center',
  },
  nextStepsSection: {
    marginBottom: spacing.lg,
  },
  nextStepsTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    color: colors.white,
  },
  stepText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    flex: 1,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: fonts.size.md,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  continueButton: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  continueButtonText: {
    color: colors.text.secondary,
    fontSize: fonts.size.md,
    fontWeight: '500',
  },
});

export default SuccessBookingModal;
