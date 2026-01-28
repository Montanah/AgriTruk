import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';

const { width } = Dimensions.get('window');

interface LogoutConfirmationDialogProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  message?: string;
  warningMessage?: string;
}

const LogoutConfirmationDialog: React.FC<LogoutConfirmationDialogProps> = ({
  visible,
  onConfirm,
  onCancel,
  message = 'Are you sure you want to logout?',
  warningMessage,
}) => {
  const [scaleAnim] = React.useState(new Animated.Value(0));
  const [fadeAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        ) : null}
        <Animated.View
          style={[
            styles.dialogContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <MaterialCommunityIcons
                name="logout-variant"
                size={36}
                color={colors.error}
              />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Confirm Logout</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Warning Message (optional) */}
          {warningMessage && (
            <View style={styles.warningContainer}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={18}
                color={colors.warning}
                style={styles.warningIcon}
              />
              <Text style={styles.warningText}>{warningMessage}</Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="logout"
                size={18}
                color={colors.white}
                style={styles.buttonIcon}
              />
              <Text style={styles.confirmButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  dialogContainer: {
    backgroundColor: colors.white,
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl + spacing.sm,
    paddingBottom: spacing.lg + spacing.sm,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 16,
    ...Platform.select({
      ios: {
        borderWidth: 0.5,
        borderColor: colors.border,
      },
    }),
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  iconBackground: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.error + '12',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.error + '20',
  },
  title: {
    fontSize: fonts.size.xl + 2,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  message: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    fontWeight: '400',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    marginBottom: spacing.lg,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  warningIcon: {
    marginRight: spacing.xs,
  },
  warningText: {
    flex: 1,
    fontSize: fonts.size.sm,
    color: colors.warning,
    fontWeight: '500',
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 52,
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.error,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  cancelButtonText: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: 0.2,
  },
  confirmButtonText: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.white,
    letterSpacing: 0.2,
  },
  buttonIcon: {
    marginRight: spacing.xs + 2,
  },
});

export default LogoutConfirmationDialog;

