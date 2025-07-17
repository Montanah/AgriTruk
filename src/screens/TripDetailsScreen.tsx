import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { FlatList, Image, Linking, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import colors from '../constants/colors';
import { mockMessages } from '../mocks/messages';
import { MOCK_BOOKINGS } from '../mocks/bookings';
import { mockTrip } from '../mocks/trip';
import { notificationService } from '../../services/notificationService';

const TripDetailsScreen = () => {
  const route = useRoute();
  const params = route.params || {};
  // booking param should be passed in navigation
  const booking = params.booking || MOCK_BOOKINGS[0];
  const trip = params.trip || mockTrip;

  // Determine communication target: assigned driver (for company) or transporter
  let commTarget = null;
  if (booking.transporterType === 'company' && booking.assignedDriver) {
    commTarget = {
      name: booking.assignedDriver.name,
      phone: booking.assignedDriver.phone,
      photo: booking.assignedDriver.photo,
      role: 'Driver',
    };
  } else {
    // fallback: transporter info (mocked for now)
    commTarget = {
      name: 'Transporter',
      phone: '+254700000000',
      photo: 'https://randomuser.me/api/portraits/men/32.jpg',
      role: 'Transporter',
    };
  }

  const [chatVisible, setChatVisible] = useState(false);
  const [callVisible, setCallVisible] = useState(false);
  const [messages, setMessages] = useState(mockMessages);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (input.trim()) {
      setMessages([...messages, { id: Date.now().toString(), from: 'customer', text: input }]);
      setInput('');
    }
  };

  // Mock users for notification demo
  const customer = { id: 'C001', name: 'Green Agri Co.', email: 'info@greenagri.com', phone: '+254712345678' };
  const driver = { id: 'D001', name: commTarget.name, email: 'driver@trukapp.com', phone: commTarget.phone };
  const company = { id: 'COMP001', name: 'TransCo Ltd.', email: 'company@trukapp.com', phone: '+254700111222' };
  const broker = { id: 'B001', name: 'BrokerX', email: 'brokerx@trukapp.com', phone: '+254700999888' };
  const admin = { id: 'ADMIN', name: 'Admin', email: 'admin@trukapp.com', phone: '+254700000000' };

  // Notification triggers for trip status changes
  const notifyTripStatus = (status) => {
    const tripSummary = `${trip.from} to ${trip.to}`;
    // In-app
    notificationService.sendInApp(customer.id, `Trip status: ${status} for ${tripSummary}`, 'customer', 'request_status', { trip, status });
    notificationService.sendInApp(driver.id, `Trip status: ${status} for ${tripSummary}`, 'driver', 'request_status', { trip, status });
    notificationService.sendInApp(company.id, `Trip status: ${status} for ${tripSummary}`, 'transporter', 'request_status', { trip, status });
    notificationService.sendInApp(broker.id, `Trip status: ${status} for ${tripSummary}`, 'broker', 'request_status', { trip, status });
    notificationService.sendInApp(admin.id, `Trip status: ${status} for ${tripSummary}`, 'admin', 'request_status', { trip, status });
    // Email
    notificationService.sendEmail(customer.email, `Trip ${status}`, `Your trip ${tripSummary} is now ${status}.`, 'customer', 'request_status', { trip, status });
    notificationService.sendEmail(driver.email, `Trip ${status}`, `Trip ${tripSummary} is now ${status}.`, 'driver', 'request_status', { trip, status });
    notificationService.sendEmail(company.email, `Trip ${status}`, `Trip ${tripSummary} is now ${status}.`, 'transporter', 'request_status', { trip, status });
    notificationService.sendEmail(broker.email, `Trip ${status}`, `Trip ${tripSummary} is now ${status}.`, 'broker', 'request_status', { trip, status });
    notificationService.sendEmail(admin.email, `Trip ${status}`, `Trip ${tripSummary} is now ${status}.`, 'admin', 'request_status', { trip, status });
    // SMS
    notificationService.sendSMS(customer.phone, `Trip ${status}: ${tripSummary}`, 'customer', 'request_status', { trip, status });
    notificationService.sendSMS(driver.phone, `Trip ${status}: ${tripSummary}`, 'driver', 'request_status', { trip, status });
    notificationService.sendSMS(company.phone, `Trip ${status}: ${tripSummary}`, 'transporter', 'request_status', { trip, status });
    notificationService.sendSMS(broker.phone, `Trip ${status}: ${tripSummary}`, 'broker', 'request_status', { trip, status });
    notificationService.sendSMS(admin.phone, `Trip ${status}: ${tripSummary}`, 'admin', 'request_status', { trip, status });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{
        flex: 1,
        backgroundColor: '#e0e0e0',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
        margin: 12,
      }}>
        <Ionicons name="map" size={64} color="#bbb" />
        <Text style={{ color: '#888', fontSize: 18, marginTop: 12 }}>Map will appear here</Text>
        <Text style={{ color: '#aaa', fontSize: 13, marginTop: 4 }}>Enable Google Maps API for live tracking</Text>
      </View>
      {/* Bottom Card */}
      <View style={[styles.bottomCard, { marginBottom: 24 }]}> 
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image source={{ uri: commTarget.photo }} style={styles.avatar} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.name}>{commTarget.name} <Text style={{ color: colors.secondary, fontSize: 13 }}>({commTarget.role})</Text></Text>
            {booking.transporterType === 'company' && booking.assignedDriver && (
              <Text style={styles.vehicleDetails}>Assigned Driver for this trip</Text>
            )}
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setChatVisible(true)}>
            <Ionicons name="chatbubble-ellipses" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setCallVisible(true)}>
            <Ionicons name="call" size={22} color={colors.secondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => Linking.openURL(`tel:${commTarget.phone}`)}>
            <MaterialCommunityIcons name="phone-forward" size={22} color={colors.tertiary} />
          </TouchableOpacity>
        </View>
        <View style={styles.tripInfoRow}>
          <FontAwesome5 name="map-marker-alt" size={16} color={colors.primary} />
          <Text style={styles.tripInfoText}>From: <Text>{trip.from}</Text></Text>
          <FontAwesome5 name="flag-checkered" size={16} color={colors.secondary} style={{ marginLeft: 12 }} />
          <Text style={styles.tripInfoText}>To: <Text>{trip.to}</Text></Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>Status: {trip.status}</Text>
          <Text style={styles.statusText}>ETA: {trip.eta} ({trip.distance})</Text>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.cancelBtn, { marginBottom: 8, marginTop: 8, alignSelf: 'flex-start' }]} onPress={() => notifyTripStatus('cancelled')}> 
            <Text style={styles.cancelText}>Cancel Trip</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Chat Modal */}
      <Modal visible={chatVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.chatModal}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="chatbubble-ellipses" size={22} color={colors.primary} />
              <Text style={{ fontWeight: 'bold', fontSize: 16, marginLeft: 8 }}>In-app Chat</Text>
              <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={() => setChatVisible(false)}>
                <Ionicons name="close" size={22} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={messages}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={{ alignSelf: item.from === 'customer' ? 'flex-end' : 'flex-start', backgroundColor: item.from === 'customer' ? colors.primary : colors.surface, borderRadius: 12, padding: 8, marginVertical: 4, maxWidth: '75%' }}>
                  <Text style={{ color: item.from === 'customer' ? '#fff' : colors.text.primary }}>{item.text}</Text>
                </View>
              )}
              style={{ flex: 1, width: '100%' }}
              contentContainerStyle={{ paddingVertical: 8 }}
              inverted
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <TextInput
                style={{ flex: 1, backgroundColor: colors.background, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: colors.text.light }}
                value={input}
                onChangeText={setInput}
                placeholder={`Message ${commTarget.name}...`}
              />
              <TouchableOpacity onPress={sendMessage} style={{ marginLeft: 8 }}>
                <Ionicons name="send" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Call Modal (in-app call placeholder) */}
      <Modal visible={callVisible} animationType="fade" transparent>
        <View style={styles.modalBg}>
          <View style={styles.callModal}>
            <Ionicons name="call" size={48} color={colors.secondary} style={{ marginBottom: 12 }} />
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>Calling {commTarget.role}...</Text>
            <Text style={{ color: colors.text.secondary, marginBottom: 16 }}>{commTarget.name} ({commTarget.phone})</Text>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setCallVisible(false)}>
              <Text style={styles.cancelText}>End Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#eee' },
  name: { fontWeight: 'bold', fontSize: 17 },
  vehicle: { color: colors.text.secondary, fontSize: 14 },
  rating: { color: colors.secondary, fontWeight: 'bold', fontSize: 14 },
  vehicleDetails: { color: colors.text.secondary, fontSize: 13, marginTop: 1 },
  iconBtn: { marginLeft: 10, backgroundColor: colors.background, borderRadius: 20, padding: 8 },
  tripInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  tripInfoText: { marginLeft: 4, marginRight: 12, color: colors.text.primary, fontSize: 14 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  statusText: { color: colors.text.secondary, fontWeight: '600', fontSize: 14 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 },
  cancelBtn: { backgroundColor: colors.error, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 18 },
  cancelText: { color: '#fff', fontWeight: 'bold' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
  chatModal: { backgroundColor: colors.white, borderRadius: 18, padding: 16, width: '90%', height: 340, shadowColor: colors.black, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  callModal: { backgroundColor: colors.white, borderRadius: 18, padding: 24, alignItems: 'center', width: 300 },
});

export default TripDetailsScreen;
