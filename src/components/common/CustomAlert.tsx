import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';

const { width } = Dimensions.get('window');

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: AlertButton[];
  onClose?: () => void;
}

const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  buttons = [{ text: 'OK' }],
  onClose,
}) => {
  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    if (onClose) {
      onClose();
    }
  };

  const getButtonStyle = (button: AlertButton, index: number) => {
    const isLast = index === buttons.length - 1;
    const isCancel = button.style === 'cancel';
    const isDestructive = button.style === 'destructive';

    if (isCancel) {
      return [styles.button, styles.cancelButton, isLast && styles.lastButton];
    }
    if (isDestructive) {
      return [styles.button, styles.destructiveButton, isLast && styles.lastButton];
    }
    return [styles.button, styles.defaultButton, isLast && styles.lastButton];
  };

  const getButtonTextStyle = (button: AlertButton) => {
    const isCancel = button.style === 'cancel';
    const isDestructive = button.style === 'destructive';

    if (isCancel) {
      return [styles.buttonText, styles.cancelButtonText];
    }
    if (isDestructive) {
      return [styles.buttonText, styles.destructiveButtonText];
    }
    return [styles.buttonText, styles.defaultButtonText];
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={24}
              color={colors.error}
              style={styles.icon}
            />
            <Text style={styles.title}>{title}</Text>
          </View>

          {/* Message */}
          <View style={styles.messageContainer}>
            <Text style={styles.message}>{message}</Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={getButtonStyle(button, index)}
                onPress={() => handleButtonPress(button)}
                activeOpacity={0.7}
              >
                <Text style={getButtonTextStyle(button)}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  alertContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  icon: {
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.primary,
    flex: 1,
  },
  messageContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  message: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  lastButton: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 16,
  },
  defaultButton: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 16,
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  destructiveButton: {
    backgroundColor: colors.error,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 16,
  },
  buttonText: {
    fontSize: fonts.size.md,
    fontWeight: '600',
  },
  defaultButtonText: {
    color: colors.white,
  },
  cancelButtonText: {
    color: colors.text.secondary,
  },
  destructiveButtonText: {
    color: colors.white,
  },
});

export default CustomAlert;
