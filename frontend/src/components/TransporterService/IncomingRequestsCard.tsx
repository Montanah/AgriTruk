import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';
import { API_ENDPOINTS } from '../../constants/api';

interface IncomingRequest {
    id: string;
    type: string;
    fromLocation: string;
    toLocation: string;
    productType: string;
    weight: string;
    createdAt: string;
    urgency: 'high' | 'medium' | 'low';
    estimatedValue: number;
    specialRequirements: string[];
    client: {
        name: string;
        rating: number;
        completedOrders: number;
    };
    pricing: {
        basePrice: number;
        urgencyBonus: number;
        specialHandling: number;
        total: number;
    };
    route: {
        distance: string;
        estimatedTime: string;
        detour: string;
    };
}

interface IncomingRequestsCardProps {
    onRequestAccepted?: (request: IncomingRequest) => void;
    onRequestRejected?: (request: IncomingRequest) => void;
    onViewAll?: () => void;
}

const IncomingRequestsCard: React.FC<IncomingRequestsCardProps> = ({
    onRequestAccepted,
    onRequestRejected,
    onViewAll,
}) => {
    const navigation = useNavigation<any>();
    const [requests, setRequests] = useState<IncomingRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchIncomingRequests = async () => {
            try {
                setLoading(true);

                // Fetch real data from API
                const { getAuth } = require('firebase/auth');
                const auth = getAuth();
                const user = auth.currentUser;
                if (!user) {
                    setRequests([]);
                    return;
                }

                const token = await user.getIdToken();
                const res = await fetch(`${API_ENDPOINTS.BOOKINGS}/requests`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (res.ok) {
                    const data = await res.json();
                    setRequests(data.requests?.slice(0, 3) || []); // Show only first 3 requests
                } else {
                    setRequests([]);
                }
            } catch (error) {
                console.error('Failed to fetch incoming requests:', error);
                setRequests([]);
            } finally {
                setLoading(false);
            }
        };

        fetchIncomingRequests();
    }, []);

    const getUrgencyColor = (urgency: string) => {
        switch (urgency) {
            case 'high':
                return colors.error;
            case 'medium':
                return colors.warning;
            case 'low':
                return colors.success;
            default:
                return colors.text.secondary;
        }
    };

    const getUrgencyIcon = (urgency: string) => {
        switch (urgency) {
            case 'high':
                return 'fire';
            case 'medium':
                return 'clock-outline';
            case 'low':
                return 'check-circle-outline';
            default:
                return 'information-outline';
        }
    };

    const handleAccept = async (request: IncomingRequest) => {
        setAcceptingId(request.id);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Remove from list
            setRequests(prev => prev.filter(req => req.id !== request.id));

            if (onRequestAccepted) {
                onRequestAccepted(request);
            }

            // Navigate to contact customer screen
            navigation.navigate('ContactCustomer', {
                requestId: request.id,
                customerName: request.client.name,
                customerPhone: '+254700000000', // Mock phone number
                pickupLocation: request.fromLocation,
                deliveryLocation: request.toLocation,
                requestDetails: request
            });

        } catch (error) {
            Alert.alert('Error', 'Failed to accept request. Please try again.');
        } finally {
            setAcceptingId(null);
        }
    };

    const handleReject = async (request: IncomingRequest) => {
        setRejectingId(request.id);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));

            // Remove from list
            setRequests(prev => prev.filter(req => req.id !== request.id));

            if (onRequestRejected) {
                onRequestRejected(request);
            }

            Alert.alert('Request Rejected', `Request ${request.id} has been rejected.`);
        } catch (error) {
            Alert.alert('Error', 'Failed to reject request. Please try again.');
        } finally {
            setRejectingId(null);
        }
    };

    const renderRequestItem = ({ item }: { item: IncomingRequest }) => (
        <View style={styles.requestCard}>
            {/* Header with urgency indicator */}
            <View style={styles.requestHeader}>
                <View style={styles.urgencyContainer}>
                    <MaterialCommunityIcons
                        name={getUrgencyIcon(item.urgency)}
                        size={16}
                        color={getUrgencyColor(item.urgency)}
                    />
                    <Text style={[styles.urgencyText, { color: getUrgencyColor(item.urgency) }]}>
                        {item.urgency.toUpperCase()} PRIORITY
                    </Text>
                </View>
                <Text style={styles.requestId}>#{item.id}</Text>
            </View>

            {/* Route information */}
            <View style={styles.routeContainer}>
                <View style={styles.routeItem}>
                    <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
                    <Text style={styles.routeText}>{item.fromLocation}</Text>
                </View>
                <View style={styles.routeArrow}>
                    <MaterialCommunityIcons name="arrow-right" size={16} color={colors.text.secondary} />
                </View>
                <View style={styles.routeItem}>
                    <MaterialCommunityIcons name="map-marker-check" size={16} color={colors.secondary} />
                    <Text style={styles.routeText}>{item.toLocation}</Text>
                </View>
            </View>

            {/* Cargo details */}
            <View style={styles.cargoContainer}>
                <View style={styles.cargoItem}>
                    <MaterialCommunityIcons name="package-variant" size={14} color={colors.text.secondary} />
                    <Text style={styles.cargoText}>{item.productType}</Text>
                </View>
                <View style={styles.cargoItem}>
                    <MaterialCommunityIcons name="weight-kilogram" size={14} color={colors.text.secondary} />
                    <Text style={styles.cargoText}>{item.weight}</Text>
                </View>
                <View style={styles.cargoItem}>
                    <MaterialCommunityIcons name="currency-usd" size={14} color={colors.text.secondary} />
                    <Text style={styles.cargoText}>Ksh {item.estimatedValue.toLocaleString()}</Text>
                </View>
            </View>

            {/* Special requirements */}
            {item.specialRequirements.length > 0 && (
                <View style={styles.requirementsContainer}>
                    {item.specialRequirements.map((req, index) => (
                        <View key={index} style={styles.requirementBadge}>
                            <MaterialCommunityIcons name="check-circle" size={12} color={colors.primary} />
                            <Text style={styles.requirementText}>{req}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Client information */}
            <View style={styles.clientContainer}>
                <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{item.client.name}</Text>
                    <View style={styles.clientRating}>
                        <MaterialCommunityIcons name="star" size={12} color={colors.secondary} />
                        <Text style={styles.ratingText}>{item.client.rating}</Text>
                        <Text style={styles.ordersText}> • {item.client.completedOrders} orders</Text>
                    </View>
                </View>
            </View>

            {/* Route details */}
            <View style={styles.routeDetails}>
                <View style={styles.routeDetail}>
                    <MaterialCommunityIcons name="map-marker-distance" size={14} color={colors.text.secondary} />
                    <Text style={styles.routeDetailText}>{item.route.distance}</Text>
                </View>
                <View style={styles.routeDetail}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color={colors.text.secondary} />
                    <Text style={styles.routeDetailText}>{item.route.estimatedTime}</Text>
                </View>
                {item.route.detour !== '0 km' && (
                    <View style={styles.routeDetail}>
                        <MaterialCommunityIcons name="map-marker-path" size={14} color={colors.warning} />
                        <Text style={[styles.routeDetailText, { color: colors.warning }]}>
                            Detour: {item.route.detour}
                        </Text>
                    </View>
                )}
            </View>

            {/* Pricing breakdown */}
            <View style={styles.pricingContainer}>
                <View style={styles.pricingRow}>
                    <Text style={styles.pricingLabel}>Base Price:</Text>
                    <Text style={styles.pricingValue}>Ksh {item.pricing.basePrice.toLocaleString()}</Text>
                </View>
                {item.pricing.urgencyBonus > 0 && (
                    <View style={styles.pricingRow}>
                        <Text style={styles.pricingLabel}>Urgency Bonus:</Text>
                        <Text style={[styles.pricingValue, { color: colors.success }]}>
                            +Ksh {item.pricing.urgencyBonus.toLocaleString()}
                        </Text>
                    </View>
                )}
                {item.pricing.specialHandling > 0 && (
                    <View style={styles.pricingRow}>
                        <Text style={styles.pricingLabel}>Special Handling:</Text>
                        <Text style={styles.pricingValue}>Ksh {item.pricing.specialHandling.toLocaleString()}</Text>
                    </View>
                )}
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Earnings:</Text>
                    <Text style={styles.totalValue}>Ksh {item.pricing.total.toLocaleString()}</Text>
                </View>
            </View>

            {/* Action buttons */}
            <View style={styles.actionContainer}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleReject(item)}
                    disabled={rejectingId === item.id}
                >
                    {rejectingId === item.id ? (
                        <Text style={styles.buttonText}>Rejecting...</Text>
                    ) : (
                        <>
                            <MaterialCommunityIcons name="close" size={16} color={colors.error} />
                            <Text style={[styles.buttonText, { color: colors.error }]}>Reject</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => handleAccept(item)}
                    disabled={acceptingId === item.id}
                >
                    {acceptingId === item.id ? (
                        <Text style={styles.buttonText}>Accepting...</Text>
                    ) : (
                        <>
                            <MaterialCommunityIcons name="check" size={16} color={colors.white} />
                            <Text style={styles.buttonText}>Accept Request</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Loading Requests...</Text>
                <Text style={styles.emptySubtitle}>
                    Please wait while we fetch the latest incoming requests.
                </Text>
            </View>
        );
    }

    if (requests.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="package-variant-closed" size={48} color={colors.text.secondary} />
                <Text style={styles.emptyTitle}>No Incoming Requests</Text>
                <Text style={styles.emptySubtitle}>
                    New requests will appear here when they match your route and capabilities
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <MaterialCommunityIcons name="package-variant" size={24} color={colors.primary} />
                    <Text style={styles.headerTitle}>Incoming Requests</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{requests.length}</Text>
                    </View>
                </View>
                {onViewAll && (
                    <TouchableOpacity onPress={onViewAll} style={styles.viewAllButton}>
                        <Text style={styles.viewAllText}>View All</Text>
                        <MaterialCommunityIcons name="chevron-right" size={16} color={colors.primary} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.listContainer}>
                {requests.map((item, index) => (
                    <React.Fragment key={item.id}>
                        {renderRequestItem({ item })}
                        {index < requests.length - 1 && <View style={styles.separator} />}
                    </React.Fragment>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.md,
        marginBottom: spacing.md,
        shadowColor: colors.black,
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginLeft: spacing.sm,
    },
    badge: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        marginLeft: spacing.sm,
    },
    badgeText: {
        color: colors.white,
        fontSize: fonts.size.xs,
        fontWeight: 'bold',
    },
    viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    viewAllText: {
        color: colors.primary,
        fontSize: fonts.size.sm,
        fontWeight: '600',
    },
    listContainer: {
        paddingBottom: spacing.xl * 2,
    },
    requestCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    requestHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    urgencyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    urgencyText: {
        fontSize: fonts.size.xs,
        fontWeight: 'bold',
        marginLeft: spacing.xs,
    },
    requestId: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        fontWeight: '600',
    },
    routeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    routeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    routeText: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        fontWeight: '600',
        marginLeft: spacing.xs,
    },
    routeArrow: {
        marginHorizontal: spacing.sm,
    },
    cargoContainer: {
        flexDirection: 'row',
        marginBottom: spacing.sm,
    },
    cargoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    cargoText: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginLeft: spacing.xs,
    },
    requirementsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: spacing.sm,
    },
    requirementBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary + '15',
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        borderRadius: 8,
        marginRight: spacing.xs,
        marginBottom: spacing.xs,
    },
    requirementText: {
        fontSize: fonts.size.xs,
        color: colors.primary,
        fontWeight: '500',
        marginLeft: 2,
    },
    clientContainer: {
        marginBottom: spacing.sm,
    },
    clientInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    clientName: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.primary,
    },
    clientRating: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingText: {
        fontSize: fonts.size.xs,
        color: colors.secondary,
        fontWeight: '600',
        marginLeft: 2,
    },
    ordersText: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
    },
    routeDetails: {
        flexDirection: 'row',
        marginBottom: spacing.sm,
    },
    routeDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    routeDetailText: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginLeft: spacing.xs,
    },
    pricingContainer: {
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: spacing.sm,
        marginBottom: spacing.sm,
    },
    pricingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    pricingLabel: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
    },
    pricingValue: {
        fontSize: fonts.size.xs,
        color: colors.text.primary,
        fontWeight: '600',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: colors.text.light + '30',
        paddingTop: spacing.xs,
        marginTop: spacing.xs,
    },
    totalLabel: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        fontWeight: '600',
    },
    totalValue: {
        fontSize: fonts.size.sm,
        color: colors.secondary,
        fontWeight: 'bold',
    },
    actionContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        borderRadius: 8,
        borderWidth: 1,
    },
    rejectButton: {
        backgroundColor: colors.white,
        borderColor: colors.error,
    },
    acceptButton: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    buttonText: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        marginLeft: spacing.xs,
    },
    separator: {
        height: spacing.sm,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xl * 2,
    },
    emptyTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.secondary,
        marginTop: spacing.md,
    },
    emptySubtitle: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        marginTop: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
});

export default IncomingRequestsCard;
