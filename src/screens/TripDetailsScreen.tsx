import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { FlatList, Image, Linking, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { notificationService } from '../../services/notificationService';
import NotificationBell from '../components/Notification/NotificationBell';
import AvailableLoadsAlongRoute from '../components/TransporterService/AvailableLoadsAlongRoute';
import colors from '../constants/colors';
import { MOCK_BOOKINGS } from '../mocks/bookings';
import { mockMessages } from '../mocks/messages';
import { mockTrip } from '../mocks/trip';

const TripDetailsScreen = () => {
  const route = useRoute();
  const params = route.params || {};

  // Support consolidated instant requests: params.requests (array) or single booking/trip
  const requests = params.requests || null; // array of requests for consolidated
  const isConsolidated = Array.isArray(requests) && requests.length > 1;
  const isInstant = params.isInstant || false; // Flag for instant requests

  // booking param should be passed in navigation
  // Prefer navigation params for booking and trip, fallback to mock
  const booking = params.booking || (requests && requests[0]) || MOCK_BOOKINGS[0];
  const trip = params.trip || mockTrip;
  // If transporter/vehicle are passed directly, use them
  const selectedTransporter = params.transporter || booking.transporter;
  const selectedVehicle = params.vehicle || booking.vehicle;

  // Determine communication target: assigned driver (for company) or selected transporter
  let commTarget = null;
  let transporter = booking.transporter || {};
  if (booking.transporterType === 'company' && booking.assignedDriver) {
    commTarget = {
      name: booking.assignedDriver.name,
      phone: booking.assignedDriver.phone,
      photo: booking.assignedDriver.photo,
      role: 'Driver',
    };
  } else if (transporter && transporter.name) {
    commTarget = {
      name: transporter.name,
      phone: transporter.phone,
      photo: transporter.photo || 'https://randomuser.me/api/portraits/men/32.jpg',
      role: 'Transporter',
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

  // Use trip.id or booking.id as tripId for AvailableLoadsAlongRoute
  const tripId = trip.id || booking.id || 'TRIP123';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingTop: 18, paddingRight: 8 }}>
        <NotificationBell />
      </View>
      <View style={styles.mapCard}>
        <Ionicons name="map" size={64} color="#bbb" />
        <Text style={{ color: '#888', fontSize: 18, marginTop: 12, fontWeight: '600' }}>Map will appear here</Text>
        <Text style={{ color: '#aaa', fontSize: 13, marginTop: 4 }}>Enable Google Maps API for live tracking</Text>
      </View>
      {/* Available Loads Along Route - Only show for transporters */}
      {!isInstant && <AvailableLoadsAlongRoute tripId={tripId} />}
      <View style={styles.divider} />
      {/* Bottom Card - Clean, At-a-Glance Trip Details */}
      <View style={[styles.bottomCard, { marginBottom: 24 }]}>
        {/* Trip Reference and Status */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          {booking.reference && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="identifier" size={16} color={colors.secondary} style={{ marginRight: 4 }} />
              <Text style={{ color: colors.text.secondary, fontWeight: 'bold', fontSize: 13 }}>Ref: {booking.reference}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="progress-clock" size={16} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { fontSize: 15 }]}>Status: <Text style={{ color: colors.primary }}>{trip.status}</Text></Text>
          </View>
        </View>
        {/* Consolidated Requests Summary */}
        {isConsolidated ? (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontWeight: 'bold', color: colors.secondary, fontSize: 15, marginBottom: 4 }}>Consolidated Requests:</Text>
            <FlatList
              data={requests}
              keyExtractor={item => item.id}
              renderItem={({ item, index }) => (
                <View style={{ marginBottom: 6, backgroundColor: index % 2 === 0 ? colors.surface : colors.background, borderRadius: 8, padding: 8 }}>
                  <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Request ID: {item.id}</Text>
                  <Text style={{ color: colors.text.primary }}>From: <Text style={{ fontWeight: 'bold' }}>{item.fromLocation}</Text></Text>
                  <Text style={{ color: colors.text.primary }}>To: <Text style={{ fontWeight: 'bold' }}>{item.toLocation}</Text></Text>
                  <Text style={{ color: colors.text.secondary }}>Product: {item.productType} | {item.weight}kg</Text>
                </View>
              )}
              style={{ maxHeight: 120 }}
            />
          </View>
        ) : (
          <View style={[styles.tripInfoRow, { marginBottom: 4 }]}>
            <FontAwesome5 name="map-marker-alt" size={16} color={colors.primary} />
            <Text style={styles.tripInfoText}>From: <Text style={{ fontWeight: 'bold' }}>{booking.pickupLocation || trip.from}</Text></Text>
            <FontAwesome5 name="flag-checkered" size={16} color={colors.secondary} style={{ marginLeft: 12 }} />
            <Text style={styles.tripInfoText}>To: <Text style={{ fontWeight: 'bold' }}>{booking.toLocation || '--'}</Text></Text>
          </View>
        )}
        {/* ETA and Distance (distance in brackets, from params > booking > trip) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, backgroundColor: '#f5f5f5', borderRadius: 8, padding: 6, alignSelf: 'flex-start' }}>
          <Ionicons name="time" size={18} color={colors.secondary} style={{ marginRight: 4 }} />
          <Text style={[styles.tripInfoText, { fontWeight: 'bold', marginRight: 4 }]}>ETA:</Text>
          <Text style={[styles.tripInfoText, { fontWeight: 'bold', color: colors.primary }]}>{params.eta || booking.eta || trip.eta} {(params.distance || booking.distance || trip.distance) ? `(${params.distance || booking.distance || trip.distance})` : ''}</Text>
        </View>
        {/* Transporter & Vehicle Info - Enhanced with comprehensive details */}
        <View style={{ marginBottom: 8, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 }}>
          {/* Transporter Profile Section */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Image source={{ uri: (selectedTransporter && selectedTransporter.profilePhoto) || (selectedTransporter && selectedTransporter.photo) || commTarget.photo }} style={styles.avatar} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.name}>{(selectedTransporter && selectedTransporter.name) || commTarget.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <MaterialCommunityIcons name="star" size={14} color={colors.secondary} style={{ marginRight: 4 }} />
                <Text style={{ color: colors.secondary, fontWeight: 'bold', fontSize: 13 }}>
                  {selectedTransporter?.rating || 'N/A'}
                </Text>
                <Text style={{ color: colors.text.secondary, fontSize: 12, marginLeft: 8 }}>
                  {selectedTransporter?.tripsCompleted || 0} trips
                </Text>
              </View>
              <Text style={{ color: colors.text.secondary, fontSize: 12, marginTop: 2 }}>
                {selectedTransporter?.experience || 'N/A'} • {selectedTransporter?.availability || 'N/A'}
              </Text>
              {booking.transporterType === 'company' && booking.assignedDriver && (
                <Text style={styles.vehicleDetails}>Assigned Driver: {booking.assignedDriver.name}</Text>
              )}
            </View>
          </View>

          {/* Vehicle Photo and Details */}
          {selectedVehicle && (
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              <View
                style={{
                  width: 80,
                  height: 60,
                  borderRadius: 8,
                  backgroundColor: '#eee',
                  overflow: 'hidden',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}
              >
                <Image
                  source={{ uri: selectedVehicle.photo || 'https://via.placeholder.com/80x60?text=VEHICLE' }}
                  style={{ width: 80, height: 60, borderRadius: 8 }}
                  defaultSource={{ uri: 'https://via.placeholder.com/80x60?text=VEHICLE' }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 14, marginBottom: 2 }}>
                  {selectedVehicle.type}{selectedVehicle.bodyType ? ` (${selectedVehicle.bodyType})` : ''} • {selectedVehicle.make}
                </Text>
                <Text style={{ color: colors.text.secondary, fontSize: 12, marginBottom: 2 }}>
                  {selectedVehicle.color} • {selectedVehicle.capacity} • {selectedVehicle.plate}
                </Text>
                <Text style={{ color: colors.text.secondary, fontSize: 12 }}>
                  {selectedVehicle.driveType || 'N/A'} • {selectedVehicle.year || 'N/A'}
                </Text>
              </View>
            </View>
          )}

          {/* Special Features */}
          {selectedVehicle?.specialFeatures && selectedVehicle.specialFeatures.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
              {selectedVehicle.specialFeatures.map((feature, index) => (
                <View key={index} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginRight: 8,
                  marginBottom: 4,
                  backgroundColor: colors.primary + '15',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 8,
                }}>
                  <MaterialCommunityIcons name="check-circle" size={12} color={colors.primary} style={{ marginRight: 2 }} />
                  <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '500' }}>
                    {feature.replace('-', ' ')}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Insurance & GPS Status */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            {selectedVehicle?.insurance && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                <MaterialCommunityIcons name="shield-check" size={14} color={colors.success} style={{ marginRight: 4 }} />
                <Text style={{ color: colors.success, fontSize: 12, fontWeight: '500' }}>Insured</Text>
              </View>
            )}
            {selectedVehicle?.gpsTracking && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                <MaterialCommunityIcons name="crosshairs-gps" size={14} color={colors.secondary} style={{ marginRight: 4 }} />
                <Text style={{ color: colors.secondary, fontSize: 12, fontWeight: '500' }}>GPS Tracking</Text>
              </View>
            )}
          </View>

          {/* Estimated Cost */}
          {booking.estimatedCost && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: colors.background,
              padding: 8,
              borderRadius: 8,
              marginBottom: 8,
            }}>
              <Text style={{ color: colors.text.primary, fontWeight: 'bold', fontSize: 14 }}>
                Estimated Cost:
              </Text>
              <Text style={{ color: colors.secondary, fontWeight: 'bold', fontSize: 16 }}>
                sh. {booking.estimatedCost.toLocaleString('en-KE')}
              </Text>
            </View>
          )}

        </View>
      </View>
      {/* Action Row: Cancel + Contact Buttons */}
      <View style={styles.actionRowSplit}>
        <TouchableOpacity style={[styles.cancelBtn, { marginBottom: 8, marginTop: 8 }]} onPress={() => notifyTripStatus('cancelled')}>
          <Text style={styles.cancelText}>Cancel Trip</Text>
        </TouchableOpacity>
        <View style={styles.actionIconsRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setChatVisible(true)}>
            <Ionicons name="chatbubble-ellipses" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setCallVisible(true)}>
            <Ionicons name="call" size={22} color={colors.secondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => Linking.openURL(`tel:${(selectedTransporter && selectedTransporter.phone) || commTarget.phone}`)}>
            <MaterialCommunityIcons name="phone-forward" size={22} color={colors.tertiary} />
          </TouchableOpacity>
          {/* Add Map View button for instant requests */}
          {isInstant && (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('MapViewScreen', {
                booking: booking,
                isInstant: true
              })}
            >
              <MaterialCommunityIcons name="map" size={22} color={colors.success} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
      {/* Chat Modal */ }
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
  {/* Call Modal (in-app call placeholder) */ }
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
    </View >
  );
};

