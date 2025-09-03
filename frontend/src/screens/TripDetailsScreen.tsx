import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, Linking, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { notificationService } from '../../services/notificationService';
import NotificationBell from '../components/Notification/NotificationBell';
import AvailableLoadsAlongRoute from '../components/TransporterService/AvailableLoadsAlongRoute';
import ExpoCompatibleMap from '../components/common/ExpoCompatibleMap';
import colors from '../constants/colors';
import { apiRequest } from '../utils/api';

interface TripDetailsParams {
  requests?: any[];
  isInstant?: boolean;
  booking?: any;
  trip?: any;
  transporter?: any;
  vehicle?: any;
  bookingId?: string;
  tripId?: string;
  userType?: 'shipper' | 'broker' | 'business' | 'transporter';
  eta?: string;
  distance?: string;
}

const TripDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const params = route.params as TripDetailsParams || {};

  // Support consolidated instant requests: params.requests (array) or single booking/trip
  const requests = params.requests || null; // array of requests for consolidated
  const isConsolidated = Array.isArray(requests) && requests.length > 1;
  const isInstant = params.isInstant || false; // Flag for instant requests

  // Get user type from params or determine from navigation context
  const userType = params.userType || 'shipper';

  // Determine if trip can be cancelled based on status and user type
  const canCancelTrip = () => {
    if (!currentBooking && !currentTrip) return false;

    const status = currentBooking?.status || currentTrip?.status || '';
    const inTransitStatuses = ['in_transit', 'in_progress', 'on_the_way', 'picked_up'];

    // Can't cancel if already in transit
    if (inTransitStatuses.includes(status.toLowerCase())) return false;

    // Only shippers and business users can cancel (not brokers on behalf of clients)
    if (userType === 'broker') return false;

    // Can cancel if pending, confirmed, or assigned
    const cancellableStatuses = ['pending', 'confirmed', 'assigned', 'accepted'];
    return cancellableStatuses.includes(status.toLowerCase());
  };

  // booking param should be passed in navigation
  const booking = params.booking || (requests && requests[0]) || null;
  const trip = params.trip || null;
  // If transporter/vehicle are passed directly, use them
  const selectedTransporter = params.transporter || booking?.transporter;
  const selectedVehicle = params.vehicle || booking?.vehicle;

  // State for real data
  const [bookingData, setBookingData] = useState(booking);
  const [tripData, setTripData] = useState(trip);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch booking and trip data if not provided
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Only try to fetch if we have IDs and the endpoints exist
        if (!bookingData && params.bookingId) {
          try {
            const bookingResponse = await apiRequest(`/bookings/${params.bookingId}`);
            setBookingData(bookingResponse);
          } catch (error) {
            console.log('Booking endpoint not available, using passed data');
            // Endpoint not available, use passed data
          }
        }

        if (!tripData && params.tripId) {
          try {
            const tripResponse = await apiRequest(`/trips/${params.tripId}`);
            setTripData(tripResponse);
          } catch (error) {
            console.log('Trip endpoint not available, using passed data');
            // Endpoint not available, use passed data
          }
        }

        // Fetch messages if we have a booking or trip and endpoint exists
        if ((bookingData?.id || tripData?.id) && params.bookingId) {
          try {
            const messagesResponse = await apiRequest(`/messages/${bookingData?.id || tripData?.id}`);
            setMessages(messagesResponse || []);
          } catch (error) {
            console.log('Messages endpoint not available, using empty array');
            setMessages([]);
          }
        }

      } catch (error) {
        console.error('Failed to fetch trip details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.bookingId, params.tripId]);

  // Use the fetched data or fallback to params
  const currentBooking = bookingData || booking;
  const currentTrip = tripData || trip;

  // Determine communication target: assigned driver (for company) or selected transporter
  let commTarget = null;
  let transporter = (booking && booking.transporter) || {};

  if (booking && booking.transporterType === 'company' && booking.assignedDriver) {
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
  const notifyTripStatus = (status: string) => {
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
  const tripId = (trip && trip.id) || (booking && booking.id) || 'TRIP123';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingTop: 18, paddingRight: 8 }}>
        <NotificationBell />
      </View>

      <View style={styles.mapCard}>
        <ExpoCompatibleMap
          style={styles.map}
          showUserLocation={true}
          markers={[
            // Pickup location marker
            ...(currentBooking && currentBooking.pickupLocation ? [{
              id: 'pickup',
              coordinate: {
                latitude: currentBooking.pickupLocation.latitude || -1.2921,
                longitude: currentBooking.pickupLocation.longitude || 36.8219,
              },
              title: 'Pickup Location',
              description: currentBooking.pickupLocation.address || 'Pickup point',
              pinColor: colors.primary,
            }] : []),
            // Delivery location marker
            ...(currentBooking && currentBooking.toLocation ? [{
              id: 'delivery',
              coordinate: {
                latitude: currentBooking.toLocation.latitude || -1.2921,
                longitude: currentBooking.toLocation.longitude || 36.8219,
              },
              title: 'Delivery Location',
              description: currentBooking.toLocation.address || 'Delivery point',
              pinColor: colors.secondary,
            }] : []),
            // Transporter location marker (if available)
            ...(currentTrip && currentTrip.currentLocation ? [{
              id: 'transporter',
              coordinate: {
                latitude: currentTrip.currentLocation.latitude || -1.2921,
                longitude: currentTrip.currentLocation.longitude || 36.8219,
              },
              title: 'Transporter Location',
              description: 'Current position',
              pinColor: colors.success,
            }] : []),
          ]}
          initialRegion={{
            latitude: -1.2921, // Nairobi
            longitude: 36.8219,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        />
      </View>

      {/* Available Loads Along Route - Only show for transporters */}
      {!isInstant && <AvailableLoadsAlongRoute tripId={tripId} />}

      <View style={styles.divider} />

      {/* Bottom Card - Clean, At-a-Glance Trip Details */}
      <View style={[styles.bottomCard, { marginBottom: 24 }]}>
        {/* Trip Reference and Status */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          {booking && booking.reference && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="identifier" size={16} color={colors.secondary} style={{ marginRight: 4 }} />
              <Text style={{ color: colors.text.secondary, fontWeight: 'bold', fontSize: 13 }}>Ref: {booking.reference}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="progress-clock" size={16} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { fontSize: 15 }]}>
              Status: <Text style={{ color: colors.primary }}>
                {trip && trip.status ? trip.status : 'Pending'}
              </Text>
            </Text>
          </View>
        </View>

        {/* User Type Specific Info */}
        {userType === 'broker' && (
          <View style={{ marginBottom: 8, backgroundColor: '#f0f8ff', borderRadius: 8, padding: 8 }}>
            <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>
              📋 Managing on behalf of client
            </Text>
          </View>
        )}

        {/* Route Information */}
        <View style={[styles.tripInfoRow, { marginBottom: 4 }]}>
          <FontAwesome5 name="map-marker-alt" size={16} color={colors.primary} />
          <Text style={styles.tripInfoText}>From: <Text style={{ fontWeight: 'bold' }}>{booking && booking.pickupLocation ? booking.pickupLocation : (trip && trip.from ? trip.from : '--')}</Text></Text>
          <FontAwesome5 name="flag-checkered" size={16} color={colors.secondary} style={{ marginLeft: 12 }} />
          <Text style={styles.tripInfoText}>To: <Text style={{ fontWeight: 'bold' }}>{booking && booking.toLocation ? booking.toLocation : '--'}</Text></Text>
        </View>

        {/* ETA and Distance */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, backgroundColor: '#f5f5f5', borderRadius: 8, padding: 6, alignSelf: 'flex-start' }}>
          <Ionicons name="time" size={18} color={colors.secondary} style={{ marginRight: 4 }} />
          <Text style={[styles.tripInfoText, { fontWeight: 'bold', marginRight: 4 }]}>ETA:</Text>
          <Text style={[styles.tripInfoText, { fontWeight: 'bold', color: colors.primary }]}>
            {params.eta || (booking && booking.eta) || (trip && trip.eta) || '--'}
            {(params.distance || (booking && booking.distance) || (trip && trip.distance)) ?
              ` (${params.distance || (booking && booking.distance) || (trip && trip.distance)})` : ''}
          </Text>
        </View>

        {/* Transporter Info */}
        <View style={{ marginBottom: 8, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 }}>
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
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRowSplit}>
          {canCancelTrip() && (
            <TouchableOpacity style={[styles.cancelBtn, { marginBottom: 8, marginTop: 8 }]} onPress={() => notifyTripStatus('cancelled')}>
              <Text style={styles.cancelText}>Cancel Trip</Text>
            </TouchableOpacity>
          )}
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
            {isInstant && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => navigation.navigate('MapViewScreen', {
                  booking: booking || {},
                  isInstant: true
                })}
              >
                <MaterialCommunityIcons name="map" size={22} color={colors.success} />
              </TouchableOpacity>
            )}
          </View>
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

      {/* Call Modal */}
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
  mapCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 22,
    margin: 16,
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  map: {
    height: 300,
    width: '100%',
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
  tripInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  tripInfoText: { marginLeft: 4, marginRight: 12, color: colors.text.primary, fontSize: 14 },
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

