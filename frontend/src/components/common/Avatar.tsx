import React from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../../constants';

type AvatarProps = {
  uri?: string;
  size?: number;
  style?: ViewStyle;
};

const Avatar = ({ uri, size = 64, style }: AvatarProps) => (
  <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, style]}>
    {uri ? (
      <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
    ) : (
      <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]} />
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: colors.text.light,
  },
});

export default Avatar;
