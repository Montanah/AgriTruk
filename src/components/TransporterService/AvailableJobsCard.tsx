import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView
} from 'react-native';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';
import { API_ENDPOINTS } from '../../constants/api';
import { getLocationName, formatLocationForDisplay } from '../../utils/locationUtils';
import { chatService } from '../../services/chatService';
import { enhancedNotificationService } from '../../services/enhancedNotificationService';
import LocationDisplay from '../common/LocationDisplay';
import { formatCostRange } from '../../utils/costCalculator';
import { getDisplayBookingId } from '../../utils/unifiedIdSystem';

interface AvailableJob {
    id: string;
    productType: string;
    fromLocation: {
        address?: string;
        latitude: number;
        longitude: number;
    };
    toLocation: {
        address?: string;
        latitude: number;
        longitude: number;
    };
    weightKg: number;
    createdAt: string;
    urgencyLevel: 'High' | 'Medium' | 'Low';
    value?: number;
    specialCargo: string[];
    cost: number;
    estimatedDuration?: string;
    vehicleType?: string;
    bodyType?: string;
    capacity?: string;
    pickupDate?: string;
    client?: {
        name: string;
        rating: number;
        completedOrders: number;
    };
}

interface AvailableJobsCardProps {
    onJobAccepted?: (job: AvailableJob) => void;
    onJobRejected?: (job: AvailableJob) => void;
    onViewAll?: () => void;
}

