import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import APITestComponent from '../components/APITestComponent';
import Divider from '../components/common/Divider';
import NetworkTest from '../components/NetworkTest';
import TransporterProfile from '../components/TransporterService/TransporterProfile';
import TransporterInsights from '../components/TransporterService/TransporterInsights';
import { fonts, spacing } from '../constants';
import colors from '../constants/colors';
import { API_ENDPOINTS } from '../constants/api';
import { testBackendConnectivity, testTerminalLogging } from '../utils/api';
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';
import { getReadableLocationName, formatRoute, getReadableLocationNameSync, cleanLocationDisplay } from '../utils/locationUtils';
import { getDisplayBookingId, getBookingType } from '../utils/bookingIdGenerator';

export default function TransporterHomeScreen() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectivityStatus, setConnectivityStatus] = useState<string>('');
  const [acceptingBooking, setAcceptingBooking] = useState(false);
  const [updatingBookingStatus, setUpdatingBookingStatus] = useState(false);
  
  // Real data states
  const [requests, setRequests] = useState([]);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // Insights data
  const [insightsData, setInsightsData] = useState({
    totalRevenue: 0,
    weeklyRevenue: 0,
    currentTripRevenue: 0,
    totalTrips: 0,
    completedTrips: 0,
    accumulatedRevenue: 0,
  });
  
  // Subscription status
  const { subscriptionStatus, loading: subscriptionLoading } = useSubscriptionStatus();

  const testBackend = async () => {
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
    testTerminalLogging();
    setConnectivityStatus('✅ Logging Test Sent - Check Terminal');
  };

  const updateAcceptingBookingStatus = async (newStatus: boolean) => {
    try {
      setUpdatingBookingStatus(true);
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.TRANSPORTERS}/${user.uid}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          acceptingBooking: newStatus,
        }),
      });

      if (response.ok) {
        setAcceptingBooking(newStatus);
        // Update local profile state
        setProfile(prev => ({ ...prev, acceptingBooking: newStatus }));
        Alert.alert(
          'Status Updated',
          `You are now ${newStatus ? 'accepting' : 'not accepting'} new booking requests.`
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update booking status');
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      Alert.alert('Error', error.message || 'Failed to update booking status. Please try again.');
    } finally {
      setUpdatingBookingStatus(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { getAuth } = require('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) throw new Error('Not authenticated');
        const token = await user.getIdToken();
        // Fetching transporter profile

        const res = await fetch(`${API_ENDPOINTS.TRANSPORTERS}/${user.uid}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        // Processing transporter profile response

        if (res.ok) {
          const data = await res.json();
          // Transporter profile retrieved successfully
          setProfile(data.transporter);
          setAcceptingBooking(data.transporter?.acceptingBooking || false);
        } else if (res.status === 404) {
          // Transporter profile not found - redirecting to completion
          // Profile doesn't exist yet, redirect to profile completion
          navigation.navigate('TransporterCompletionScreen');
        } else {
          const errorData = await res.json();
          // Failed to fetch transporter profile
          throw new Error('Failed to fetch profile');
        }
      } catch (err) {
        setError(err.message || 'Failed to load profile');
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  // Fetch real data for insights and requests
  const fetchInsightsData = async () => {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      
      // Fetch transporter stats
      const statsResponse = await fetch(`${API_ENDPOINTS.TRANSPORTERS}/${user.uid}/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setInsightsData({
          totalRevenue: statsData.totalRevenue || 0,
          weeklyRevenue: statsData.weeklyRevenue || 0,
          currentTripRevenue: statsData.currentTripRevenue || 0,
          totalTrips: statsData.totalTrips || 0,
          completedTrips: statsData.completedTrips || 0,
          accumulatedRevenue: statsData.accumulatedRevenue || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching insights data:', error);
    }
  };

  const fetchRequests = async () => {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch(`${API_ENDPOINTS.TRANSPORTERS}/requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (res.ok) {
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
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch(`${API_ENDPOINTS.TRANSPORTERS}/current-trip`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        setCurrentTrip(data.trip || null);
      }
    } catch (error) {
      console.error('Error fetching current trip:', error);
    }
  };

  // Fetch all data when component mounts
  useEffect(() => {
    fetchInsightsData();
    fetchRequests();
    fetchCurrentTrip();
  }, []);

  const handleAccept = async (req) => {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        Alert.alert('Error', 'Please log in to accept jobs');
        return;
      }

      // Show confirmation dialog
      Alert.alert(
        'Accept Job',
        `Are you sure you want to accept this ${req.productType || 'job'} for KES ${req.cost?.toLocaleString() || '0'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Accept', 
            onPress: async () => {
              try {
                const token = await user.getIdToken();
                const jobId = req.bookingId || req.id;
                
                // Ensure we have a valid job ID
                if (!jobId) {
                  throw new Error('No valid job ID found');
                }
                
                console.log('Making API call to:', `${API_ENDPOINTS.BOOKINGS}/${jobId}/accept`);
                console.log('Request body:', { transporterId: user.uid });
                console.log('Job data:', { bookingId: req.bookingId, id: req.id, jobId });
                console.log('User token length:', token.length);
                console.log('User UID:', user.uid);
                
                const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${jobId}/accept`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    transporterId: user.uid,
                  }),
                });
                
                console.log('Response status:', response.status);
                console.log('Response ok:', response.ok);
                console.log('Response headers:', Object.fromEntries(response.headers.entries()));

                if (response.ok) {
                  const result = await response.json();
                  setCurrentTrip({ ...req, status: 'accepted' });
                  setRequests((prev) => prev.filter((r) => r.id !== req.id));
                  setShowModal(false);
                  
                  // Check if it's an instant request or booking
                  if (req.type === 'instant' || req.type === 'instant-request') {
                    Alert.alert(
                      'Request Accepted! 🎉',
                      'You can now manage this shipment directly.',
                      [
                        {
                          text: 'Manage Shipment',
                          onPress: () => {
                            (navigation as any).navigate('ShipmentManagementScreen', {
                              booking: { ...req, status: 'accepted' },
                              isInstant: true,
                              transporterId: user.uid
                            });
                          }
                        }
                      ]
                    );
                  } else {
                    Alert.alert(
                      'Booking Accepted! 🎉',
                      'You can now manage this booking from your management screen.',
                      [
                        {
                          text: 'View in Management',
                          onPress: () => {
                            (navigation as any).navigate('TransporterBookingManagement');
                          }
                        }
                      ]
                    );
                  }
                } else {
                  let errorData;
                  try {
                    const responseText = await response.text();
                    console.log('Raw response text:', responseText);
                    console.log('Response status:', response.status);
                    console.log('Response statusText:', response.statusText);
                    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
                    
                    if (responseText) {
                      errorData = JSON.parse(responseText);
                    } else {
                      errorData = { message: 'Empty response from server' };
                    }
                  } catch (parseError) {
                    console.error('Failed to parse response:', parseError);
                    errorData = { message: 'Failed to parse server response' };
                  }
                  
                  console.error('Failed to accept job - Full error details:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorData: errorData,
                    jobId: jobId,
                    transporterId: user.uid
                  });
                  
                  Alert.alert(
                    'Error', 
                    `Failed to accept job: ${errorData.message || errorData.code || 'Unknown error'}`,
                    [{ text: 'OK' }]
                  );
                }
              } catch (error) {
                console.error('Error accepting job:', error);
                Alert.alert(
                  'Error', 
                  'Network error. Please check your connection and try again.',
                  [{ text: 'OK' }]
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error accepting job:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const handleReject = async (req) => {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        Alert.alert('Error', 'Please log in to reject jobs');
        return;
      }

      // Show confirmation dialog
      Alert.alert(
        'Reject Job',
        `Are you sure you want to reject this ${req.productType || 'job'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Reject', 
            style: 'destructive',
            onPress: async () => {
              try {
                const token = await user.getIdToken();
                const jobId = req.bookingId || req.id;
                
                const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${jobId}/reject`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    transporterId: user.uid,
                    reason: 'Transporter declined',
                  }),
                });

                if (response.ok) {
                  setRequests((prev) => prev.map(r => r.id === req.id ? { ...r, status: 'Rejected' } : r));
                  setShowModal(false);
                  Alert.alert('Success', 'Job rejected successfully');
                } else {
                  const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                  console.error('Failed to reject job:', response.status, errorData);
                  Alert.alert(
                    'Error', 
                    `Failed to reject job: ${errorData.message || 'Unknown error'}`,
                    [{ text: 'OK' }]
                  );
                }
              } catch (error) {
                console.error('Error rejecting job:', error);
                Alert.alert(
                  'Error', 
                  'Network error. Please check your connection and try again.',
                  [{ text: 'OK' }]
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error rejecting job:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const openRequestModal = (req) => {
    setSelectedRequest(req);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
  };

  // Show loading if profile or subscription is loading
  if (loading || subscriptionLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.primary, fontWeight: 'bold' }}>
          {subscriptionLoading ? 'Checking subscription...' : 'Loading profile...'}
        </Text>
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
      
      {/* Real Insights Data */}
      <View style={styles.card}>
        <TransporterInsights
          totalRevenue={insightsData.totalRevenue}
          weeklyRevenue={insightsData.weeklyRevenue}
          currentTripRevenue={insightsData.currentTripRevenue}
          totalTrips={insightsData.totalTrips}
          completedTrips={insightsData.completedTrips}
          accumulatedRevenue={insightsData.accumulatedRevenue}
          subscriptionStatus={subscriptionStatus ? {
            isTrialActive: subscriptionStatus.isTrialActive,
            daysRemaining: subscriptionStatus.daysRemaining,
            planName: subscriptionStatus.currentPlan?.name || 'Free Trial'
          } : undefined}
        />
      </View>

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
          
          {/* Accepting Requests Toggle */}
          <View style={styles.toggleContainer}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Accepting New Requests</Text>
              <Text style={styles.toggleDescription}>
                {acceptingBooking 
                  ? 'You are currently accepting new booking requests' 
                  : 'You are not accepting new booking requests'
                }
              </Text>
            </View>
            <Switch
              value={acceptingBooking}
              onValueChange={updateAcceptingBookingStatus}
              disabled={updatingBookingStatus}
              trackColor={{ false: colors.text.light, true: colors.primary + '40' }}
              thumbColor={acceptingBooking ? colors.primary : colors.text.light}
              ios_backgroundColor={colors.text.light}
            />
          </View>
        </View>
      )}
      {/* Current Trip */}
      {currentTrip && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Current Trip</Text>
          <Text style={styles.label}>Customer: <Text style={styles.value}>{currentTrip.customer || 'N/A'}</Text></Text>
          <Text style={styles.label}>From: <Text style={styles.value}>{currentTrip.from || 'N/A'}</Text></Text>
          <Text style={styles.label}>To: <Text style={styles.value}>{currentTrip.to || 'N/A'}</Text></Text>
          <Text style={styles.label}>Product: <Text style={styles.value}>{currentTrip.product || 'N/A'}</Text></Text>
          <Text style={styles.label}>Weight: <Text style={styles.value}>{currentTrip.weight || 0} kg</Text></Text>
          <Text style={styles.label}>ETA: <Text style={styles.value}>{currentTrip.eta || 'N/A'}</Text></Text>
          <Text style={styles.label}>Status: <Text style={[styles.value, { color: colors.success }]}>{currentTrip.status || 'N/A'}</Text></Text>
          <Text style={styles.label}>Contact: <Text style={styles.value}>{currentTrip.contact || 'N/A'}</Text></Text>
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
      {/* Incoming Requests */}
      <View style={styles.card}>
        <View style={styles.requestsHeader}>
          <Text style={styles.sectionTitle}>Incoming Requests</Text>
          {!acceptingBooking && (
            <View style={styles.notAcceptingBadge}>
              <Ionicons name="pause-circle" size={16} color={colors.warning} />
              <Text style={styles.notAcceptingText}>Not Accepting</Text>
            </View>
          )}
        </View>
        
        {!acceptingBooking ? (
          <View style={styles.notAcceptingContainer}>
            <Ionicons name="pause-circle-outline" size={48} color={colors.warning} />
            <Text style={styles.notAcceptingTitle}>Not Accepting Requests</Text>
            <Text style={styles.notAcceptingDescription}>
              You have disabled new booking requests. Toggle the switch above to start accepting requests again.
            </Text>
          </View>
        ) : requests.length === 0 ? (
          <Text style={styles.emptyText}>No new requests at the moment.</Text>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.requestItem}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => openRequestModal(item)}>
                  <Text style={styles.label}>Booking ID: <Text style={[styles.value, { fontWeight: 'bold', color: colors.primary }]}>{getDisplayBookingId(item)}</Text></Text>
                  <Text style={styles.label}>From: <Text style={styles.value}>{cleanLocationDisplay(item.fromLocation || item.from)}</Text></Text>
                  <Text style={styles.label}>To: <Text style={styles.value}>{cleanLocationDisplay(item.toLocation || item.to)}</Text></Text>
                  <Text style={styles.label}>Product: <Text style={styles.value}>{item.productType || item.product}</Text></Text>
                  <Text style={styles.label}>Weight: <Text style={styles.value}>{item.weightKg || item.weight} kg</Text></Text>
                  <Text style={styles.label}>ETA: <Text style={styles.value}>{item.estimatedDuration || item.eta}</Text></Text>
                  <Text style={styles.label}>Price: <Text style={styles.value}>Ksh {(item.cost || item.price)?.toLocaleString()}</Text></Text>
                  <Text style={styles.label}>Customer: <Text style={styles.value}>{item.customer}</Text></Text>
                  <Text style={styles.label}>Contact: <Text style={styles.value}>{item.contact}</Text></Text>
                  {item.specialCargo && item.specialCargo.length > 0 && (
                    <Text style={styles.label}>Special: <Text style={styles.value}>{item.specialCargo.join(', ')}</Text></Text>
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
      {/* Modal for request details and actions */}
      {showModal && selectedRequest && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.sectionTitle}>Request Details</Text>
            <Text style={styles.label}>Booking ID: <Text style={[styles.value, { fontWeight: 'bold', color: colors.primary }]}>{getDisplayBookingId(selectedRequest)}</Text></Text>
            <Text style={styles.label}>From: <Text style={styles.value}>{cleanLocationDisplay(selectedRequest.fromLocation || selectedRequest.from)}</Text></Text>
            <Text style={styles.label}>To: <Text style={styles.value}>{cleanLocationDisplay(selectedRequest.toLocation || selectedRequest.to)}</Text></Text>
            <Text style={styles.label}>Product: <Text style={styles.value}>{selectedRequest.productType || selectedRequest.product}</Text></Text>
            <Text style={styles.label}>Weight: <Text style={styles.value}>{selectedRequest.weightKg || selectedRequest.weight} kg</Text></Text>
            <Text style={styles.label}>ETA: <Text style={styles.value}>{selectedRequest.estimatedDuration || selectedRequest.eta}</Text></Text>
            <Text style={styles.label}>Price: <Text style={styles.value}>Ksh {(selectedRequest.cost || selectedRequest.price)?.toLocaleString()}</Text></Text>
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
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.text.light + '30',
  },
  toggleInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleLabel: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  requestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  notAcceptingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  notAcceptingText: {
    fontSize: fonts.size.sm,
    color: colors.warning,
    fontWeight: '600',
    marginLeft: 4,
  },
  notAcceptingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  notAcceptingTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  notAcceptingDescription: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
});
