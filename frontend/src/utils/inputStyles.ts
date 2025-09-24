// Global input styles to ensure consistent text visibility across all input fields
import { colors, fonts, spacing } from '../constants';

export const getInputStyles = (baseStyle: any = {}) => ({
  ...baseStyle,
  color: colors.text.primary,
  placeholderTextColor: colors.text.light,
});

export const commonInputStyles = {
  backgroundColor: colors.background,
  borderRadius: 8,
  padding: spacing.sm,
  fontSize: fonts.size.md,
  borderWidth: 1,
  borderColor: colors.text.light,
  color: colors.text.primary,
  placeholderTextColor: colors.text.light,
};

export const whiteInputStyles = {
  backgroundColor: colors.white,
  borderRadius: 8,
  padding: spacing.sm,
  fontSize: fonts.size.md,
  borderWidth: 1,
  borderColor: colors.text.light,
  color: colors.text.primary,
  placeholderTextColor: colors.text.light,
};

export const modalInputStyles = {
  backgroundColor: '#f3f4f6',
  borderRadius: 12,
  padding: spacing.md,
  fontSize: fonts.size.md,
  borderWidth: 1,
  borderColor: colors.text.light,
  color: colors.text.primary,
  placeholderTextColor: colors.text.light,
  marginBottom: spacing.md,
};
