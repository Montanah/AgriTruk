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
    View
} from 'react-native';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';
import { API_ENDPOINTS } from '../../constants/api';
import { getLocationName, formatLocationForDisplay } from '../../utils/locationUtils';
import { chatService } from '../../services/chatService';
import { enhancedNotificationService } from '../../services/enhancedNotificationService';
import LocationDisplay from '../common/LocationDisplay';

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

    const fetchAvailableJobs = async () => {
        try {
            setError(null);
            const { getAuth } = require('firebase/auth');
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();
            console.log('Fetching available jobs from:', `${API_ENDPOINTS.BOOKINGS}/requests`);
            
            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/requests`, {
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
                    const availableJobs = jobs.filter(job => {
                        // Only show jobs that are pending and not already accepted
                        const isPending = job.status === 'pending';
                        const notAccepted = !job.acceptedAt || job.acceptedAt === null;
                        const notAssigned = !job.transporterId || job.transporterId === null;
                        
                        console.log(`Job ${job.bookingId || job.id} - Status: ${job.status}, AcceptedAt: ${job.acceptedAt}, TransporterId: ${job.transporterId}, Available: ${isPending && notAccepted && notAssigned}`);
                        
                        return isPending && notAccepted && notAssigned;
                    });
                    
                    console.log(`Filtered ${availableJobs.length} available jobs from ${jobs.length} total jobs`);
                    
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
                    } else if (errorMessage.includes('subscription')) {
                        setJobs([]);
                        setError('Your company subscription is inactive. Please contact your company administrator.');
                        return;
                    } else {
                        setJobs([]);
                        setError('Access denied. Please contact your company administrator for assistance.');
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


    const renderJobItem = ({ item }: { item: AvailableJob }) => (
        <View style={styles.jobCard}>
            <View style={styles.jobHeader}>
                <View style={styles.jobInfo}>
                    <Text style={styles.jobType}>{item.productType}</Text>
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
                <Text style={styles.jobPrice}>{formatCurrency(item.cost || 0)}</Text>
            </View>

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
                        style={[styles.actionButton, styles.acceptButton]}
                        onPress={() => handleAcceptJob(item)}
                    >
                        <Text style={styles.acceptButtonText}>Accept</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

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
    },
    acceptButtonText: {
        color: colors.white,
        fontSize: fonts.size.sm,
        fontWeight: '700',
    },
});

export default AvailableJobsCard;
