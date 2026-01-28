import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../../constants';

interface PasswordStrengthIndicatorProps {
  password: string;
  confirmPassword?: string;
  showLabel?: boolean;
  containerStyle?: any;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  confirmPassword,
  showLabel = true,
  containerStyle,
}) => {
  const calculatePasswordStrength = (password: string): number => {
    let strength = 0;
    
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
    
    return Math.min(strength, 5); // Max strength of 5
  };

  const getPasswordStrengthText = (strength: number): string => {
    if (strength === 0) return 'Very Weak';
    if (strength === 1) return 'Weak';
    if (strength === 2) return 'Fair';
    if (strength === 3) return 'Good';
    if (strength === 4) return 'Strong';
    return 'Very Strong';
  };

  const getPasswordStrengthColor = (strength: number): string => {
    if (strength <= 1) return colors.error;
    if (strength === 2) return colors.warning;
    if (strength === 3) return colors.secondary;
    return colors.success;
  };

  const checkPasswordMatch = (password: string, confirmPassword?: string): boolean => {
    if (!confirmPassword) return true; // No confirm password provided
    return password === confirmPassword;
  };

  const strength = calculatePasswordStrength(password);
  const passwordsMatch = checkPasswordMatch(password, confirmPassword);
  const hasConfirmPassword = confirmPassword !== undefined;

  if (password.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {showLabel && (
        <Text style={styles.strengthLabel}>Password Strength:</Text>
      )}
      <View style={styles.strengthBarContainer}>
        <View style={styles.strengthBar}>
          <View 
            style={[
              styles.strengthBarFill, 
              { 
                width: `${(strength / 5) * 100}%`,
                backgroundColor: getPasswordStrengthColor(strength)
              }
            ]} 
          />
        </View>
        <Text style={[styles.strengthText, { color: getPasswordStrengthColor(strength) }]}>
          {getPasswordStrengthText(strength)}
        </Text>
      </View>
      
      {/* Password Match Indicator */}
      {hasConfirmPassword && confirmPassword && confirmPassword.length > 0 && (
        <View style={styles.matchContainer}>
          <View style={styles.matchIndicator}>
            <Text style={styles.matchIcon}>
              {passwordsMatch ? '✓' : '✗'}
            </Text>
            <Text style={[
              styles.matchText, 
              { color: passwordsMatch ? colors.success : colors.error }
            ]}>
              {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  strengthLabel: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  strengthBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  strengthBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.text.light + '30',
    borderRadius: 3,
    marginRight: spacing.sm,
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.3s ease',
  },
  strengthText: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
    minWidth: 80,
  },
  matchContainer: {
    marginTop: spacing.sm,
  },
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchIcon: {
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    marginRight: spacing.xs,
  },
  matchText: {
    fontSize: fonts.size.sm,
    fontWeight: '500',
  },
});

export default PasswordStrengthIndicator;
