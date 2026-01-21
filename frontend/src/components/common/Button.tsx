import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { colors, fonts, spacing } from '../../constants';

type ButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textColor?: string;
};

const Button = ({ title, onPress, loading, disabled, style, textColor }: ButtonProps) => (
  <TouchableOpacity
    style={[styles.button, style, disabled && styles.disabled]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.8}
  >
    {loading ? (
      <ActivityIndicator color={colors.white} />
    ) : (
      <Text style={[styles.text, textColor ? { color: textColor } : {}]}>{title}</Text>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  text: {
    color: colors.white,
    fontSize: fonts.size.lg,
    fontWeight: fonts.weight.bold as any,
    fontFamily: fonts.family.bold,
  },
  disabled: {
    backgroundColor: colors.text.light,
  },
});

export default Button;
