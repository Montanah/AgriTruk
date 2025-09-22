import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../constants/colors';
import { SubscriptionStatus } from '../../services/subscriptionService';
import EnhancedSubscriptionProgressBar from './EnhancedSubscriptionProgressBar';

interface SubscriptionStatusCardProps {
    subscriptionStatus: SubscriptionStatus;
    onManagePress: () => void;
    onRenewPress: () => void;
    onActivateTrial?: () => void;
    loading?: boolean;
}

const SubscriptionStatusCard: React.FC<SubscriptionStatusCardProps> = ({
    subscriptionStatus,
    onManagePress,
    onRenewPress,
    onActivateTrial,
    loading = false,
}) => {
    // Safety check for subscriptionStatus
    if (!subscriptionStatus) {
        return null;
    }

    const formatStatus = (status: SubscriptionStatus) => {
        console.log('SubscriptionStatusCard - formatStatus called with:', status);
        let planName = 'No Active Plan';
        let statusText = 'Inactive';
        let daysRemaining = 0;
        let isTrial = false;
        let progressPercentage = 0;
        let statusColor = colors.error;

        if (status.isTrialActive) {
            planName = 'Free Trial';
            statusText = 'Trial Active';
            daysRemaining = status.daysRemaining;
            isTrial = true;
            // Progress should show remaining time, not elapsed time
            progressPercentage = Math.max(0, Math.min(1, daysRemaining / 30));
            statusColor = colors.success;
        } else if (status.hasActiveSubscription && status.currentPlan) {
            planName = status.currentPlan.name;
            statusText = 'Active';
            daysRemaining = status.daysRemaining;
            isTrial = false;
            // Assuming monthly subscription (30 days)
            const totalDays = 30;
            // Progress should show remaining time, not elapsed time
            progressPercentage = Math.max(0, Math.min(1, daysRemaining / totalDays));
            statusColor = colors.primary;
        } else if (status.subscriptionStatus === 'expired') {
            planName = 'Expired';
            statusText = 'Expired';
            daysRemaining = 0;
            isTrial = false;
            progressPercentage = 1;
            statusColor = colors.error;
        } else if (status.needsTrialActivation) {
            planName = 'Trial Available';
            statusText = 'Activate Trial';
            daysRemaining = 30;
            isTrial = false;
            progressPercentage = 0;
            statusColor = colors.warning;
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

            <EnhancedSubscriptionProgressBar
                daysRemaining={formatted.daysRemaining}
                totalDays={30}
                isTrial={formatted.isTrial}
                statusColor={formatted.statusColor}
                showDetails={true}
                animated={true}
            />

            <View style={styles.actions}>
                {subscriptionStatus.needsTrialActivation && onActivateTrial ? (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.activateButton]}
                        onPress={onActivateTrial}
                        disabled={loading}
                    >
                        <MaterialCommunityIcons name="play-circle" size={18} color="#fff" style={styles.buttonIcon} />
                        <Text style={styles.activateButtonText}>Activate Trial</Text>
                    </TouchableOpacity>
                ) : (
                    <>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.manageButton]}
                            onPress={onManagePress}
                            disabled={loading}
                        >
                            <MaterialCommunityIcons name="cog-outline" size={18} color="#fff" style={styles.buttonIcon} />
                            <Text style={styles.manageButtonText}>Manage</Text>
                        </TouchableOpacity>

                        {formatted.statusText === 'Active' && (
                            <TouchableOpacity
                                style={[styles.actionButton, styles.renewButton]}
                                onPress={onRenewPress}
                                disabled={loading}
                            >
                                <MaterialCommunityIcons name="refresh" size={18} color="#fff" style={styles.buttonIcon} />
                                <Text style={styles.renewButtonText}>Renew</Text>
                            </TouchableOpacity>
                        )}
                    </>
                )}
            </View>

            {subscriptionStatus.currentPlan && subscriptionStatus.currentPlan.features && Array.isArray(subscriptionStatus.currentPlan.features) && (
                <View style={styles.featuresContainer}>
                    <Text style={styles.featuresTitle}>Plan Features:</Text>
                    {subscriptionStatus.currentPlan.features.slice(0, 3).map((feature, index) => (
                        <Text key={index} style={styles.featureText}>
                            • {feature}
                        </Text>
                    ))}
                    {subscriptionStatus.currentPlan.features.length > 3 && (
                        <Text style={styles.featureText}>
                            • +{subscriptionStatus.currentPlan.features.length - 3} more features
                        </Text>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
        elevation: 2,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
        color: colors.primary,
    },
    progressContainer: {
        marginBottom: 16,
    },
    progressBar: {
        height: 8,
        backgroundColor: colors.text.light + '33',
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
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    buttonIcon: {
        marginRight: 6,
    },
    manageButton: {
        backgroundColor: colors.primary,
    },
    manageButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    renewButton: {
        backgroundColor: colors.secondary,
    },
    renewButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    activateButton: {
        backgroundColor: colors.success,
    },
    activateButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    featuresContainer: {
        borderTopWidth: 1,
        borderTopColor: colors.text.light + '33',
        paddingTop: 12,
    },
    featuresTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: 6,
    },
    featureText: {
        fontSize: 12,
        color: colors.text.secondary,
        marginBottom: 2,
    },
});

export default SubscriptionStatusCard;
