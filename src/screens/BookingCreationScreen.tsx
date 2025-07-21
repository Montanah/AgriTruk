import React, { useState, useRef } from 'react';
import { View, Text, Button, StyleSheet, Alert, Platform } from 'react-native';
import MapView, { Marker, Polyline, LatLng } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { notificationService } from '../../services/notificationService';

const GOOGLE_MAPS_APIKEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

const BookingCreationScreen = ({ navigation }) => {
  const [pickupLocation, setPickupLocation] = useState('');
  const [pickupCoords, setPickupCoords] = useState<LatLng | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [dropoffCoords, setDropoffCoords] = useState<LatLng | null>(null);
  const [cargoDetails, setCargoDetails] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const mapRef = useRef<MapView>(null);

  // Helper: fetch directions from Google Directions API
  const fetchRoute = async (from: LatLng, to: LatLng) => {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${from.latitude},${from.longitude}&destination=${to.latitude},${to.longitude}&key=${GOOGLE_MAPS_APIKEY}&departure_time=now&traffic_model=best_guess`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      const points = decodePolyline(data.routes[0].overview_polyline.points);
      setRouteCoords(points);
      setDistance(data.routes[0].legs[0].distance.value / 1000); // in km
      setDuration(data.routes[0].legs[0].duration_in_traffic ? data.routes[0].legs[0].duration_in_traffic.value / 60 : data.routes[0].legs[0].duration.value / 60); // in min
      // Fit map to markers
      mapRef.current?.fitToCoordinates([from, to], { edgePadding: { top: 80, bottom: 80, left: 80, right: 80 }, animated: true });
    }
  };

  // Polyline decoder (Google encoded polyline)
  function decodePolyline(encoded: string): LatLng[] {
    let points: LatLng[] = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;
    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;
      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;
      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
  }

  // Cost estimation logic (simple: base + per km)
  const estimateCost = () => {
    if (!distance) return null;
    const base = 500; // base fare
    const perKm = 120; // per km rate
    return Math.round(base + perKm * distance);
  };

  const handleCreateBooking = () => {
    if (!pickupLocation || !dropoffLocation || !pickupTime || !pickupCoords || !dropoffCoords) {
      Alert.alert('Error', 'Please fill all fields and select locations.');
      return;
    }
    const booking = {
      pickupLocation,
      dropoffLocation,
      pickupCoords,
      dropoffCoords,
      cargoDetails,
      pickupTime,
      distance,
      duration,
      estimatedCost: estimateCost(),
      status: 'pending',
    };
    // Mock users (replace with real user context)
    const customer = { id: 'C001', name: 'Green Agri Co.', email: 'info@greenagri.com', phone: '+254712345678' };
    const broker = { id: 'B001', name: 'BrokerX', email: 'brokerx@trukapp.com', phone: '+254700999888' };
    const admin = { id: 'ADMIN', name: 'Admin', email: 'admin@trukapp.com', phone: '+254700000000' };
    notificationService.sendEmail(
      customer.email,
      'Booking Created',
      `Hi ${customer.name}, your booking from ${pickupLocation} to ${dropoffLocation} at ${pickupTime} has been created.`,
      'customer',
      'request_status',
      { booking }
    );
    notificationService.sendSMS(
      customer.phone,
      `Booking created: ${cargoDetails} from ${pickupLocation} to ${dropoffLocation} at ${pickupTime}.`,
      'customer',
      'request_status',
      { booking }
    );
    notificationService.sendInApp(
      customer.id,
      `Your booking from ${pickupLocation} to ${dropoffLocation} at ${pickupTime} has been created.`,
      'customer',
      'request_status',
      { booking }
    );
    notificationService.sendInApp(
      broker.id,
      `New booking created by ${customer.name}: ${cargoDetails} from ${pickupLocation} to ${dropoffLocation} at ${pickupTime}.`,
      'broker',
      'request_allocated',
      { booking, customer }
    );
    notificationService.sendInApp(
      admin.id,
      `New booking created: ${cargoDetails} from ${pickupLocation} to ${dropoffLocation} at ${pickupTime}.`,
      'admin',
      'request_allocated',
      { booking, customer }
    );
    Alert.alert('Booking created!', 'API integration pending.');
    setPickupLocation('');
    setDropoffLocation('');
    setPickupCoords(null);
    setDropoffCoords(null);
    setCargoDetails('');
    setPickupTime('');
    setDistance(null);
    setDuration(null);
    setRouteCoords([]);
  };

  // When both locations are set, fetch route
  React.useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      fetchRoute(pickupCoords, dropoffCoords);
    } else {
      setRouteCoords([]);
      setDistance(null);
      setDuration(null);
    }
  }, [pickupCoords, dropoffCoords]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create a Booking</Text>
      <GooglePlacesAutocomplete
        placeholder="Pickup Location"
        fetchDetails
        onPress={(data, details = null) => {
          setPickupLocation(data.description);
          if (details) {
            setPickupCoords({
              latitude: details.geometry.location.lat,
              longitude: details.geometry.location.lng,
            });
          }
        }}
        query={{
          key: GOOGLE_MAPS_APIKEY,
          language: 'en',
        }}
        styles={{
          textInput: styles.input,
        }}
        enablePoweredByContainer={false}
        nearbyPlacesAPI="GooglePlacesSearch"
        debounce={300}
      />
      <GooglePlacesAutocomplete
        placeholder="Dropoff Location"
        fetchDetails
        onPress={(data, details = null) => {
          setDropoffLocation(data.description);
          if (details) {
            setDropoffCoords({
              latitude: details.geometry.location.lat,
              longitude: details.geometry.location.lng,
            });
          }
        }}
        query={{
          key: GOOGLE_MAPS_APIKEY,
          language: 'en',
        }}
        styles={{
          textInput: styles.input,
        }}
        enablePoweredByContainer={false}
        nearbyPlacesAPI="GooglePlacesSearch"
        debounce={300}
      />
      <View style={{ height: 200, marginBottom: 15 }}>
        <MapView
          ref={mapRef}
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
      <TextInput
        style={styles.input}
        placeholder="Cargo Details"
        value={cargoDetails}
        onChangeText={setCargoDetails}
      />
      <TextInput
        style={styles.input}
        placeholder="Pickup Time (e.g. 2024-06-10 14:00)"
        value={pickupTime}
        onChangeText={setPickupTime}
      />
      {distance && duration && (
        <View style={styles.infoBox}>
          <Text>Distance: {distance.toFixed(2)} km</Text>
          <Text>ETA: {duration.toFixed(0)} min</Text>
          <Text>Estimated Cost: Ksh {estimateCost()}</Text>
        </View>
      )}
      <Button title="Create Booking" onPress={handleCreateBooking} />
      <Text style={styles.note}>
        * Date/time picker will be enabled after ejecting or using a custom dev client. For now, enter date/time manually.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  note: {
    marginTop: 20,
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
});

export default BookingCreationScreen;
