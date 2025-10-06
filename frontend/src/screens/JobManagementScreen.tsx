import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Linking,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import { getDisplayBookingId } from '../utils/unifiedIdSystem';
import spacing from '../constants/spacing';
import { API_ENDPOINTS } from '../constants/api';
import { enhancedNotificationService } from '../services/enhancedNotificationService';
import LocationDisplay from '../components/common/LocationDisplay';

interface Job {
    id: string;
    bookingId?: string;
    type?: string;
    bookingType?: string;
    bookingMode?: 'instant' | 'booking';
    fromLocation: string;
    toLocation: string;
    productType: string;
    weight?: string;
    weightKg?: number;
    createdAt: string;
    status: 'accepted' | 'ongoing' | 'completed' | 'cancelled' | 'pending';
    estimatedValue?: number;
    cost?: number;
    specialRequirements?: string[];
    client?: {
        name: string;
        phone: string;
        email: string;
        rating: number;
        completedOrders: number;
    };
    pricing?: {
        basePrice: number;
        urgencyBonus: number;
        specialHandling: number;
        total: number;
    };
    route?: {
        distance: string;
        estimatedTime: string;
        detour: string;
    };
    vehicleType?: string;
    vehicle?: {
        id: string;
        type: string;
        reg: string;
        bodyType: string;
        model: string;
        capacity: string;
    };
    bodyType?: string;
    capacity?: string;
    pickupDate?: string;
    pickUpDate?: string;
    deliveryDate?: string;
    actualPickupDate?: string;
    actualDeliveryDate?: string;
    notes?: string;
}

type JobStatus = 'all' | 'accepted' | 'ongoing' | 'completed' | 'cancelled' | 'active' | 'route-loads';

