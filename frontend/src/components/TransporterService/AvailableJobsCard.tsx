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
import { convertCoordinatesToPlaceName, formatLocationForDisplay } from '../../utils/locationUtils';
import { useLocationName } from '../../hooks/useLocationName';
import { cleanLocationDisplay } from '../../utils/locationDisplay';
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
                    setJobs(jobs);
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
            const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${job.id}/accept`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                // Create chat room for communication
                try {
                    const chatRoom = await chatService.getOrCreateChatRoom(
                        job.id,
                        user.uid,
                        job.client?.id || 'client-id' // This should come from the job data
                    );
                    
                    // Send notification to client
                    await enhancedNotificationService.sendNotification(
                        'booking_accepted',
                        job.client?.id || 'client-id',
                        {
                            bookingId: job.id,
                            transporterName: 'You', // This should come from user profile
                        pickupLocation: formatLocationForDisplay(job.fromLocation),
                        deliveryLocation: formatLocationForDisplay(job.toLocation),
                        }
                    );

                    Alert.alert(
                        'Job Accepted! 🎉',
                        'You can now communicate with the client directly.',
                        [
                            {
                                text: 'Continue',
                                onPress: () => {
                                    // Remove the job from the list
                                    setJobs(prev => prev.filter(j => j.id !== job.id));
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
                                    setJobs(prev => prev.filter(j => j.id !== job.id));
                                    onJobAccepted?.(job);
                                }
                            }
                        ]
                    );
                } catch (chatError) {
                    console.error('Error creating chat room:', chatError);
                    Alert.alert('Success', 'Job accepted successfully!');
                    // Remove the job from the list
                    setJobs(prev => prev.filter(j => j.id !== job.id));
                    onJobAccepted?.(job);
                }
            } else {
                throw new Error('Failed to accept job');
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
        switch (urgency) {
            case 'high': return colors.error;
            case 'medium': return colors.warning;
            case 'low': return colors.success;
            default: return colors.text.secondary;
        }
    };

    const getUrgencyIcon = (urgency: string) => {
        switch (urgency) {
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

    // Helper function to format location for display
    const formatLocationForDisplay = (location: any): string => {
        if (typeof location === 'string') {
            return location;
        }
        if (location?.address) {
            return location.address;
        }
        if (location?.latitude && location?.longitude && 
            typeof location.latitude === 'number' && typeof location.longitude === 'number') {
            return `Location (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`;
        }
        return 'Unknown location';
    };

    const renderJobItem = ({ item }: { item: AvailableJob }) => (
        <View style={styles.jobCard}>
            <View style={styles.jobHeader}>
                <View style={styles.jobInfo}>
                    <Text style={styles.jobType}>{item.productType}</Text>
                    <View style={styles.urgencyBadge}>
                        <MaterialCommunityIcons
                            name={getUrgencyIcon(item.urgencyLevel)}
                            size={12}
                            color={getUrgencyColor(item.urgencyLevel)}
                        />
                        <Text style={[styles.urgencyText, { color: getUrgencyColor(item.urgencyLevel) }]}>
                            {item.urgencyLevel?.toUpperCase() || 'NORMAL'}
                        </Text>
                    </View>
                </View>
                <Text style={styles.jobPrice}>{formatCurrency(item.cost || 0)}</Text>
            </View>

            <View style={styles.jobDetails}>
                <LocationDisplay 
                    location={formatLocationForDisplay(item.fromLocation)} 
                    iconColor={colors.primary} 
                />
                <LocationDisplay 
                    location={formatLocationForDisplay(item.toLocation)} 
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
        
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Available Jobs</Text>
                </View>
                <View style={styles.errorContainer}>
                    <MaterialCommunityIcons 
                        name={isProfileError ? "account-plus" : "alert-circle"} 
                        size={48} 
                        color={isProfileError ? colors.primary : colors.error} 
                    />
                    <Text style={styles.errorText}>{error}</Text>
                    {isProfileError ? (
                        <TouchableOpacity 
                            style={styles.profileButton} 
                            onPress={() => navigation.navigate('TransporterCompletion')}
                        >
                            <Text style={styles.profileButtonText}>Complete Profile</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.retryButton} onPress={fetchAvailableJobs}>
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
                <FlatList
                    data={jobs.slice(0, 3)} // Show only first 3 jobs
                    renderItem={renderJobItem}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colors.primary]}
                        />
                    }
                />
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
    },
    errorText: {
        marginTop: spacing.md,
        fontSize: fonts.size.sm,
        color: colors.error,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: colors.primary,
        borderRadius: 8,
    },
    retryButtonText: {
        color: colors.white,
        fontWeight: '600',
    },
    profileButton: {
        marginTop: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: colors.primary,
        borderRadius: 8,
    },
    profileButtonText: {
        color: colors.white,
        fontWeight: '600',
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
    jobCard: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
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
    },
    urgencyText: {
        fontSize: fonts.size.xs,
        fontWeight: '600',
        marginLeft: 4,
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
    },
    rejectButton: {
        backgroundColor: colors.error + '20',
        borderWidth: 1,
        borderColor: colors.error,
    },
    rejectButtonText: {
        color: colors.error,
        fontSize: fonts.size.sm,
        fontWeight: '600',
    },
    acceptButton: {
        backgroundColor: colors.primary,
    },
    acceptButtonText: {
        color: colors.white,
        fontSize: fonts.size.sm,
        fontWeight: '600',
    },
});

export default AvailableJobsCard;
