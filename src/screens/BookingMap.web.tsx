import React from 'react';
import { View, Text } from 'react-native';

const BookingMap = React.forwardRef(() => (
  <View style={{ height: 200, marginBottom: 15, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' }}>
    <Text>Map not supported on web</Text>
  </View>
));

export default BookingMap;
