import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { getDisplayBookingId } from '../utils/unifiedIdSystem';
import { API_ENDPOINTS } from '../constants/api';
import LocationDisplay from '../components/common/LocationDisplay';
import { formatCostRange } from '../utils/costCalculator';

interface Job {
  id: string;
  bookingId: string;
  customerName: string;
  customerPhone: string;
  fromLocation: any;
  toLocation: any;
  pickupTime: string;
  deliveryTime: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  paymentAmount: number;
  vehicleId: string;
  vehicleRegistration: string;
  createdAt: string;
  updatedAt: string;
  productType?: string;
  weight?: number;
  specialRequirements?: string[];
  client?: {
    id?: string;
    name: string;
    phone: string;
    rating: number;
  };
}

interface RouteLoad {
  id: string;
  pickup: string;
  dropoff: string;
  detourKm: number;
  weight: number;
  price: number;
  description?: string;
  urgency: 'high' | 'medium' | 'low';
  specialRequirements: string[];
  clientRating: number;
  estimatedValue: number;
  route: {
    distance: string;
    estimatedTime: string;
  };
}

interface DriverProfile {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  assignedVehicle: {
    id: string;
    make: string;
    model: string;
    registration: string;
  };
  company: {
    id: string;
    name: string;
  };
}

const DriverJobManagementScreen = () => {
  const navigation = useNavigation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'available' | 'my_jobs' | 'route_loads'>('available');
  const [currentTrip, setCurrentTrip] = useState<Job | null>(null);
  const [routeLoads, setRouteLoads] = useState<RouteLoad[]>([]);
  const [selectedLoads, setSelectedLoads] = useState<RouteLoad[]>([]);
  const [acceptingJobId, setAcceptingJobId] = useState<string | null>(null);
  const [startingTripId, setStartingTripId] = useState<string | null>(null);
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [jobToCancel, setJobToCancel] = useState<Job | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  // KPI counts
  const [availableJobsCount, setAvailableJobsCount] = useState<number>(0);
  const [acceptedJobsCount, setAcceptedJobsCount] = useState<number>(0);

  const fetchDriverProfile = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.DRIVERS}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDriverProfile(data.driver);
      }
    } catch (err) {
      console.error('Error fetching driver profile:', err);
    }
  };

  const fetchJobs = useCallback(async () => {
    try {
      setError(null);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      let endpoint = '';

      switch (selectedTab) {
        case 'available':
          endpoint = `${API_ENDPOINTS.BOOKINGS}/available`;
          break;
        case 'my_jobs':
          // Try driver/accepted first, fallback to transporter/accepted
          endpoint = `${API_ENDPOINTS.BOOKINGS}/driver/accepted`;
          break;
        case 'route_loads':
          if (currentTrip) {
            endpoint = `${API_ENDPOINTS.TRANSPORTERS}/trips/${currentTrip.id}/available-loads`;
          } else {
            setJobs([]);
            return;
          }
          break;
      }

      console.log('🔄 Fetching jobs from endpoint:', endpoint);
      let response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('🔄 Jobs response status:', response.status, response.statusText);

      // For my_jobs, try fallback if first endpoint fails
      if (!response.ok && selectedTab === 'my_jobs' && endpoint.includes('/driver/accepted')) {
        console.log('🔄 Driver endpoint failed, trying transporter endpoint...');
        const fallbackEndpoint = `${API_ENDPOINTS.BOOKINGS}/transporter/accepted`;
        response = await fetch(fallbackEndpoint, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        console.log('🔄 Fallback response status:', response.status, response.statusText);
      }

      if (response.ok) {
        const data = await response.json();
        if (selectedTab === 'route_loads') {
          setRouteLoads(data.routeLoads || data.loads || data || []);
        } else {
          // Handle both array and object responses - available endpoint returns availableBookings array
          const jobsData = Array.isArray(data) ? data : (data.availableBookings || data.jobs || data.bookings || data.data || []);
          
          // CRITICAL: Filter out accepted/active jobs for the "available" tab
          // Available jobs should ONLY include jobs that are:
          // - Status: 'pending' (not accepted, started, in_progress, etc.)
          // - Not already accepted (acceptedAt is null/undefined)
          // - Not assigned to any transporter (transporterId is null/undefined)
          // - Not assigned to this driver (driverId is null/undefined or not matching current driver)
          let filteredJobsData = jobsData;
          if (selectedTab === 'available') {
            filteredJobsData = jobsData.filter((job: any) => {
              const status = (job.status || '').toLowerCase();
              
              // List of statuses that indicate the job is NOT available
              const nonAvailableStatuses = [
                'accepted', 'started', 'in_progress', 'in_transit', 
                'picked_up', 'enroute', 'completed', 'cancelled',
                'delivered', 'ongoing'
              ];
              
              const isNotAvailableStatus = nonAvailableStatuses.includes(status);
              const isPending = status === 'pending';
              const notAccepted = !job.acceptedAt || job.acceptedAt === null;
              const notAssigned = !job.transporterId || job.transporterId === null;
              const notAssignedToDriver = !job.driverId || job.driverId === null;
              
              // Job is available ONLY if:
              // 1. Status is 'pending' (not accepted/active)
              // 2. Status is NOT in the non-available list
              // 3. Has no acceptedAt timestamp
              // 4. Has no transporterId assignment
              // 5. Has no driverId assignment
              const isAvailable = isPending && !isNotAvailableStatus && notAccepted && notAssigned && notAssignedToDriver;
              
              if (!isAvailable) {
                console.log('🚫 Filtered out non-available job:', {
                  id: job.id || job.bookingId,
                  status: job.status,
                  acceptedAt: job.acceptedAt,
                  transporterId: job.transporterId,
                  driverId: job.driverId,
                  reason: isNotAvailableStatus ? `status is ${status}` : !isPending ? 'not pending' : !notAccepted ? 'already accepted' : !notAssigned ? 'assigned to transporter' : 'assigned to driver'
                });
              }
              
              return isAvailable;
            });
            
            console.log(`✅ Filtered ${jobsData.length} jobs to ${filteredJobsData.length} available jobs (removed ${jobsData.length - filteredJobsData.length} accepted/active jobs)`);
          }
          
          // Ensure all jobs have proper readableId/bookingId
          // IMPORTANT: customerName/customerPhone should be the CLIENT/SHIPPER who created the booking, NOT the driver/transporter
          const processedJobs = (Array.isArray(filteredJobsData) ? filteredJobsData : [])
            .filter(job => job != null) // Filter out null/undefined
            .map((job: any) => {
              if (!job) return null;
            // The userId field refers to the user who created the booking (shipper/broker/business)
            // The transporterName/transporterPhone are the DRIVER who accepted it
            const clientName = job.clientName || job.shipperName || job.userName || job.client?.name || 'Customer';
            const clientPhone = job.clientPhone || job.phone || job.contactPhone || job.client?.phone || job.client?.contactPhone;
            const clientEmail = job.clientEmail || job.email || job.contactEmail || job.client?.email;
            
            // Debug: Log what backend returned for ID fields
            console.log('DriverJobManagement - Raw job from backend:', {
              id: job.id,
              bookingId: job.bookingId,
              readableId: job.readableId,
              createdAt: job.createdAt,
              pickUpDate: job.pickUpDate,
              bookingType: job.bookingType,
              bookingMode: job.bookingMode,
            });
            
            const processed = {
              ...job, // Spread first to preserve ALL original fields from backend
              // IMPORTANT: Keep the original ID fields from the backend response
              // Don't override id - it's likely the Firestore document ID
              id: job.id || job._id || job.bookingId, // Firestore doc ID
              // bookingId might be different from id (could be a readableId or another field)
              bookingId: job.bookingId || job.requestId || job.id,
              readableId: job.readableId, // CRITICAL: This is the source of truth - backend stores this at creation
              createdAt: job.createdAt, // CRITICAL: Preserve createdAt for correct ID generation if readableId missing
              pickUpDate: job.pickUpDate || job.pickupDate, // CRITICAL: Preserve pickup date (database uses pickUpDate)
              bookingType: job.bookingType, // Preserve bookingType
              bookingMode: job.bookingMode, // Preserve bookingMode
              productType: job.productType || job.cargoDetails,
              weight: job.weightKg || job.weight,
              specialRequirements: job.specialCargo || job.specialRequirements || [],
              // Preserve exact locations with addresses
              fromLocation: job.fromLocation || job.pickupLocation, // Keep exact location with address
              toLocation: job.toLocation || job.deliveryLocation, // Keep exact location with address
              // Preserve backend-calculated cost and cost range
              cost: job.cost || job.price || job.estimatedCost, // Backend-calculated cost
              estimatedCostRange: job.estimatedCostRange, // Preserve cost range from backend
              costRange: job.costRange, // Preserve cost range from backend
              minCost: job.minCost, // Preserve min cost
              maxCost: job.maxCost, // Preserve max cost
              // Customer/Client details - the person who created the booking
              customerName: clientName,
              customerPhone: clientPhone,
              customerEmail: clientEmail,
              clientId: job.userId || job.clientId || job.shipperId,
              // Keep transporter info separate for reference
              transporterName: job.transporterName,
              transporterPhone: job.transporterPhone,
            };
            
            // Debug: Log what getDisplayBookingId will see
            console.log('DriverJobManagement - Processed job for ID display:', {
              readableId: processed.readableId,
              bookingId: processed.bookingId,
              createdAt: processed.createdAt,
              bookingType: processed.bookingType,
              bookingMode: processed.bookingMode,
              displayId: getDisplayBookingId(processed),
            });
            
              return processed;
            })
            .filter(job => job != null); // Remove any null entries
          setJobs(processedJobs);
        }
      } else {
        const statusCode = response.status;
        // For route_loads tab, handle 404 gracefully (feature may not be implemented)
        if (selectedTab === 'route_loads' && statusCode === 404) {
          console.log('Route loads endpoint not available - setting empty array');
          setRouteLoads([]);
          setError(null); // Don't show error for route loads 404
          return;
        }
        if (statusCode === 403) {
          // If transporter/accepted fails, try driver/accepted
          if (selectedTab === 'my_jobs' && endpoint.includes('/transporter/accepted')) {
            const altResponse = await fetch(`${API_ENDPOINTS.BOOKINGS}/driver/accepted`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            if (altResponse.ok) {
              const altData = await altResponse.json();
              setJobs(altData.jobs || altData.bookings || []);
              return;
            }
          }
          throw new Error('Insufficient permissions. Backend needs to allow driver role for this endpoint.');
        } else if (statusCode === 401) {
          throw new Error('Authentication failed. Please log out and log back in.');
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to fetch jobs: ${statusCode}`);
        }
      }
    } catch (err: any) {
      console.error('Error fetching jobs:', err);
      setError(err.message || 'Failed to fetch jobs');
      // Set empty arrays on error
      setJobs([]);
      setRouteLoads([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTab, currentTrip]);

  // Fetch KPI counts (available jobs and accepted jobs)
  const fetchKPICounts = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      // Fetch available jobs count
      try {
        const availableResponse = await fetch(`${API_ENDPOINTS.BOOKINGS}/available`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (availableResponse.ok) {
          const availableData = await availableResponse.json();
          const availableJobsData = Array.isArray(availableData) ? availableData : (availableData.availableBookings || availableData.jobs || availableData.bookings || availableData.data || []);
          
          // Filter to only pending jobs (available jobs)
          const availableCount = availableJobsData.filter((job: any) => {
            const status = (job.status || '').toLowerCase();
            const isPending = status === 'pending';
            const notAccepted = !job.acceptedAt || job.acceptedAt === null;
            const notAssigned = !job.transporterId || job.transporterId === null;
            const notAssignedToDriver = !job.driverId || job.driverId === null;
            return isPending && notAccepted && notAssigned && notAssignedToDriver;
          }).length;
          
          setAvailableJobsCount(availableCount);
        }
      } catch (err) {
        console.error('Error fetching available jobs count:', err);
      }

      // Fetch accepted jobs count
      try {
        let acceptedResponse = await fetch(`${API_ENDPOINTS.BOOKINGS}/driver/accepted`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        // Fallback to transporter endpoint if driver endpoint fails
        if (!acceptedResponse.ok) {
          acceptedResponse = await fetch(`${API_ENDPOINTS.BOOKINGS}/transporter/accepted`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        }

        if (acceptedResponse.ok) {
          const acceptedData = await acceptedResponse.json();
          const acceptedJobsData = acceptedData.jobs || acceptedData.bookings || acceptedData.data || [];
          setAcceptedJobsCount(acceptedJobsData.length);
        }
      } catch (err) {
        console.error('Error fetching accepted jobs count:', err);
      }
    } catch (err) {
      console.error('Error fetching KPI counts:', err);
    }
  };

  const fetchCurrentTrip = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/driver/active-trip`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentTrip(data.trip);
      } else {
        // If API fails, try to find active trip from jobs list
        // Active trip statuses: accepted, started, in_progress, in_transit, picked_up, enroute
        const activeJob = jobs.find(j => 
          ['accepted', 'started', 'in_progress', 'in_transit', 'picked_up', 'enroute'].includes(j.status?.toLowerCase() || '')
        );
        setCurrentTrip(activeJob || null);
      }
    } catch (err) {
      console.error('Error fetching current trip:', err);
      // Fallback: try to find active trip from jobs list
      const activeJob = jobs.find(j => 
        ['accepted', 'started', 'in_progress', 'in_transit', 'picked_up', 'enroute'].includes(j.status?.toLowerCase() || '')
      );
      setCurrentTrip(activeJob || null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDriverProfile(),
      fetchJobs(),
      fetchCurrentTrip(),
      fetchKPICounts()
    ]);
    setRefreshing(false);
  };

  const handleAcceptJob = async (job: Job) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      // Set loading state
      setAcceptingJobId(job.id);

      const token = await user.getIdToken();
      const jobId = job.bookingId || job.id; // Use bookingId if available
      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${jobId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transporterId: user.uid, // Same as transporters - use userId
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Job accepted successfully!');
        // Refresh jobs list - if on my_jobs tab, refresh accepted jobs
        fetchJobs();
        fetchCurrentTrip();
        fetchKPICounts(); // Refresh KPI counts after accepting a job
      } else {
        const statusCode = response.status;
        if (statusCode === 403) {
          throw new Error('Insufficient permissions. Backend needs to allow driver role for job acceptance.');
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to accept job: ${statusCode}`);
        }
      }
    } catch (err: any) {
      console.error('Error accepting job:', err);
      Alert.alert('Error', err.message || 'Failed to accept job');
    } finally {
      // Clear loading state
      setAcceptingJobId(null);
    }
  };

  const handleStartTrip = async (job: Job) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'Please log in to start a trip.');
        return;
      }

      // Set loading state
      setStartingTripId(job.id);

      const token = await user.getIdToken();
      
      // CRITICAL: For API calls, always use the raw database ID
      // The backend likely expects the Firestore document ID, which is typically in the 'id' field
      // bookingId might be a different field (like requestId or readableId)
      const bookingId = job.id || job._id || job.bookingId;
      
      if (!bookingId) {
        throw new Error('Booking ID not found. Cannot start trip.');
      }
      
      console.log('Starting trip for job:', {
        rawId: job.id,
        rawBookingId: job.bookingId,
        requestId: (job as any).requestId,
        displayId: (job as any).readableId || getDisplayBookingId(job),
        usingForAPI: bookingId,
        fullJobObject: JSON.stringify(job, null, 2).substring(0, 500) // First 500 chars for debugging
      });
      
      // Use the correct endpoint for updating booking status - try /update/:bookingId endpoint
      let response = await fetch(`${API_ENDPOINTS.BOOKINGS}/update/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'started',
          startedAt: new Date().toISOString()
        })
      });

      // Fallback to /status endpoint if /update doesn't work
      if (!response.ok && response.status === 404) {
        response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${bookingId}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            status: 'started',
            startedAt: new Date().toISOString()
          })
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('Authorization failed. Please log out and log back in.');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to start this trip. Please contact support.');
        } else if (response.status === 404) {
          throw new Error('Booking not found.');
        } else {
          throw new Error(errorData.message || `Failed to start trip (${response.status})`);
        }
      }

      const data = await response.json();
      
      // Successfully started trip - navigate to driver trip navigation screen
      Alert.alert('Trip Started', 'You can now navigate to the pickup location.', [
        {
          text: 'OK',
          onPress: () => {
            fetchJobs();
            fetchCurrentTrip();
            // Navigate to driver trip navigation screen
            (navigation as any).navigate('DriverTripNavigation', { 
              jobId: bookingId,
              bookingId: bookingId,
              job: job
            });
          }
        }
      ]);
    } catch (err: any) {
      console.error('Error starting trip:', err);
      Alert.alert('Error Starting Trip', err.message || 'Failed to start trip. Please try again.');
    } finally {
      // Clear loading state
      setStartingTripId(null);
    }
  };

  const handleCompleteTrip = async (job: Job) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/update/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'completed' })
      });

      if (response.ok) {
        Alert.alert('Success', 'Trip completed successfully!');
        fetchJobs();
        fetchCurrentTrip();
      } else {
        throw new Error('Failed to complete trip');
      }
    } catch (err: any) {
      console.error('Error completing trip:', err);
      Alert.alert('Error', err.message || 'Failed to complete trip');
    }
  };

  const cancelJob = async (job: Job, reason: string) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      // Set loading state
      setCancellingJobId(job.id);

      const token = await user.getIdToken();
      const bookingId = job.id || job._id || job.bookingId;
      
      console.log('🔄 Cancelling job:', { bookingId, jobId: job.id, reason });
      
      if (!bookingId) {
        throw new Error('Booking ID not found. Cannot cancel job.');
      }

      // When cancelling, set status back to 'pending' so it becomes available again
      // Clear transporter assignment and acceptance timestamp
      const updatePayload = { 
        status: 'pending',
        cancellationReason: reason,
        cancelledAt: new Date().toISOString(),
        transporterId: null,
        acceptedAt: null,
        vehicleId: null,
        vehicleMake: null,
        vehicleModel: null,
        vehicleRegistration: null,
        transporterName: null,
        transporterPhone: null,
        transporterPhoto: null,
        startedAt: null,
      };

      console.log('🔄 Sending cancel request to:', `${API_ENDPOINTS.BOOKINGS}/update/${bookingId}`);
      console.log('🔄 Payload:', JSON.stringify(updatePayload, null, 2));

      let response = await fetch(`${API_ENDPOINTS.BOOKINGS}/update/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      });

      console.log('🔄 Cancel response status:', response.status, response.statusText);

      // Fallback to /status endpoint if /update doesn't work
      if (!response.ok && response.status === 404) {
        console.log('🔄 Primary endpoint 404, trying /status endpoint...');
        response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${bookingId}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            status: 'pending',
            cancellationReason: reason,
            transporterId: null,
            acceptedAt: null,
            startedAt: null,
          })
        });
        console.log('🔄 Fallback response status:', response.status, response.statusText);
      }

      if (response.ok) {
        const responseData = await response.json().catch(() => ({}));
        console.log('✅ Cancel successful:', responseData);
        Alert.alert('Success', 'Job cancelled successfully! The job is now available for other drivers.');
        // Refresh jobs and current trip
        await Promise.all([fetchJobs(), fetchCurrentTrip()]);
      } else {
        const errorText = await response.text().catch(() => '');
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || 'Unknown error' };
        }
        console.error('❌ Cancel failed:', { status: response.status, statusText: response.statusText, errorData, errorText });
        throw new Error(errorData.message || `Failed to cancel job: ${response.statusText || 'Network error'}`);
      }
    } catch (err: any) {
      console.error('❌ Error cancelling job:', err);
      // Provide more helpful error messages
      let errorMessage = 'Failed to cancel job. Please try again.';
      if (err.message) {
        if (err.message.includes('Network request failed') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      Alert.alert('Error Cancelling Job', errorMessage);
    } finally {
      // Clear loading state
      setCancellingJobId(null);
    }
  };

  const openCancelModal = (job: Job) => {
    setJobToCancel(job);
    setCancellationReason('');
    setShowCancelModal(true);
  };

  const handleCancelConfirm = () => {
    if (!jobToCancel) return;
    
    if (!cancellationReason.trim()) {
      Alert.alert('Error', 'Please provide a cancellation reason');
      return;
    }

    cancelJob(jobToCancel, cancellationReason.trim());
    setShowCancelModal(false);
    setJobToCancel(null);
    setCancellationReason('');
  };

  const handleCall = (phoneNumber: string) => {
    const phoneUrl = `tel:${phoneNumber}`;
    Linking.openURL(phoneUrl).catch(err => {
      console.error('Error opening phone app:', err);
      Alert.alert('Error', 'Unable to open phone app');
    });
  };

  const handleChat = (job: Job) => {
    // Navigate to chat screen or open chat modal
    // IMPORTANT: Pass the full job object so ChatScreen can use createdAt for consistent ID generation
    (navigation as any).navigate('ChatScreen', { 
      jobId: job.id,
      bookingId: job.bookingId || job.id,
      clientId: job.client?.id || job.customerPhone,
      clientName: job.client?.name || job.customerName,
      job: job, // Pass full job object for proper ID generation
      participant1Type: 'driver', // Current user is a driver
      participant2Type: job.userType || 'shipper' // Client type from job
    });
  };



  const toggleLoadSelection = (load: RouteLoad) => {
    setSelectedLoads(prev => 
      prev.find(l => l.id === load.id) 
        ? prev.filter(l => l.id !== load.id)
        : [...prev, load]
    );
  };



  useEffect(() => {
    fetchDriverProfile();
    fetchCurrentTrip();
    fetchKPICounts();
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Update currentTrip when jobs list changes (for active trip detection)
  // BUT: Only update currentTrip when NOT on the "available" tab (available tab should never have active trips)
  useEffect(() => {
    // Skip updating currentTrip if we're on the available tab - those jobs shouldn't be active
    if (selectedTab === 'available') {
      return;
    }
    
    // Find active trip from jobs list if currentTrip is null or jobs have changed
    const activeJob = jobs.find(j => 
      ['accepted', 'started', 'in_progress', 'in_transit', 'picked_up', 'enroute'].includes(j.status?.toLowerCase() || '')
    );
    if (activeJob && (!currentTrip || currentTrip.id !== activeJob.id)) {
      setCurrentTrip(activeJob);
    } else if (!activeJob && currentTrip) {
      // If no active job found but currentTrip exists, check if currentTrip is still active
      const isStillActive = ['accepted', 'started', 'in_progress', 'in_transit', 'picked_up', 'enroute'].includes(
        currentTrip.status?.toLowerCase() || ''
      );
      if (!isStillActive) {
        setCurrentTrip(null);
      }
    }
  }, [jobs, selectedTab]);

  const renderJob = ({ item }: { item: Job }) => {
    // Ensure we have the readable ID for display
    const displayId = getDisplayBookingId({
      ...item,
      readableId: item.readableId, // Ensure readableId is passed
      bookingType: item.bookingType || item.type,
      bookingMode: item.bookingMode || (item.type === 'instant' ? 'instant' : 'booking'),
      createdAt: item.createdAt,
      bookingId: item.bookingId || item.id,
    });

    return (
    <View style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <View style={styles.jobInfo}>
          <Text style={styles.jobId}>{displayId}</Text>
          <Text style={styles.customerName}>{item.customerName}</Text>
          <Text style={styles.customerPhone}>{item.customerPhone}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: 
            item.status === 'completed' ? colors.success :
            item.status === 'in_progress' ? colors.primary :
            item.status === 'accepted' ? colors.warning :
            item.status === 'cancelled' ? colors.error :
            colors.text.secondary
          }
        ]}>
          <Text style={styles.statusText}>
            {item.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.jobDetails}>
        <View style={styles.routeInfo}>
          <View style={styles.locationRow}>
            <LocationDisplay 
              location={item.fromLocation} 
              iconColor={colors.primary} 
            />
          </View>
          <View style={styles.locationRow}>
            <LocationDisplay 
              location={item.toLocation} 
              iconColor={colors.success}
              iconName="map-marker-outline"
            />
          </View>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="clock" size={16} color={colors.text.secondary} />
          <Text style={styles.detailText}>
            Pickup: {(() => {
              // Check pickUpDate first (database field name), then fallback aliases
              const pickupDateSource = item.pickUpDate || item.pickupDate || item.pickupTime || item.pickUpTime;
              if (!pickupDateSource) return 'Not specified';
              
              try {
                // Handle Firestore timestamp
                let date: Date;
                if (pickupDateSource._seconds !== undefined) {
                  date = new Date(pickupDateSource._seconds * 1000);
                } else if (pickupDateSource.toDate && typeof pickupDateSource.toDate === 'function') {
                  date = pickupDateSource.toDate();
                } else if (typeof pickupDateSource === 'string') {
                  date = new Date(pickupDateSource);
                } else if (pickupDateSource instanceof Date) {
                  date = pickupDateSource;
                } else {
                  return 'Not specified';
                }
                
                if (isNaN(date.getTime())) return 'Not specified';
                
                return date.toLocaleString('en-KE', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
              } catch {
                return 'Date error';
              }
            })()}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="cash" size={16} color={colors.success} />
          <Text style={styles.detailText}>
            Payment: {formatCostRange(item)}
          </Text>
        </View>
        
        {/* Additional Details for My Jobs */}
        {selectedTab === 'my_jobs' && (
          <>
            {/* Weight */}
            {item.weight && (
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="weight-kilogram" size={16} color={colors.text.secondary} />
                <Text style={styles.detailText}>
                  Weight: {typeof item.weight === 'number' ? `${item.weight} kg` : item.weight}
                </Text>
              </View>
            )}
            
            {/* Product Type / Cargo Details */}
            {item.productType && (
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="package-variant" size={16} color={colors.text.secondary} />
                <Text style={styles.detailText}>
                  Cargo: {item.productType}
                </Text>
              </View>
            )}
            
            {/* Special Requirements */}
            {((item.specialRequirements && item.specialRequirements.length > 0) || 
              (item.specialCargo && item.specialCargo.length > 0)) && (
              <View style={styles.specialRequirementsContainer}>
                <Text style={styles.specialRequirementsTitle}>Special Requirements:</Text>
                <View style={styles.specialRequirementsList}>
                  {(item.specialCargo || item.specialRequirements || []).map((req: string, index: number) => (
                    <View key={index} style={styles.requirementTag}>
                      <MaterialCommunityIcons name="check-circle" size={12} color={colors.primary} />
                      <Text style={styles.requirementText}>{req}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {/* Customer Contact Details - Enhanced UI */}
            <View style={styles.customerDetailsCard}>
              <View style={styles.customerDetailsHeader}>
                <MaterialCommunityIcons name="account-circle" size={24} color={colors.primary} />
                <Text style={styles.customerDetailsTitle}>Customer Information</Text>
              </View>
              <View style={styles.customerDetailsContent}>
                {item.customerName && (
                  <View style={styles.customerDetailItem}>
                    <View style={styles.customerIconContainer}>
                      <MaterialCommunityIcons name="account" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.customerDetailContent}>
                      <Text style={styles.customerDetailLabel}>Name</Text>
                      <Text style={styles.customerDetailValue}>{item.customerName}</Text>
                    </View>
                  </View>
                )}
                {item.customerPhone && (
                  <View style={styles.customerDetailItem}>
                    <View style={styles.customerIconContainer}>
                      <MaterialCommunityIcons name="phone" size={20} color={colors.success} />
                    </View>
                    <View style={styles.customerDetailContent}>
                      <Text style={styles.customerDetailLabel}>Phone</Text>
                      <Text style={styles.customerDetailValue}>{item.customerPhone}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.contactActionButton}
                      onPress={() => handleCall(item.customerPhone)}
                    >
                      <MaterialCommunityIcons name="phone-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
                {(item.customerEmail || item.client?.email) && (
                  <View style={styles.customerDetailItem}>
                    <View style={styles.customerIconContainer}>
                      <MaterialCommunityIcons name="email" size={20} color={colors.secondary} />
                    </View>
                    <View style={styles.customerDetailContent}>
                      <Text style={styles.customerDetailLabel}>Email</Text>
                      <Text style={styles.customerDetailValue}>{item.customerEmail || item.client?.email}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </>
        )}
      </View>

      <View style={styles.jobActions}>
        {item.status === 'pending' && (
          <TouchableOpacity
            style={[
              styles.acceptButton,
              acceptingJobId === item.id && styles.acceptButtonDisabled
            ]}
            onPress={() => handleAcceptJob(item)}
            disabled={acceptingJobId === item.id}
          >
            {acceptingJobId === item.id ? (
              <>
                <ActivityIndicator size="small" color={colors.white} />
                <Text style={styles.actionText}>Accepting...</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={16} color={colors.white} />
                <Text style={styles.actionText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        
        {item.status === 'accepted' && (
          <TouchableOpacity
            style={[
              styles.startButton,
              startingTripId === item.id && styles.acceptButtonDisabled
            ]}
            onPress={() => handleStartTrip(item)}
            disabled={startingTripId === item.id}
          >
            {startingTripId === item.id ? (
              <>
                <ActivityIndicator size="small" color={colors.white} />
                <Text style={styles.actionText}>Starting...</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="play" size={16} color={colors.white} />
                <Text style={styles.actionText}>Start Trip</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {(item.status === 'started' || item.status === 'in_progress') && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.resumeButton, { flex: 1 }]}
              onPress={() => {
                (navigation as any).navigate('DriverTripNavigation', {
                  jobId: item.id || item.bookingId,
                  bookingId: item.bookingId || item.id,
                  job: item
                });
              }}
            >
              <MaterialCommunityIcons name="navigation" size={16} color={colors.white} />
              <Text style={styles.actionText}>Resume Trip</Text>
            </TouchableOpacity>
            {item.status === 'in_progress' && (
              <TouchableOpacity
                style={[styles.completeButton, { flex: 1 }]}
                onPress={() => handleCompleteTrip(item)}
              >
                <MaterialCommunityIcons name="check-circle" size={16} color={colors.white} />
                <Text style={styles.actionText}>Complete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Communication Buttons Row */}
        <View style={styles.communicationRow}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => handleChat(item)}
          >
            <MaterialCommunityIcons name="message-text" size={16} color={colors.primary} />
            <Text style={styles.chatButtonText}>Chat</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => handleCall(item.customerPhone || item.client?.phone || '')}
          >
            <MaterialCommunityIcons name="phone" size={16} color={colors.success} />
            <Text style={styles.callButtonText}>Call</Text>
          </TouchableOpacity>
        </View>

        {/* Cancel Button Row */}
        {(item.status === 'accepted' || item.status === 'in_progress' || item.status === 'started') && (
          <View style={styles.cancelRow}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                cancellingJobId === item.id && styles.acceptButtonDisabled
              ]}
              onPress={() => openCancelModal(item)}
              disabled={cancellingJobId === item.id}
            >
              {cancellingJobId === item.id ? (
                <>
                  <ActivityIndicator size="small" color={colors.error} />
                  <Text style={styles.cancelButtonText}>Cancelling...</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="close-circle" size={16} color={colors.error} />
                  <Text style={styles.cancelButtonText}>Cancel Job</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
    );
  };

  const renderRouteLoadItem = ({ item }: { item: RouteLoad }) => (
    <TouchableOpacity 
      style={[
        styles.loadCard,
        selectedLoads.find(l => l.id === item.id) && styles.selectedLoadCard
      ]}
      onPress={() => toggleLoadSelection(item)}
    >
      <View style={styles.loadHeader}>
        <View style={styles.loadInfo}>
          <Text style={styles.loadId}>Load #{item.id.slice(-6)}</Text>
          <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(item.urgency) + '20' }]}>
            <Text style={[styles.urgencyText, { color: getUrgencyColor(item.urgency) }]}>
              {item.urgency.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.loadPrice}>KES {item.price.toLocaleString()}</Text>
      </View>

      <View style={styles.loadRoute}>
        <Text style={styles.loadPickup}>{item.pickup}</Text>
        <MaterialCommunityIcons name="arrow-right" size={16} color={colors.text.secondary} />
        <Text style={styles.loadDropoff}>{item.dropoff}</Text>
      </View>

      <View style={styles.loadDetails}>
        <Text style={styles.loadWeight}>{item.weight} kg</Text>
        <Text style={styles.loadDetour}>+{item.detourKm}km detour</Text>
        <Text style={styles.loadTime}>{item.route.estimatedTime}</Text>
      </View>

      {selectedLoads.find(l => l.id === item.id) && (
        <View style={styles.selectedIndicator}>
          <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
        </View>
      )}
    </TouchableOpacity>
  );


  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return colors.error;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.text.secondary;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading jobs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Management</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('DisputeList' as never)}
          style={styles.disputeButton}
        >
          <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Job Summary Header */}
      <View style={styles.summaryHeader}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="briefcase-check" size={20} color={colors.primary} />
            <Text style={styles.summaryLabel}>Total Jobs</Text>
            <Text style={styles.summaryValue}>{availableJobsCount}</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="truck-fast" size={20} color={colors.success} />
            <Text style={styles.summaryLabel}>Active Trip</Text>
            <Text style={styles.summaryValue}>{acceptedJobsCount}</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="package-variant" size={20} color={colors.secondary} />
            <Text style={styles.summaryLabel}>Route Loads</Text>
            <Text style={styles.summaryValue}>{routeLoads.length}</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'available' && styles.activeTab]}
          onPress={() => setSelectedTab('available')}
        >
          <Text style={[styles.tabText, selectedTab === 'available' && styles.activeTabText]}>
            Available Jobs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'my_jobs' && styles.activeTab]}
          onPress={() => setSelectedTab('my_jobs')}
        >
          <Text style={[styles.tabText, selectedTab === 'my_jobs' && styles.activeTabText]}>
            My Jobs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'route_loads' && styles.activeTab]}
          onPress={() => setSelectedTab('route_loads')}
          disabled={!currentTrip}
        >
          <Text style={[
            styles.tabText, 
            selectedTab === 'route_loads' && styles.activeTabText,
            !currentTrip && styles.disabledTab
          ]}>
            Route Loads
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={48} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchJobs}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (selectedTab === 'route_loads' ? routeLoads.length === 0 : jobs.length === 0) ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons 
              name={selectedTab === 'route_loads' ? 'package-variant' : 'briefcase-outline'} 
              size={64} 
              color={colors.text.secondary} 
            />
            <Text style={styles.emptyTitle}>
              {selectedTab === 'available' ? 'No Available Jobs' : 
               selectedTab === 'my_jobs' ? 'No Jobs Assigned' : 
               'No Loads Available Along Route'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {selectedTab === 'available' 
                ? 'Check back later for new job opportunities'
                : selectedTab === 'my_jobs'
                ? 'You don\'t have any assigned jobs at the moment'
                : 'No loads available along your current route'
              }
            </Text>
          </View>
        ) : selectedTab === 'route_loads' ? (
          <FlatList
            data={routeLoads}
            renderItem={renderRouteLoadItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        ) : (
          <FlatList
            data={jobs}
            renderItem={renderJob}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>

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
              placeholderTextColor={colors.text.secondary}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => {
                  setShowCancelModal(false);
                  setJobToCancel(null);
                  setCancellationReason('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Keep Job</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalConfirmButton, cancellingJobId === jobToCancel?.id && styles.disabledButton]} 
                onPress={handleCancelConfirm}
                disabled={cancellingJobId === jobToCancel?.id}
              >
                {cancellingJobId === jobToCancel?.id ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Cancel Job</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  headerRight: {
    width: 40,
  },
  disputeButton: {
    padding: 8,
    borderRadius: 20,
  },
  driverInfo: {
    backgroundColor: colors.white,
    padding: 16,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverName: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  vehicleInfo: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.primary,
    marginBottom: 2,
  },
  companyInfo: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    margin: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  activeTabText: {
    color: colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  jobCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobId: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.primary,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  jobDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  jobActions: {
    flexDirection: 'column',
    gap: 8,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptButtonDisabled: {
    backgroundColor: colors.text.light,
    opacity: 0.7,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.error,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 100,
    paddingHorizontal: 16,
  },
  // New styles for enhanced functionality
  routeInfo: {
    marginBottom: 12,
  },
  locationRow: {
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 4,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  productType: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
  weight: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  detailsButton: {
    backgroundColor: colors.background,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  detailsButtonText: {
    color: colors.text.primary,
    fontWeight: 'bold',
  },
  communicationRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  cancelRow: {
    marginTop: 8,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  chatButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  callButtonText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.error,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    width: '100%',
  },
  cancelButtonText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  // Summary header styles
  summaryHeader: {
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    fontFamily: fonts.family.medium,
  },
  summaryValue: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginTop: 2,
  },
  // Route loads styles
  loadCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedLoadCard: {
    borderColor: colors.success,
    backgroundColor: colors.success + '10',
  },
  loadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  loadInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginRight: 8,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  loadPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  loadRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  loadPickup: {
    fontSize: 14,
    color: colors.text.primary,
    flex: 1,
  },
  loadDropoff: {
    fontSize: 14,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'right',
  },
  loadDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  loadWeight: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  loadDetour: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  loadTime: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  disabledTab: {
    color: colors.text.secondary,
    opacity: 0.5,
  },
  jobIdSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  jobIdLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  jobIdValue: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  // Enhanced Customer Details Styles
  customerDetailsCard: {
    marginTop: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  customerDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  customerDetailsTitle: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  customerDetailsContent: {
    gap: spacing.md,
  },
  customerDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  customerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  customerDetailContent: {
    flex: 1,
  },
  customerDetailLabel: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customerDetailValue: {
    fontSize: 15,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
  },
  contactActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  // Cancel Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: colors.border || colors.text.light,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border || colors.text.light,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default DriverJobManagementScreen;
