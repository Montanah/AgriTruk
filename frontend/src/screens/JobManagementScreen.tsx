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
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { API_ENDPOINTS } from '../constants/api';
import { formatLocationForDisplay } from '../utils/locationUtils';

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
    bodyType: string;
    capacity: string;
    pickupDate: string;
    deliveryDate: string;
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
                setJobs(jobsArray);
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

            const token = await user.getIdToken();
            const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${jobId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
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

    const formatCurrency = (amount: number) => {
        return `KES ${amount.toLocaleString()}`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
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
            <View style={styles.jobHeader}>
                <View style={styles.jobInfo}>
                    <View style={styles.jobTypeRow}>
                        <Text style={styles.jobType}>{item.bookingType || item.type}</Text>
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

            <View style={styles.jobDetails}>
                <View style={styles.locationRow}>
                    <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
                    <Text style={styles.locationText}>{formatLocationForDisplay(item.fromLocation)}</Text>
                </View>
                <View style={styles.locationRow}>
                    <MaterialCommunityIcons name="map-marker-outline" size={16} color={colors.text.secondary} />
                    <Text style={styles.locationText}>{formatLocationForDisplay(item.toLocation)}</Text>
                </View>
            </View>

            <View style={styles.jobSpecs}>
                <View style={styles.specItem}>
                    <MaterialCommunityIcons name="package-variant" size={14} color={colors.text.secondary} />
                    <Text style={styles.specText}>{item.productType}</Text>
                </View>
                <View style={styles.specItem}>
                    <MaterialCommunityIcons name="weight" size={14} color={colors.text.secondary} />
                    <Text style={styles.specText}>{item.weight || item.weightKg ? `${item.weightKg}kg` : 'N/A'}</Text>
                </View>
                <View style={styles.specItem}>
                    <MaterialCommunityIcons name="truck" size={14} color={colors.text.secondary} />
                    <Text style={styles.specText}>{item.vehicleType || 'N/A'}</Text>
                </View>
            </View>

            <View style={styles.jobFooter}>
                <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{item.client?.name || 'Unknown Client'}</Text>
                    <Text style={styles.clientContact}>{item.client?.phone || 'No phone'}</Text>
                    <View style={styles.ratingRow}>
                        <MaterialCommunityIcons name="star" size={12} color={colors.warning} />
                        <Text style={styles.ratingText}>{item.client?.rating?.toFixed(1) || '0.0'}</Text>
                        <Text style={styles.ordersText}>({item.client?.completedOrders || 0} orders)</Text>
                    </View>
                </View>
                <View style={styles.actionButtons}>
                    {item.status === 'accepted' && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.startButton]}
                            onPress={() => updateJobStatus(item.id, 'ongoing')}
                        >
                            <Text style={styles.startButtonText}>Start</Text>
                        </TouchableOpacity>
                    )}
                    {item.status === 'ongoing' && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.completeButton]}
                            onPress={() => updateJobStatus(item.id, 'completed')}
                        >
                            <Text style={styles.completeButtonText}>Complete</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.actionButton, styles.detailsButton]}
                        onPress={() => {
                            // Navigate to job details
                            navigation.navigate('JobDetailsScreen', { jobId: item.id });
                        }}
                    >
                        <Text style={styles.detailsButtonText}>Details</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.jobDates}>
                <Text style={styles.dateLabel}>Pickup: {formatDate(item.pickupDate)}</Text>
                <Text style={styles.dateLabel}>Delivery: {formatDate(item.deliveryDate)}</Text>
                {item.actualPickupDate && (
                    <Text style={styles.actualDateLabel}>Actual Pickup: {formatDate(item.actualPickupDate)}</Text>
                )}
                {item.actualDeliveryDate && (
                    <Text style={styles.actualDateLabel}>Actual Delivery: {formatDate(item.actualDeliveryDate)}</Text>
                )}
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
                    contentContainerStyle={styles.jobsList}
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
        flexDirection: 'row',
        gap: spacing.sm,
    },
    actionButton: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 6,
        minWidth: 60,
        alignItems: 'center',
    },
    startButton: {
        backgroundColor: colors.primary,
    },
    startButtonText: {
        color: colors.white,
        fontSize: fonts.size.xs,
        fontWeight: '600',
    },
    completeButton: {
        backgroundColor: colors.success,
    },
    completeButtonText: {
        color: colors.white,
        fontSize: fonts.size.xs,
        fontWeight: '600',
    },
    detailsButton: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    detailsButtonText: {
        color: colors.text.primary,
        fontSize: fonts.size.xs,
        fontWeight: '600',
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
});

export default JobManagementScreen;
