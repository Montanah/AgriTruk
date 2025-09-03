import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';

interface BrokerStats {
    totalClients: number;
    activeRequests: number;
    completedTrips: number;
    monthlyEarnings: number;
    pendingRequests: number;
    consolidationOpportunities: number;
}

interface Client {
    id: string;
    name: string;
    company?: string;
    phone: string;
    email: string;
    clientType: 'individual' | 'business';
    location: string;
    businessType?: string;
    occupation?: string;
    totalRequests: number;
    activeRequests: number;
    lastRequest: string;
    isVerified: boolean;
}

const mockStats: BrokerStats = {
    totalClients: 24,
    activeRequests: 8,
    completedTrips: 156,
    monthlyEarnings: 125000,
    pendingRequests: 12,
    consolidationOpportunities: 5,
};

const mockClients: Client[] = [
    {
        id: 'C001',
        name: 'John Kamau',
        company: 'Green Agri Co.',
        phone: '+254712345678',
        email: 'john@greenagri.co.ke',
        clientType: 'business',
        location: 'Nairobi, Kenya',
        totalRequests: 45,
        activeRequests: 3,
        lastRequest: '2 hours ago',
        isVerified: true,
    },
    {
        id: 'C002',
        name: 'Mary Wanjiku',
        company: 'Farmers United',
        phone: '+254723456789',
        email: 'mary@farmersunited.ke',
        clientType: 'business',
        location: 'Eldoret, Kenya',
        totalRequests: 32,
        activeRequests: 2,
        lastRequest: '1 day ago',
        isVerified: true,
    },
    {
        id: 'C003',
        name: 'David Ochieng',
        company: 'Eldoret Maize Co.',
        phone: '+254734567890',
        email: 'david@eldoretmaize.ke',
        clientType: 'individual',
        location: 'Kisumu, Kenya',
        totalRequests: 28,
        activeRequests: 1,
        lastRequest: '3 days ago',
        isVerified: false,
    },
];

