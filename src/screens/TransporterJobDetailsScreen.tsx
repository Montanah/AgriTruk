import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Image,
  Linking,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';

import colors from '../constants/colors';
import { PLACEHOLDER_IMAGES } from '../constants/images';
import { API_ENDPOINTS } from '../constants/api';
import LocationDisplay from '../components/common/LocationDisplay';
import ExpoCompatibleMap from '../components/common/ExpoCompatibleMap';
import RealtimeChatModal from '../components/Chat/RealtimeChatModal';
import AvailableLoadsAlongRoute from '../components/TransporterService/AvailableLoadsAlongRoute';

interface TransporterJobDetailsParams {
  jobId?: string;
  bookingId?: string;
  job?: any;
  transporterType?: 'individual' | 'company';
}

const TransporterJobDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as TransporterJobDetailsParams;

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [vehicleDetails, setVehicleDetails] = useState<any>(null);

  useEffect(() => {
    fetchJobDetails();
    fetchVehicleDetails();
  }, [params.jobId, params.bookingId]);

  const fetchVehicleDetails = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      // Fetch driver profile to get vehicle details
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://agritruk.onrender.com'}/api/drivers/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const driver = data.driver || data;
        if (driver.assignedVehicle || driver.assignedVehicleDetails) {
          setVehicleDetails(driver.assignedVehicle || driver.assignedVehicleDetails);
        }
      }
    } catch (err) {
      console.error('Error fetching vehicle details:', err);
    }
  };

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const bookingId = params.bookingId || params.job?.bookingId;

      if (bookingId) {
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://agritruk.onrender.com'}/api/bookings/${bookingId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const responseData = await response.json();
          // Handle response structure: { booking: {...}, message: "..." }
          const jobData = responseData.booking || responseData;
          setJob(jobData);
          console.log('Fetched job details:', jobData);
        } else {
          throw new Error('Failed to fetch job details');
        }
      } else if (params.job) {
        setJob(params.job);
      }
    } catch (err: any) {
      console.error('Error fetching job details:', err);
      setError(err.message || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get companyId
  const getCompanyId = async (): Promise<string> => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return '';

      // Check if job has companyId
      if (job?.companyId) {
        return job.companyId;
      }
      if (job?.company?.id) {
        return job.company.id;
      }
      if (job?.transporter?.company?.id) {
        return job.transporter.company.id;
      }

      // For individual transporters, use userId as companyId
      // For company transporters, fetch company profile
      const token = await user.getIdToken();
      try {
        const response = await fetch(`${API_ENDPOINTS.COMPANIES}/transporter/${user.uid}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const companyData = await response.json();
          const company = Array.isArray(companyData) ? companyData[0] : companyData;
          if (company?.id) {
            return company.id;
          }
        }
      } catch (e) {
        // If no company found, use userId as companyId for individual transporters
      }
      
      return user.uid; // Fallback to userId
    } catch (err) {
      console.error('Error getting companyId:', err);
      const auth = getAuth();
      const user = auth.currentUser;
      return user?.uid || '';
    }
  };

  const handleStartTrip = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const companyId = await getCompanyId();
      const bookingId = job.id || job.bookingId;
      
      if (!companyId) {
        throw new Error('Company ID not found. Cannot start trip.');
      }
      
      if (!bookingId) {
        throw new Error('Booking ID not found. Cannot start trip.');
      }
      
      // Use the correct endpoint: POST /api/bookings/:companyId/start/:bookingId
      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${companyId}/start/${bookingId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'started' })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle registration required error
        if (response.status === 403 && errorData.error === 'REGISTRATION_REQUIRED') {
          const regStatus = errorData.registrationStatus;
          Alert.alert(
            'Registration Required',
            `Company registration number is required to continue using services. ` +
            `Your company has completed ${regStatus?.completedTrips || 0} trips. ` +
            `Please update the registration number in your profile.`
          );
          return;
        }
        
        throw new Error(errorData.message || 'Failed to start trip');
      }

      Alert.alert('Success', 'Trip started successfully!');
      fetchJobDetails(); // Refresh data
    } catch (err: any) {
      console.error('Error starting trip:', err);
      Alert.alert('Error', err.message || 'Failed to start trip');
    }
  };

  const handleCompleteTrip = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const companyId = await getCompanyId();
      const bookingId = job.id || job.bookingId;
      
      if (!companyId) {
        throw new Error('Company ID not found. Cannot complete trip.');
      }
      
      if (!bookingId) {
        throw new Error('Booking ID not found. Cannot complete trip.');
      }
      
      // Use the correct endpoint: POST /api/bookings/:companyId/complete/:bookingId
      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${companyId}/complete/${bookingId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'completed' })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to complete trip');
      }

      Alert.alert('Success', 'Trip completed successfully!');
      navigation.goBack();
    } catch (err: any) {
      console.error('Error completing trip:', err);
      Alert.alert('Error', err.message || 'Failed to complete trip');
    }
  };

  const handleCancelJob = async () => {
    if (!cancellationReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for cancellation');
      return;
    }

    try {
      setCancelling(true);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://agritruk.onrender.com'}/api/bookings/${job.id}/update`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status: 'cancelled',
          cancellationReason: cancellationReason.trim()
        })
      });

      if (response.ok) {
        Alert.alert('Success', 'Job cancelled successfully. It will be available for other transporters.');
        setShowCancelModal(false);
        setCancellationReason('');
        navigation.goBack();
      } else {
        throw new Error('Failed to cancel job');
      }
    } catch (err: any) {
      console.error('Error cancelling job:', err);
      Alert.alert('Error', err.message || 'Failed to cancel job');
    } finally {
      setCancelling(false);
    }
  };

  const canStartTrip = () => {
    return job?.status === 'accepted';
  };

  const canCompleteTrip = () => {
    return job?.status === 'started' || job?.status === 'in_progress';
  };

  const canCancelJob = () => {
    return ['accepted', 'started'].includes(job?.status);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return colors.success;
      case 'started': return colors.primary;
      case 'completed': return colors.success;
      case 'cancelled': return colors.error;
      default: return colors.text.secondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted': return 'Ready to Start';
      case 'started': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={64} color={colors.error} />
        <Text style={styles.errorText}>{error || 'Job not found'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchJobDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <MaterialCommunityIcons name="truck" size={24} color={getStatusColor(job.status)} />
            <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
              {getStatusText(job.status)}
            </Text>
          </View>
          {job.reference && (
            <Text style={styles.referenceText}>Ref: {job.reference}</Text>
          )}
        </View>

        {/* Route Information */}
        <View style={styles.routeCard}>
          <Text style={styles.cardTitle}>Route</Text>
          <View style={styles.routeInfo}>
            <LocationDisplay 
              location={job.fromLocation} 
              iconName="map-marker-alt"
              iconColor={colors.primary}
              style={styles.locationText}
            />
            <LocationDisplay 
              location={job.toLocation} 
              iconName="flag-checkered"
              iconColor={colors.secondary}
              style={styles.locationText}
            />
          </View>
        </View>

        {/* Job Information */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Job Information</Text>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="package-variant" size={20} color={colors.text.secondary} />
            <Text style={styles.infoLabel}>Product:</Text>
            <Text style={styles.infoValue}>{job.productType || 'Not specified'}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="weight-kilogram" size={20} color={colors.text.secondary} />
            <Text style={styles.infoLabel}>Weight:</Text>
            <Text style={styles.infoValue}>
              {job.weightKg || job.weight ? `${job.weightKg || job.weight} kg` : 'Not specified'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="cash" size={20} color={colors.text.secondary} />
            <Text style={styles.infoLabel}>Value:</Text>
            <Text style={styles.infoValue}>
              {job.cost || job.estimatedValue ? `KES ${(job.cost || job.estimatedValue).toLocaleString()}` : 'Not specified'}
            </Text>
          </View>
          {job.specialRequirements && job.specialRequirements.length > 0 && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="alert-circle" size={20} color={colors.warning} />
              <Text style={styles.infoLabel}>Special Requirements:</Text>
              <Text style={styles.infoValue}>{job.specialRequirements.join(', ')}</Text>
            </View>
          )}
        </View>

        {/* Client Information */}
        {job.client && (
          <View style={styles.clientCard}>
            <Text style={styles.cardTitle}>Client Information</Text>
            <View style={styles.clientInfo}>
              <Image 
                source={{ uri: job.client.photo || PLACEHOLDER_IMAGES.USER }} 
                style={styles.clientAvatar} 
              />
              <View style={styles.clientDetails}>
                <Text style={styles.clientName}>{job.client.name || 'Client Name'}</Text>
                <Text style={styles.clientPhone}>{job.client.phone || 'Contact not available'}</Text>
                <View style={styles.clientRating}>
                  <MaterialCommunityIcons name="star" size={16} color={colors.secondary} />
                  <Text style={styles.ratingText}>{job.client.rating?.toFixed(1) || '0.0'}</Text>
                  <Text style={styles.ordersText}>({job.client.completedOrders || 0} completed orders)</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Map */}
        <View style={styles.mapCard}>
          <ExpoCompatibleMap
            style={styles.map}
            showUserLocation={true}
            markers={[
              {
                id: 'pickup',
                coordinate: {
                  latitude: job.fromLocation?.latitude || -1.2921,
                  longitude: job.fromLocation?.longitude || 36.8219,
                },
                title: 'Pickup Location',
                description: job.fromLocation?.address || 'Pickup point',
                pinColor: colors.primary,
              },
              {
                id: 'delivery',
                coordinate: {
                  latitude: job.toLocation?.latitude || -1.2921,
                  longitude: job.toLocation?.longitude || 36.8219,
                },
                title: 'Delivery Location',
                description: job.toLocation?.address || 'Delivery point',
                pinColor: colors.secondary,
              },
            ]}
            initialRegion={{
              latitude: job.fromLocation?.latitude || -1.2921,
              longitude: job.fromLocation?.longitude || 36.8219,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
          />
        </View>

        {/* Available Loads Along Route */}
        <AvailableLoadsAlongRoute tripId={job.id} />

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {canStartTrip() && (
            <TouchableOpacity style={styles.startButton} onPress={handleStartTrip}>
              <MaterialCommunityIcons name="play" size={20} color={colors.white} />
              <Text style={styles.startButtonText}>Start Trip</Text>
            </TouchableOpacity>
          )}

          {canCompleteTrip() && (
            <TouchableOpacity style={styles.completeButton} onPress={handleCompleteTrip}>
              <MaterialCommunityIcons name="check-circle" size={20} color={colors.white} />
              <Text style={styles.completeButtonText}>Complete Trip</Text>
            </TouchableOpacity>
          )}

          {canCancelJob() && (
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCancelModal(true)}>
              <MaterialCommunityIcons name="close-circle" size={20} color={colors.white} />
              <Text style={styles.cancelButtonText}>Cancel Job</Text>
            </TouchableOpacity>
          )}

          <View style={styles.communicationButtons}>
            <TouchableOpacity style={styles.commButton} onPress={() => setShowChat(true)}>
              <Ionicons name="chatbubble-ellipses" size={22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.commButton} onPress={() => setShowCall(true)}>
              <Ionicons name="call" size={22} color={colors.secondary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.commButton} 
              onPress={() => Linking.openURL(`tel:${job.client?.phone}`)}
            >
              <MaterialCommunityIcons name="phone-forward" size={22} color={colors.tertiary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Cancel Modal */}
      <Modal visible={showCancelModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Job</Text>
            <Text style={styles.modalSubtitle}>Please provide a reason for cancelling this job:</Text>
            
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter cancellation reason..."
              value={cancellationReason}
              onChangeText={setCancellationReason}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Keep Job</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalConfirmButton, cancelling && styles.disabledButton]} 
                onPress={handleCancelJob}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Cancel Job</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Chat Modal */}
      {showChat && job && (
        <RealtimeChatModal
          visible={showChat}
          onClose={() => setShowChat(false)}
          bookingId={job.id || job.bookingId}
          participant1Id={getAuth().currentUser?.uid || ''}
          participant1Type="transporter"
          participant2Id={
            // Priority: Use userId/shipperId (user IDs) > client.id (if it's a user ID)
            job.userId || 
            job.shipperId || 
            job.client?.id || 
            job.clientId ||
            'client-id'
          }
          participant2Type={job.userType || 'shipper'}
          participant2Name={job.client?.name || job.clientName || 'Client'}
          participant2Photo={job.client?.photo || job.clientPhoto}
          onChatCreated={(chatRoom) => {
            // Chat created
          }}
        />
      )}

      {/* Call Modal */}
      {showCall && (
        <Modal visible={showCall} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Call Client</Text>
              <Text style={styles.modalSubtitle}>
                Call {job.client?.name || 'Client'} at {job.client?.phone || 'No phone available'}
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.modalCancelButton} 
                  onPress={() => setShowCall(false)}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.modalConfirmButton} 
                  onPress={() => {
                    Linking.openURL(`tel:${job.client?.phone}`);
                    setShowCall(false);
                  }}
                >
                  <Text style={styles.modalConfirmButtonText}>Call Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 100, // Add bottom padding to prevent content from being masked by navigation
  },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  referenceText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  routeCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
  },
  routeInfo: {
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 8,
    minWidth: 80,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text.primary,
    flex: 1,
  },
  clientCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  clientPhone: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  clientRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 4,
  },
  ordersText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 8,
  },
  mapCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  map: {
    height: 200,
    borderRadius: 8,
  },
  actionButtons: {
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  startButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  completeButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  completeButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  cancelButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  communicationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  commButton: {
    padding: 12,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text.primary,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: colors.text.primary,
    fontWeight: 'bold',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: colors.error,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default TransporterJobDetailsScreen;
