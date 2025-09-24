import React from 'react';
import { View, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { colors, spacing, fonts } from '../../constants';
import { Ionicons } from '@expo/vector-icons';

type LocationInputProps = TextInputProps & {
  icon?: string;
};

const LocationInput = ({ icon = 'location-outline', ...props }: LocationInputProps) => (
  <View style={styles.container}>
    <Ionicons name={icon as any} size={20} color={colors.secondary} style={styles.icon} />
    <TextInput style={styles.input} placeholderTextColor={colors.text.light} {...props} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.text.light,
    marginBottom: spacing.lg,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
  },
});

export default LocationInput;