const BrokerHomeScreen = ({ navigation, route }: any) => {
    const [stats, setStats] = useState<BrokerStats>(mockStats);
    const [clients, setClients] = useState<Client[]>(mockClients);
    const [showAddClientModal, setShowAddClientModal] = useState(false);
    const [showClientDetailsModal, setShowClientDetailsModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [newClient, setNewClient] = useState({
        name: '',
        company: '',
        phone: '',
        email: '',
        clientType: 'individual' as 'individual' | 'business',
        location: '',
        businessType: '',
        occupation: '',
    });
    const subscriptionStatus = route.params?.subscriptionStatus;

    useEffect(() => {
        fetchBrokerStats();
        fetchClients();
    }, []);

    const fetchBrokerStats = async () => {
        try {
            // TODO: Replace with actual API call
            console.log('Fetching broker stats...');
        } catch (error) {
            console.error('Error fetching broker stats:', error);
        }
    };

    const fetchClients = async () => {
        try {
            // TODO: Replace with actual API call
            console.log('Fetching clients...');
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    };

    const handleAddClient = () => {
        if (!newClient.name || !newClient.phone || !newClient.location) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        if (newClient.clientType === 'business' && !newClient.company) {
            Alert.alert('Error', 'Company name is required for business clients');
            return;
        }

        const client: Client = {
            id: `C${Date.now()}`,
            ...newClient,
            totalRequests: 0,
            activeRequests: 0,
            lastRequest: 'Never',
            isVerified: false,
        };

        setClients([...clients, client]);
        setNewClient({ name: '', company: '', phone: '', email: '', clientType: 'individual', location: '', businessType: '', occupation: '' });
        setShowAddClientModal(false);
        Alert.alert('Success', 'Client added successfully!');
    };

    const handleClientPress = (client: Client) => {
        setSelectedClient(client);
        setShowClientDetailsModal(true);
    };

    const handleNewRequest = (client?: Client) => {
        navigation.navigate('BrokerRequestScreen', {
            clientId: client?.id,
            selectedClient: client || null
        });
    };

    const renderStatCard = (title: string, value: string | number, icon: string, color: string, subtitle?: string) => (
        <View style={[styles.statCard, { borderLeftColor: color }]}>
            <View style={styles.statHeader}>
                <MaterialCommunityIcons name={icon as any} size={24} color={color} />
                <Text style={styles.statTitle}>{title}</Text>
            </View>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        </View>
    );

    const renderClientItem = ({ item }: { item: Client }) => (
        <TouchableOpacity
            style={styles.clientItem}
            onPress={() => handleClientPress(item)}
        >
            <View style={styles.clientAvatar}>
                <Text style={styles.clientInitials}>
                    {item.name.split(' ').map(n => n[0]).join('')}
                </Text>
                {item.isVerified && (
                    <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    </View>
                )}
            </View>

            <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{item.name}</Text>
                <Text style={styles.clientCompany}>{item.company}</Text>
                <View style={styles.clientMeta}>
                    <Text style={styles.clientRequests}>{item.activeRequests} active requests</Text>
                    <Text style={styles.clientLastRequest}>Last: {item.lastRequest}</Text>
                </View>
            </View>

            <View style={styles.clientActions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleNewRequest(item)}
                >
                    <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.viewButton]}
                    onPress={() => navigation.navigate('BrokerManagementScreen', {
                        activeTab: 'tracking',
                        selectedClient: item
                    })}
                >
                    <MaterialCommunityIcons name="eye" size={16} color={colors.secondary} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Welcome back,</Text>
                    <Text style={styles.brokerName}>Broker</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.notificationButton}>
                        <Ionicons name="notifications" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.addClientButton}
                        onPress={() => setShowAddClientModal(true)}
                    >
                        <MaterialCommunityIcons name="account-plus" size={20} color={colors.white} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Earnings Overview */}
                <View style={styles.earningsSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Monthly Earnings</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('BrokerProfileScreen')}>
                            <Text style={styles.viewAllText}>View Details</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.earningsCard}>
                        <View style={styles.earningsAmount}>
                            <Text style={styles.currency}>KES</Text>
                            <Text style={styles.amount}>{stats.monthlyEarnings.toLocaleString()}</Text>
                        </View>
                        <View style={styles.earningsBreakdown}>
                            <Text style={styles.breakdownText}>From {stats.completedTrips} completed trips</Text>
                            <Text style={styles.breakdownText}>{stats.totalClients} active clients</Text>
                        </View>
                    </View>
                </View>

                {/* Stats Overview */}
                <View style={styles.statsSection}>
                    <Text style={styles.sectionTitle}>Performance Overview</Text>
                    <View style={styles.statsGrid}>
                        {renderStatCard('Active Requests', stats.activeRequests, 'clipboard-list', colors.primary, 'In progress')}
                        {renderStatCard('Pending', stats.pendingRequests, 'clock-outline', colors.warning, 'Awaiting action')}
                        {renderStatCard('Consolidation', stats.consolidationOpportunities, 'layers', colors.success, 'Cost savings')}
                        {renderStatCard('Total Clients', stats.totalClients, 'account-group', colors.secondary, 'Network size')}
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActionsSection}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.quickActionsGrid}>
                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => handleNewRequest()}
                        >
                            <MaterialCommunityIcons name="plus-circle" size={32} color={colors.primary} />
                            <Text style={styles.quickActionTitle}>New Request</Text>
                            <Text style={styles.quickActionSubtitle}>Place transport request</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => navigation.navigate('BrokerManagementScreen', { activeTab: 'consolidation' })}
                        >
                            <MaterialCommunityIcons name="layers" size={32} color={colors.success} />
                            <Text style={styles.quickActionTitle}>Consolidate</Text>
                            <Text style={styles.quickActionSubtitle}>Group requests</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => navigation.navigate('BrokerManagementScreen', { activeTab: 'tracking' })}
                        >
                            <MaterialCommunityIcons name="map-marker-path" size={32} color={colors.secondary} />
                            <Text style={styles.quickActionTitle}>Track</Text>
                            <Text style={styles.quickActionSubtitle}>Monitor progress</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => setShowAddClientModal(true)}
                        >
                            <MaterialCommunityIcons name="account-plus" size={32} color={colors.tertiary} />
                            <Text style={styles.quickActionTitle}>Add Client</Text>
                            <Text style={styles.quickActionSubtitle}>Expand network</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Clients Section */}
                <View style={styles.clientsSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Your Clients</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('BrokerManagementScreen', { activeTab: 'clients' })}>
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={clients.slice(0, 5)}
                        renderItem={renderClientItem}
                        keyExtractor={(item) => item.id}
                        scrollEnabled={false}
                        showsVerticalScrollIndicator={false}
                    />
                </View>

                {/* Subscription Status */}
                {subscriptionStatus && (
                    <View style={styles.subscriptionCard}>
                        <View style={styles.subscriptionHeader}>
                            <MaterialCommunityIcons name="star-circle" size={32} color={colors.secondary} />
                            <View style={styles.subscriptionInfo}>
                                <Text style={styles.subscriptionTitle}>
                                    {subscriptionStatus.currentPlan?.name || 'Subscription'}
                                </Text>
                                <Text style={styles.subscriptionStatus}>
                                    {subscriptionStatus.isTrialActive
                                        ? `Trial • ${subscriptionStatus.daysRemaining || 0} days remaining`
                                        : subscriptionStatus.hasActiveSubscription
                                            ? `Active • ${subscriptionStatus.daysRemaining || 0} days remaining`
                                            : 'Inactive'
                                    }
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.manageButton}
                            onPress={() => navigation.navigate('BrokerProfileScreen')}
                        >
                            <Text style={styles.manageButtonText}>
                                {subscriptionStatus?.needsTrialActivation ? 'Activate Trial' : 'Manage'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Add Client Modal */}
            <Modal
                visible={showAddClientModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowAddClientModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add New Client</Text>
                            <TouchableOpacity onPress={() => setShowAddClientModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text.secondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Client Type *</Text>
                                <View style={styles.clientTypeContainer}>
                                    <TouchableOpacity
                                        style={[
                                            styles.clientTypeButton,
                                            newClient.clientType === 'individual' && styles.clientTypeButtonActive
                                        ]}
                                        onPress={() => setNewClient({ ...newClient, clientType: 'individual' })}
                                    >
                                        <MaterialCommunityIcons
                                            name="account"
                                            size={20}
                                            color={newClient.clientType === 'individual' ? colors.white : colors.primary}
                                        />
                                        <Text style={[
                                            styles.clientTypeText,
                                            newClient.clientType === 'individual' && styles.clientTypeTextActive
                                        ]}>
                                            Individual
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.clientTypeButton,
                                            newClient.clientType === 'business' && styles.clientTypeButtonActive
                                        ]}
                                        onPress={() => setNewClient({ ...newClient, clientType: 'business' })}
                                    >
                                        <MaterialCommunityIcons
                                            name="office-building"
                                            size={20}
                                            color={newClient.clientType === 'business' ? colors.white : colors.primary}
                                        />
                                        <Text style={[
                                            styles.clientTypeText,
                                            newClient.clientType === 'business' && styles.clientTypeTextActive
                                        ]}>
                                            Business
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>
                                    {newClient.clientType === 'individual' ? 'Full Name *' : 'Contact Person Name *'}
                                </Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={newClient.name}
                                    onChangeText={(text) => setNewClient({ ...newClient, name: text })}
                                    placeholder={
                                        newClient.clientType === 'individual'
                                            ? "Enter client's full name"
                                            : "Enter contact person's name"
                                    }
                                    placeholderTextColor={colors.text.light}
                                />
                            </View>

                            {newClient.clientType === 'business' && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Company Name *</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={newClient.company}
                                        onChangeText={(text) => setNewClient({ ...newClient, company: text })}
                                        placeholder="Enter company name"
                                        placeholderTextColor={colors.text.light}
                                    />
                                </View>
                            )}

                            {newClient.clientType === 'business' && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Business Type</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={newClient.businessType}
                                        onChangeText={(text) => setNewClient({ ...newClient, businessType: text })}
                                        placeholder="e.g., Wholesaler, Retailer, Manufacturer"
                                        placeholderTextColor={colors.text.light}
                                    />
                                </View>
                            )}

                            {newClient.clientType === 'individual' && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Occupation</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={newClient.occupation}
                                        onChangeText={(text) => setNewClient({ ...newClient, occupation: text })}
                                        placeholder="e.g., Farmer, Trader, Student"
                                        placeholderTextColor={colors.text.light}
                                    />
                                </View>
                            )}

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Phone Number *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={newClient.phone}
                                    onChangeText={(text) => setNewClient({ ...newClient, phone: text })}
                                    placeholder="+254712345678"
                                    placeholderTextColor={colors.text.light}
                                    keyboardType="phone-pad"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Email Address</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={newClient.email}
                                    onChangeText={(text) => setNewClient({ ...newClient, email: text })}
                                    placeholder="client@company.com"
                                    placeholderTextColor={colors.text.light}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Location *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={newClient.location}
                                    onChangeText={(text) => setNewClient({ ...newClient, location: text })}
                                    placeholder="e.g., Nairobi, Kenya"
                                    placeholderTextColor={colors.text.light}
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowAddClientModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleAddClient}
                            >
                                <Text style={styles.saveButtonText}>Add Client</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Client Details Modal */}
            <Modal
                visible={showClientDetailsModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowClientDetailsModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Client Details</Text>
                            <TouchableOpacity onPress={() => setShowClientDetailsModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text.secondary} />
                            </TouchableOpacity>
                        </View>

                        {selectedClient && (
                            <>
                                <View style={styles.clientDetailHeader}>
                                    <View style={styles.clientDetailAvatar}>
                                        <Text style={styles.clientDetailInitials}>
                                            {selectedClient.name.split(' ').map(n => n[0]).join('')}
                                        </Text>
                                    </View>
                                    <View style={styles.clientDetailInfo}>
                                        <Text style={styles.clientDetailName}>{selectedClient.name}</Text>
                                        <Text style={styles.clientDetailCompany}>{selectedClient.company}</Text>
                                        <View style={styles.verificationStatus}>
                                            <Ionicons
                                                name={selectedClient.isVerified ? "checkmark-circle" : "close-circle"}
                                                size={16}
                                                color={selectedClient.isVerified ? colors.success : colors.error}
                                            />
                                            <Text style={[styles.verificationText, {
                                                color: selectedClient.isVerified ? colors.success : colors.error
                                            }]}>
                                                {selectedClient.isVerified ? 'Verified' : 'Not Verified'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.clientDetailStats}>
                                    <View style={styles.statItem}>
                                        <Text style={styles.statLabel}>Total Requests</Text>
                                        <Text style={styles.clientDetailStatValue}>{selectedClient.totalRequests}</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Text style={styles.statLabel}>Active Requests</Text>
                                        <Text style={styles.clientDetailStatValue}>{selectedClient.activeRequests}</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Text style={styles.statLabel}>Last Request</Text>
                                        <Text style={styles.clientDetailStatValue}>{selectedClient.lastRequest}</Text>
                                    </View>
                                </View>

                                <View style={styles.clientDetailContact}>
                                    <View style={styles.contactItem}>
                                        <MaterialCommunityIcons name="phone" size={20} color={colors.primary} />
                                        <Text style={styles.contactText}>{selectedClient.phone}</Text>
                                    </View>
                                    <View style={styles.contactItem}>
                                        <MaterialCommunityIcons name="email" size={20} color={colors.secondary} />
                                        <Text style={styles.contactText}>{selectedClient.email}</Text>
                                    </View>
                                    <View style={styles.contactItem}>
                                        <MaterialCommunityIcons name="map-marker" size={20} color={colors.tertiary} />
                                        <Text style={styles.contactText}>{selectedClient.location}</Text>
                                    </View>
                                    <View style={styles.contactItem}>
                                        <MaterialCommunityIcons
                                            name={selectedClient.clientType === 'business' ? 'office-building' : 'account'}
                                            size={20}
                                            color={colors.warning}
                                        />
                                        <Text style={styles.contactText}>
                                            {selectedClient.clientType === 'business' ? 'Business Client' : 'Individual Client'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.clientDetailActions}>
                                    <TouchableOpacity
                                        style={styles.primaryActionButton}
                                        onPress={() => {
                                            setShowClientDetailsModal(false);
                                            handleNewRequest(selectedClient);
                                        }}
                                    >
                                        <MaterialCommunityIcons name="plus-circle" size={20} color={colors.white} />
                                        <Text style={styles.primaryActionText}>New Request</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.secondaryActionButton}
                                        onPress={() => {
                                            setShowClientDetailsModal(false);
                                            navigation.navigate('BrokerManagementScreen', {
                                                activeTab: 'tracking',
                                                selectedClient: selectedClient
                                            });
                                        }}
                                    >
                                        <MaterialCommunityIcons name="map-marker-path" size={20} color={colors.primary} />
                                        <Text style={styles.secondaryActionText}>View Requests</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    greeting: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginBottom: 2,
    },
    brokerName: {
        fontSize: fonts.size.xl,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    headerActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    notificationButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: colors.surface,
    },
    addClientButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: colors.primary,
    },
    content: {
        flex: 1,
        padding: spacing.lg,
        paddingBottom: spacing.xxl * 4, // Add extra bottom padding to avoid navigation tabs
    },
    sectionTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    viewAllText: {
        fontSize: fonts.size.sm,
        color: colors.primary,
        fontWeight: '600',
    },

    // Earnings Section
    earningsSection: {
        marginBottom: spacing.xl,
    },
    earningsCard: {
        backgroundColor: colors.primary,
        borderRadius: 20,
        padding: spacing.xl,
        alignItems: 'center',
    },
    earningsAmount: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: spacing.sm,
    },
    currency: {
        fontSize: fonts.size.lg,
        color: colors.white + 'CC',
        marginRight: spacing.xs,
    },
    amount: {
        fontSize: fonts.size.xxl,
        fontWeight: 'bold',
        color: colors.white,
    },
    earningsBreakdown: {
        alignItems: 'center',
    },
    breakdownText: {
        fontSize: fonts.size.sm,
        color: colors.white + 'CC',
        marginBottom: 2,
    },

    // Stats Section
    statsSection: {
        marginBottom: spacing.xl,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: colors.white,
        padding: spacing.md,
        borderRadius: 16,
        borderLeftWidth: 4,
        shadowColor: colors.black,
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    statTitle: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginLeft: spacing.sm,
        flex: 1,
    },
    statValue: {
        fontSize: fonts.size.xl,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    statSubtitle: {
        fontSize: fonts.size.xs,
        color: colors.text.light,
        textAlign: 'center',
    },

    // Quick Actions
    quickActionsSection: {
        marginBottom: spacing.xl,
    },
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    quickActionCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: colors.white,
        padding: spacing.lg,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: colors.black,
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    quickActionTitle: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.primary,
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    quickActionSubtitle: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        textAlign: 'center',
    },

    // Clients Section
    clientsSection: {
        marginBottom: spacing.xxl * 2,
    },
    clientItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        padding: spacing.md,
        borderRadius: 12,
        marginBottom: spacing.sm,
        shadowColor: colors.black,
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    clientAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
        position: 'relative',
    },
    clientInitials: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.primary,
    },
    verifiedBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: colors.white,
        borderRadius: 10,
    },
    clientInfo: {
        flex: 1,
    },
    clientName: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 2,
    },
    clientCompany: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginBottom: 4,
    },
    clientMeta: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    clientRequests: {
        fontSize: fonts.size.xs,
        color: colors.primary,
        fontWeight: '600',
    },
    clientLastRequest: {
        fontSize: fonts.size.xs,
        color: colors.text.light,
    },
    clientActions: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewButton: {
        backgroundColor: colors.secondary + '20',
    },

    // Subscription Card
    subscriptionCard: {
        backgroundColor: colors.white,
        padding: spacing.lg,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: colors.black,
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    subscriptionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    subscriptionInfo: {
        marginLeft: spacing.md,
    },
    subscriptionTitle: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: 2,
    },
    subscriptionStatus: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
    },
    manageButton: {
        backgroundColor: colors.secondary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 20,
    },
    manageButtonText: {
        color: colors.white,
        fontWeight: '600',
        fontSize: fonts.size.sm,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.black + '50',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: spacing.xl,
        width: '90%',
        maxWidth: 400,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    modalTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    inputGroup: {
        marginBottom: spacing.md,
    },
    inputLabel: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    textInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: spacing.md,
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        backgroundColor: colors.surface,
    },
    modalActions: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.lg,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.secondary,
    },
    saveButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.white,
    },

    // Client Type Styles
    clientTypeContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    clientTypeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    clientTypeButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    clientTypeText: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.primary,
    },
    clientTypeTextActive: {
        color: colors.white,
    },

    // Client Details Modal
    clientDetailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    clientDetailAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    clientDetailInitials: {
        fontSize: fonts.size.xl,
        fontWeight: 'bold',
        color: colors.primary,
    },
    clientDetailInfo: {
        flex: 1,
    },
    clientDetailName: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: 2,
    },
    clientDetailCompany: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        marginBottom: 4,
    },
    verificationStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    verificationText: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
    },
    clientDetailStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statLabel: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginBottom: 2,
    },
    clientDetailStatValue: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    clientDetailContact: {
        marginBottom: spacing.lg,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    contactText: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        marginLeft: spacing.sm,
    },
    clientDetailActions: {
        gap: spacing.md,
    },
    primaryActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: 12,
        gap: spacing.sm,
    },
    primaryActionText: {
        color: colors.white,
        fontSize: fonts.size.md,
        fontWeight: '600',
    },
    secondaryActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        paddingVertical: spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.primary,
        gap: spacing.sm,
    },
    secondaryActionText: {
        color: colors.primary,
        fontSize: fonts.size.md,
        fontWeight: '600',
    },
    modalScrollContent: {
        flexGrow: 1,
        paddingBottom: spacing.xl, // Add padding to the bottom of the scrollable content
    },
});

export default BrokerHomeScreen;
