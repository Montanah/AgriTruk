import React, { useState, forwardRef } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { colors, spacing, fonts } from '../../constants';
import { Ionicons } from '@expo/vector-icons';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  secureTextEntryToggle?: boolean;
};

const Input = forwardRef<TextInput, InputProps>(({ label, error, secureTextEntryToggle, ...props }, ref) => {
  const [secure, setSecure] = useState(props.secureTextEntry);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrapper}>
        <TextInput
          ref={ref}
          style={styles.input}
          placeholderTextColor={colors.text.light}
          returnKeyType="next"
          blurOnSubmit={false}
          {...props}
          secureTextEntry={secure}
        />
        {secureTextEntryToggle && (
          <TouchableOpacity onPress={() => setSecure(!secure)}>
            <Ionicons name={secure ? 'eye-off' : 'eye'} size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    fontWeight: fonts.weight.medium as any,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.text.light,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
  },
  error: {
    color: colors.error,
    fontSize: fonts.size.xs,
    marginTop: spacing.xs,
  },
});

export default Input;
