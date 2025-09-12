import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import APITestComponent from '../components/APITestComponent';
import Divider from '../components/common/Divider';
import NetworkTest from '../components/NetworkTest';
import TransporterProfile from '../components/TransporterService/TransporterProfile';
import { fonts, spacing } from '../constants';
import colors from '../constants/colors';
import { API_ENDPOINTS } from '../constants/api';
import { testBackendConnectivity, testTerminalLogging } from '../utils/api';

export default function TransporterHomeScreen() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectivityStatus, setConnectivityStatus] = useState<string>('');

  const testBackend = async () => {
    console.log('🔍 Testing backend connectivity...');
    setConnectivityStatus('Testing...');
    try {
      const isConnected = await testBackendConnectivity();
      setConnectivityStatus(isConnected ? '✅ Backend Connected' : '❌ Backend Not Connected');
    } catch (error) {
      console.error('Backend test failed:', error);
      setConnectivityStatus('❌ Test Failed');
    }
  };

  const testLogging = () => {
    console.log('🧪 Testing terminal logging...');
    testTerminalLogging();
    setConnectivityStatus('✅ Logging Test Sent - Check Terminal');
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { getAuth } = require('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) throw new Error('Not authenticated');
        const token = await user.getIdToken();
        console.log('='.repeat(80));
        console.log('🚀 TRANSPORTER PROFILE REQUEST FOR BACKEND ENGINEER');
        console.log('='.repeat(80));
        console.log('📍 Endpoint:', `${API_ENDPOINTS.TRANSPORTERS}/${user.uid}`);
        console.log('📋 Method: GET');
        console.log('⏰ Request Timestamp:', new Date().toISOString());
        console.log('🔑 Auth Token Present:', token ? 'YES' : 'NO');
        if (token) {
          console.log('🔑 Token Preview:', `${token.substring(0, 30)}...`);
        }
        console.log('👤 User UID:', user.uid);
        console.log('='.repeat(80));

        const res = await fetch(`${API_ENDPOINTS.TRANSPORTERS}/${user.uid}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        console.log('='.repeat(80));
        console.log('📊 TRANSPORTER PROFILE RESPONSE FOR BACKEND ENGINEER');
        console.log('='.repeat(80));
        console.log('📍 Endpoint:', `${API_ENDPOINTS.TRANSPORTERS}/${user.uid}`);
        console.log(`📋 Response Status: ${res.status} ${res.statusText}`);
        console.log('⏰ Response Timestamp:', new Date().toISOString());
        console.log('📋 Response Headers:', JSON.stringify(Object.fromEntries(res.headers.entries()), null, 2));

        if (res.ok) {
          const data = await res.json();
          console.log('✅ Transporter profile retrieved successfully');
          console.log('📦 Response Data:', JSON.stringify(data, null, 2));
          setProfile(data.transporter);
        } else if (res.status === 404) {
          console.log('⚠️ Transporter profile not found - redirecting to completion');
          console.log('📦 404 Response Data: Profile not found');
          // Profile doesn't exist yet, redirect to profile completion
          navigation.navigate('TransporterCompletionScreen');
        } else {
          const errorData = await res.json();
          console.log('❌ Failed to fetch transporter profile');
          console.log('📦 Error Response Data:', JSON.stringify(errorData, null, 2));
          throw new Error('Failed to fetch profile');
        }
        console.log('='.repeat(80));
      } catch (err) {
        setError(err.message || 'Failed to load profile');
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  // Fetch requests and current trip data
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const { getAuth } = require('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          const res = await fetch(`${API_ENDPOINTS.TRANSPORTERS}/requests`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          const data = await res.json();
          setRequests(data.requests || []);
        }
      } catch (error) {
        console.error('Error fetching requests:', error);
      }
    };
    
    const fetchCurrentTrip = async () => {
      try {
        const { getAuth } = require('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          const res = await fetch(`${API_ENDPOINTS.TRANSPORTERS}/current-trip`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          const data = await res.json();
          setCurrentTrip(data.trip || null);
        }
      } catch (error) {
        console.error('Error fetching current trip:', error);
      }
    };
    
    fetchRequests();
    fetchCurrentTrip();
  }, []);

  // Real API integration - no mock data
  const [requests, setRequests] = useState([]);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleAccept = (req) => {
    setCurrentTrip({ ...req, status: 'On Transit' });
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    setShowModal(false);
  };

  const handleReject = (req) => {
    setRequests((prev) => prev.map(r => r.id === req.id ? { ...r, status: 'Rejected' } : r));
    setShowModal(false);
  };

  const openRequestModal = (req) => {
    setSelectedRequest(req);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.primary, fontWeight: 'bold' }}>Loading profile...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={{ color: colors.error, fontWeight: 'bold' }}>{error}</Text>
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Transporter Dashboard</Text>

      {/* Backend Connectivity Test */}
      <TouchableOpacity style={styles.testButton} onPress={testBackend}>
        <Text style={styles.testButtonText}>Test Backend Connection</Text>
      </TouchableOpacity>

      {/* Terminal Logging Test */}
      <TouchableOpacity style={[styles.testButton, { backgroundColor: colors.secondary }]} onPress={testLogging}>
        <Text style={styles.testButtonText}>Test Terminal Logging</Text>
      </TouchableOpacity>

      {connectivityStatus ? (
        <Text style={styles.connectivityStatus}>{connectivityStatus}</Text>
      ) : null}

      {/* API Test Component */}
      <APITestComponent />

      {/* Network Test Component */}
      <NetworkTest />

      <Divider style={{ marginVertical: spacing.md }} />
      {/* Profile Details */}
      {profile && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profile Details</Text>
          <TransporterProfile
            transporter={{
              name: profile.displayName || profile.name || '',
              phone: profile.phoneNumber || profile.phone || '',
              vehicleType: profile.vehicleType || '',
              bodyType: profile.bodyType || '',
              plateNumber: profile.vehicleRegistration || profile.plateNumber || '',
              subscriptionActive: typeof profile.subscriptionActive === 'boolean' ? profile.subscriptionActive : true,
              // Add more mappings as needed
            }}
          />
          <Text style={styles.label}>Email: <Text style={styles.value}>{profile.email}</Text></Text>
          <Text style={styles.label}>Status: <Text style={[styles.value, { color: colors.secondary }]}>{profile.status}</Text></Text>
        </View>
      )}
      {/* Current Trip (mock fallback) */}
      {currentTrip && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Current Trip (Demo)</Text>
          <Text style={styles.label}>Customer: <Text style={styles.value}>{currentTrip.customer}</Text></Text>
          <Text style={styles.label}>From: <Text style={styles.value}>{currentTrip.from}</Text></Text>
          <Text style={styles.label}>To: <Text style={styles.value}>{currentTrip.to}</Text></Text>
          <Text style={styles.label}>Product: <Text style={styles.value}>{currentTrip.product}</Text></Text>
          <Text style={styles.label}>Weight: <Text style={styles.value}>{currentTrip.weight} kg</Text></Text>
          <Text style={styles.label}>ETA: <Text style={styles.value}>{currentTrip.eta}</Text></Text>
          <Text style={styles.label}>Status: <Text style={[styles.value, { color: colors.success }]}>{currentTrip.status}</Text></Text>
          <Text style={styles.label}>Contact: <Text style={styles.value}>{currentTrip.contact}</Text></Text>
          {currentTrip.special && currentTrip.special.length > 0 && (
            <Text style={styles.label}>Special: <Text style={styles.value}>{currentTrip.special.join(', ')}</Text></Text>
          )}
          <TouchableOpacity
            style={styles.detailsBtn}
            onPress={() => navigation.navigate('TripDetails', { trip: currentTrip })}
          >
            <Ionicons name="information-circle-outline" size={20} color={colors.white} style={{ marginRight: 6 }} />
            <Text style={styles.detailsBtnText}>View Trip Details</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Incoming Requests (mock fallback) */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Incoming Requests (Demo)</Text>
        {requests.length === 0 ? (
          <Text style={styles.emptyText}>No new requests at the moment.</Text>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.requestItem}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => openRequestModal(item)}>
                  <Text style={styles.label}>From: <Text style={styles.value}>{item.from}</Text></Text>
                  <Text style={styles.label}>To: <Text style={styles.value}>{item.to}</Text></Text>
                  <Text style={styles.label}>Product: <Text style={styles.value}>{item.product}</Text></Text>
                  <Text style={styles.label}>Weight: <Text style={styles.value}>{item.weight} kg</Text></Text>
                  <Text style={styles.label}>ETA: <Text style={styles.value}>{item.eta}</Text></Text>
                  <Text style={styles.label}>Price: <Text style={styles.value}>Ksh {item.price?.toLocaleString()}</Text></Text>
                  <Text style={styles.label}>Customer: <Text style={styles.value}>{item.customer}</Text></Text>
                  <Text style={styles.label}>Contact: <Text style={styles.value}>{item.contact}</Text></Text>
                  {item.special && item.special.length > 0 && (
                    <Text style={styles.label}>Special: <Text style={styles.value}>{item.special.join(', ')}</Text></Text>
                  )}
                  <Text style={styles.label}>Status: <Text style={[styles.value, item.status === 'Rejected' ? { color: colors.error } : { color: colors.secondary }]}>{item.status}</Text></Text>
                </TouchableOpacity>
                {item.status === 'Pending' && (
                  <>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => openRequestModal(item)}
                    >
                      <MaterialCommunityIcons name="check-circle-outline" size={22} color={colors.white} style={{ marginRight: 4 }} />
                      <Text style={styles.acceptBtnText}>Action</Text>
                    </TouchableOpacity>
                  </>
                )}
                {item.status === 'Rejected' && (
                  <Ionicons name="close-circle" size={22} color={colors.error} style={{ marginLeft: 10 }} />
                )}
              </View>
            )}
            ItemSeparatorComponent={() => <Divider style={{ marginVertical: 8 }} />}
          />
        )}
      </View>
      {/* Modal for request details and actions (mock fallback) */}
      {showModal && selectedRequest && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.sectionTitle}>Request Details</Text>
            <Text style={styles.label}>From: <Text style={styles.value}>{selectedRequest.from}</Text></Text>
            <Text style={styles.label}>To: <Text style={styles.value}>{selectedRequest.to}</Text></Text>
            <Text style={styles.label}>Product: <Text style={styles.value}>{selectedRequest.product}</Text></Text>
            <Text style={styles.label}>Weight: <Text style={styles.value}>{selectedRequest.weight} kg</Text></Text>
            <Text style={styles.label}>ETA: <Text style={styles.value}>{selectedRequest.eta}</Text></Text>
            <Text style={styles.label}>Price: <Text style={styles.value}>Ksh {selectedRequest.price?.toLocaleString()}</Text></Text>
            <Text style={styles.label}>Customer: <Text style={styles.value}>{selectedRequest.customer}</Text></Text>
            <Text style={styles.label}>Contact: <Text style={styles.value}>{selectedRequest.contact}</Text></Text>
            {selectedRequest.special && selectedRequest.special.length > 0 && (
              <Text style={styles.label}>Special: <Text style={styles.value}>{selectedRequest.special.join(', ')}</Text></Text>
            )}
            <View style={{ flexDirection: 'row', marginTop: spacing.lg, justifyContent: 'space-between' }}>
              <TouchableOpacity style={[styles.acceptBtn, { flex: 1, marginRight: 8 }]} onPress={() => handleAccept(selectedRequest)}>
                <MaterialCommunityIcons name="check-circle-outline" size={22} color={colors.white} style={{ marginRight: 4 }} />
                <Text style={styles.acceptBtnText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.rejectBtn, { flex: 1, marginLeft: 8 }]} onPress={() => handleReject(selectedRequest)}>
                <Ionicons name="close-circle-outline" size={22} color={colors.white} style={{ marginRight: 4 }} />
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.closeModalBtn} onPress={closeModal}>
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* History, Notifications, etc. can be added here */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    alignItems: 'center',
    flexGrow: 1,
  },
  header: {
    fontSize: fonts.size.xl + 2,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.lg,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: spacing.lg,
    width: '100%',
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  value: {
    fontWeight: '400',
    color: colors.text.secondary,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  acceptBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  acceptBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: fonts.size.md,
  },
  detailsBtn: {
    backgroundColor: colors.secondary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  detailsBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: fonts.size.md,
  },
  emptyText: {
    color: colors.text.light,
    fontStyle: 'italic',
    marginTop: 8,
  },
  rejectBtn: {
    backgroundColor: colors.error,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rejectBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: fonts.size.md,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modalBox: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 400,
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
  },
  closeModalBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 4,
  },
  testButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: fonts.size.md,
  },
  connectivityStatus: {
    textAlign: 'center',
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    marginVertical: 4,
  },
});
