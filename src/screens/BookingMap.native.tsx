import React, { forwardRef } from 'react';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { View } from 'react-native';

const BookingMap = forwardRef(({ pickupCoords, dropoffCoords, routeCoords }, ref) => (
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
));

export default BookingMap;
