import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, TextInput, FlatList, Linking } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import colors from '../constants/colors';
import { MOCK_TRANSPORTERS } from '../mocks/transporters';
import { mockTrip } from '../mocks/trip';
import { mockMessages } from '../mocks/messages';

const mockTransporter = MOCK_TRANSPORTERS[0];

const TripDetailsScreen = () => {
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
      <View style={[styles.bottomCard, { marginBottom: 24 }]}> {/* Add margin to avoid overlap with nav bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image source={{ uri: mockTransporter.photo }} style={styles.avatar} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.name}>{mockTransporter.name}</Text>
            <Text style={styles.vehicle}>{mockTransporter.vehicle} ({mockTransporter.reg})</Text>
            <Text style={styles.vehicleDetails}>Reg: <Text>{mockTransporter.reg}</Text></Text>
            <Text style={styles.vehicleDetails}>Trips Completed: <Text>{mockTransporter.tripsCompleted || 42}</Text></Text>
            <Text style={styles.rating}>Rating: {mockTransporter.rating} ★</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setChatVisible(true)}>
            <Ionicons name="chatbubble-ellipses" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setCallVisible(true)}>
            <Ionicons name="call" size={22} color={colors.secondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => Linking.openURL(`tel:${mockTransporter.phone}`)}>
            <MaterialCommunityIcons name="phone-forward" size={22} color={colors.tertiary} />
          </TouchableOpacity>
        </View>
        <View style={styles.tripInfoRow}>
          <FontAwesome5 name="map-marker-alt" size={16} color={colors.primary} />
          <Text style={styles.tripInfoText}>From: <Text>{mockTrip.from}</Text></Text>
          <FontAwesome5 name="flag-checkered" size={16} color={colors.secondary} style={{ marginLeft: 12 }} />
          <Text style={styles.tripInfoText}>To: <Text>{mockTrip.to}</Text></Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>Status: {mockTrip.status}</Text>
          <Text style={styles.statusText}>ETA: {mockTrip.eta} ({mockTrip.distance})</Text>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.cancelBtn, { marginBottom: 8, marginTop: 8, alignSelf: 'flex-start' }]}> {/* Move up and left */}
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
                placeholder="Type a message..."
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
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>Calling Transporter...</Text>
            <Text style={{ color: colors.text.secondary, marginBottom: 16 }}>{mockTransporter.name} ({mockTransporter.phone})</Text>
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