const AvailableJobsCard: React.FC<AvailableJobsCardProps> = ({
    onJobAccepted,
    onJobRejected,
    onViewAll
}) => {
    const navigation = useNavigation();
    const [jobs, setJobs] = useState<AvailableJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [acceptingJobId, setAcceptingJobId] = useState<string | null>(null);

    const fetchAvailableJobs = async () => {
        try {
            setError(null);
            const { getAuth } = require('firebase/auth');
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();
            
            // Determine endpoint based on user type
            // Drivers use /available endpoint which checks company subscription
            // Transporters use /requests endpoint which checks their own subscription
            let endpoint = `${API_ENDPOINTS.BOOKINGS}/requests`; // Default for transporters
            let isDriver = false;
            
            try {
                // Check if user is a company driver
                const driverCheckResponse = await fetch(`${API_ENDPOINTS.DRIVERS}/check/${user.uid}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                
                if (driverCheckResponse.ok) {
                    const driverData = await driverCheckResponse.json();
                    if (driverData.success && driverData.isDriver) {
                        isDriver = true;
                        endpoint = `${API_ENDPOINTS.BOOKINGS}/available`;
                        console.log('Driver detected - using /available endpoint (checks company subscription)');
                    }
                }
            } catch (checkError) {
                // If check fails, continue with transporter endpoint
                console.log('Driver check failed, using transporter endpoint');
            }
            
            console.log('Fetching available jobs from:', endpoint);
            
            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
            });
            
            clearTimeout(timeoutId);

            console.log('Available jobs response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Available jobs data:', data);
                
                // Handle the response format from MatchingService
                // The MatchingService returns an array directly
                const jobs = Array.isArray(data) ? data : (data.availableBookings || data.bookings || data.data || []);
                console.log('Parsed jobs:', jobs);
                
                        if (Array.isArray(jobs)) {
                            // Filter out jobs that are not available for acceptance
                            // CRITICAL: Available jobs should NEVER include:
                            // - Accepted jobs (status: 'accepted', 'started', 'in_progress', etc.)
                            // - Jobs with acceptedAt timestamp
                            // - Jobs assigned to transporters or drivers
                            let availableJobs = jobs.filter(job => {
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
                        // 2. Has no acceptedAt timestamp
                        // 3. Has no transporterId assignment
                        // 4. Has no driverId assignment
                        const isAvailable = isPending && !isNotAvailableStatus && notAccepted && notAssigned && notAssignedToDriver;
                        
                        if (!isAvailable) {
                            console.log(`🚫 Filtered out non-available job in AvailableJobsCard:`, {
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
                    
                    console.log(`Filtered ${availableJobs.length} available jobs from ${jobs.length} total jobs`);
                    
                    // Group consolidated bookings by consolidationGroupId
                    // Consolidation: multiple individual bookings with same consolidationGroupId
                    const consolidationMap = new Map<string, any[]>();
                    const nonConsolidated: any[] = [];
                    
                    availableJobs.forEach((job: any) => {
                        if (job.consolidationGroupId || (job.consolidated === true && job.consolidationGroupId)) {
                            const groupId = job.consolidationGroupId;
                            if (!consolidationMap.has(groupId)) {
                                consolidationMap.set(groupId, []);
                            }
                            consolidationMap.get(groupId)!.push(job);
                        } else {
                            nonConsolidated.push(job);
                        }
                    });
                    
                    // Create consolidation objects - one per group
                    const consolidationObjects = Array.from(consolidationMap.entries()).map(([groupId, bookings]) => {
                        // Calculate total cost range
                        let totalMinCost = 0;
                        let totalMaxCost = 0;
                        
                        bookings.forEach((booking: any) => {
                            const minCost = booking.costRange?.min || booking.minCost || booking.estimatedCost || booking.cost || 0;
                            const maxCost = booking.costRange?.max || booking.maxCost || booking.estimatedCost || booking.cost || 0;
                            totalMinCost += minCost;
                            totalMaxCost += maxCost;
                        });
                        
                        return {
                            id: groupId,
                            bookingId: groupId,
                            type: 'consolidated',
                            isConsolidation: true,
                            consolidationGroupId: groupId,
                            consolidatedBookings: bookings,
                            totalBookings: bookings.length,
                            totalCostRange: { min: totalMinCost, max: totalMaxCost },
                            // Use first booking's details for summary display
                            fromLocation: bookings[0]?.fromLocation,
                            toLocation: bookings[bookings.length - 1]?.toLocation, // Use last dropoff
                            status: bookings[0]?.status || 'pending',
                            urgencyLevel: bookings[0]?.urgencyLevel || bookings[0]?.urgency || 'Low',
                            createdAt: bookings[0]?.createdAt,
                            client: bookings[0]?.client,
                            productType: 'Mixed Products',
                            weightKg: bookings.reduce((sum: number, b: any) => sum + (b.weightKg || 0), 0),
                        };
                    });
                    
                    // Combine consolidation objects with non-consolidated bookings
                    availableJobs = [...consolidationObjects, ...nonConsolidated];
                    
                    // Debug urgency levels for available jobs
                    availableJobs.forEach((job, index) => {
                        console.log(`Available Job ${index} full data:`, job);
                        console.log(`Available Job ${index} urgency level:`, job.urgencyLevel, typeof job.urgencyLevel);
                        console.log(`Available Job ${index} urgency:`, job.urgency, typeof job.urgency);
                    });
                    
                    setJobs(availableJobs);
                } else {
                    console.error('Jobs data is not an array:', jobs);
                    setJobs([]);
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Available jobs API error:', {
                    status: response.status,
                    statusText: response.statusText,
                    data: errorData
                });
                
                // Handle specific error cases
                if (response.status === 403) {
                    // Check for specific 403 error messages
                    const errorMessage = errorData.message || '';
                    if (errorMessage.includes('Driver not approved') || errorMessage.includes('license not verified')) {
                        setJobs([]);
                        setError('Your profile needs verification. Please contact your company administrator to approve your driver license and activate your account.');
                        return;
                    } else if (errorMessage.includes('vehicle') || errorMessage.includes('Vehicle')) {
                        setJobs([]);
                        setError('Your assigned vehicle needs verification. Please contact your company administrator.');
                        return;
                    } else if (errorMessage.includes('subscription') || errorMessage.includes('Company does not have an active subscription')) {
                        setJobs([]);
                        if (isDriver) {
                            setError('Your company\'s subscription is inactive. Please contact your company administrator to activate the subscription.');
                        } else {
                            setError('Your subscription is inactive. Please activate your subscription to access available jobs.');
                        }
                        return;
                    } else {
                        setJobs([]);
                        setError('Unable to access available jobs. Please contact your company administrator for assistance.');
                        return;
                    }
                }
                
                if (response.status === 404 && errorData.message?.includes('Transporter not found')) {
                    // Transporter profile doesn't exist yet - show empty state with helpful message
                    setJobs([]);
                    setError('Please complete your transporter profile first to view available jobs.');
                    return;
                }
                
                // Handle other 404 cases or server errors
                if (response.status === 404) {
                    setJobs([]);
                    setError('No available jobs found at the moment.');
                    return;
                }
                
                throw new Error(`Failed to fetch available jobs: ${response.status} ${response.statusText}`);
            }
        } catch (err: any) {
            console.error('Error fetching available jobs:', err);
            
            // Handle different types of errors
            if (err.name === 'AbortError') {
                setError('Request timed out. Please check your internet connection and try again.');
            } else if (err.message?.includes('Network request failed') || err.message?.includes('fetch')) {
                setError('Network error. Please check your internet connection and try again.');
            } else if (err.message?.includes('TypeError: Network request failed')) {
                setError('Network error. Please check your internet connection and try again.');
            } else {
                setError(err.message || 'Failed to fetch available jobs');
            }
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchAvailableJobs();
        setRefreshing(false);
    };

    useEffect(() => {
        fetchAvailableJobs();
    }, []);

    const handleAcceptJob = async (job: AvailableJob) => {
        try {
            const { getAuth } = require('firebase/auth');
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();
            const jobId = job.bookingId || job.id;
            
            if (!jobId) {
                throw new Error('No valid job ID found');
            }

            // Set loading state
            setAcceptingJobId(jobId);
            
            console.log('AvailableJobsCard - Accepting job with ID:', jobId);
            console.log('AvailableJobsCard - Full job object:', job);
            console.log('AvailableJobsCard - API endpoint:', `${API_ENDPOINTS.BOOKINGS}/${jobId}/accept`);
            
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

            console.log('AvailableJobsCard - Response status:', response.status);
            console.log('AvailableJobsCard - Response ok:', response.ok);
            
            if (response.ok) {
                const result = await response.json();
                console.log('AvailableJobsCard - Job accepted successfully:', result);
                console.log('AvailableJobsCard - Job ID:', jobId, 'Transporter ID:', user.uid);
                
                // Create chat room for communication
                try {
                    const chatRoom = await chatService.getOrCreateChatRoom(
                        jobId,
                        user.uid,
                        job.userId // This is the client ID from the job data
                    );
                    
                    // Send notification to client
                    try {
                        await enhancedNotificationService.sendNotification(
                            'booking_accepted',
                            job.userId, // This is the client ID
                            {
                                bookingId: jobId,
                                transporterName: user.displayName || 'Transporter',
                                pickupLocation: formatLocationForDisplay(job.fromLocation),
                                deliveryLocation: formatLocationForDisplay(job.toLocation),
                                productType: job.productType,
                                weight: job.weightKg ? `${job.weightKg}kg` : 'N/A',
                                cost: job.cost ? `KES ${job.cost.toLocaleString()}` : 'N/A',
                            }
                        );
                    } catch (notificationError) {
                        console.warn('Failed to send notification:', notificationError);
                        // Don't fail the job acceptance if notification fails
                    }

                    Alert.alert(
                        'Job Accepted! 🎉',
                        'You can now communicate with the client directly.',
                        [
                            {
                                text: 'Continue',
                                onPress: () => {
                                    // Remove the job from the list
                                    setJobs(prev => prev.filter(j => (j.bookingId || j.id) !== jobId));
                                    onJobAccepted?.(job);
                                }
                            },
                            {
                                text: 'Start Chat',
                                onPress: () => {
                                    // Navigate to chat screen
                                    navigation.navigate('ChatScreen', {
                                        roomId: chatRoom.id,
                                        bookingId: job.id,
                                        transporterName: 'You', // This should come from user profile
                                        clientName: job.client?.name || 'Client',
                                        transporterPhone: 'your-phone', // This should come from user profile
                                        clientPhone: job.client?.phone,
                                        userType: 'transporter'
                                    });
                                    // Remove the job from the list
                                    setJobs(prev => prev.filter(j => (j.bookingId || j.id) !== jobId));
                                    onJobAccepted?.(job);
                                }
                            }
                        ]
                    );
                } catch (chatError) {
                    console.error('Error creating chat room:', chatError);
                    Alert.alert('Success', 'Job accepted successfully!');
                    // Remove the job from the list
                    setJobs(prev => prev.filter(j => (j.bookingId || j.id) !== jobId));
                    onJobAccepted?.(job);
                }
            } else {
                let errorData;
                try {
                    const responseText = await response.text();
                    console.log('AvailableJobsCard - Raw error response:', responseText);
                    errorData = responseText ? JSON.parse(responseText) : { message: 'Empty response from server' };
                } catch (parseError) {
                    console.error('Failed to parse response:', parseError);
                    errorData = { message: 'Failed to parse server response' };
                }
                
                console.error('AvailableJobsCard - Failed to accept job:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorData: errorData,
                    jobId: jobId,
                    transporterId: user.uid,
                    apiUrl: `${API_ENDPOINTS.BOOKINGS}/${jobId}/accept`
                });
                
                // Provide more specific error messages based on status code
                let errorMessage = 'Unknown error';
                if (response.status === 401) {
                    errorMessage = 'Authentication failed. Please log in again.';
                } else if (response.status === 403) {
                    errorMessage = 'Access denied. You may not have permission to accept this job.';
                } else if (response.status === 404) {
                    errorMessage = 'Job not found. It may have been removed or already accepted.';
                } else if (response.status === 409) {
                    errorMessage = 'This job has already been accepted by another transporter.';
                } else if (response.status === 400) {
                    errorMessage = errorData.message || 'Invalid request. Please check your input.';
                } else if (response.status >= 500) {
                    errorMessage = 'Server error. Please try again later.';
                } else {
                    errorMessage = errorData.message || errorData.code || 'Unknown error';
                }
                
                throw new Error(errorMessage);
            }
        } catch (err: any) {
            console.error('Error accepting job:', err);
            Alert.alert('Error', err.message || 'Failed to accept job');
        } finally {
            // Clear loading state
            setAcceptingJobId(null);
        }
    };

    const handleRejectJob = async (job: AvailableJob) => {
        try {
            const { getAuth } = require('firebase/auth');
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();
            const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${job.id}/reject`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                Alert.alert('Success', 'Job rejected');
                // Remove the job from the list
                setJobs(prev => prev.filter(j => j.id !== job.id));
                onJobRejected?.(job);
            } else {
                throw new Error('Failed to reject job');
            }
        } catch (err: any) {
            console.error('Error rejecting job:', err);
            Alert.alert('Error', err.message || 'Failed to reject job');
        }
    };

    const getUrgencyColor = (urgency: string) => {
        const urgencyLower = urgency?.toLowerCase();
        console.log('Urgency level:', urgency, 'Lowercase:', urgencyLower);
        switch (urgencyLower) {
            case 'high': return colors.error;
            case 'medium': return colors.warning;
            case 'low': return colors.success;
            default: return colors.text.secondary;
        }
    };

    const getUrgencyBackgroundColor = (urgency: string) => {
        const urgencyLower = urgency?.toLowerCase();
        switch (urgencyLower) {
            case 'high': return colors.error + '15';
            case 'medium': return colors.warning + '15';
            case 'low': return colors.success + '15';
            default: return 'rgba(0,0,0,0.05)';
        }
    };

    const getUrgencyIcon = (urgency: string) => {
        const urgencyLower = urgency?.toLowerCase();
        switch (urgencyLower) {
            case 'high': return 'alert-circle';
            case 'medium': return 'clock';
            case 'low': return 'check-circle';
            default: return 'circle';
        }
    };

    const formatCurrency = (amount: number) => {
        return `KES ${amount.toLocaleString()}`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-KE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };


    const toggleConsolidationExpansion = (groupId: string) => {
        setExpandedConsolidations(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupId)) {
                newSet.delete(groupId);
            } else {
                newSet.add(groupId);
            }
            return newSet;
        });
    };

    const renderJobItem = ({ item }: { item: any }) => {
        // Check if this is a consolidation object
        const isConsolidation = item.isConsolidation === true || item.type === 'consolidated';
        const isExpanded = isConsolidation && expandedConsolidations.has(item.consolidationGroupId || item.id);

        return (
        <View style={styles.jobCard}>
            <View style={styles.jobHeader}>
                <View style={styles.jobInfo}>
                    {isConsolidation && (
                        <MaterialCommunityIcons
                            name="package-variant-closed"
                            size={16}
                            color={colors.primary}
                            style={{ marginRight: 4 }}
                        />
                    )}
                    <Text style={styles.jobType}>
                        {isConsolidation ? `Consolidation (${item.totalBookings || item.consolidatedBookings?.length || 0} bookings)` : item.productType}
                    </Text>
                    <View style={[styles.urgencyBadge, { 
                        backgroundColor: getUrgencyBackgroundColor(item.urgencyLevel || item.urgency),
                        borderColor: getUrgencyColor(item.urgencyLevel || item.urgency) + '30'
                    }]}>
                        <MaterialCommunityIcons
                            name={getUrgencyIcon(item.urgencyLevel || item.urgency)}
                            size={12}
                            color={getUrgencyColor(item.urgencyLevel || item.urgency)}
                        />
                        <Text style={[styles.urgencyText, { color: getUrgencyColor(item.urgencyLevel || item.urgency) }]}>
                            {(item.urgencyLevel || item.urgency)?.toUpperCase() || 'NORMAL'}
                        </Text>
                    </View>
                </View>
                <Text style={styles.jobPrice}>
                    {isConsolidation && item.totalCostRange 
                        ? formatCostRange({ costRange: item.totalCostRange })
                        : formatCostRange(item)}
                </Text>
            </View>

            {/* Consolidation Overview */}
            {isConsolidation && (
                <View style={styles.consolidationOverview}>
                    <View style={styles.consolidationSummary}>
                        <MaterialCommunityIcons name="package-variant" size={20} color={colors.primary} />
                        <View style={styles.consolidationSummaryText}>
                            <Text style={styles.consolidationSummaryTitle}>
                                {item.totalBookings || item.consolidatedBookings?.length || 0} individual bookings
                            </Text>
                            <Text style={styles.consolidationSummarySubtitle}>
                                Multiple pickup and dropoff locations
                            </Text>
                        </View>
                    </View>
                    
                    {/* Expand/Collapse Button */}
                    <TouchableOpacity
                        style={styles.expandButton}
                        onPress={() => toggleConsolidationExpansion(item.consolidationGroupId || item.id)}
                    >
                        <MaterialCommunityIcons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color={colors.primary}
                        />
                        <Text style={styles.expandButtonText}>
                            {isExpanded ? 'Hide Details' : 'View Individual Bookings'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Individual Bookings - Shown when expanded */}
            {isConsolidation && isExpanded && item.consolidatedBookings && (
                <View style={styles.individualBookingsContainer}>
                    <Text style={styles.individualBookingsTitle}>Individual Bookings:</Text>
                    {item.consolidatedBookings.map((booking: any, index: number) => (
                        <View key={booking.id || booking.bookingId || index} style={styles.individualBookingItem}>
                            <View style={styles.individualBookingHeader}>
                                <Text style={styles.individualBookingNumber}>Booking {index + 1}</Text>
                                <Text style={styles.individualBookingId}>
                                    #{getDisplayBookingId({
                                        ...booking,
                                        bookingType: booking.bookingType || booking.type,
                                        bookingMode: booking.bookingMode || (booking.type === 'instant' ? 'instant' : 'booking')
                                    })}
                                </Text>
                            </View>
                            <View style={styles.individualBookingDetails}>
                                <View style={styles.individualBookingRow}>
                                    <MaterialCommunityIcons name="map-marker" size={14} color={colors.primary} />
                                    <Text style={styles.individualBookingText}>
                                        From: {typeof booking.fromLocation === 'object' 
                                            ? (booking.fromLocation.address || 'Unknown') 
                                            : (booking.fromLocation || booking.fromLocationAddress || 'Unknown')}
                                    </Text>
                                </View>
                                <View style={styles.individualBookingRow}>
                                    <MaterialCommunityIcons name="map-marker-check" size={14} color={colors.success} />
                                    <Text style={styles.individualBookingText}>
                                        To: {typeof booking.toLocation === 'object' 
                                            ? (booking.toLocation.address || 'Unknown') 
                                            : (booking.toLocation || booking.toLocationAddress || 'Unknown')}
                                    </Text>
                                </View>
                                <View style={styles.individualBookingRow}>
                                    <MaterialCommunityIcons name="package-variant" size={14} color={colors.secondary} />
                                    <Text style={styles.individualBookingText}>
                                        {booking.productType || 'N/A'} | {booking.weight || booking.weightKg || '0'}kg
                                    </Text>
                                </View>
                                <View style={styles.individualBookingRow}>
                                    <MaterialCommunityIcons name="cash" size={14} color={colors.success} />
                                    <Text style={[styles.individualBookingText, { fontWeight: 'bold' }]}>
                                        Cost: {formatCostRange(booking)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Route information - Only show for non-consolidation or when consolidation is collapsed */}
            {!isConsolidation && (
                <>
                    <View style={styles.jobDetails}>
                        <LocationDisplay 
                            location={item.fromLocation} 
                            iconColor={colors.primary} 
                        />
                        <LocationDisplay 
                            location={item.toLocation} 
                            iconColor={colors.text.secondary}
                            iconName="map-marker-outline"
                        />
                    </View>

                    <View style={styles.jobSpecs}>
                        <View style={styles.specItem}>
                            <MaterialCommunityIcons name="package-variant" size={14} color={colors.text.secondary} />
                            <Text style={styles.specText}>{item.productType}</Text>
                        </View>
                        <View style={styles.specItem}>
                            <MaterialCommunityIcons name="weight" size={14} color={colors.text.secondary} />
                            <Text style={styles.specText}>{item.weightKg}kg</Text>
                        </View>
                        <View style={styles.specItem}>
                            <MaterialCommunityIcons name="truck" size={14} color={colors.text.secondary} />
                            <Text style={styles.specText}>{item.vehicleType}</Text>
                        </View>
                    </View>
                </>
            )}
            
            {/* Route summary for consolidation (when collapsed) */}
            {isConsolidation && !isExpanded && (
                <View style={styles.jobDetails}>
                    <View style={styles.routeItem}>
                        <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
                        <Text style={styles.routeText}>Multiple pickup locations</Text>
                    </View>
                    <View style={styles.routeItem}>
                        <MaterialCommunityIcons name="map-marker-check" size={16} color={colors.secondary} />
                        <Text style={styles.routeText}>Multiple dropoff locations</Text>
                    </View>
                </View>
            )}

            <View style={styles.jobFooter}>
                <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{item.client?.name || 'Client'}</Text>
                    <View style={styles.ratingRow}>
                        <MaterialCommunityIcons name="star" size={12} color={colors.warning} />
                        <Text style={styles.ratingText}>
                            {typeof item.client?.rating === 'number' ? item.client.rating.toFixed(1) : 'New'}
                        </Text>
                        <Text style={styles.ordersText}>({item.client?.completedOrders || 0} orders)</Text>
                    </View>
                    {item.client?.phone && (
                        <View style={styles.contactRow}>
                            <MaterialCommunityIcons name="phone" size={12} color={colors.primary} />
                            <Text style={styles.contactText}>{item.client.phone}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleRejectJob(item)}
                    >
                        <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.actionButton, 
                            styles.acceptButton,
                            acceptingJobId === (item.bookingId || item.id) && styles.acceptButtonDisabled
                        ]}
                        onPress={() => handleAcceptJob(item)}
                        disabled={acceptingJobId === (item.bookingId || item.id)}
                    >
                        {acceptingJobId === (item.bookingId || item.id) ? (
                            <>
                                <ActivityIndicator size="small" color={colors.white} style={{ marginRight: 4 }} />
                                <Text style={styles.acceptButtonText}>Accepting...</Text>
                            </>
                        ) : (
                            <Text style={styles.acceptButtonText}>Accept</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Available Jobs</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading available jobs...</Text>
                </View>
            </View>
        );
    }

    if (error) {
        const isProfileError = error.includes('complete your transporter profile');
        const isVerificationError = error.includes('verification') || error.includes('approved') || error.includes('license');
        const isNetworkError = error.includes('Network error') || error.includes('internet connection');
        
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Available Jobs</Text>
                </View>
                <View style={styles.errorContainer}>
                    <MaterialCommunityIcons 
                        name={
                            isProfileError ? "account-plus" : 
                            isVerificationError ? "account-alert" :
                            isNetworkError ? "wifi-off" :
                            "alert-circle"
                        } 
                        size={48} 
                        color={
                            isProfileError ? colors.primary : 
                            isVerificationError ? colors.warning :
                            isNetworkError ? colors.text.secondary :
                            colors.error
                        } 
                    />
                    <Text style={styles.errorTitle}>
                        {isNetworkError ? 'Connection Issue' : 
                         isVerificationError ? 'Verification Required' :
                         'Unable to Load Jobs'}
                    </Text>
                    <Text style={styles.errorText}>{error}</Text>
                    {isProfileError ? (
                        <TouchableOpacity 
                            style={styles.profileButton} 
                            onPress={() => navigation.navigate('TransporterCompletion')}
                        >
                            <MaterialCommunityIcons name="account-plus" size={16} color={colors.white} style={{ marginRight: 4 }} />
                            <Text style={styles.profileButtonText}>Complete Profile</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.retryButton} onPress={fetchAvailableJobs}>
                            <MaterialCommunityIcons name="refresh" size={16} color={colors.white} style={{ marginRight: 4 }} />
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Available Jobs</Text>
                <TouchableOpacity onPress={onViewAll} style={styles.viewAllButton}>
                    <Text style={styles.viewAllText}>View All</Text>
                    <MaterialCommunityIcons name="chevron-right" size={16} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {jobs.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="truck-delivery" size={48} color={colors.text.light} />
                    <Text style={styles.emptyTitle}>No Available Jobs</Text>
                    <Text style={styles.emptyText}>
                        There are currently no jobs available that match your vehicle capabilities.
                    </Text>
                </View>
            ) : (
                <View style={styles.jobsListContainer}>
                    {jobs.slice(0, 3).map((job) => (
                        <View key={job.id}>
                            {renderJobItem({ item: job })}
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.background,
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: colors.black,
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    title: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    viewAllText: {
        fontSize: fonts.size.sm,
        color: colors.primary,
        fontWeight: '600',
        marginRight: 4,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    loadingText: {
        marginTop: spacing.md,
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
    },
    errorContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.md,
    },
    errorTitle: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginTop: spacing.md,
        textAlign: 'center',
    },
    errorText: {
        marginTop: spacing.sm,
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: spacing.md,
    },
    retryButton: {
        marginTop: spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.primary,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    retryButtonText: {
        color: colors.white,
        fontWeight: '600',
        fontSize: fonts.size.md,
    },
    profileButton: {
        marginTop: spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.primary,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    profileButtonText: {
        color: colors.white,
        fontWeight: '600',
        fontSize: fonts.size.md,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    emptyTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginTop: spacing.md,
    },
    emptyText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        marginTop: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
    jobsListContainer: {
        // Container for non-virtualized list when nested in ScrollView
    },
    jobCard: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    jobHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    },
    jobInfo: {
        flex: 1,
    },
    jobType: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: 4,
    },
    urgencyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    urgencyText: {
        fontSize: fonts.size.xs,
        fontWeight: '700',
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    jobPrice: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.primary,
    },
    jobDetails: {
        marginBottom: spacing.sm,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    locationText: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        marginLeft: 8,
        flex: 1,
    },
    jobSpecs: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: spacing.sm,
    },
    specItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: spacing.md,
        marginBottom: 4,
    },
    specText: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginLeft: 4,
    },
    jobFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    clientInfo: {
        flex: 1,
    },
    clientName: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.primary,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    ratingText: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginLeft: 4,
    },
    ordersText: {
        fontSize: fonts.size.xs,
        color: colors.text.light,
        marginLeft: 4,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    contactText: {
        fontSize: fonts.size.xs,
        color: colors.primary,
        marginLeft: 4,
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    actionButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 8,
        minWidth: 70,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    rejectButton: {
        backgroundColor: colors.error + '20',
        borderWidth: 1,
        borderColor: colors.error,
    },
    rejectButtonText: {
        color: colors.error,
        fontSize: fonts.size.sm,
        fontWeight: '700',
    },
    acceptButton: {
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOpacity: 0.3,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptButtonDisabled: {
        backgroundColor: colors.text.light,
        opacity: 0.7,
    },
    acceptButtonText: {
        color: colors.white,
        fontSize: fonts.size.sm,
        fontWeight: '700',
    },
    // Consolidation Styles
    consolidationOverview: {
        backgroundColor: colors.primary + '10',
        borderRadius: 8,
        padding: 12,
        marginVertical: 12,
        borderWidth: 1,
        borderColor: colors.primary + '30',
    },
    consolidationSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    consolidationSummaryText: {
        marginLeft: 8,
        flex: 1,
    },
    consolidationSummaryTitle: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
        fontFamily: fonts.family.bold,
    },
    consolidationSummarySubtitle: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginTop: 2,
        fontFamily: fonts.family.regular,
    },
    expandButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: colors.primary + '20',
        borderRadius: 6,
    },
    expandButtonText: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.primary,
        marginLeft: 4,
        fontFamily: fonts.family.medium,
    },
    individualBookingsContainer: {
        marginTop: 12,
        padding: 12,
        backgroundColor: colors.background,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    individualBookingsTitle: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: 12,
        fontFamily: fonts.family.bold,
    },
    individualBookingItem: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    individualBookingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    individualBookingNumber: {
        fontSize: fonts.size.sm,
        fontWeight: 'bold',
        color: colors.primary,
        fontFamily: fonts.family.bold,
    },
    individualBookingId: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        fontFamily: fonts.family.regular,
    },
    individualBookingDetails: {
        marginTop: 4,
    },
    individualBookingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    individualBookingText: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        marginLeft: 8,
        flex: 1,
        fontFamily: fonts.family.regular,
    },
    routeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    routeText: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        marginLeft: 8,
        flex: 1,
    },
});

export default AvailableJobsCard;
