import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SubscriptionPlan } from '../components/common/SubscriptionPlanCard';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';

interface PaymentSuccessScreenProps {
    route: {
        params: {
            plan: SubscriptionPlan;
            userType: 'transporter' | 'broker';
            isUpgrade?: boolean;
        };
    };
}

const PaymentSuccessScreen: React.FC<PaymentSuccessScreenProps> = ({ route }) => {
    const navigation = useNavigation();
    const { plan, userType, isUpgrade = false } = route.params;

    const handleContinue = () => {
        // Navigate to the appropriate home screen based on user type
        if (userType === 'transporter') {
            navigation.navigate('TransporterTabs');
        } else {
            navigation.navigate('BrokerTabs');
        }
    };

    const handleViewSubscription = () => {
        // Navigate to subscription management screen
        navigation.navigate('SubscriptionManagement');
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={[colors.success, colors.successDark || colors.success]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <View style={styles.successIconContainer}>
                        <MaterialCommunityIcons name="check-circle" size={80} color={colors.white} />
                    </View>
                    <Text style={styles.headerTitle}>
                        {isUpgrade ? 'Upgrade Successful!' : 'Payment Successful!'}
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        {isUpgrade ? 'Your subscription has been upgraded' : 'Your subscription has been activated'}
                    </Text>
                </View>
            </LinearGradient>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Subscription Details */}
                <View style={styles.detailsCard}>
                    <Text style={styles.sectionTitle}>Subscription Details</Text>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Plan:</Text>
                        <Text style={styles.detailValue}>{plan.name}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>User Type:</Text>
                        <Text style={styles.detailValue}>
                            {userType === 'transporter' ? 'Transporter' : 'Broker'}
                        </Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Amount Paid:</Text>
                        <Text style={styles.detailValue}>KES {plan.price.toLocaleString()}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Status:</Text>
                        <View style={styles.statusContainer}>
                            <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
                            <Text style={[styles.detailValue, { color: colors.success }]}>Active</Text>
                        </View>
                    </View>
                </View>

                {/* Next Steps */}
                <View style={styles.nextStepsCard}>
                    <Text style={styles.sectionTitle}>What's Next?</Text>

                    <View style={styles.stepItem}>
                        <View style={styles.stepIcon}>
                            <MaterialCommunityIcons name="rocket-launch" size={24} color={colors.primary} />
                        </View>
                        <View style={styles.stepContent}>
                            <Text style={styles.stepTitle}>Start Using Your Features</Text>
                            <Text style={styles.stepDescription}>
                                Access all the premium features included in your {plan.name} plan
                            </Text>
                        </View>
                    </View>

                    <View style={styles.stepItem}>
                        <View style={styles.stepIcon}>
                            <MaterialCommunityIcons name="account-group" size={24} color={colors.secondary} />
                        </View>
                        <View style={styles.stepContent}>
                            <Text style={styles.stepTitle}>Connect with Users</Text>
                            <Text style={styles.stepDescription}>
                                {userType === 'transporter'
                                    ? 'Start receiving job requests from clients'
                                    : 'Start managing client requests and consolidations'
                                }
                            </Text>
                        </View>
                    </View>

                    <View style={styles.stepItem}>
                        <View style={styles.stepIcon}>
                            <MaterialCommunityIcons name="headset" size={24} color={colors.warning} />
                        </View>
                        <View style={styles.stepContent}>
                            <Text style={styles.stepTitle}>Get Support</Text>
                            <Text style={styles.stepDescription}>
                                Our support team is available 24/7 to help you succeed
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Features Included */}
                <View style={styles.featuresCard}>
                    <Text style={styles.sectionTitle}>Features Included</Text>
                    {plan.features.map((feature, index) => (
                        <View key={index} style={styles.featureItem}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                            <Text style={styles.featureText}>{feature}</Text>
                        </View>
                    ))}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.primaryButton]}
                        onPress={handleContinue}
                    >
                        <MaterialCommunityIcons name="home" size={20} color={colors.white} />
                        <Text style={styles.primaryButtonText}>
                            {isUpgrade ? 'Continue' : 'Go to Dashboard'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.secondaryButton]}
                        onPress={handleViewSubscription}
                    >
                        <MaterialCommunityIcons name="cog" size={20} color={colors.primary} />
                        <Text style={styles.secondaryButtonText}>Manage Subscription</Text>
                    </TouchableOpacity>
                </View>

                {/* Support Info */}
                <View style={styles.supportCard}>
                    <Text style={styles.supportTitle}>Need Help?</Text>
                    <Text style={styles.supportText}>
                        Our support team is here to help you get the most out of your subscription.
                    </Text>
                    <TouchableOpacity style={styles.supportButton}>
                        <MaterialCommunityIcons name="message-text" size={20} color={colors.primary} />
                        <Text style={styles.supportButtonText}>Contact Support</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingTop: 20,
        paddingBottom: 40,
        alignItems: 'center',
    },
    headerContent: {
        alignItems: 'center',
    },
    successIconContainer: {
        marginBottom: spacing.md,
    },
    headerTitle: {
        fontSize: fonts.size.xl,
        fontWeight: 'bold',
        color: colors.white,
        marginBottom: spacing.sm,
    },
    headerSubtitle: {
        fontSize: fonts.size.md,
        color: colors.white + 'CC',
        textAlign: 'center',
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: spacing.lg,
    },
    detailsCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginTop: -20,
        marginBottom: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    sectionTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    detailLabel: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
    },
    detailValue: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.primary,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    nextStepsCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: spacing.lg,
    },
    stepIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    stepDescription: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        lineHeight: 20,
    },
    featuresCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    featureText: {
        fontSize: fonts.size.md,
        color: colors.text.primary,
        marginLeft: spacing.sm,
        flex: 1,
    },
    actionButtons: {
        marginBottom: spacing.lg,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.lg,
        borderRadius: 12,
        marginBottom: spacing.md,
    },
    primaryButton: {
        backgroundColor: colors.primary,
    },
    primaryButtonText: {
        color: colors.white,
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        marginLeft: spacing.sm,
    },
    secondaryButton: {
        backgroundColor: colors.white,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    secondaryButtonText: {
        color: colors.primary,
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        marginLeft: spacing.sm,
    },
    supportCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        alignItems: 'center',
    },
    supportTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    supportText: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
        lineHeight: 20,
    },
    supportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 8,
        backgroundColor: colors.surface,
    },
    supportButtonText: {
        color: colors.primary,
        fontSize: fonts.size.md,
        fontWeight: '600',
        marginLeft: spacing.sm,
    },
});

export default PaymentSuccessScreen;
