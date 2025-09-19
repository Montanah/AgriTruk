import React from 'react';
import { View, ViewStyle } from 'react-native';

type SpacerProps = {
  size?: number;
  style?: ViewStyle;
};

const Spacer = ({ size = 16, style }: SpacerProps) => (
  <View style={[{ height: size, width: size }, style]} />
);

export default Spacer;
