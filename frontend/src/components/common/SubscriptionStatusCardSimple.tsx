import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../constants/colors';
import { SubscriptionStatus } from '../../services/subscriptionService';

interface SubscriptionStatusCardSimpleProps {
    subscriptionStatus: SubscriptionStatus;
    loading?: boolean;
}

const SubscriptionStatusCardSimple: React.FC<SubscriptionStatusCardSimpleProps> = ({
    subscriptionStatus,
    loading = false,
}) => {
    // Safety check for subscriptionStatus
    if (!subscriptionStatus) {
        return null;
    }

    const formatStatus = (status: any) => {
        let planName = 'No Active Plan';
        let statusText = 'Inactive';
        let daysRemaining = 0;
        let isTrial = false;
        let progressPercentage = 0;
        let statusColor = colors.error;

        // Handle different data structures
        const data = status.data || status;
        const plan = status.plan || status.planDetails || status.currentPlan;
        
        console.log('Formatting subscription status:', { status, data, plan });

        if (data?.isTrialActive || status.isTrialActive) {
            planName = 'Free Trial';
            statusText = 'Trial Active';
            daysRemaining = data?.daysRemaining || status.daysRemaining || 0;
            isTrial = true;
            // Progress bar: show progress based on days used (30 - daysRemaining) / 30
            const daysUsed = 30 - daysRemaining;
            progressPercentage = Math.max(0, Math.min(1, daysUsed / 30));
            statusColor = colors.success;
        } else if ((data?.hasActiveSubscription || status.hasActiveSubscription) && plan) {
            planName = plan.name || plan.planName || 'Active Plan';
            statusText = 'Active';
            daysRemaining = data?.daysRemaining || status.daysRemaining || 0;
            isTrial = false;
            // Assuming monthly subscription (30 days)
            const totalDays = 30;
            progressPercentage = Math.max(0, Math.min(1, daysRemaining / totalDays));
            statusColor = colors.primary;
        } else if (data?.subscriptionStatus === 'expired' || status.subscriptionStatus === 'expired') {
            planName = 'Expired';
            statusText = 'Expired';
            daysRemaining = 0;
            isTrial = false;
            progressPercentage = 0;
            statusColor = colors.error;
        } else if (data?.needsTrialActivation || status.needsTrialActivation) {
            planName = 'Trial Available';
            statusText = 'Activate Trial';
            daysRemaining = 30;
            isTrial = false;
            progressPercentage = 0;
            statusColor = colors.warning;
        } else if (data?.subscriptionStatus === 'none' || status.subscriptionStatus === 'none') {
            planName = 'No Active Plan';
            statusText = 'Inactive';
            daysRemaining = 0;
            isTrial = false;
            progressPercentage = 0;
            statusColor = colors.error;
        }

        return {
            planName,
            statusText,
            daysRemaining,
            isTrial,
            progressPercentage,
            statusColor,
        };
    };

    const formatted = formatStatus(subscriptionStatus);

    const getStatusIcon = () => {
        if (formatted.isTrial) {
            return 'star-circle';
        } else if (formatted.statusText === 'Active') {
            return 'check-circle';
        } else if (formatted.statusText === 'Expired') {
            return 'alert-circle';
        } else {
            return 'help-circle';
        }
    };

    const getStatusMessage = () => {
        if (formatted.isTrial) {
            return `Trial ends in ${formatted.daysRemaining} days`;
        } else if (formatted.statusText === 'Active') {
            return `Plan ends in ${formatted.daysRemaining} days`;
        } else if (formatted.statusText === 'Expired') {
            return 'Your subscription has expired';
        } else {
            return 'No active subscription';
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading subscription status...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <MaterialCommunityIcons
                        name={getStatusIcon()}
                        size={24}
                        color={formatted.statusColor}
                        style={styles.icon}
                    />
                    <View style={styles.headerText}>
                        <Text style={styles.planName}>{formatted.planName}</Text>
                        <Text style={[styles.statusText, { color: formatted.statusColor }]}>
                            {formatted.statusText}
                        </Text>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    <Text style={styles.daysText}>
                        {formatted.daysRemaining > 0 ? `${formatted.daysRemaining} days` : 'Expired'}
                    </Text>
                </View>
            </View>

            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            {
                                width: `${formatted.progressPercentage * 100}%`,
                                backgroundColor: formatted.statusColor,
                            }
                        ]}
                    />
                </View>
                <Text style={styles.progressText}>
                    {getStatusMessage()}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    icon: {
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    planName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: 2,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    daysText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text.secondary,
    },
    progressContainer: {
        marginTop: 8,
    },
    progressBar: {
        height: 8,
        backgroundColor: colors.background,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        color: colors.text.secondary,
        textAlign: 'center',
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 14,
        color: colors.text.secondary,
    },
});

export default SubscriptionStatusCardSimple;

