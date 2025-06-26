import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing } from '../../constants';

type DividerProps = {
  style?: ViewStyle;
};

const Divider = ({ style }: DividerProps) => <View style={[styles.divider, style]} />;

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: colors.surface,
    marginVertical: spacing.md,
    width: '100%',
  },
});

export default Divider;
