import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { fonts, spacing } from '../../constants';
import { 
  getMissingContactMessage, 
  hasIncompleteContactInfo,
  isPlaceholderEmail,
  isPlaceholderPhone 
} from '../../utils/contactUtils';

interface ContactCompletionPromptProps {
  email: string;
  phone: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  onEditProfile: () => void;
  onVerifyContact: (type: 'email' | 'phone') => void;
}

const ContactCompletionPrompt: React.FC<ContactCompletionPromptProps> = ({
  email,
  phone,
  emailVerified,
  phoneVerified,
  onEditProfile,
  onVerifyContact,
}) => {
  // Don't show if contact info is complete
  if (!hasIncompleteContactInfo(email, phone, emailVerified, phoneVerified)) {
    return null;
  }

  const message = getMissingContactMessage(email, phone, emailVerified, phoneVerified);
  const hasPlaceholderEmail = isPlaceholderEmail(email);
  const hasPlaceholderPhone = isPlaceholderPhone(phone);

  const handleAction = () => {
    if (hasPlaceholderEmail || hasPlaceholderPhone) {
      // User needs to edit profile to add missing contact info
      onEditProfile();
    } else if (!emailVerified || !phoneVerified) {
      // User needs to verify contact info
      if (!emailVerified) {
        onVerifyContact('email');
      } else if (!phoneVerified) {
        onVerifyContact('phone');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons 
          name={hasPlaceholderEmail || hasPlaceholderPhone ? "add-circle" : "checkmark-circle"} 
          size={20} 
          color={hasPlaceholderEmail || hasPlaceholderPhone ? colors.warning : colors.success} 
        />
        <Text style={styles.title}>{message.title}</Text>
      </View>
      
      <Text style={styles.description}>{message.description}</Text>
      
      <TouchableOpacity style={styles.actionButton} onPress={handleAction}>
        <Text style={styles.actionButtonText}>{message.action}</Text>
        <Ionicons name="arrow-forward" size={16} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.text.light + '30',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  description: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: fonts.size.sm,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
});

export default ContactCompletionPrompt;






