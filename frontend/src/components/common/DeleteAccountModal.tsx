import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  loading?: boolean;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  visible,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for account deletion.');
      return;
    }

    if (reason.trim().length < 10) {
      setError('Please provide a more detailed reason (at least 10 characters).');
      return;
    }

    setError('');
    await onConfirm(reason.trim());
  };

  const handleClose = () => {
    setReason('');
    setError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={32}
                color={colors.error}
              />
              <Text style={styles.title}>Delete Account</Text>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.warningText}>
                Are you sure you want to delete your account? This action cannot be undone.
              </Text>

              <Text style={styles.description}>
                Your account will be disabled immediately and marked for deletion. You will have 30 days to restore your account using the link sent to your email.
              </Text>

              <View style={styles.reasonSection}>
                <Text style={styles.reasonLabel}>
                  Reason for deletion <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.reasonHint}>
                  Please let us know why you're deleting your account. This helps us improve our service.
                </Text>
                <TextInput
                  style={[
                    styles.reasonInput,
                    error && styles.reasonInputError
                  ]}
                  value={reason}
                  onChangeText={(text) => {
                    setReason(text);
                    setError('');
                  }}
                  placeholder="Enter your reason here..."
                  placeholderTextColor={colors.text.light}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  editable={!loading}
                />
                {error ? (
                  <Text style={styles.errorText}>{error}</Text>
                ) : (
                  <Text style={styles.charCount}>
                    {reason.length}/500 characters
                  </Text>
                )}
              </View>
            </ScrollView>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.deleteButton,
                  loading && styles.deleteButtonDisabled
                ]}
                onPress={handleConfirm}
                disabled={loading || !reason.trim()}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="delete"
                      size={20}
                      color={colors.white}
                      style={styles.deleteIcon}
                    />
                    <Text style={styles.deleteButtonText}>Delete Account</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: colors.error,
    marginLeft: spacing.sm,
    fontFamily: fonts.family.bold,
  },
  scrollView: {
    maxHeight: 400,
  },
  scrollContent: {
    paddingBottom: spacing.sm,
  },
  warningText: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  description: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  reasonSection: {
    marginTop: spacing.md,
  },
  reasonLabel: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.error,
  },
  reasonHint: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  reasonInput: {
    borderWidth: 1.5,
    borderColor: colors.text.light,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: fonts.size.md,
    color: colors.text.primary,
    backgroundColor: colors.background,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  reasonInputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: fonts.size.sm,
    color: colors.error,
    marginTop: spacing.xs,
  },
  charCount: {
    fontSize: fonts.size.xs,
    color: colors.text.light,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.text.light,
  },
  cancelButtonText: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.white,
  },
  deleteIcon: {
    marginRight: spacing.xs,
  },
});

export default DeleteAccountModal;

