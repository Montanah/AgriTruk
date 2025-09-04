import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';

const { width } = Dimensions.get('window');

interface ProfessionalAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  primaryButton?: {
    text: string;
    onPress: () => void;
    style?: 'primary' | 'secondary';
  };
  secondaryButton?: {
    text: string;
    onPress: () => void;
    style?: 'primary' | 'secondary';
  };
  onClose: () => void;
}

const ProfessionalAlert: React.FC<ProfessionalAlertProps> = ({
  visible,
  title,
  message,
  type = 'info',
  primaryButton,
  secondaryButton,
  onClose,
}) => {
  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'check-circle',
          gradientColors: [colors.success, colors.success + 'DD'],
          iconColor: colors.white,
          titleColor: colors.white,
        };
      case 'error':
        return {
          icon: 'alert-circle',
          gradientColors: [colors.error, colors.error + 'DD'],
          iconColor: colors.white,
          titleColor: colors.white,
        };
      case 'warning':
        return {
          icon: 'alert',
          gradientColors: [colors.warning, colors.warning + 'DD'],
          iconColor: colors.white,
          titleColor: colors.white,
        };
      default:
        return {
          icon: 'information',
          gradientColors: [colors.primary, colors.primaryDark],
          iconColor: colors.white,
          titleColor: colors.white,
        };
    }
  };

  const config = getTypeConfig();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          <LinearGradient
            colors={config.gradientColors}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name={config.icon as any}
                size={32}
                color={config.iconColor}
              />
            </View>
            <Text style={[styles.title, { color: config.titleColor }]}>
              {title}
            </Text>
          </LinearGradient>

          <View style={styles.content}>
            <Text style={styles.message}>{message}</Text>

            <View style={styles.buttonContainer}>
              {secondaryButton && (
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.secondaryButton,
                    secondaryButton.style === 'primary' && styles.primaryButtonStyle
                  ]}
                  onPress={secondaryButton.onPress}
                >
                  <Text style={[
                    styles.buttonText,
                    styles.secondaryButtonText,
                    secondaryButton.style === 'primary' && styles.primaryButtonText
                  ]}>
                    {secondaryButton.text}
                  </Text>
                </TouchableOpacity>
              )}

              {primaryButton && (
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.primaryButton,
                    primaryButton.style === 'secondary' && styles.secondaryButtonStyle
                  ]}
                  onPress={primaryButton.onPress}
                >
                  <Text style={[
                    styles.buttonText,
                    styles.primaryButtonText,
                    primaryButton.style === 'secondary' && styles.secondaryButtonText
                  ]}>
                    {primaryButton.text}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  alertContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    padding: spacing.xl,
    alignItems: 'center',
    paddingTop: spacing.xl + spacing.md,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  content: {
    padding: spacing.xl,
  },
  message: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButton: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
  },
  primaryButtonStyle: {
    backgroundColor: colors.primary,
    borderWidth: 0,
  },
  secondaryButtonStyle: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: colors.white,
  },
  secondaryButtonText: {
    color: colors.text.primary,
  },
});

export default ProfessionalAlert;