const JobManagementScreen = () => {
    const navigation = useNavigation();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<JobStatus>('all');
    
    // Enhanced filter states
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        fromLocation: '',
        toLocation: '',
        productType: '',
        minValue: '',
        maxValue: '',
        status: 'all'
    });

    const statusFilters: { key: JobStatus; label: string; count: number }[] = [
        { key: 'all', label: 'All', count: jobs.length },
        { key: 'active', label: 'Active Jobs', count: jobs.filter(j => j.status === 'accepted' || j.status === 'ongoing').length },
        { key: 'route-loads', label: 'Route Loads', count: jobs.filter(j => j.status === 'ongoing').length },
        { key: 'accepted', label: 'Accepted', count: jobs.filter(j => j.status === 'accepted').length },
        { key: 'ongoing', label: 'Ongoing', count: jobs.filter(j => j.status === 'ongoing').length },
        { key: 'completed', label: 'Completed', count: jobs.filter(j => j.status === 'completed').length },
        { key: 'cancelled', label: 'Cancelled', count: jobs.filter(j => j.status === 'cancelled').length },
    ];

    const fetchJobs = async () => {
        try {
            setError(null);
            const { getAuth } = require('firebase/auth');
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();
            const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/transporter/${user.uid}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                console.log('JobManagementScreen - API Response:', data);
                console.log('JobManagementScreen - Bookings count:', data.bookings?.length || 0);
                
                // Ensure we have an array of jobs
                const jobsArray = data.bookings || data.jobs || [];
                console.log('JobManagementScreen - Jobs array:', jobsArray);
                
                // Log the first job to see what data we're getting
                if (jobsArray.length > 0) {
                    console.log('JobManagementScreen - First job data:', jobsArray[0]);
                    console.log('JobManagementScreen - First job client:', jobsArray[0].client);
                    console.log('JobManagementScreen - First job vehicle:', jobsArray[0].vehicle);
                    console.log('JobManagementScreen - First job fromLocation:', jobsArray[0].fromLocation);
                    console.log('JobManagementScreen - First job toLocation:', jobsArray[0].toLocation);
                    console.log('JobManagementScreen - First job pickUpDate:', jobsArray[0].pickUpDate);
                    console.log('JobManagementScreen - First job deliveryDate:', jobsArray[0].deliveryDate);
                    console.log('JobManagementScreen - First job createdAt:', jobsArray[0].createdAt);
                    console.log('JobManagementScreen - First job updatedAt:', jobsArray[0].updatedAt);
                }
                
                // If backend doesn't provide client data, try to fetch it
                const enrichedJobs = await Promise.all(jobsArray.map(async (job) => {
                    console.log(`JobManagementScreen - Processing job ${job.id}:`, {
                        hasClient: !!job.client,
                        userId: job.userId,
                        clientData: job.client
                    });
                    
                    if (!job.client && job.userId) {
                        try {
                            console.log(`JobManagementScreen - Fetching client data for userId: ${job.userId}`);
                            const clientResponse = await fetch(`${API_ENDPOINTS.USERS}/${job.userId}`, {
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                },
                            });
                            
                            console.log(`JobManagementScreen - Client response status: ${clientResponse.status}`);
                            
                            if (clientResponse.ok) {
                                const clientData = await clientResponse.json();
                                console.log(`JobManagementScreen - Client data received:`, clientData);
                                job.client = {
                                    id: clientData.uid,
                                    name: clientData.name || 'Unknown Client',
                                    phone: clientData.phone || 'No phone',
                                    email: clientData.email || 'No email',
                                    rating: clientData.rating || 0,
                                    completedOrders: clientData.completedOrders || 0,
                                };
                                console.log(`JobManagementScreen - Client data set:`, job.client);
                            } else {
                                console.log(`JobManagementScreen - Failed to fetch client data: ${clientResponse.status}`);
                            }
                        } catch (error) {
                            console.error('JobManagementScreen - Error fetching client data:', error);
                        }
                    } else if (job.client) {
                        console.log(`JobManagementScreen - Job already has client data:`, job.client);
                    } else {
                        console.log(`JobManagementScreen - No userId available for job:`, job.id);
                    }
                    return job;
                }));
                
                setJobs(enrichedJobs);
            } else {
                const errorText = await response.text();
                console.log('JobManagementScreen - API Error:', response.status, response.statusText, errorText);
                throw new Error(`Failed to fetch jobs: ${response.status} ${response.statusText}`);
            }
        } catch (err: any) {
            console.error('Error fetching jobs:', err);
            setError(err.message || 'Failed to fetch jobs');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchJobs();
        setRefreshing(false);
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    // Apply filters
    const applyFilters = () => {
        let filtered = jobs;
        
        // Status filter
        if (filters.status !== 'all') {
            if (filters.status === 'active') {
                filtered = filtered.filter(job => job.status === 'accepted' || job.status === 'ongoing');
            } else if (filters.status === 'route-loads') {
                filtered = filtered.filter(job => job.status === 'ongoing');
            } else {
                filtered = filtered.filter(job => job.status === filters.status);
            }
        }
        
        // Location filters
        if (filters.fromLocation) {
            filtered = filtered.filter(job => 
                job.fromLocation.toLowerCase().includes(filters.fromLocation.toLowerCase())
            );
        }
        
        if (filters.toLocation) {
            filtered = filtered.filter(job => 
                job.toLocation.toLowerCase().includes(filters.toLocation.toLowerCase())
            );
        }
        
        // Product type filter
        if (filters.productType) {
            filtered = filtered.filter(job => 
                job.productType.toLowerCase().includes(filters.productType.toLowerCase())
            );
        }
        
        // Value range filters
        if (filters.minValue) {
            const minVal = parseFloat(filters.minValue);
            if (!isNaN(minVal)) {
                filtered = filtered.filter(job => job.estimatedValue >= minVal);
            }
        }
        
        if (filters.maxValue) {
            const maxVal = parseFloat(filters.maxValue);
            if (!isNaN(maxVal)) {
                filtered = filtered.filter(job => job.estimatedValue <= maxVal);
            }
        }
        
        setFilteredJobs(filtered);
    };

    // Clear all filters
    const clearFilters = () => {
        setFilters({
            fromLocation: '',
            toLocation: '',
            productType: '',
            minValue: '',
            maxValue: '',
            status: 'all'
        });
        setSelectedStatus('all');
    };

    useEffect(() => {
        applyFilters();
    }, [jobs, filters]);

    useEffect(() => {
        if (selectedStatus === 'all') {
            setFilteredJobs(jobs);
        } else {
            setFilteredJobs(jobs.filter(job => job.status === selectedStatus));
        }
    }, [jobs, selectedStatus]);

    const updateJobStatus = async (jobId: string, newStatus: string) => {
        try {
            const { getAuth } = require('firebase/auth');
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            // Find the job to get client information
            const job = jobs.find(j => j.id === jobId);
            if (!job) {
                throw new Error('Job not found');
            }

            const token = await user.getIdToken();
            const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/update/${jobId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
                // Send notification to client based on status change
                if (job.client?.id || job.userId) {
                    const clientId = job.client?.id || job.userId;
                    const transporterName = user.displayName || 'Transporter';
                    
                    let notificationType: string;
                    let notificationData: any = {
                        bookingId: jobId,
                        transporterName,
                        pickupLocation: formatLocationForDisplay(job.fromLocation),
                        deliveryLocation: formatLocationForDisplay(job.toLocation),
                        productType: job.productType,
                    };

                    switch (newStatus) {
                        case 'ongoing':
                            notificationType = 'trip_started';
                            break;
                        case 'completed':
                            notificationType = 'trip_completed';
                            break;
                        case 'cancelled':
                            notificationType = 'booking_cancelled';
                            break;
                        default:
                            notificationType = 'booking_updated';
                    }

                    try {
                        await enhancedNotificationService.sendNotification(
                            notificationType as any,
                            clientId,
                            notificationData
                        );
                    } catch (notificationError) {
                        console.error('Error sending notification:', notificationError);
                        // Don't fail the status update if notification fails
                    }
                }

                Alert.alert('Success', 'Job status updated successfully!');
                // Update the job in the local state
                setJobs(prev => prev.map(job => 
                    job.id === jobId ? { ...job, status: newStatus as any } : job
                ));
            } else {
                throw new Error('Failed to update job status');
            }
        } catch (err: any) {
            console.error('Error updating job status:', err);
            Alert.alert('Error', err.message || 'Failed to update job status');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'accepted': return colors.primary;
            case 'ongoing': return colors.warning;
            case 'completed': return colors.success;
            case 'cancelled': return colors.error;
            default: return colors.text.secondary;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'accepted': return 'check-circle';
            case 'ongoing': return 'clock';
            case 'completed': return 'check-circle-outline';
            case 'cancelled': return 'close-circle';
            default: return 'circle';
        }
    };

    const cancelJob = async (job: Job, reason: string) => {
        try {
            const { getAuth } = require('firebase/auth');
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
                body: JSON.stringify({ 
                    status: 'cancelled',
                    cancellationReason: reason,
                    cancelledAt: new Date().toISOString()
                })
            });

            if (response.ok) {
                // Send notification to client
                if (job.client?.id || job.userId) {
                    const clientId = job.client?.id || job.userId;
                    const transporterName = user.displayName || 'Transporter';
                    
                    try {
                        await enhancedNotificationService.sendNotification(
                            'booking_cancelled',
                            clientId,
                            {
                                bookingId: job.id,
                                transporterName,
                                cancellationReason: reason,
                                pickupLocation: formatLocationForDisplay(job.fromLocation),
                                deliveryLocation: formatLocationForDisplay(job.toLocation),
                                productType: job.productType,
                            }
                        );
                    } catch (notificationError) {
                        console.error('Error sending cancellation notification:', notificationError);
                    }
                }

                Alert.alert('Success', 'Job cancelled successfully!');
                fetchJobs();
            } else {
                throw new Error('Failed to cancel job');
            }
        } catch (err: any) {
            console.error('Error cancelling job:', err);
            Alert.alert('Error', err.message || 'Failed to cancel job');
        }
    };

    const showCancelModal = (job: Job) => {
        Alert.prompt(
            'Cancel Job',
            'Please provide a reason for cancellation:',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Confirm', 
                    onPress: (reason) => {
                        if (reason && reason.trim()) {
                            cancelJob(job, reason.trim());
                        } else {
                            Alert.alert('Error', 'Please provide a cancellation reason');
                        }
                    }
                }
            ],
            'plain-text'
        );
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
        (navigation as any).navigate('ChatScreen', { 
            jobId: job.id,
            bookingId: job.bookingId,
            clientId: job.client?.id || job.userId,
            clientName: job.client?.name || job.customerName
        });
    };

    const handleStartTrip = (job: Job) => {
        // Navigate to trip navigation screen
        (navigation as any).navigate('TripNavigationScreen', { 
            jobId: job.id,
            bookingId: job.bookingId,
            job: job
        });
    };

    const formatCurrency = (amount: number) => {
        return `KES ${amount.toLocaleString()}`;
    };

    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return 'Not set';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }
        
        return date.toLocaleDateString('en-KE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };


    const renderStatusFilter = ({ item }: { item: { key: JobStatus; label: string; count: number } }) => (
        <TouchableOpacity
            style={[
                styles.filterButton,
                selectedStatus === item.key && styles.filterButtonActive
            ]}
            onPress={() => setSelectedStatus(item.key)}
        >
            <Text style={[
                styles.filterButtonText,
                selectedStatus === item.key && styles.filterButtonTextActive
            ]}>
                {item.label} ({item.count})
            </Text>
        </TouchableOpacity>
    );

    const renderJobItem = ({ item }: { item: Job }) => (
        <View style={styles.jobCard}>
            {/* Header with Job Type, Status, and Price */}
            <View style={styles.jobHeader}>
                <View style={styles.jobInfo}>
                    <View style={styles.jobTypeRow}>
                        <Text style={styles.jobType}>{item.bookingType || item.type || 'Booking'}</Text>
                        {item.bookingMode === 'instant' && (
                            <View style={styles.instantBadge}>
                                <MaterialCommunityIcons name="lightning-bolt" size={12} color={colors.warning} />
                                <Text style={styles.instantText}>INSTANT</Text>
                            </View>
                        )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <MaterialCommunityIcons
                            name={getStatusIcon(item.status)}
                            size={12}
                            color={getStatusColor(item.status)}
                        />
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {item.status.toUpperCase()}
                        </Text>
                    </View>
                </View>
                <Text style={styles.jobPrice}>{formatCurrency(item.cost || item.pricing?.total || item.estimatedValue || 0)}</Text>
            </View>

            {/* Job ID */}
            <View style={styles.jobIdSection}>
                <MaterialCommunityIcons name="identifier" size={16} color={colors.primary} />
                <Text style={styles.jobIdLabel}>Job ID:</Text>
                <Text style={styles.jobIdValue}>{getDisplayBookingId(item)}</Text>
            </View>

            {/* Route Information */}
            <View style={styles.routeSection}>
                <Text style={styles.sectionTitle}>Route</Text>
                <View style={styles.routeContainer}>
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
            </View>

            {/* Job Information */}
            <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Job Information</Text>
                <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                        <MaterialCommunityIcons name="package-variant" size={16} color={colors.text.secondary} />
                        <Text style={styles.infoLabel}>Product:</Text>
                        <Text style={styles.infoValue}>{item.productType || 'Not specified'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <MaterialCommunityIcons name="weight" size={16} color={colors.text.secondary} />
                        <Text style={styles.infoLabel}>Weight:</Text>
                        <Text style={styles.infoValue}>
                            {item.weight || item.weightKg ? `${item.weightKg || item.weight}kg` : 'Not specified'}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <MaterialCommunityIcons name="currency-usd" size={16} color={colors.text.secondary} />
                        <Text style={styles.infoLabel}>Value:</Text>
                        <Text style={styles.infoValue}>
                            {formatCurrency(item.cost || item.pricing?.total || item.estimatedValue || 0)}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Client Information */}
            <View style={styles.clientSection}>
                <Text style={styles.sectionTitle}>Client Details</Text>
                <View style={styles.clientCard}>
                    <View style={styles.clientHeader}>
                        <Text style={styles.clientName}>{item.client?.name || 'Client Name'}</Text>
                        <View style={styles.ratingContainer}>
                            <MaterialCommunityIcons name="star" size={14} color={colors.warning} />
                            <Text style={styles.ratingText}>{item.client?.rating?.toFixed(1) || '0.0'}</Text>
                        </View>
                    </View>
                    <Text style={styles.clientContact}>{item.client?.phone || 'Contact not available'}</Text>
                    <Text style={styles.clientOrders}>({item.client?.completedOrders || 0} completed orders)</Text>
                </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionSection}>
                <View style={styles.actionButtons}>
                    {item.status === 'accepted' && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.startButton]}
                            onPress={() => handleStartTrip(item)}
                        >
                            <MaterialCommunityIcons name="play" size={16} color={colors.white} />
                            <Text style={styles.startButtonText}>Start Trip</Text>
                        </TouchableOpacity>
                    )}
                    {item.status === 'ongoing' && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.completeButton]}
                            onPress={() => updateJobStatus(item.id, 'completed')}
                        >
                            <MaterialCommunityIcons name="check" size={16} color={colors.white} />
                            <Text style={styles.completeButtonText}>Complete</Text>
                        </TouchableOpacity>
                    )}
                    
                    {/* Communication Buttons Row */}
                    <View style={styles.communicationRow}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.chatButton]}
                            onPress={() => handleChat(item)}
                        >
                            <MaterialCommunityIcons name="message-text" size={16} color={colors.primary} />
                            <Text style={styles.chatButtonText}>Chat</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={[styles.actionButton, styles.callButton]}
                            onPress={() => handleCall(item.client?.phone || '')}
                        >
                            <MaterialCommunityIcons name="phone" size={16} color={colors.success} />
                            <Text style={styles.callButtonText}>Call</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {/* Cancel Button Row */}
                    {(item.status === 'accepted' || item.status === 'ongoing') && (
                        <View style={styles.cancelRow}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.cancelButton]}
                                onPress={() => showCancelModal(item)}
                            >
                                <MaterialCommunityIcons name="close-circle" size={16} color={colors.error} />
                                <Text style={styles.cancelButtonText}>Cancel Job</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>

            {/* Pickup Date */}
            <View style={styles.dateSection}>
                <Text style={styles.dateLabel}>
                    Pickup: {formatDate(item.pickUpDate || item.pickupDate || item.createdAt)}
                </Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Job Management</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading jobs...</Text>
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Job Management</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={styles.errorContainer}>
                    <MaterialCommunityIcons name="alert-circle" size={48} color={colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={fetchJobs}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Job Management</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Enhanced Filter Section */}
            <View style={styles.filterContainer}>
                <TouchableOpacity 
                    style={styles.filterHeader}
                    onPress={() => setShowFilters(!showFilters)}
                >
                    <View style={styles.filterTitleContainer}>
                        <MaterialCommunityIcons name="filter-variant" size={20} color={colors.primary} />
                        <Text style={styles.filterTitle}>
                            {showFilters ? 'Hide Filters' : 'Show Filters'}
                        </Text>
                    </View>
                    <MaterialCommunityIcons 
                        name={showFilters ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color={colors.primary} 
                    />
                </TouchableOpacity>

                {showFilters && (
                    <View style={styles.filterContent}>
                        {/* Location Filters */}
                        <View style={styles.filterSection}>
                            <Text style={styles.sectionTitle}>Location</Text>
                            <View style={styles.locationRow}>
                                <View style={styles.locationInputContainer}>
                                    <Text style={styles.inputLabel}>From</Text>
                                    <View style={styles.inputWrapper}>
                                        <MaterialCommunityIcons name="map-marker" size={16} color={colors.text.light} />
                                        <TextInput
                                            style={styles.locationInput}
                                            placeholder="From location"
                                            value={filters.fromLocation}
                                            onChangeText={(text) => setFilters({...filters, fromLocation: text})}
                                            placeholderTextColor={colors.text.light}
                                        />
                                    </View>
                                </View>
                                <View style={styles.locationInputContainer}>
                                    <Text style={styles.inputLabel}>To</Text>
                                    <View style={styles.inputWrapper}>
                                        <MaterialCommunityIcons name="map-marker" size={16} color={colors.text.light} />
                                        <TextInput
                                            style={styles.locationInput}
                                            placeholder="To location"
                                            value={filters.toLocation}
                                            onChangeText={(text) => setFilters({...filters, toLocation: text})}
                                            placeholderTextColor={colors.text.light}
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Product Type Filter */}
                        <View style={styles.filterSection}>
                            <Text style={styles.sectionTitle}>Product Type</Text>
                            <View style={styles.chipContainer}>
                                {['All', 'Agricultural', 'Cargo', 'Livestock', 'Construction'].map((type) => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.chip,
                                            filters.productType === type.toLowerCase() && styles.chipActive
                                        ]}
                                        onPress={() => setFilters({
                                            ...filters, 
                                            productType: type === 'All' ? '' : type.toLowerCase()
                                        })}
                                    >
                                        <Text style={[
                                            styles.chipText,
                                            filters.productType === type.toLowerCase() && styles.chipTextActive
                                        ]}>
                                            {type}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Value Range Filter */}
                        <View style={styles.filterSection}>
                            <Text style={styles.sectionTitle}>Value Range (KES)</Text>
                            <View style={styles.rangeContainer}>
                                <View style={styles.rangeInputContainer}>
                                    <Text style={styles.rangeLabel}>Min</Text>
                                    <View style={styles.rangeInputWrapper}>
                                        <TextInput
                                            style={styles.rangeInput}
                                            placeholder="0"
                                            value={filters.minValue}
                                            onChangeText={(text) => setFilters({...filters, minValue: text})}
                                            keyboardType="numeric"
                                            placeholderTextColor={colors.text.light}
                                        />
                                    </View>
                                </View>
                                <View style={styles.rangeSeparator}>
                                    <Text style={styles.rangeSeparatorText}>to</Text>
                                </View>
                                <View style={styles.rangeInputContainer}>
                                    <Text style={styles.rangeLabel}>Max</Text>
                                    <View style={styles.rangeInputWrapper}>
                                        <TextInput
                                            style={styles.rangeInput}
                                            placeholder="∞"
                                            value={filters.maxValue}
                                            onChangeText={(text) => setFilters({...filters, maxValue: text})}
                                            keyboardType="numeric"
                                            placeholderTextColor={colors.text.light}
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Status Filter */}
                        <View style={styles.filterSection}>
                            <Text style={styles.sectionTitle}>Status</Text>
                            <View style={styles.statusChipContainer}>
                                {statusFilters.map((status) => (
                                    <TouchableOpacity
                                        key={status.key}
                                        style={[
                                            styles.statusChip,
                                            selectedStatus === status.key && styles.statusChipActive
                                        ]}
                                        onPress={() => setSelectedStatus(status.key)}
                                    >
                                        <View style={[
                                            styles.statusIndicator,
                                            selectedStatus === status.key && styles.statusIndicatorActive
                                        ]} />
                                        <Text style={[
                                            styles.statusChipText,
                                            selectedStatus === status.key && styles.statusChipTextActive
                                        ]}>
                                            {status.label} ({status.count})
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Clear Filters Button */}
                        <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                            <MaterialCommunityIcons name="close-circle" size={16} color={colors.error} />
                            <Text style={styles.clearButtonText}>Clear All Filters</Text>
                        </TouchableOpacity>

                        {/* Results Counter */}
                        <View style={styles.resultsContainer}>
                            <Text style={styles.resultsText}>
                                {filteredJobs.length} of {jobs.length} jobs match your criteria
                            </Text>
                        </View>
                    </View>
                )}
            </View>

            {filteredJobs.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="truck-delivery" size={48} color={colors.text.light} />
                    <Text style={styles.emptyTitle}>No Jobs Found</Text>
                    <Text style={styles.emptyText}>
                        {selectedStatus === 'all' 
                            ? 'You don\'t have any jobs yet.' 
                            : `You don't have any ${selectedStatus} jobs.`
                        }
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredJobs}
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
                    contentContainerStyle={[styles.jobsList, { paddingBottom: 100 }]}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    // Enhanced Filter Styles
    filterContainer: {
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    filterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.background,
    },
    filterTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterTitle: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.primary,
        marginLeft: spacing.sm,
    },
    filterContent: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.white,
    },
    filterSection: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    locationRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    locationInputContainer: {
        flex: 1,
    },
    inputLabel: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginBottom: spacing.xs,
        fontWeight: '500',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 8,
        paddingHorizontal: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    locationInput: {
        flex: 1,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        fontSize: fonts.size.sm,
        color: colors.text.primary,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    chip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    chipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    chipText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    chipTextActive: {
        color: colors.white,
    },
    rangeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    rangeInputContainer: {
        flex: 1,
    },
    rangeLabel: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginBottom: spacing.xs,
        fontWeight: '500',
    },
    rangeInputWrapper: {
        backgroundColor: colors.background,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    rangeInput: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        textAlign: 'center',
    },
    rangeSeparator: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: spacing.lg,
    },
    rangeSeparatorText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    statusChipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statusChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.text.light,
        marginRight: spacing.sm,
    },
    statusIndicatorActive: {
        backgroundColor: colors.white,
    },
    statusChipText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    statusChipTextActive: {
        color: colors.white,
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        marginTop: spacing.sm,
    },
    clearButtonText: {
        fontSize: fonts.size.sm,
        color: colors.error,
        fontWeight: '500',
        marginLeft: spacing.xs,
    },
    resultsContainer: {
        alignItems: 'center',
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    resultsText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: spacing.md,
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
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
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
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
    },
    jobsList: {
        padding: spacing.lg,
    },
    // New section styles
    routeSection: {
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    routeContainer: {
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: spacing.md,
        gap: spacing.sm,
    },
    infoSection: {
        marginBottom: spacing.md,
    },
    infoGrid: {
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: spacing.md,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    infoLabel: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginLeft: spacing.sm,
        marginRight: spacing.sm,
        minWidth: 60,
    },
    infoValue: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        fontWeight: '500',
        flex: 1,
    },
    clientSection: {
        marginBottom: spacing.md,
    },
    clientCard: {
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: spacing.md,
    },
    clientHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    clientName: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.primary,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginLeft: spacing.xs,
    },
    clientContact: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginBottom: spacing.xs,
    },
    clientOrders: {
        fontSize: fonts.size.xs,
        color: colors.text.light,
    },
    actionSection: {
        marginBottom: spacing.md,
    },
    dateSection: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: spacing.sm,
    },
    jobCard: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.md,
        shadowColor: colors.black,
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
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
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    statusText: {
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
        marginBottom: spacing.sm,
    },
    clientInfo: {
        flex: 1,
    },
    clientName: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.primary,
    },
    clientContact: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginTop: 2,
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
    actionButtons: {
        flexDirection: 'column',
        gap: spacing.xs,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 8,
        justifyContent: 'center',
        minWidth: 100,
        marginRight: spacing.sm,
    },
    startButton: {
        backgroundColor: colors.primary,
    },
    startButtonText: {
        color: colors.white,
        fontSize: fonts.size.sm,
        fontWeight: '600',
        marginLeft: spacing.xs,
    },
    completeButton: {
        backgroundColor: colors.success,
    },
    completeButtonText: {
        color: colors.white,
        fontSize: fonts.size.sm,
        fontWeight: '600',
        marginLeft: spacing.xs,
    },
    detailsButton: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    detailsButtonText: {
        color: colors.primary,
        fontSize: fonts.size.sm,
        fontWeight: '600',
        marginLeft: spacing.xs,
    },
    communicationRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    cancelRow: {
        marginTop: spacing.sm,
    },
    chatButton: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.primary,
        flex: 1,
    },
    chatButtonText: {
        color: colors.primary,
        fontSize: fonts.size.sm,
        fontWeight: '600',
        marginLeft: spacing.xs,
    },
    callButton: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.success,
        flex: 1,
    },
    callButtonText: {
        color: colors.success,
        fontSize: fonts.size.sm,
        fontWeight: '600',
        marginLeft: spacing.xs,
    },
    cancelButton: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.error,
        width: '100%',
    },
    cancelButtonText: {
        color: colors.error,
        fontSize: fonts.size.sm,
        fontWeight: '600',
        marginLeft: spacing.xs,
    },
    jobDates: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: spacing.sm,
    },
    dateLabel: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginBottom: 2,
    },
    actualDateLabel: {
        fontSize: fonts.size.xs,
        color: colors.primary,
        fontWeight: '600',
        marginBottom: 2,
    },
    jobTypeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    instantBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.warning + '20',
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 2,
    },
    instantText: {
        fontSize: fonts.size.xs,
        color: colors.warning,
        fontWeight: '600',
    },
    jobIdSection: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 8,
        marginBottom: spacing.sm,
        gap: spacing.xs,
    },
    jobIdLabel: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    jobIdValue: {
        fontSize: fonts.size.sm,
        color: colors.primary,
        fontWeight: 'bold',
        fontFamily: 'monospace',
    },
});

export default JobManagementScreen;
