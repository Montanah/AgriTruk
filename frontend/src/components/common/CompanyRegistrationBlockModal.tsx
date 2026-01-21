import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';

interface CompanyRegistrationBlockModalProps {
  visible: boolean;
  completedTrips: number;
  tripsThreshold: number;
  onClose?: () => void;
}

const CompanyRegistrationBlockModal: React.FC<CompanyRegistrationBlockModalProps> = ({
  visible,
  completedTrips,
  tripsThreshold,
  onClose,
}) => {
  const navigation = useNavigation();

  const handleGoToCompanyProfile = () => {
    if (onClose) {
      onClose();
    }
    // Navigate to company profile screen where registration can be updated
    // This assumes the driver can access company profile or contact company admin
    navigation.navigate('ManageTransporter' as never, { transporterType: 'company' } as never);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.content}>
            {/* Header Icon */}
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={64}
                color={colors.error}
              />
            </View>

            {/* Title */}
            <Text style={styles.title}>Registration Required</Text>

            {/* Message */}
            <View style={styles.messageContainer}>
              <Text style={styles.message}>
                Your company has completed {completedTrips} trip{completedTrips !== 1 ? 's' : ''}, which exceeds the threshold of {tripsThreshold} trips.
              </Text>
              <Text style={styles.message}>
                To continue using TRUKapp services, your company must provide a registration number.
              </Text>
            </View>

            {/* Information Box */}
            <View style={styles.infoBox}>
              <MaterialCommunityIcons
                name="information"
                size={20}
                color={colors.primary}
                style={styles.infoIcon}
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>What You Need to Do:</Text>
                <Text style={styles.infoText}>
                  • Contact your company administrator{'\n'}
                  • Ask them to update the company registration number in the company profile{'\n'}
                  • Once updated, all drivers under the company will be able to continue using services
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleGoToCompanyProfile}
              >
                <MaterialCommunityIcons
                  name="office-building"
                  size={20}
                  color={colors.white}
                  style={styles.buttonIcon}
                />
                <Text style={styles.primaryButtonText}>
                  Go to Company Profile
                </Text>
              </TouchableOpacity>

              {onClose && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onClose}
                >
                  <Text style={styles.secondaryButtonText}>Close</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  content: {
    padding: spacing.xl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  messageContainer: {
    marginBottom: spacing.lg,
  },
  message: {
    fontSize: 16,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    lineHeight: 24,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  actionsContainer: {
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonIcon: {
    marginRight: spacing.xs,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.text.light,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
});

export default CompanyRegistrationBlockModal;
