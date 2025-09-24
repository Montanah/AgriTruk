import React from 'react';
import { Image, StyleSheet, View, ViewStyle, Text } from 'react-native';
import { colors } from '../../constants';

type AvatarProps = {
  uri?: string;
  size?: number;
  style?: ViewStyle;
  name?: string;
};

const Avatar = ({ uri, size = 64, style, name }: AvatarProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, style]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
          {name && (
            <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
              {getInitials(name)}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.white,
    fontWeight: 'bold',
  },
});

export default Avatar;
