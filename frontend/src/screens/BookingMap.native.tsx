import React, { forwardRef } from 'react';
import { View, Text } from 'react-native';

let MapView, Marker, Polyline;
try {
  ({ default: MapView, Marker, Polyline } = require('react-native-maps'));
} catch (e) {
  MapView = forwardRef(({ children, ...props }: any, ref) => (
    <View style={{ height: 200, marginBottom: 15, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 20 }}>
        Maps not available in Expo Go
      </Text>
    </View>
  ));
  Marker = () => null;
  Polyline = () => null;
}

const BookingMap = forwardRef(({ pickupCoords, dropoffCoords, routeCoords }, ref) => {
  // If MapView is the fallback, just show the fallback View
  if (!MapView || MapView.name === 'ForwardRef' && MapView.render === undefined) {
    return (
      <View style={{ height: 200, marginBottom: 15, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 20 }}>
          Maps not available in Expo Go
        </Text>
      </View>
    );
  }
  
  return (
    <View style={{ height: 200, marginBottom: 15 }}>
      <MapView
        ref={ref}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: pickupCoords?.latitude || -1.2921,
          longitude: pickupCoords?.longitude || 36.8219,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        {pickupCoords && <Marker coordinate={pickupCoords} title="Pickup" />}
        {dropoffCoords && <Marker coordinate={dropoffCoords} title="Dropoff" pinColor="blue" />}
        {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="#4285F4" />}
      </MapView>
    </View>
  );
});
export default BookingMap;
