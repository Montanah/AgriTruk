import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { notificationService } from '../../services/notificationService';

const BookingCreationScreen = ({ navigation }) => {
  const [pickupLocation, setPickupLocation] = useState('');
  const [cargoDetails, setCargoDetails] = useState('');
  const [pickupTime, setPickupTime] = useState(''); // ISO string or readable string

  const handleCreateBooking = () => {
    // Basic validation
    if (!pickupLocation || !cargoDetails || !pickupTime) {
      Alert.alert('Error', 'Please fill all fields including pickup time.');
      return;
    }
    // TODO: Integrate with backend API
    const booking = {
      pickupLocation,
      cargoDetails,
      pickupTime, // as string
      status: 'pending',
    };
    // Mock users (replace with real user context)
    const customer = { id: 'C001', name: 'Green Agri Co.', email: 'info@greenagri.com', phone: '+254712345678' };
    const broker = { id: 'B001', name: 'BrokerX', email: 'brokerx@trukapp.com', phone: '+254700999888' };
    const admin = { id: 'ADMIN', name: 'Admin', email: 'admin@trukapp.com', phone: '+254700000000' };
    // Trigger notifications
    notificationService.sendEmail(
      customer.email,
      'Booking Created',
      `Hi ${customer.name}, your booking for ${cargoDetails} at ${pickupLocation} on ${pickupTime} has been created.`,
      'customer',
      'request_status',
      { booking }
    );
    notificationService.sendSMS(
      customer.phone,
      `Booking created: ${cargoDetails} at ${pickupLocation} on ${pickupTime}.`,
      'customer',
      'request_status',
      { booking }
    );
    notificationService.sendInApp(
      customer.id,
      `Your booking for ${cargoDetails} at ${pickupLocation} on ${pickupTime} has been created.`,
      'customer',
      'request_status',
      { booking }
    );
    // Notify broker
    notificationService.sendInApp(
      broker.id,
      `New booking created by ${customer.name}: ${cargoDetails} at ${pickupLocation} on ${pickupTime}.`,
      'broker',
      'request_allocated',
      { booking, customer }
    );
    // Notify admin
    notificationService.sendInApp(
      admin.id,
      `New booking created: ${cargoDetails} at ${pickupLocation} on ${pickupTime}.`,
      'admin',
      'request_allocated',
      { booking, customer }
    );
    // Placeholder: Show confirmation and reset form
    Alert.alert('Booking created!', 'API integration pending.');
    setPickupLocation('');
    setCargoDetails('');
    setPickupTime('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create a Booking</Text>
      <TextInput
        style={styles.input}
        placeholder="Pickup Location"
        value={pickupLocation}
        onChangeText={setPickupLocation}
      />
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
  },
  note: {
    marginTop: 20,
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default BookingCreationScreen;