const styles = StyleSheet.create({
  mapCard: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    margin: 16,
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  divider: {
    height: 8,
    backgroundColor: '#f1f1f1',
    width: '100%',
    marginBottom: 0,
  },
  bottomCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    shadowColor: colors.black,
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 16,
    borderWidth: 0.5,
    borderColor: '#f0f0f0',
  },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#eee' },
  name: { fontWeight: 'bold', fontSize: 17 },
  vehicle: { color: colors.text.secondary, fontSize: 14 },
  rating: { color: colors.secondary, fontWeight: 'bold', fontSize: 14 },
  vehicleDetails: { color: colors.text.secondary, fontSize: 13, marginTop: 1 },
  iconBtn: {
    marginLeft: 0,
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 10,
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  tripInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  tripInfoText: { marginLeft: 4, marginRight: 12, color: colors.text.primary, fontSize: 14 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  statusText: { color: colors.text.secondary, fontWeight: '600', fontSize: 14 },
  actionRowSplit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    gap: 10,
  },
  actionIconsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelBtn: {
    backgroundColor: colors.error,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 22,
    shadowColor: colors.error,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cancelText: { color: '#fff', fontWeight: 'bold', fontSize: 15, letterSpacing: 0.2 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
  chatModal: { backgroundColor: colors.white, borderRadius: 18, padding: 16, width: '90%', height: 340, shadowColor: colors.black, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  callModal: { backgroundColor: colors.white, borderRadius: 18, padding: 24, alignItems: 'center', width: 300 },
});

export default TripDetailsScreen;
